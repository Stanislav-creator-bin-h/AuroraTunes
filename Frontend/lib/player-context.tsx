"use client"

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react"
import {
  getStreamUrl,
  savePlayerState as savePlayerStateApi,
  addToListeningHistory,
  loadPlayerState as loadPlayerStateApi,
  getListeningHistory,
  clearListeningHistory,
} from "./api"
import { useAuth } from "./auth-context"
import { isTrackLiked, loadLikedTracks, toggleLikedTrack } from "./liked-tracks"
import type { Track } from "./types"

export type PlayMode = "normal" | "radio"

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
  isShuffle?: boolean
  isRepeat?: boolean
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
  likedTracks: Track[]
  playMode: PlayMode
  setPlayMode: (mode: PlayMode) => void
  setCurrentTrack: (track: Track | null) => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  seek: (time: number) => void
  playTrack: (track: Track, options?: { playlist?: Track[]; mode?: PlayMode }) => void
  setPlaylist: (tracks: Track[]) => void
  nextTrack: () => void
  prevTrack: () => void
  audioRef: React.RefObject<HTMLAudioElement | null>
  clearHistory: () => void
  isShuffle: boolean
  isRepeat: boolean
  toggleShuffle: () => void
  toggleRepeat: () => void
  toggleLike: (track: Track) => void
  isLiked: (track: Track) => boolean
}

const PlayerContext = createContext<PlayerContextType | null>(null)
const PLAYER_STATE_KEY = "aurora_player_state"

function trackKey(track: Track): string {
  return `${track.source ?? "unknown"}:${track.id}`
}

