import type { Track } from "./types"

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:5000"

function normalizeTrack(entry: Record<string, any>): Track {
  return {
    id: String(entry.id ?? ""),
    title: entry.title ?? "Unknown title",
    duration: entry.duration ?? "0:00",
    thumbnail: entry.thumbnail ?? "https://via.placeholder.com/500",
    channel: entry.channel ?? "Unknown artist",
    source: entry.source ?? "soundcloud",
  }
}

export async function searchTracks(query: string, source: string = "all"): Promise<Track[]> {
  const params = new URLSearchParams({ q: query, source })
  const response = await fetch(`${BACKEND_BASE_URL}/search?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.statusText}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error("Unexpected search response format")
  }

  return data.map(normalizeTrack)
}

export async function getStreamUrl(track: Track): Promise<string> {
  const params = new URLSearchParams({ id: track.id, source: track.source ?? "soundcloud" })
  const response = await fetch(`${BACKEND_BASE_URL}/stream?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = body?.error ?? response.statusText
    throw new Error(`Не вдалося отримати потік: ${message}`)
  }

  const data = await response.json()
  if (!data || typeof data?.stream_url !== "string") {
    throw new Error("Invalid stream response")
  }

  return data.stream_url
}

export async function savePlayerState(userId: string, state: any): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/player/state?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  })

  if (!response.ok) {
    throw new Error(`Failed to save player state: ${response.statusText}`)
  }
}

export async function loadPlayerState(userId: string): Promise<any> {
  const response = await fetch(`${BACKEND_BASE_URL}/player/state?user_id=${userId}`)

  if (!response.ok) {
    throw new Error(`Failed to load player state: ${response.statusText}`)
  }

  return response.json()
}

export async function addToListeningHistory(userId: string, track: Track, playedDuration: number): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/player/history?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ track, playedDuration }),
  })

  if (!response.ok) {
    throw new Error(`Failed to add to history: ${response.statusText}`)
  }
}

export async function getListeningHistory(userId: string): Promise<any[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/player/history?user_id=${userId}`)

  if (!response.ok) {
    throw new Error(`Failed to get history: ${response.statusText}`)
  }

  return response.json()
}
