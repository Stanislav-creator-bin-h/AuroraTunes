import type { Track } from "./types"

const LIKED_KEY = "aurora_liked_tracks"

function trackKey(track: Track): string {
  return `${track.source ?? "unknown"}:${track.id}`
}

export function loadLikedTracks(): Track[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LIKED_KEY)
    return raw ? (JSON.parse(raw) as Track[]) : []
  } catch {
    return []
  }
}

export function saveLikedTracks(tracks: Track[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(LIKED_KEY, JSON.stringify(tracks))
}

export function isTrackLiked(tracks: Track[], track: Track): boolean {
  const key = trackKey(track)
  return tracks.some((item) => trackKey(item) === key)
}

export function toggleLikedTrack(tracks: Track[], track: Track): Track[] {
  if (isTrackLiked(tracks, track)) {
    const key = trackKey(track)
    const next = tracks.filter((item) => trackKey(item) !== key)
    saveLikedTracks(next)
    return next
  }
  const next = [track, ...tracks]
  saveLikedTracks(next)
  return next
}