function pickRandomIndex(playlist: Track[], currentId?: string): number {
  if (playlist.length <= 1) return 0
  const others = playlist
    .map((_, index) => index)
    .filter((index) => playlist[index].id !== currentId)
  if (!others.length) return 0
  return others[Math.floor(Math.random() * others.length)]
}

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
  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  const [playMode, setPlayModeState] = useState<PlayMode>("normal")
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playPromiseRef = useRef<Promise<void> | null>(null)
  const playGenerationRef = useRef(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLikedTracks(loadLikedTracks())
  }, [])

  useEffect(() => {
    let cancelled = false

    async function restoreState() {
      try {
        const localState = loadPlayerStateFromStorage()
        const sourceState = user
          ? await loadPlayerStateApi(user.id).catch(() => localState)
          : localState

        if (cancelled || !sourceState) return

        if (typeof sourceState.volume === "number") setVolumeState(sourceState.volume)
        if (typeof sourceState.currentTime === "number") setCurrentTime(sourceState.currentTime)
        if (Array.isArray(sourceState.playlist)) setPlaylistState(sourceState.playlist)
        if (sourceState.currentTrack) setCurrentTrackState(sourceState.currentTrack)
        if (Array.isArray(sourceState.listeningHistory)) setListeningHistory(sourceState.listeningHistory)
        if (typeof sourceState.isShuffle === "boolean") setIsShuffle(sourceState.isShuffle)
        if (typeof sourceState.isRepeat === "boolean") setIsRepeat(sourceState.isRepeat)

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
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
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
        isShuffle,
        isRepeat,
        ...state,
      }
      try {
        if (user) await savePlayerStateApi(user.id, payload)
      } catch (error) {
        console.error("Failed to save player state to backend:", error)
      } finally {
        savePlayerStateToStorage(payload)
      }
    }, 500)
  }, [currentTrack, currentTime, volume, playlist, listeningHistory, isShuffle, isRepeat, user])

  const setCurrentTrack = useCallback((track: Track | null) => {
    setCurrentTrackState(track)
    debouncedSave({ currentTrack: track })
  }, [debouncedSave])

  const setPlaylist = useCallback((tracks: Track[]) => {
    setPlaylistState(tracks)
    debouncedSave({ playlist: tracks })
  }, [debouncedSave])

  const setPlayMode = useCallback((mode: PlayMode) => {
    setPlayModeState(mode)
    if (mode === "radio") setIsShuffle(true)
  }, [])

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

  const safePause = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    const pending = playPromiseRef.current
    playPromiseRef.current = null
    if (pending) {
      try {
        await pending
      } catch {
        // AbortError is expected when interrupting play()
      }
    }
    audio.pause()
    setIsPlaying(false)
  }, [])

  const loadTrackAudio = useCallback(async (track: Track, autoplay = true) => {
    const audio = audioRef.current
    if (!audio) return false

    const generation = ++playGenerationRef.current
    await safePause()

    const streamUrl = await getStreamUrl(track)
    if (generation !== playGenerationRef.current) return false

    audio.src = streamUrl
    audio.load()

    if (!autoplay) return true

    try {
      const promise = audio.play()
      playPromiseRef.current = promise
      await promise
      if (generation !== playGenerationRef.current) return false
      setIsPlaying(true)
      return true
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return false
      throw error
    } finally {
      if (playPromiseRef.current) playPromiseRef.current = null
    }
  }, [safePause])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      await safePause()
      return
    }

    if (currentTrack && (!audio.src || audio.error)) {
      try {
        await loadTrackAudio(currentTrack)
      } catch (error) {
        console.error("Failed to reload track:", error)
        import("sonner").then((mod) => mod.toast.error("Не вдалося завантажити аудіопотік."))
      }
      return
    }

    try {
      const promise = audio.play()
      playPromiseRef.current = promise
      await promise
      setIsPlaying(true)
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        import("sonner").then((mod) =>
          mod.toast.error("Помилка відтворення. Трек недоступний або формат не підтримується.")
        )
      }
    } finally {
      playPromiseRef.current = null
    }
  }, [currentTrack, isPlaying, loadTrackAudio, safePause])

  const clearHistory = useCallback(() => {
    setListeningHistory([])
    debouncedSave({ listeningHistory: [] })
    if (user) {
      clearListeningHistory().catch((error) => console.error("Failed to clear history:", error))
    }
  }, [debouncedSave, user])

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
    }
  }, [])

  const setVolume = useCallback((nextVolume: number) => {
    setVolumeState(nextVolume)
    if (audioRef.current) audioRef.current.volume = nextVolume
    debouncedSave({ volume: nextVolume })
  }, [debouncedSave])

  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time
    setCurrentTime(time)
    debouncedSave({ currentTime: time })
  }, [debouncedSave])

  const playTrack = useCallback(async (
    track: Track,
    options?: { playlist?: Track[]; mode?: PlayMode },
  ) => {
    if (options?.playlist?.length) setPlaylist(options.playlist)
    if (options?.mode) setPlayMode(options.mode)

    if (currentTrack && currentTime > 10) {
      addToHistory(currentTrack, currentTime)
    }

    setCurrentTrack(track)

    try {
      await loadTrackAudio(track)
    } catch (error) {
      console.error("Failed to play track:", error)
      setIsPlaying(false)
      import("sonner").then((mod) =>
        mod.toast.error("Не вдалося завантажити аудіопотік. Перевірте, чи запущений backend.")
      )
    }
  }, [addToHistory, currentTime, currentTrack, loadTrackAudio, setCurrentTrack, setPlayMode, setPlaylist])

  const resolveNextIndex = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return -1
    if (playMode === "radio" || isShuffle) {
      return pickRandomIndex(playlist, currentTrack.id)
    }
    const currentIndex = playlist.findIndex((t) => trackKey(t) === trackKey(currentTrack))
    return currentIndex < 0 ? 0 : (currentIndex + 1) % playlist.length
  }, [currentTrack, isShuffle, playMode, playlist])

  const nextTrack = useCallback(() => {
    const nextIndex = resolveNextIndex()
    if (nextIndex < 0 || !playlist[nextIndex]) return
    playTrack(playlist[nextIndex])
  }, [playTrack, playlist, resolveNextIndex])

  const prevTrack = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return
    let prevIndex = 0
    if (playMode === "radio" || isShuffle) {
      prevIndex = pickRandomIndex(playlist, currentTrack.id)
    } else {
      const currentIndex = playlist.findIndex((t) => trackKey(t) === trackKey(currentTrack))
      prevIndex = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1
    }
    playTrack(playlist[prevIndex])
  }, [currentTrack, playMode, isShuffle, playlist, playTrack])

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextVal = !prev
      debouncedSave({ isShuffle: nextVal })
      return nextVal
    })
  }, [debouncedSave])

  const toggleRepeat = useCallback(() => {
    setIsRepeat((prev) => {
      const nextVal = !prev
      debouncedSave({ isRepeat: nextVal })
      return nextVal
    })
  }, [debouncedSave])

  const toggleLike = useCallback((track: Track) => {
    setLikedTracks((prev) => toggleLikedTrack(prev, track))
  }, [])

  const isLiked = useCallback((track: Track) => isTrackLiked(likedTracks, track), [likedTracks])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    if (currentTrack && duration > 10) {
      addToHistory(currentTrack, duration)
    }
    if (isRepeat && currentTrack && playMode !== "radio") {
      playTrack(currentTrack)
    } else {
      nextTrack()
    }
  }, [addToHistory, currentTrack, duration, isRepeat, nextTrack, playMode, playTrack])

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
        likedTracks,
        playMode,
        setPlayMode,
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
        isShuffle,
        isRepeat,
        toggleShuffle,
        toggleRepeat,
        toggleLike,
        isLiked,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => {
          setIsPlaying(false)
          import("sonner").then((mod) =>
            mod.toast.error("Помилка відтворення. Спробуйте інший трек.")
          )
        }}
      />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error("usePlayer must be used within PlayerProvider")
  return context
}
