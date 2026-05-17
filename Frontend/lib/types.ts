export interface Track {
  id: string
  title: string
  duration: string
  thumbnail: string
  channel: string
  source?: "youtube" | "soundcloud" | string
}

export interface User {
  id: string
  username: string
  email: string
  avatar: string | null
  createdAt: string
  customBackgrounds: string[]
}

export interface AuthResponse {
  user: User
  token: string
}

export interface CustomBackground {
  id: string
  userId: string
  imageUrl: string
  createdAt: string
}

export interface ListeningHistoryItem {
  track: Track
  playedAt: string
  playedDuration: number
}

export interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  volume: number
  streamUrl: string
}
