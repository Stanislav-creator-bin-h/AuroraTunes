"use client"

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react"
import {
  getStreamUrl,
  savePlayerState as savePlayerStateApi,
  addToListeningHistory,
  loadPlayerState as loadPlayerStateApi,
  getListeningHistory,
} from "./api"
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

function savePlayerStateToStorage(state: Partial<PlayerState>) {
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

  useEffect(() => {
    let cancelled = false

    async function restoreState() {
      try {
        const localState = loadPlayerStateFromStorage()
        const sourceState = user
          ? await loadPlayerStateApi(user.id).catch(() => localState)
          : localState

        if (cancelled || !sourceState) return

        if (typeof sourceState.volume === "number") {
          setVolumeState(sourceState.volume)
        }
        if (typeof sourceState.currentTime === "number") {
          setCurrentTime(sourceState.currentTime)
        }
        if (Array.isArray(sourceState.playlist)) {
          setPlaylistState(sourceState.playlist)
        }
        if (sourceState.currentTrack) {
          setCurrentTrackState(sourceState.currentTrack)
        }
        if (Array.isArray(sourceState.listeningHistory)) {
          setListeningHistory(sourceState.listeningHistory)
        }

        if (user) {
          const remoteHistory = await getListeningHistory(user.id).catch(() => null)
          if (!cancelled && Array.isArray(remoteHistory) && remoteHistory.length > 0) {
            setListeningHistory(remoteHistory)
          }
        }
      } catch (error) {
        console.error("Failed to restore player state:", error)
      }
    }

    restoreState()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const debouncedSave = useCallback((state: Partial<PlayerState>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(async () => {
      const payload = {
        currentTrack,
        currentTime,
        volume,
        playlist,
        listeningHistory,
        ...state,
      }

      try {
        if (user) {
          await savePlayerStateApi(user.id, payload)
        }
      } catch (error) {
        console.error("Failed to save player state to backend:", error)
      } finally {
        savePlayerStateToStorage(payload)
      }
    }, 500)
  }, [currentTrack, currentTime, volume, playlist, listeningHistory, user])

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
      playedDuration,
    }

    setListeningHistory((prev) => {
      const newHistory = [historyItem, ...prev.filter((item) => item.track.id !== track.id)].slice(0, 100)
      debouncedSave({ listeningHistory: newHistory })
      return newHistory
    })

    if (user) {
      try {
        await addToListeningHistory(user.id, track, playedDuration)
      } catch (error) {
        console.error("Failed to save history to backend:", error)
      }
    }
  }, [debouncedSave, user])

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return

    if (isPlaying) {
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current
        } catch {
        }
        playPromiseRef.current = null
      }

      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    try {
      playPromiseRef.current = audioRef.current.play()
      await playPromiseRef.current
      setIsPlaying(true)
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Playback error:", error)
      }
    } finally {
      playPromiseRef.current = null
    }
  }, [isPlaying])

  const clearHistory = useCallback(() => {
    setListeningHistory([])
    debouncedSave({ listeningHistory: [] })
  }, [debouncedSave])

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return

    const current = audioRef.current.currentTime
    const nextDuration = audioRef.current.duration || 0

    setCurrentTime(current)
    setDuration(nextDuration)
    setProgress(nextDuration ? current / nextDuration : 0)

    if (Math.floor(current) % 5 === 0 && current > 0) {
      debouncedSave({ currentTime: current })
    }
  }, [debouncedSave])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      if (currentTime > 0) {
        audioRef.current.currentTime = currentTime
      }
    }
  }, [currentTime])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    if (currentTrack && duration > 10) {
      addToHistory(currentTrack, duration)
    }
  }, [addToHistory, currentTrack, duration])

  const setVolume = useCallback((nextVolume: number) => {
    setVolumeState(nextVolume)
    if (audioRef.current) {
      audioRef.current.volume = nextVolume
    }
    debouncedSave({ volume: nextVolume })
  }, [debouncedSave])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
    setCurrentTime(time)
    debouncedSave({ currentTime: time })
  }, [debouncedSave])

  const playTrack = useCallback(async (track: Track) => {
    if (playPromiseRef.current && audioRef.current) {
      try {
        await playPromiseRef.current
      } catch {
      }
      audioRef.current.pause()
      playPromiseRef.current = null
    }

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
  }, [addToHistory, currentTime, currentTrack, setCurrentTrack])

  const nextTrack = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return
    const currentIndex = playlist.findIndex((track) => track.id === currentTrack.id)
    const nextIndex = (currentIndex + 1) % playlist.length
    playTrack(playlist[nextIndex])
  }, [currentTrack, playlist, playTrack])

  const prevTrack = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return
    const currentIndex = playlist.findIndex((track) => track.id === currentTrack.id)
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
