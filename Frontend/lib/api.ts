import type { AuthResponse, CustomBackground, Track, User } from "./types"
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

async function readJsonError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null)
  return new Error(body?.error || fallback)
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

export interface SearchTracksPage {
  tracks: Track[]
  nextCursor: string | null
}

export async function searchTracksPage(
  query: string,
  source: string = "youtube",
  cursor?: string,
): Promise<SearchTracksPage> {
  const params = new URLSearchParams({ q: query, source })
  if (cursor) params.set("cursor", cursor)

  const response = await apiFetch(`/search?${params.toString()}`)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Search failed")
  }

  const data = await response.json()

  if (Array.isArray(data)) {
    return {
      tracks: data.map(normalizeTrack),
      nextCursor: null,
    }
  }

  const tracks = Array.isArray(data?.tracks) ? data.tracks.map(normalizeTrack) : []
  return {
    tracks,
    nextCursor: data?.nextCursor ?? null,
  }
}

export async function searchTracks(query: string, source: string = "all"): Promise<Track[]> {
  const page = await searchTracksPage(query, source)
  return page.tracks
}

export function getAudioPlaybackUrl(track: Track): string {
  const source = track.source || "youtube"
  const id = encodeURIComponent(track.id)
  return apiUrl(`/audio/${source}/${id}`)
}

export async function getStreamUrl(track: Track): Promise<string> {
  if (!track?.id) {
    throw new Error("ID треку відсутній")
  }

  return getAudioPlaybackUrl({ ...track, source: track.source || "youtube" })
}

export async function registerUser(username: string, email: string, password: string): Promise<AuthResponse> {
  const response = await apiFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  })

  if (!response.ok) {
    throw await readJsonError(response, "Registration failed")
  }

  return response.json()
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw await readJsonError(response, "Login failed")
  }

  return response.json()
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiFetch("/auth/me", {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await readJsonError(response, "Failed to load current user")
  }

  const data = await response.json()
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
    throw await readJsonError(response, "Failed to update user")
  }

  const data = await response.json()
  return data.user
}

export async function logoutUser(): Promise<void> {
  await apiFetch("/auth/logout", {
    method: "POST",
    headers: authHeaders(),
  }).catch(() => undefined)
}

export async function getBackgrounds(): Promise<CustomBackground[]> {
  const response = await apiFetch("/backgrounds", {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await readJsonError(response, "Failed to load backgrounds")
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
    throw await readJsonError(response, "Failed to save background")
  }

  return response.json()
}

export async function deleteBackground(backgroundId: string): Promise<void> {
  const response = await apiFetch(`/backgrounds/${backgroundId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await readJsonError(response, "Failed to delete background")
  }
}

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

export async function addToListeningHistory(userId: string, track: Track, playedDuration: number): Promise<void> {
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

export async function getRandomTracks(limit = 14): Promise<Track[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const response = await apiFetch(`/random?${params.toString()}`)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Failed to get random tracks")
  }

  const data = await response.json()
  return Array.isArray(data) ? data.map(normalizeTrack) : []
}
