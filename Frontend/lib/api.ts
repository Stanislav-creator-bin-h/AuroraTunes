import type { AuthResponse, CustomBackground, Playlist, Track, User } from "./types"
import { getBackendBaseUrl, getBackendUnreachableMessage } from "./backend-url"

const AUTH_TOKEN_KEY = "aurora_auth_token"

function apiUrl(path: string): string {
  const base = getBackendBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(path), {
      cache: "no-store",
      ...init,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(getBackendUnreachableMessage())
    }
    throw error
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function safeJson(response: Response) {
  const text = await response.text().catch(() => "")
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const data = await safeJson(response)
  const message =
    data?.message ||
    data?.error ||
    data?.detail ||
    fallback

  return new Error(`${message} (HTTP ${response.status})`)
}

// -------------------- TYPES --------------------

export interface SearchTracksPage {
  tracks: Track[]
  nextCursor: string | null
}

function normalizeTrack(entry: any): Track {
  return {
    id: String(entry.id ?? ""),
    title: entry.title ?? "Unknown title",
    duration: entry.duration ?? "0:00",
    thumbnail: entry.thumbnail ?? "https://via.placeholder.com/500",
    channel: entry.channel ?? "Unknown artist",
    source: entry.source ?? "youtube",
  }
}

// -------------------- SEARCH --------------------

export async function searchTracksPage(
  query: string,
  source: string = "youtube",
  cursor?: string,
): Promise<SearchTracksPage> {
  const params = new URLSearchParams({ q: query, source })
  if (cursor) params.set("cursor", cursor)

  const response = await apiFetch(`/search?${params.toString()}`)

  if (!response.ok) {
    const body = await safeJson(response)
    throw new Error(body?.error || "Search failed")
  }

  const data = await safeJson(response)

  if (Array.isArray(data)) {
    return {
      tracks: data.map(normalizeTrack),
      nextCursor: null,
    }
  }

  return {
    tracks: Array.isArray(data?.tracks)
      ? data.tracks.map(normalizeTrack)
      : [],
    nextCursor: data?.nextCursor ?? null,
  }
}

export async function searchTracks(query: string, source: string = "all"): Promise<Track[]> {
  const page = await searchTracksPage(query, source)
  return page.tracks
}

// -------------------- AUDIO --------------------

export function getAudioPlaybackUrl(track: Track): string {
  const source = track.source || "youtube"
  const id = encodeURIComponent(track.id)
  return apiUrl(`/audio/${source}/${id}`)
}

export async function assertAudioPlaybackAvailable(track: Track): Promise<string> {
  const url = getAudioPlaybackUrl(track)
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Range: "bytes=0-1" },
  })

  if (!response.ok) {
    const data = await safeJson(response)
    throw new Error(data?.error || `Audio stream unavailable (HTTP ${response.status})`)
  }

  const contentType = response.headers.get("Content-Type") || ""
  if (contentType && !contentType.toLowerCase().startsWith("audio/")) {
    throw new Error(`Unsupported audio response: ${contentType}`)
  }

  // Cache the URL for 24 hours
  const cacheKey = `stream_url:${track.source}:${track.id}`
  const expiry = Date.now() + 24 * 60 * 60 * 1000
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ url, expiry }))
  } catch (e) {
    // Storage might be full, just continue
    console.warn("Failed to cache stream URL:", e)
  }

  return url
}

export async function getStreamUrl(track: Track): Promise<string> {
  if (!track?.id) {
    throw new Error("ID треку відсутній")
  }

  // Check client-side cache first (faster than network)
  const cacheKey = `stream_url:${track.source}:${track.id}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      const { url, expiry } = JSON.parse(cached)
      if (expiry > Date.now()) {
        return url
      }
      localStorage.removeItem(cacheKey)
    } catch (e) {
      localStorage.removeItem(cacheKey)
    }
  }

  return assertAudioPlaybackAvailable(track)
}

// -------------------- AUTH --------------------

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  })

  if (!response.ok) {
    throw await readError(response, "Registration failed")
  }

  return response.json()
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw await readError(response, "Login failed")
  }

  return response.json()
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiFetch("/auth/me", {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await readError(response, "Failed to load current user")
  }

  const data = await safeJson(response)
  return data.user
}

export async function updateCurrentUser(payload: { avatarUrl?: string | null }): Promise<User> {
  const response = await apiFetch("/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw await readError(response, "Failed to update user")
  }

  const data = await safeJson(response)
  return data.user
}

export async function logoutUser(): Promise<void> {
  await apiFetch("/auth/logout", {
    method: "POST",
    headers: authHeaders(),
  }).catch(() => undefined)
}

// -------------------- BACKGROUNDS --------------------

export async function getBackgrounds(): Promise<CustomBackground[]> {
  const response = await apiFetch("/backgrounds", {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await readError(response, "Failed to load backgrounds")
  }

  return response.json()
}

export async function createBackground(imageUrl: string): Promise<CustomBackground> {
  const response = await apiFetch("/backgrounds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ imageUrl }),
  })

  if (!response.ok) {
    throw await readError(response, "Failed to save background")
  }

  return response.json()
}

export async function deleteBackground(backgroundId: string): Promise<void> {
  const response = await apiFetch(`/backgrounds/${backgroundId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await readError(response, "Failed to delete background")
  }
}

