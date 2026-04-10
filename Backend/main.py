import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from yt_dlp import YoutubeDL

app = Flask(__name__)
CORS(app)

# In-memory storage for demo (replace with database later)
user_data = {}

YDL_OPTIONS = {
    'quiet': True,
    'nocheckcertificate': True,
}

YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
SOUNDCLOUD_CLIENT_ID = os.getenv('SOUNDCLOUD_CLIENT_ID')


def parse_iso8601_duration(duration: str) -> str:
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
    if not match:
        return '0:00'

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    total_seconds = hours * 3600 + minutes * 60 + seconds
    return f"{total_seconds // 60}:{total_seconds % 60:02d}"


def millis_to_duration(ms: int) -> str:
    seconds = int(ms / 1000)
    minutes = seconds // 60
    remainder = seconds % 60
    return f"{minutes}:{remainder:02d}"


def fetch_json(url: str, params: dict) -> dict:
    query = urllib.parse.urlencode(params)
    request_url = f"{url}?{query}"
    req = urllib.request.Request(
        request_url,
        headers={
            'User-Agent': 'Mozilla/5.0 (AuroraTunes)'
        }
    )
    with urllib.request.urlopen(req, timeout=15) as res:
        return json.loads(res.read().decode('utf-8'))


def search_soundcloud(query: str, limit: int = 10) -> list[dict]:
    items = []

    if SOUNDCLOUD_CLIENT_ID:
        try:
            response = fetch_json(
                'https://api-v2.soundcloud.com/search/tracks',
                {
                    'q': query,
                    'client_id': SOUNDCLOUD_CLIENT_ID,
                    'limit': limit,
                }
            )
            items = response.get('collection', []) or []
        except Exception:
            items = []
    else:
        try:
            with YoutubeDL({**YDL_OPTIONS, 'extract_flat': True}) as ydl:
                info = ydl.extract_info(f"scsearch{limit}:{query}", download=False)
                items = info.get('entries', []) or []
        except Exception:
            items = []

    tracks = []
    for entry in items:
        if not entry:
            continue

        thumbnail = 'https://via.placeholder.com/500'
        if entry.get('artwork_url'):
            thumbnail = entry.get('artwork_url')
            if thumbnail.endswith('-large.jpg'):
                thumbnail = thumbnail.replace('-large.jpg', '-t500x500.jpg')
        elif entry.get('thumbnails'):
            thumbs = entry.get('thumbnails')
            if isinstance(thumbs, list) and thumbs:
                thumbnail = thumbs[0].get('url', thumbnail)

        channel = 'SoundCloud'
        if entry.get('user'):
            channel = entry.get('user', {}).get('username', channel)

        duration = millis_to_duration(entry.get('duration', 0)) if entry.get('duration') else '0:00'

        tracks.append({
            'id': str(entry.get('id')),
            'title': entry.get('title'),
            'channel': channel,
            'duration': duration,
            'thumbnail': thumbnail,
            'source': 'soundcloud',
        })

    return tracks


def search_youtube(query: str, limit: int = 10) -> list[dict]:
    if not YOUTUBE_API_KEY:
        return []

    try:
        search_data = fetch_json(
            'https://www.googleapis.com/youtube/v3/search',
            {
                'part': 'snippet',
                'maxResults': limit,
                'q': query,
                'type': 'video',
                'key': YOUTUBE_API_KEY,
            }
        )

        video_ids = [item.get('id', {}).get('videoId') for item in search_data.get('items', []) if item.get('id', {}).get('videoId')]
        if not video_ids:
            return []

        video_data = fetch_json(
            'https://www.googleapis.com/youtube/v3/videos',
            {
                'part': 'snippet,contentDetails',
                'id': ','.join(video_ids),
                'key': YOUTUBE_API_KEY,
            }
        )

        tracks = []
        for item in video_data.get('items', []):
            snippet = item.get('snippet', {}) or {}
            details = item.get('contentDetails', {}) or {}
            thumbnails = snippet.get('thumbnails', {}) or {}
            
            # Get highest quality thumbnail available
            thumbnail = (
                thumbnails.get('maxres', {}).get('url') or
                thumbnails.get('high', {}).get('url') or
                thumbnails.get('medium', {}).get('url') or
                thumbnails.get('default', {}).get('url') or
                'https://via.placeholder.com/500'
            )

            duration_str = parse_iso8601_duration(details.get('duration', 'PT0S'))
            
            tracks.append({
                'id': item.get('id'),
                'title': snippet.get('title'),
                'channel': snippet.get('channelTitle'),
                'duration': duration_str if duration_str != '0:00' else '0:00',
                'thumbnail': thumbnail,
                'source': 'youtube',
            })

        return tracks
    except Exception:
        return []


