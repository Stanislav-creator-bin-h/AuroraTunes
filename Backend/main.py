import json
import os
import re
import urllib.parse
import urllib.request
from flask import Flask, request, jsonify
from flask_cors import CORS

# Опціонально: yt-dlp для реального стрімінгу YouTube
try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
except ImportError:
    YT_DLP_AVAILABLE = False
    print("⚠️  yt-dlp не встановлено. Стрімінг YouTube буде недоступний.")

app = Flask(__name__)
CORS(app)

# ====================== CONFIG ======================
YOUTUBE_API_KEY = ("YOUTUBE_API_KEY") #ЗАГЛУШКА
SOUNDCLOUD_CLIENT_ID = os.getenv("SOUNDCLOUD_CLIENT_ID")  # опціонально

if not YOUTUBE_API_KEY:
    print("⚠️  YOUTUBE_API_KEY не знайдено! Пошук YouTube працювати не буде.")

# ====================== HELPERS ======================
def parse_duration(duration: str) -> str:
    """PT3M45S → 3:45"""
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration or "")
    if not match:
        return "0:00"
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    total_min = hours * 60 + minutes
    return f"{total_min}:{seconds:02d}"


def fetch_json(url: str, params: dict = None) -> dict:
    if params:
        url += "?" + urllib.parse.urlencode(params)
    
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "AuroraTunes/1.0 (Desktop App)"}
    )
    with urllib.request.urlopen(req, timeout=12) as res:
        return json.loads(res.read().decode("utf-8"))


# ====================== YOUTUBE ======================
def search_youtube(query: str, limit: int = 15) -> list:
    if not YOUTUBE_API_KEY:
        return []

    try:
        # Пошук
        search_data = fetch_json(
            "https://www.googleapis.com/youtube/v3/search",
            {
                "part": "snippet",
                "maxResults": limit,
                "q": query,
                "type": "video",
                "videoCategoryId": "10",  # Music
                "key": YOUTUBE_API_KEY,
            }
        )

        video_ids = [item["id"]["videoId"] for item in search_data.get("items", []) if item.get("id", {}).get("videoId")]

        if not video_ids:
            return []

        # Деталі (тривалість + thumbnail)
        details = fetch_json(
            "https://www.googleapis.com/youtube/v3/videos",
            {
                "part": "snippet,contentDetails",
                "id": ",".join(video_ids),
                "key": YOUTUBE_API_KEY,
            }
        )

        tracks = []
        for item in details.get("items", []):
            snippet = item.get("snippet", {})
            content = item.get("contentDetails", {})

            thumbs = snippet.get("thumbnails", {})
            thumbnail = (
                thumbs.get("maxres", {}).get("url") or 
    thumbs.get("high", {}).get("url") or 
    thumbs.get("medium", {}).get("url") or 
    thumbs.get("default", {}).get("url") or
                "https://via.placeholder.com/500x500/0a0a0f/7c3aed?text=Aurora"
            )

            tracks.append({
                "id": item["id"],
                "title": snippet.get("title"),
                "channel": snippet.get("channelTitle"),
                "duration": parse_duration(content.get("duration")),
                "thumbnail": thumbnail,
                "source": "youtube"
            })

        return tracks
    except Exception as e:
        print(f"YouTube search error: {e}")
        return []


def get_youtube_stream_url(video_id: str) -> str | None:
    """Повертає пряме аудіо посилання через yt-dlp"""
    if not YT_DLP_AVAILABLE:
        return None

    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            # Беремо найкращий аудіо формат
            if info.get('url'):
                return info['url']
            # Альтернатива: formats
            formats = info.get('formats', [])
            audio_formats = [f for f in formats if f.get('acodec') != 'none' and f.get('url')]
            if audio_formats:
                return audio_formats[0]['url']
    except Exception as e:
        print(f"yt-dlp error for {video_id}: {e}")
    
    return None