// -------------------- PLAYER --------------------

export async function savePlayerState(userId: string, state: any): Promise<void> {
  const response = await apiFetch("/player/state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(state),
  })

  if (!response.ok) {
    throw new Error(`Failed to save player state: ${response.statusText}`)
  }
}

export async function loadPlayerState(userId: string): Promise<any> {
  const response = await apiFetch("/player/state", {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to load player state: ${response.statusText}`)
  }

  return response.json()
}

// -------------------- HISTORY --------------------

export async function addToListeningHistory(
  userId: string,
  track: Track,
  playedDuration: number
): Promise<void> {
  const response = await apiFetch("/player/history", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ track, playedDuration }),
  })

  if (!response.ok) {
    throw new Error(`Failed to add to history: ${response.statusText}`)
  }
}

export async function getListeningHistory(userId: string): Promise<any[]> {
  const response = await apiFetch("/player/history", {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to get history: ${response.statusText}`)
  }

  return response.json()
}

export async function clearListeningHistory(): Promise<void> {
  const response = await apiFetch("/player/history", {
    method: "DELETE",
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to clear history: ${response.statusText}`)
  }
}

// -------------------- RANDOM --------------------

export async function getRandomTracks(limit = 14): Promise<Track[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const response = await apiFetch(`/random?${params.toString()}`)

  if (!response.ok) {
    const body = await safeJson(response)
    throw new Error(body?.error || "Failed to get random tracks")
  }

  const data = await safeJson(response)
  return Array.isArray(data) ? data.map(normalizeTrack) : []
}

// -------------------- PLAYLISTS --------------------

export async function getPlaylists(): Promise<Playlist[]> {
  const response = await apiFetch("/playlists", { headers: authHeaders() })
  if (!response.ok) throw await readError(response, "Failed to load playlists")
  return response.json()
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const response = await apiFetch("/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw await readError(response, "Failed to create playlist")
  return response.json()
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const response = await apiFetch(`/playlists/${playlistId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!response.ok) throw await readError(response, "Failed to delete playlist")
}

export async function addTrackToPlaylist(playlistId: string, track: Track): Promise<Playlist> {
  const response = await apiFetch(`/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(track),
  })
  if (!response.ok) throw await readError(response, "Failed to add track to playlist")
  return response.json()
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  source: string,
  trackId: string,
): Promise<Playlist> {
  const response = await apiFetch(`/playlists/${playlistId}/tracks/${source}/${trackId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!response.ok) throw await readError(response, "Failed to remove track from playlist")
  return response.json()
}

export async function syncLikedTrack(
  track: Track,
  action: "add" | "remove",
): Promise<Playlist> {
  const response = await apiFetch("/playlists/liked/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ...track, action }),
  })
  if (!response.ok) throw await readError(response, "Failed to sync liked track")
  return response.json()
}

export interface GeneratedAiPlaylist {
  name: string
  description: string
  tracks: (Track & { aiReason?: string })[]
  warning?: string
}

export async function generateAiPlaylist(prompt: string, source: string = "all"): Promise<GeneratedAiPlaylist> {
  const response = await apiFetch("/ai/generate-playlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ prompt, source }),
  })

  if (!response.ok) {
    throw await readError(response, "Не вдалося згенерувати плейлист")
  }

  return response.json()
}

export async function createPlaylistWithTracks(name: string, tracks: Track[]): Promise<Playlist> {
  const response = await apiFetch("/playlists/create-with-tracks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ name, tracks }),
  })

  if (!response.ok) {
    throw await readError(response, "Не вдалося зберегти плейлист")
  }

  return response.json()
}