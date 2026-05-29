import os
import logging

from .base import BaseProvider, fetch_json

logger = logging.getLogger(__name__)

try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
except ImportError:
    yt_dlp = None
    YT_DLP_AVAILABLE = False
    logger.warning("yt-dlp is not installed, fallback disabled")


def millis_to_duration(val: int | float) -> str:
    seconds = int(val / 1000)
    minutes = seconds // 60
    remainder = seconds % 60
    return f"{minutes}:{remainder:02d}"


class SoundCloudProvider(BaseProvider):
    source_name = "soundcloud"

    def __init__(self) -> None:
        self.client_id = os.getenv("SOUNDCLOUD_CLIENT_ID")

        self.ydl_opts = {
            "quiet": True,
            "nocheckcertificate": True,
            "no_warnings": True,
        }

        if not self.client_id:
            logger.warning("SOUNDCLOUD_CLIENT_ID not set")

    def is_enabled(self) -> bool:
        return bool(self.client_id)

    def search(self, query: str, limit: int = 8, cursor: str | None = None) -> tuple[list[dict], str | None]:
        logger.info("SoundCloud search: %s", query)

        try:
            if cursor:
                response = fetch_json(cursor)
            else:
                url = "https://api-v2.soundcloud.com/search/tracks"
                response = fetch_json(url, {
                    "q": query,
                    "client_id": self.client_id,
                    "limit": limit,
                })

            next_cursor = response.get("next_href")

            collection = response.get("collection", []) or []
            tracks = []

            for entry in collection:
                if not entry:
                    continue

                artwork = entry.get("artwork_url") or ""
                thumbnail = artwork.replace("-large.", "-t500x500.") if artwork else "https://via.placeholder.com/500"

                user = entry.get("user") or {}
                channel = user.get("username", "SoundCloud")

                tracks.append({
                    "id": str(entry.get("id")),
                    "title": entry.get("title"),
                    "channel": channel,
                    "duration": millis_to_duration(entry.get("duration", 0) or 0),
                    "thumbnail": thumbnail,
                    "source": self.source_name,
                })

            return tracks, next_cursor

        except Exception as e:
            logger.exception("SoundCloud search error: %s", e)
            return [], None

    def get_stream_url(self, track_id: str) -> str | None:
        logger.info("Getting stream for track_id=%s", track_id)

        try:
            track = fetch_json(
                f"https://api-v2.soundcloud.com/tracks/{track_id}",
                {"client_id": self.client_id},
            )

            transcodings = track.get("media", {}).get("transcodings", []) or []
            progressive = [
                item for item in transcodings
                if (item.get("format") or {}).get("protocol") == "progressive"
            ]
            others = [item for item in transcodings if item not in progressive]
            ordered = progressive + others

            for transcoding in ordered:
                try:
                    stream_resp = fetch_json(
                        transcoding["url"],
                        {
                            "client_id": self.client_id,
                            "track_authorization": track.get("track_authorization", "")
                        },
                    )

                    url = stream_resp.get("url")
                    if url:
                        protocol = (transcoding.get("format") or {}).get("protocol")
                        logger.info("Stream resolved via API (%s)", protocol)
                        return url

                except Exception:
                    continue

        except Exception as e:
            logger.exception("SoundCloud API error: %s", e)

        if YT_DLP_AVAILABLE and yt_dlp is not None:
            logger.info("Fallback to yt-dlp")

            try:
                track_url = f"https://api.soundcloud.com/tracks/{track_id}"

                with yt_dlp.YoutubeDL({
                    **self.ydl_opts,
                    "format": "bestaudio/best",
                    "extractor_args": {
                        "soundcloud": {
                            "client_id": "auto"
                        }
                    }
                }) as ydl:

                    info = ydl.extract_info(track_url, download=False)

                    if not info:
                        return None

                    if info.get("url"):
                        return info["url"]

                    if info.get("formats"):
                        return info["formats"][-1].get("url")

            except Exception as e:
                logger.exception("yt-dlp fallback error: %s", e)

        logger.warning("No stream found for track_id=%s", track_id)
        return None