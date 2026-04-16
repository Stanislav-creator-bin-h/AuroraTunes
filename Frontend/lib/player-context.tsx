"use client"

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react"
import { getStreamUrl, savePlayerState as savePlayerStateApi, addToListeningHistory } from "./api"
import { useAuth } from "./auth-context"
import type { Track } from "./types"

interface ListeningHistoryItem {
  track: Track
  playedAt: string
  playedDuration: number
}

interface PlayerState {
  currentTrack: Track | null
  currentTime: number
  volume: number
  playlist: Track[]
  listeningHistory: ListeningHistoryItem[]
}

interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  volume: number
  currentTime: number
  duration: number
  playlist: Track[]
  listeningHistory: ListeningHistoryItem[]
  setCurrentTrack: (track: Track | null) => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  seek: (time: number) => void
  playTrack: (track: Track) => void
  setPlaylist: (tracks: Track[]) => void
  nextTrack: () => void
  prevTrack: () => void
  audioRef: React.RefObject<HTMLAudioElement | null>
  clearHistory: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

const PLAYER_STATE_KEY = "aurora_player_state"

function savePlayerState(state: Partial<PlayerState>) {
  try {
    const existing = JSON.parse(localStorage.getItem(PLAYER_STATE_KEY) || "{}")
    const updated = { ...existing, ...state, lastSaved: Date.now() }
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to save player state:", error)
  }
}

function loadPlayerStateFromStorage(): Partial<PlayerState> {
  try {
    const stored = localStorage.getItem(PLAYER_STATE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error("Failed to load player state:", error)
    return {}
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playlist, setPlaylistState] = useState<Track[]>([])
  const [listeningHistory, setListeningHistory] = useState<ListeningHistoryItem[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playPromiseRef = useRef<Promise<void> | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      // Wait for any pending play promise before pausing
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current
        } catch {
          // Ignore errors from interrupted play
        }
        playPromiseRef.current = null
      }
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      try {
        playPromiseRef.current = audioRef.current.play()
        await playPromiseRef.current
        setIsPlaying(true)
      } catch (error) {
        // Ignore AbortError - it's expected when play is interrupted
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Playback error:', error)
        }
      } finally {
        playPromiseRef.current = null
      }
    }
  }, [isPlaying])

  // Debounced save function
  const debouncedSave = useCallback(async (state: Partial<PlayerState>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (user) {
          // Save to backend
          await savePlayerStateApi(user.id, {
            currentTrack,
            currentTime,
            volume,
            playlist,
            listeningHistory,
            ...state
          })
        } else {
          // Save to localStorage
          savePlayerState({
            currentTrack,
            currentTime,
            volume,
            playlist,
            listeningHistory,
            ...state
          })
        }
      } catch (error) {
        console.error("Failed to save player state:", error)
        // Fallback to localStorage
        savePlayerState({
          currentTrack,
          currentTime,
          volume,
          playlist,
          listeningHistory,
          ...state
        })
      }
    }, 1000) // Save after 1 second of inactivity
  }, [user, currentTrack, currentTime, volume, playlist, listeningHistory])

  const setCurrentTrack = useCallback((track: Track | null) => {
    setCurrentTrackState(track)
    debouncedSave({ currentTrack: track })
  }, [debouncedSave])

  const setPlaylist = useCallback((tracks: Track[]) => {
    setPlaylistState(tracks)
    debouncedSave({ playlist: tracks })
  }, [debouncedSave])

  const addToHistory = useCallback(async (track: Track, playedDuration: number) => {
    const historyItem: ListeningHistoryItem = {
      track,
      playedAt: new Date().toISOString(),
      playedDuration
    }

    setListeningHistory(prev => {
      const newHistory = [historyItem, ...prev.filter(item => item.track.id !== track.id)].slice(0, 100)
      debouncedSave({ listeningHistory: newHistory })
      return newHistory
    })

    // Also save to backend if user is logged in
    if (user) {
      try {
        await addToListeningHistory(user.id, track, playedDuration)
      } catch (error) {
        console.error("Failed to save to backend history:", error)
      }
    }
  }, [debouncedSave, user])

  const clearHistory = useCallback(() => {
    setListeningHistory([])
    savePlayerState({ listeningHistory: [] })
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime
      const dur = audioRef.current.duration || 0
      setCurrentTime(current)
      setDuration(dur)
      setProgress(dur ? current / dur : 0)

      // Save current time every 5 seconds
      if (Math.floor(current) % 5 === 0 && current > 0) {
        debouncedSave({ currentTime: current })
      }
    }
  }, [debouncedSave])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    // Add to history when track ends
    if (currentTrack && duration > 10) {
      addToHistory(currentTrack, duration)
    }
  }, [currentTrack, duration, addToHistory])

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
    debouncedSave({ volume: vol })
  }, [debouncedSave])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
    setCurrentTime(time)
    debouncedSave({ currentTime: time })
  }, [debouncedSave])

  const playTrack = useCallback(async (track: Track) => {
    // Cancel any pending play operation
    if (playPromiseRef.current && audioRef.current) {
      try {
        await playPromiseRef.current
      } catch {
        // Ignore
      }
      audioRef.current.pause()
      playPromiseRef.current = null
    }

    // Add previous track to history if it was playing for more than 10 seconds
    if (currentTrack && currentTime > 10) {
      addToHistory(currentTrack, currentTime)
    }

    setCurrentTrack(track)
    setIsPlaying(true)

    if (!audioRef.current) {
      return
    }

    try {
      const streamUrl = await getStreamUrl(track)
      audioRef.current.src = streamUrl
      audioRef.current.load()
      playPromiseRef.current = audioRef.current.play()
      await playPromiseRef.current
      setIsPlaying(true)
    } catch (error) {
      console.error("Failed to play track:", error)
      setIsPlaying(false)
    } finally {
      playPromiseRef.current = null
    }
  }, [currentTrack, currentTime, addToHistory, setCurrentTrack])

  const nextTrack = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id)
    const nextIndex = (currentIndex + 1) % playlist.length
    playTrack(playlist[nextIndex])
  }, [currentTrack, playlist, playTrack])

  const prevTrack = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id)
    const prevIndex = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1
    playTrack(playlist[prevIndex])
  }, [currentTrack, playlist, playTrack])

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        volume,
        currentTime,
        duration,
        playlist,
        listeningHistory,
        setCurrentTrack,
        togglePlay,
        setVolume,
        seek,
        playTrack,
        setPlaylist,
        nextTrack,
        prevTrack,
        audioRef,
        clearHistory,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider")
  }
  return context
}
