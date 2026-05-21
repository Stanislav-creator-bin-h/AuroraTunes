# Trigger hot reload for new providers
import json
import logging
import os
import random
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

if getattr(sys, 'frozen', False):
    base_dir = Path.cwd()
else:
    base_dir = Path(__file__).resolve().parent

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
load_dotenv(dotenv_path=base_dir / ".env")

logging.basicConfig(level=logging.DEBUG)

# pyrefly: ignore [missing-import]
import jwt
# pyrefly: ignore [missing-import]
from flask import Flask, Response, g, jsonify, request
# pyrefly: ignore [missing-import]
from flask_cors import CORS
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError
# pyrefly: ignore [missing-import]
from werkzeug.security import check_password_hash, generate_password_hash

from providers import SoundCloudProvider, YT_DLP_AVAILABLE, YouTubeProvider
from providers.base import fetch_json

from db import SessionLocal, engine, get_db_session
from models import CustomBackground, ListeningHistory, PlayerState, User

app = Flask(__name__)
app.logger.setLevel(logging.DEBUG)
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5000", "http://127.0.0.1:5000"]}},
    supports_credentials=True,
)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-change-this-secret")
JWT_ALGORITHM = "HS256"

DATA_DIR = base_dir / "data"
PLAYER_DATA_PATH = DATA_DIR / "player_data.json"

youtube_provider = YouTubeProvider()
soundcloud_provider = SoundCloudProvider()

print(f"[INIT] SOUNDCLOUD_CLIENT_ID loaded: {bool(soundcloud_provider.client_id)}", flush=True)
print(f"[INIT] client_id value: {soundcloud_provider.client_id!r}", flush=True)

if not youtube_provider.is_enabled():
    print("YOUTUBE_API_KEY is not configured. YouTube search will be unavailable.")

if not YT_DLP_AVAILABLE:
    print("yt-dlp is not installed. YouTube streaming will be unavailable.")


def read_player_data() -> dict:
    if not PLAYER_DATA_PATH.exists():
        return {"states": {}, "history": {}}

    try:
        return json.loads(PLAYER_DATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"states": {}, "history": {}}


def write_player_data(data: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PLAYER_DATA_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_user_id() -> str:
    user_id = request.args.get("user_id", "").strip()
    if not user_id:
        raise ValueError("user_id is required")
    return user_id


def serialize_datetime(value):
    return value.replace(tzinfo=timezone.utc).isoformat() if value else None


def serialize_user(user: User) -> dict:
    try:
        backgrounds = [item.image_url for item in user.custom_backgrounds]
    except Exception:
        backgrounds = []

    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "avatar": user.avatar_url,
        "createdAt": serialize_datetime(user.created_at),
        "customBackgrounds": backgrounds,
    }


def serialize_background(background: CustomBackground) -> dict:
    return {
        "id": str(background.id),
        "userId": str(background.user_id),
        "imageUrl": background.image_url,
        "createdAt": serialize_datetime(background.created_at),
    }


