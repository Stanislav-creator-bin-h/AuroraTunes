import json
import random
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from providers import SoundCloudProvider, YT_DLP_AVAILABLE, YouTubeProvider

load_dotenv()

app = Flask(__name__)
CORS(app)

DATA_DIR = Path(__file__).resolve().parent / "data"
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

    if source == "soundcloud":
        if not soundcloud_provider.is_enabled():
            return jsonify({"error": "SoundCloud client ID is not configured"}), 500

        url = soundcloud_provider.get_stream_url(track_id)
        if url:
            return jsonify({"stream_url": url})
        return jsonify({"error": "Could not get stream URL"}), 404

    if source == "youtube":
        if not YT_DLP_AVAILABLE:
            return jsonify({"error": "yt-dlp is not installed on the server"}), 501

        url = youtube_provider.get_stream_url(track_id)
        if url:
            return jsonify({"stream_url": url})
        return jsonify({"error": "Failed to extract YouTube audio"}), 404

    return jsonify({"error": "Unknown source"}), 400


@app.route("/player/state", methods=["GET", "POST"])
def player_state():
    try:
        user_id = get_user_id()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    data = read_player_data()

    if request.method == "GET":
        return jsonify(data.get("states", {}).get(user_id, {}))

    payload = request.get_json(silent=True) or {}
    data.setdefault("states", {})[user_id] = payload
    write_player_data(data)
    return jsonify({"status": "saved"})


@app.route("/player/history", methods=["GET", "POST", "DELETE"])
def player_history():
    try:
        user_id = get_user_id()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    data = read_player_data()
    history_by_user = data.setdefault("history", {})

    if request.method == "GET":
        return jsonify(history_by_user.get(user_id, []))

    if request.method == "DELETE":
        history_by_user[user_id] = []
        write_player_data(data)
        return jsonify({"status": "cleared"})

    payload = request.get_json(silent=True) or {}
    track = payload.get("track")
    played_duration = payload.get("playedDuration", 0)

    if not track:
        return jsonify({"error": "track is required"}), 400

    new_item = {
        "track": track,
        "playedAt": payload.get("playedAt") or request.headers.get("X-Played-At") or "",
        "playedDuration": played_duration,
    }
    if not new_item["playedAt"]:
        from datetime import datetime, timezone

        new_item["playedAt"] = datetime.now(timezone.utc).isoformat()

    existing = history_by_user.get(user_id, [])
    filtered = [item for item in existing if item.get("track", {}).get("id") != track.get("id")]
    history_by_user[user_id] = [new_item, *filtered][:100]
    write_player_data(data)
    return jsonify({"status": "saved"})


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "running",
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
