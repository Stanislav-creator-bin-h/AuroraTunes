import os

from .base import BaseProvider, fetch_json, parse_duration

try:
    import yt_dlp

    YT_DLP_AVAILABLE = True
except ImportError:
    yt_dlp = None
    YT_DLP_AVAILABLE = False


class YouTubeProvider(BaseProvider):
    source_name = "youtube"

    def __init__(self) -> None:
        self.api_key = os.getenv("YOUTUBE_API_KEY")

    def is_enabled(self) -> bool:
        return bool(self.api_key)

    def search(self, query: str, limit: int = 15) -> list[dict]:
        if not self.api_key:
            return []

        try:
            search_data = fetch_json(
                "https://www.googleapis.com/youtube/v3/search",
                {
                    "part": "snippet",
                    "maxResults": limit,
                    "q": query,
                    "type": "video",
                    "videoCategoryId": "10",
                    "key": self.api_key,
                },
            )

            video_ids = [
                item["id"]["videoId"]
                for item in search_data.get("items", [])
                if item.get("id", {}).get("videoId")
            ]

            if not video_ids:
                return []

            details = fetch_json(
                "https://www.googleapis.com/youtube/v3/videos",
                {
                    "part": "snippet,contentDetails",
                    "id": ",".join(video_ids),
                    "key": self.api_key,
                },
            )

            tracks = []
            for item in details.get("items", []):
                snippet = item.get("snippet", {})
                content = item.get("contentDetails", {})
                thumbs = snippet.get("thumbnails", {})
                thumbnail = (
                    thumbs.get("maxres", {}).get("url")
                    or thumbs.get("high", {}).get("url")
                    or thumbs.get("medium", {}).get("url")
                    or thumbs.get("default", {}).get("url")
                    or "https://via.placeholder.com/500x500/0a0a0f/7c3aed?text=Aurora"
                )

                tracks.append(
                    {
                        "id": item["id"],
                        "title": snippet.get("title"),
                        "channel": snippet.get("channelTitle"),
                        "duration": parse_duration(content.get("duration")),
                        "thumbnail": thumbnail,
                        "source": self.source_name,
                    }
                )

            return tracks
        except Exception as error:
            print(f"YouTube search error: {error}")
            return []

    def can_stream(self) -> bool:
        return YT_DLP_AVAILABLE

    def get_stream_url(self, track_id: str) -> str | None:
        if not YT_DLP_AVAILABLE or yt_dlp is None:
            return None

        ydl_opts = {
            "format": "bestaudio/best",
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(
                    f"https://www.youtube.com/watch?v={track_id}",
                    download=False,
                )
                if info.get("url"):
                    return info["url"]

                formats = info.get("formats", [])
                audio_formats = [
                    item for item in formats if item.get("acodec") != "none" and item.get("url")
                ]
                if audio_formats:
                    return audio_formats[0]["url"]
        except Exception as error:
            print(f"yt-dlp error for {track_id}: {error}")

        return None