def create_token(user_id: str) -> str:
    payload = {
        "sub": str(user_id),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()
    return None


def require_auth(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify({"error": "Authentication token is required"}), 401

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid or expired authentication token"}), 401

        user_id = payload.get("sub")
        if not user_id:
            return jsonify({"error": "Invalid authentication token"}), 401

        session = SessionLocal()
        try:
            user = session.get(User, user_id)
            if not user:
                return jsonify({"error": "User not found"}), 401
            g.db = session
            g.current_user = user
            return handler(*args, **kwargs)
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    return wrapper


def parse_played_at(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
    except ValueError:
        return datetime.now(timezone.utc).replace(tzinfo=None)


@app.route("/auth/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if len(username) < 3:
        return jsonify({"error": "Username must contain at least 3 characters"}), 400
    if "@" not in email:
        return jsonify({"error": "Valid email is required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must contain at least 6 characters"}), 400

    try:
        with get_db_session() as session:
            existing = session.scalar(
                select(User).where(func.lower(User.email) == email)
            )
            if existing:
                return jsonify({"error": "Користувач з таким email вже існує"}), 409

            user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
            )
            session.add(user)
            session.flush()
            session.refresh(user)

            return jsonify(
                {"user": serialize_user(user), "token": create_token(str(user.id))}
            ), 201
    except IntegrityError:
        return jsonify({"error": "Користувач з таким email вже існує"}), 409
    except Exception as error:
        app.logger.exception("Registration failed: %s", error)
        return jsonify({"error": "Помилка бази даних під час реєстрації. Перевірте підключення до SQL Server."}), 500


@app.route("/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    with get_db_session() as session:
        user = session.scalar(select(User).where(User.email == email))
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Невірний email або пароль"}), 401

        return jsonify({"user": serialize_user(user), "token": create_token(user.id)})


@app.route("/auth/me", methods=["GET", "PATCH"])
@require_auth
def auth_me():
    user = g.current_user

    if request.method == "PATCH":
        payload = request.get_json(silent=True) or {}
        if "avatarUrl" in payload:
            user.avatar_url = payload.get("avatarUrl") or None
        g.db.commit()
        g.db.refresh(user)

    return jsonify({"user": serialize_user(user)})


@app.route("/auth/logout", methods=["POST"])
def logout():
    return jsonify({"status": "ok"})


@app.route("/backgrounds", methods=["GET", "POST"])
@require_auth
def backgrounds():
    user = g.current_user
    session = g.db

    if request.method == "GET":
        items = session.scalars(
            select(CustomBackground)
            .where(CustomBackground.user_id == user.id)
            .order_by(CustomBackground.created_at.desc())
        ).all()
        return jsonify([serialize_background(item) for item in items])

    payload = request.get_json(silent=True) or {}
    image_url = (payload.get("imageUrl") or payload.get("image_url") or "").strip()
    if not image_url:
        return jsonify({"error": "imageUrl is required"}), 400

    background = CustomBackground(user_id=user.id, image_url=image_url)
    session.add(background)
    session.commit()
    session.refresh(background)
    return jsonify(serialize_background(background)), 201


@app.route("/backgrounds/<background_id>", methods=["DELETE"])
@require_auth
def delete_background(background_id: str):
    user = g.current_user
    session = g.db

    background = session.get(CustomBackground, background_id)
    if not background or str(background.user_id) != str(user.id):
        return jsonify({"error": "Background not found"}), 404

    session.delete(background)
    session.commit()
    return jsonify({"status": "deleted"})


@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    source = request.args.get("source", "youtube")
    cursor = request.args.get("cursor", "").strip() or None

    if len(query) < 2:
        return jsonify({"tracks": [], "nextCursor": None})

    next_cursor = None
    tracks = []

    if source == "youtube":
        tracks, next_cursor = youtube_provider.search(query, limit=20, page_token=cursor)
    elif source == "soundcloud":
        if soundcloud_provider.is_enabled():
            tracks, next_cursor = soundcloud_provider.search(query, limit=20, cursor=cursor)
    else:
        youtube_tracks, youtube_cursor = youtube_provider.search(query, limit=12, page_token=cursor)
        tracks.extend(youtube_tracks)
        next_cursor = youtube_cursor
        if soundcloud_provider.is_enabled():
            soundcloud_tracks, _ = soundcloud_provider.search(query, limit=8)
            tracks.extend(soundcloud_tracks)
        random.shuffle(tracks)
        tracks = tracks[:20]

    return jsonify({"tracks": tracks, "nextCursor": next_cursor})


def resolve_stream_url(source: str, track_id: str) -> str | None:
    if source == "soundcloud":
        if not soundcloud_provider.is_enabled():
            return None
        return soundcloud_provider.get_stream_url(track_id)

    if source == "youtube":
        if not YT_DLP_AVAILABLE:
            return None
        return youtube_provider.get_stream_url(track_id)

    return None


@app.route("/audio/<source>/<track_id>", methods=["GET"])
def proxy_audio(source: str, track_id: str):
    if not track_id:
        return jsonify({"error": "Track ID is required"}), 400

    upstream_url = resolve_stream_url(source, track_id)
    if not upstream_url:
        return jsonify({"error": "Stream not available"}), 404

    upstream_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }
    range_header = request.headers.get("Range")
    if range_header:
        upstream_headers["Range"] = range_header

    try:
        upstream_req = urllib.request.Request(upstream_url, headers=upstream_headers)
        upstream_resp = urllib.request.urlopen(upstream_req, timeout=45)
    except urllib.error.HTTPError as error:
        app.logger.exception("Audio proxy upstream HTTP error")
        return jsonify({"error": f"Upstream error: {error.code}"}), 502
    except Exception as error:
        app.logger.exception("Audio proxy failed")
        return jsonify({"error": str(error)}), 502

    excluded = {"transfer-encoding", "connection", "content-encoding", "keep-alive"}
    pass_headers = {
        key: value
        for key, value in upstream_resp.headers.items()
        if key.lower() not in excluded
    }
    pass_headers["Accept-Ranges"] = "bytes"
    pass_headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Accept-Ranges"

    def generate():
        try:
            while True:
                chunk = upstream_resp.read(65536)
                if not chunk:
                    break
                yield chunk
        finally:
            upstream_resp.close()

    return Response(
        generate(),
        status=upstream_resp.status,
        headers=pass_headers,
        direct_passthrough=True,
    )


@app.route("/stream/<source>/<track_id>", methods=["GET"])
def get_stream(source: str, track_id: str):
    if not track_id:
        return jsonify({"error": "Track ID is required"}), 400

    if source == "soundcloud":
        if not soundcloud_provider.is_enabled():
            return jsonify({"error": "SoundCloud client ID is not configured"}), 500

        print(f"[SC] client_id present: {bool(soundcloud_provider.client_id)}", flush=True)
        print(f"[SC] track_id: {track_id!r}", flush=True)

        try:
            track = fetch_json(
                f"https://api-v2.soundcloud.com/tracks/{track_id}",
                {"client_id": soundcloud_provider.client_id},
            )
            print(f"[SC] track keys: {list(track.keys())}", flush=True)
            transcodings = track.get("media", {}).get("transcodings", [])
            print(f"[SC] transcodings count: {len(transcodings)}", flush=True)
            for t in transcodings:
                fmt = t.get("format", {})
                print(f"  protocol={fmt.get('protocol')} mime={fmt.get('mime_type')}", flush=True)
        except Exception as e:
            print(f"[SC] fetch failed: {e}", flush=True)

        url = resolve_stream_url(source, track_id)
        print(f"[SC] stream url result: {url!r}", flush=True)

        if url:
            return jsonify({"stream_url": url, "playback_url": f"/audio/{source}/{track_id}"})
        return jsonify({"error": "Could not get stream URL"}), 404

    if source == "youtube":
        if not YT_DLP_AVAILABLE:
            return jsonify({"error": "yt-dlp is not installed on the server"}), 501

        url = resolve_stream_url(source, track_id)
        if url:
            return jsonify({"stream_url": url, "playback_url": f"/audio/{source}/{track_id}"})
        return jsonify({"error": "Failed to extract YouTube audio"}), 404

    return jsonify({"error": "Unknown source"}), 400


@app.route("/player/state", methods=["GET", "POST", "PUT"])
@require_auth
def player_state():
    user = g.current_user
    session = g.db

    if request.method == "GET":
        state = session.scalar(select(PlayerState).where(PlayerState.user_id == user.id))
        if not state:
            return jsonify({})

        current_track = json.loads(state.current_track_json) if state.current_track_json else None
        playlist = json.loads(state.playlist_json) if state.playlist_json else []
        return jsonify(
            {
                "currentTrack": current_track,
                "currentTime": state.current_time,
                "volume": state.volume,
                "playlist": playlist,
            }
        )

    payload = request.get_json(silent=True) or {}
    state = session.scalar(select(PlayerState).where(PlayerState.user_id == user.id))
    if not state:
        state = PlayerState(user_id=user.id)
        session.add(state)

    state.current_track_json = json.dumps(payload.get("currentTrack"), ensure_ascii=False) if payload.get("currentTrack") else None
    state.current_time = float(payload.get("currentTime") or 0)
    state.volume = float(payload.get("volume") if payload.get("volume") is not None else 0.7)
    state.playlist_json = json.dumps(payload.get("playlist") or [], ensure_ascii=False)
    state.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.commit()
    return jsonify({"status": "saved"})


@app.route("/player/history", methods=["GET", "POST", "DELETE"])
@require_auth
def player_history():
    user = g.current_user
    session = g.db

    if request.method == "GET":
        items = session.scalars(
            select(ListeningHistory)
            .where(ListeningHistory.user_id == user.id)
            .order_by(ListeningHistory.played_at.desc())
        ).all()
        return jsonify(
            [
                {
                    "track": {
                        "id": item.track_id,
                        "title": item.title,
                        "channel": item.channel,
                        "thumbnail": item.thumbnail,
                        "source": item.source,
                        "duration": "0:00",
                    },
                    "playedAt": serialize_datetime(item.played_at),
                    "playedDuration": item.played_duration,
                }
                for item in items
            ]
        )

    if request.method == "DELETE":
        session.execute(delete(ListeningHistory).where(ListeningHistory.user_id == user.id))
        session.commit()
        return jsonify({"status": "cleared"})

    payload = request.get_json(silent=True) or {}
    track = payload.get("track")
    played_duration = payload.get("playedDuration", 0)

    if not track:
        return jsonify({"error": "track is required"}), 400

    session.execute(
        delete(ListeningHistory).where(
            ListeningHistory.user_id == user.id,
            ListeningHistory.track_id == str(track.get("id") or ""),
        )
    )
    session.add(
        ListeningHistory(
            user_id=user.id,
            track_id=str(track.get("id") or ""),
            title=track.get("title") or "Unknown title",
            channel=track.get("channel"),
            thumbnail=track.get("thumbnail"),
            source=track.get("source") or "youtube",
            played_duration=float(played_duration or 0),
            played_at=parse_played_at(payload.get("playedAt") or request.headers.get("X-Played-At")),
        )
    )
    session.commit()
    return jsonify({"status": "saved"})


@app.route("/health", methods=["GET"])
def health():
    database_ok = False
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            database_ok = True
    except Exception as error:
        print(f"Database health check failed: {error}")

    return jsonify(
        {
            "status": "running",
            "database": database_ok,
            "youtube_api": youtube_provider.is_enabled(),
            "soundcloud": soundcloud_provider.is_enabled(),
            "yt_dlp": YT_DLP_AVAILABLE,
        }
    )


@app.route("/random", methods=["GET"])
def get_random_tracks():
    try:
        limit = min(max(int(request.args.get("limit", 12)), 4), 24)
    except ValueError:
        limit = 12

    genres = [
        "pop music",
        "electronic music",
        "rock hits",
        "hip hop",
        "jazz",
        "classical music",
        "indie",
        "r&b",
        "latin music",
        "lofi beats",
    ]

    random_genre = random.choice(genres)
    per_source = max(limit // 2, 4)
    youtube_tracks, _ = youtube_provider.search(random_genre, limit=per_source)
    tracks = youtube_tracks

    if soundcloud_provider.is_enabled():
        soundcloud_tracks, _ = soundcloud_provider.search(random_genre, limit=max(per_source // 2, 3))
        tracks.extend(soundcloud_tracks)

    random.shuffle(tracks)
    return jsonify(tracks[:limit])


if __name__ == "__main__":
    print("AuroraTunes backend started", flush=True)
    app.run(debug=True, port=5000, host="0.0.0.0")