from flask import Flask, request, jsonify
from flask_cors import CORS
from yt_dlp import YoutubeDL

app = Flask(__name__)
CORS(app)

YDL_OPTIONS = {
    'quiet': True,
    'nocheckcertificate': True,
}

def format_track(entry):
    return {
        "id": entry.get('id'),
        "title": entry.get('title'),
        "artist": entry.get('uploader'),
        "url": entry.get('url'),
        "duration": entry.get('duration'),
        "thumbnail": entry.get('thumbnails')[0]['url'].replace('-mini.jpg', '-t500x500.jpg') 
                     if entry.get('thumbnails') else None
    }

@app.route('/search')
def search():
    """Поиск треков по названию."""
    query = request.args.get('q')
    if not query:
        return jsonify([])

    try:
        with YoutubeDL({**YDL_OPTIONS, 'extract_flat': True}) as ydl:
            info = ydl.extract_info(f"scsearch10:{query}", download=False)
            tracks = [format_track(e) for e in info.get('entries', [])]
            return jsonify(tracks)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/stream/<track_id>')
def stream(track_id):
    """Получение прямой ссылки на аудиопоток (mp3/opus)."""
    track_url = f"https://api.soundcloud.com/tracks/{track_id}"
    
    try:
        with YoutubeDL({**YDL_OPTIONS, 'format': 'bestaudio/best'}) as ydl:
            info = ydl.extract_info(track_url, download=False)
            stream_url = info.get('url')
            return jsonify({"stream_url": stream_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("--- Бэкенд AuroraTunes запущен на порту 5000 ---")
    app.run(debug=False, port=5000)