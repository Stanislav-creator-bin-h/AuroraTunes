import json
import os
import random
import sys
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

import jwt
import requests
from dotenv import load_dotenv
from flask import Flask, Response, g, jsonify, request, stream_with_context
from flask_cors import CORS
from sqlalchemy import delete, select, text
from werkzeug.security import check_password_hash, generate_password_hash

from providers import SoundCloudProvider, YT_DLP_AVAILABLE, YouTubeProvider

if getattr(sys, 'frozen', False):
    base_dir = Path.cwd()
else:
    base_dir = Path(__file__).resolve().parent

load_dotenv(dotenv_path=base_dir / ".env")

from db import SessionLocal, engine, get_db_session
from models import CustomBackground, ListeningHistory, PlayerState, User

app = Flask(__name__)
CORS(app)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-change-this-secret")
JWT_ALGORITHM = "HS256"

DATA_DIR = base_dir / "data"
PLAYER_DATA_PATH = DATA_DIR / "player_data.json"

youtube_provider = YouTubeProvider()
soundcloud_provider = SoundCloudProvider()

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
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "avatar": user.avatar_url,
        "createdAt": serialize_datetime(user.created_at),
        "customBackgrounds": [item.image_url for item in user.custom_backgrounds],
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

    with get_db_session() as session:
        existing = session.scalar(select(User).where(User.email == email))
        if existing:
            return jsonify({"error": "User with this email already exists"}), 409

        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
        )
        session.add(user)
        session.flush()
        session.refresh(user)

        return jsonify({"user": serialize_user(user), "token": create_token(user.id)}), 201


@app.route("/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    with get_db_session() as session:
        user = session.scalar(select(User).where(User.email == email))
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401

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
    source = request.args.get("source", "all")

    if len(query) < 2:
        return jsonify([])

    tracks = []
    if source in ["youtube", "all"]:
        tracks.extend(youtube_provider.search(query, limit=12))
    if source in ["soundcloud", "all"]:
        tracks.extend(soundcloud_provider.search(query, limit=8))

    random.shuffle(tracks)
    return jsonify(tracks[:20])


@app.route("/stream/<source>/<track_id>", methods=["GET"])
def get_stream(source: str, track_id: str):
    if not track_id:
        return jsonify({"error": "Track ID is required"}), 400

    if source == "soundcloud" and not soundcloud_provider.is_enabled():
        return jsonify({"error": "SoundCloud client ID is not configured"}), 500

    if source == "youtube" and not YT_DLP_AVAILABLE:
        return jsonify({"error": "yt-dlp is not installed on the server"}), 501

    if source not in ["youtube", "soundcloud"]:
        return jsonify({"error": "Unknown source"}), 400

    stream_url = f"{request.host_url.rstrip('/')}/media/{source}/{track_id}"
    return jsonify({"stream_url": stream_url})


def resolve_remote_stream_url(source: str, track_id: str) -> str | None:
    if not track_id:
        return None

    if source == "soundcloud":
        return soundcloud_provider.get_stream_url(track_id)

    if source == "youtube":
        return youtube_provider.get_stream_url(track_id)

    return None


@app.route("/media/<source>/<track_id>", methods=["GET"])
def proxy_media_stream(source: str, track_id: str):
    if source == "soundcloud" and not soundcloud_provider.is_enabled():
        return jsonify({"error": "SoundCloud client ID is not configured"}), 500

    if source == "youtube" and not YT_DLP_AVAILABLE:
        return jsonify({"error": "yt-dlp is not installed on the server"}), 501

    if source not in ["youtube", "soundcloud"]:
        return jsonify({"error": "Unknown source"}), 400

    remote_url = resolve_remote_stream_url(source, track_id)
    if not remote_url:
        return jsonify({"error": "Could not get stream URL"}), 404

    headers = {
        "User-Agent": request.headers.get("User-Agent", "AuroraTunes/1.0"),
    }
    if request.headers.get("Range"):
        headers["Range"] = request.headers["Range"]

    try:
        upstream = requests.get(remote_url, headers=headers, stream=True, timeout=20)
        upstream.raise_for_status()
    except requests.RequestException as error:
        print(f"Media proxy error for {source}/{track_id}: {error}")
        return jsonify({"error": "Could not open media stream"}), 502

    response_headers = {
        "Accept-Ranges": upstream.headers.get("Accept-Ranges", "bytes"),
        "Cache-Control": "no-store",
    }
    for header in ["Content-Length", "Content-Range"]:
        if upstream.headers.get(header):
            response_headers[header] = upstream.headers[header]

    content_type = upstream.headers.get("Content-Type", "audio/mpeg")

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=64 * 1024):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    return Response(
        stream_with_context(generate()),
        status=upstream.status_code,
        content_type=content_type,
        headers=response_headers,
    )


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
    tracks = youtube_provider.search(random_genre, limit=8)

    if soundcloud_provider.is_enabled():
        tracks.extend(soundcloud_provider.search(random_genre, limit=4))

    random.shuffle(tracks)
    return jsonify(tracks[:12])


if __name__ == "__main__":
    print("AuroraTunes backend started")
    print("Search:  GET http://localhost:5000/search?q=query")
    print("Stream:  GET http://localhost:5000/stream/youtube/{id}")
    print("         GET http://localhost:5000/stream/soundcloud/{id}")
    app.run(debug=True, port=5000, host="0.0.0.0")
