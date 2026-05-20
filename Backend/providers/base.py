import json
import re
import urllib.parse
import urllib.request


class BaseProvider:
    source_name = "unknown"

    def is_enabled(self) -> bool:
        return False

    def search(self, query: str, limit: int = 10) -> list[dict]:
        return []

    def get_stream_url(self, track_id: str) -> str | None:
        return None


def parse_duration(duration: str) -> str:
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration or "")
    if not match:
        return "0:00"

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    total_minutes = hours * 60 + minutes
    return f"{total_minutes}:{seconds:02d}"


def fetch_json(url: str, params: dict | None = None) -> dict:
    if params:
        url += "?" + urllib.parse.urlencode(params)

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "AuroraTunes/1.0 (Desktop App)"},
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))
