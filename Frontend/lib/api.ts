import type { AuthResponse, CustomBackground, Track, User } from "./types"

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:5000"
const AUTH_TOKEN_KEY = "aurora_auth_token"

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

export async function searchTracks(query: string, source: string = "all"): Promise<Track[]> {
  const params = new URLSearchParams({ q: query, source })
  const response = await fetch(`${BACKEND_BASE_URL}/search?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Search failed")
  }

  const data = await response.json()
  return Array.isArray(data) ? data.map(normalizeTrack) : []
}

export async function getStreamUrl(track: Track): Promise<string> {
  const response = await fetch(`${BACKEND_BASE_URL}/stream/${track.source}/${track.id}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Не вдалося отримати посилання на потік")
  }

  const data = await response.json()
  return data.stream_url
}

export async function registerUser(username: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/auth/register`, {
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
  const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
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
  const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
    headers: authHeaders(),
    cache: "no-store",
  })

  if (!response.ok) {
    throw await readJsonError(response, "Failed to load current user")
  }

  const data = await response.json()
  return data.user
}

export async function updateCurrentUser(payload: { avatarUrl?: string | null }): Promise<User> {
  const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
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
  await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: authHeaders(),
  }).catch(() => undefined)
}

export async function getBackgrounds(): Promise<CustomBackground[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/backgrounds`, {
    headers: authHeaders(),
    cache: "no-store",
  })

  if (!response.ok) {
    throw await readJsonError(response, "Failed to load backgrounds")
  }

  return response.json()
}

export async function createBackground(imageUrl: string): Promise<CustomBackground> {
  const response = await fetch(`${BACKEND_BASE_URL}/backgrounds`, {
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
  const response = await fetch(`${BACKEND_BASE_URL}/backgrounds/${backgroundId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw await readJsonError(response, "Failed to delete background")
  }
}

export async function savePlayerState(userId: string, state: any): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/player/state`, {
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
  const response = await fetch(`${BACKEND_BASE_URL}/player/state`, {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to load player state: ${response.statusText}`)
  }

  return response.json()
}

export async function addToListeningHistory(userId: string, track: Track, playedDuration: number): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/player/history`, {
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
  const response = await fetch(`${BACKEND_BASE_URL}/player/history`, {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to get history: ${response.statusText}`)
  }

  return response.json()
}

export async function clearListeningHistory(): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/player/history`, {
    method: "DELETE",
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to clear history: ${response.statusText}`)
  }
}

export async function getRandomTracks(): Promise<Track[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/random`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Failed to get random tracks")
  }

  const data = await response.json()
  return Array.isArray(data) ? data.map(normalizeTrack) : []
}
