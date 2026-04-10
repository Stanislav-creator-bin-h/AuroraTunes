export interface Track {
  id: string
  title: string
  duration: string
  thumbnail: string
  channel: string
  source?: "youtube" | "soundcloud" | string
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