# ====================== SOUNDCLOUD (опціонально) ======================
def search_soundcloud(query: str, limit: int = 8) -> list:
    if not SOUNDCLOUD_CLIENT_ID:
        return []

    try:
        data = fetch_json(
            "https://api-v2.soundcloud.com/search/tracks",
            {"q": query, "client_id": SOUNDCLOUD_CLIENT_ID, "limit": limit}
        )

        tracks = []
        for track in data.get("collection", []):
            if not track.get("streamable", True):
                continue

            artwork = track.get("artwork_url") or track.get("user", {}).get("avatar_url")
            if artwork and "large.jpg" in artwork:
                artwork = artwork.replace("large.jpg", "t500x500.jpg")

            duration_ms = track.get("duration", 0)
            duration = f"{duration_ms // 60000}:{(duration_ms % 60000) // 1000:02d}"

            tracks.append({
                "id": str(track["id"]),
                "title": track.get("title"),
                "channel": track.get("user", {}).get("username", "SoundCloud"),
                "duration": duration,
                "thumbnail": artwork or "https://via.placeholder.com/500",
                "source": "soundcloud"
            })
        return tracks
    except Exception:
        return []


def get_soundcloud_stream_url(track_id: str) -> str | None:
    if not SOUNDCLOUD_CLIENT_ID:
        return None
    try:
        # Спочатку отримуємо track info
        track = fetch_json(f"https://api-v2.soundcloud.com/tracks/{track_id}", {"client_id": SOUNDCLOUD_CLIENT_ID})
        # Потім streams
        streams = fetch_json(f"https://api-v2.soundcloud.com/tracks/{track_id}/streams", {"client_id": SOUNDCLOUD_CLIENT_ID})
        
        # Беремо найкращий (HLS AAC або http_mp3)
        for key in ["hls_aac_160_url", "hls_aac_96_url", "http_mp3_128_url"]:
            if streams.get(key):
                return streams[key]
    except Exception as e:
        print(f"SoundCloud stream error: {e}")
    return None


# ====================== ROUTES ======================

@app.route('/search', methods=['GET']) # Раніше тут було /stream по помилці
def search():
    query = request.args.get("q", "").strip()
    source = request.args.get("source", "all")
    
    if len(query) < 2:
        return jsonify([])

    tracks = []
    # Логіка вибору джерела
    if source in ["youtube", "all"]:
        tracks.extend(search_youtube(query, limit=12))
    if source in ["soundcloud", "all"]:
        tracks.extend(search_soundcloud(query, limit=8))

    import random
    random.shuffle(tracks)
    return jsonify(tracks[:20])

@app.route("/stream/<source>/<track_id>")
def get_stream(source, track_id):
    if not track_id:
        return jsonify({'error': 'Track ID is required'}), 400

    if source == 'soundcloud':
        if not SOUNDCLOUD_CLIENT_ID:
            return jsonify({'error': 'SoundCloud ID not configured'}), 500
        try:
            # Використовуємо твою функцію-хелпер для SoundCloud
            url = get_soundcloud_stream_url(track_id)
            if url:
                return jsonify({'stream_url': url})
            return jsonify({'error': 'Could not get stream URL'}), 404
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    elif source == 'youtube':
        if not YT_DLP_AVAILABLE:
            return jsonify({'error': 'yt-dlp not installed on server'}), 501
        
        url = get_youtube_stream_url(track_id)
        if url:
            return jsonify({'stream_url': url})
        return jsonify({'error': 'Failed to extract YouTube audio'}), 404

    return jsonify({'error': 'Unknown source'}), 400


@app.route("/health")
def health():
    return jsonify({
        "status": "running",
        "youtube_api": bool(YOUTUBE_API_KEY),
        "soundcloud": bool(SOUNDCLOUD_CLIENT_ID),
        "yt_dlp": YT_DLP_AVAILABLE
    })

@app.route("/random", methods=['GET'])
def get_random_tracks():
    """Повертає випадкові треки для автовідтворення при запуску"""
    import random
    
    # Популярні музичні жанри для випадкового пошуку
    genres = ["pop music", "electronic music", "rock hits", "hip hop", "jazz", "classical music", "indie", "r&b", "latin music", "lofi beats"]
    
    random_genre = random.choice(genres)
    tracks = []
    
    if random_genre:
        tracks.extend(search_youtube(random_genre, limit=8))
    
    if SOUNDCLOUD_CLIENT_ID:
        tracks.extend(search_soundcloud(random_genre, limit=4))
    
    random.shuffle(tracks)
    return jsonify(tracks[:12])

if __name__ == "__main__":
    print("🚀 AuroraTunes Backend (YouTube + SoundCloud) запущено")
    print("   Пошук:      GET http://localhost:5000/search?q=query")
    print("   Стрім:      GET http://localhost:5000/stream/youtube/{id}")
    print("               GET http://localhost:5000/stream/soundcloud/{id}")
    app.run(debug=True, port=5000, host="0.0.0.0")