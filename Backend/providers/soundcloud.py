import os

from .base import BaseProvider, fetch_json


class SoundCloudProvider(BaseProvider):
    source_name = "soundcloud"

    def __init__(self) -> None:
        self.client_id = os.getenv("SOUNDCLOUD_CLIENT_ID")

    def is_enabled(self) -> bool:
        return bool(self.client_id)

    def search(self, query: str, limit: int = 8) -> list[dict]:
        if not self.client_id:
            return []

        try:
            data = fetch_json(
                "https://api-v2.soundcloud.com/search/tracks",
                {"q": query, "client_id": self.client_id, "limit": limit},
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

                tracks.append(
                    {
                        "id": str(track["id"]),
                        "title": track.get("title"),
                        "channel": track.get("user", {}).get("username", "SoundCloud"),
                        "duration": duration,
                        "thumbnail": artwork or "https://via.placeholder.com/500",
                        "source": self.source_name,
                    }
                )
            return tracks
        except Exception as error:
            print(f"SoundCloud search error: {error}")
            return []

    def get_stream_url(self, track_id: str) -> str | None:
        if not self.client_id:
            return None

        try:
            fetch_json(
                f"https://api-v2.soundcloud.com/tracks/{track_id}",
                {"client_id": self.client_id},
            )
            streams = fetch_json(
                f"https://api-v2.soundcloud.com/tracks/{track_id}/streams",
                {"client_id": self.client_id},
            )

            for key in ["hls_aac_160_url", "hls_aac_96_url", "http_mp3_128_url"]:
                if streams.get(key):
                    return streams[key]
        except Exception as error:
            print(f"SoundCloud stream error: {error}")

        return None