@app.route('/search')
def search():
    query = request.args.get('q')
    source = request.args.get('source', 'all').lower()

    if not query:
        return jsonify([])

    tracks = []
    if source == 'youtube':
        tracks = search_youtube(query)
    elif source == 'soundcloud':
        tracks = search_soundcloud(query)
    else:
        tracks = []
        tracks.extend(search_soundcloud(query, limit=6))
        tracks.extend(search_youtube(query, limit=6))

    return jsonify(tracks)


@app.route('/stream')
def stream():
    track_id = request.args.get('id')
    source = request.args.get('source', 'soundcloud').lower()

    if not track_id:
        return jsonify({'error': 'track id is required'}), 400

    if source == 'youtube':
        track_url = f'https://www.youtube.com/watch?v={track_id}'
    else:
        track_url = f'https://api.soundcloud.com/tracks/{track_id}'

    try:
        with YoutubeDL({**YDL_OPTIONS, 'format': 'bestaudio/best'}) as ydl:
            info = ydl.extract_info(track_url, download=False)
            stream_url = info.get('url')
            return jsonify({'stream_url': stream_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/player/state', methods=['GET', 'POST'])
def player_state():
    user_id = request.args.get('user_id', 'default_user')

    if request.method == 'POST':
        # Save player state
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        user_data[user_id] = {
            'currentTrack': data.get('currentTrack'),
            'currentTime': data.get('currentTime', 0),
            'volume': data.get('volume', 0.7),
            'playlist': data.get('playlist', []),
            'listeningHistory': data.get('listeningHistory', []),
            'lastUpdated': datetime.now().isoformat()
        }
        return jsonify({'success': True})

    else:
        # Load player state
        state = user_data.get(user_id, {})
        return jsonify(state)


@app.route('/player/history', methods=['GET', 'POST'])
def player_history():
    user_id = request.args.get('user_id', 'default_user')

    if request.method == 'POST':
        # Add to history
        data = request.get_json()
        if not data or not data.get('track'):
            return jsonify({'error': 'Track data required'}), 400

        if user_id not in user_data:
            user_data[user_id] = {'listeningHistory': []}

        history_item = {
            'track': data['track'],
            'playedAt': datetime.now().isoformat(),
            'playedDuration': data.get('playedDuration', 0)
        }

        # Add to beginning, keep only last 100 items
        history = user_data[user_id].get('listeningHistory', [])
        history.insert(0, history_item)
        # Remove duplicates and limit to 100
        seen_ids = set()
        unique_history = []
        for item in history:
            track_id = item['track']['id']
            if track_id not in seen_ids:
                seen_ids.add(track_id)
                unique_history.append(item)
            if len(unique_history) >= 100:
                break

        user_data[user_id]['listeningHistory'] = unique_history
        return jsonify({'success': True})

    else:
        # Get history
        history = user_data.get(user_id, {}).get('listeningHistory', [])
        return jsonify(history)


if __name__ == '__main__':
    print('--- Бэкенд AuroraTunes запущен на порту 5000 ---')
    app.run(debug=False, port=5000)
