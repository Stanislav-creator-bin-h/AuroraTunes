"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { SearchBar } from "./search-bar"
import { TrackList } from "./track-list"
import { SettingsPanel } from "./settings-panel"
import { AuthPanel } from "./auth-panel"
import { getRandomTracks } from "@/lib/api"
import { usePlayer } from "@/lib/player-context"
import type { Track, ListeningHistoryItem } from "../../lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { SkipBack, Play, Pause, SkipForward, Repeat, Shuffle, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

interface MainContentProps { activeTab: string }

function getHighResThumbnail(url?: string): string {
  if (!url) return "https://via.placeholder.com/150"
  if (url.includes("ytimg.com")) return url.replace("default.jpg", "hqdefault.jpg").replace("mqdefault.jpg", "hqdefault.jpg")
  if (url.includes("sndcdn.com")) return url.replace("-large.jpg", "-t500x500.jpg").replace("-small.jpg", "-t500x500.jpg")
  return url
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
}

const PAGE = "h-full min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white/[0.02] to-transparent px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"

export function MainContent({ activeTab }: MainContentProps) {
  const {
    currentTrack, isPlaying, progress, duration, volume, currentTime,
    listeningHistory, togglePlay, nextTrack, prevTrack, setVolume
  } = usePlayer()

  const [searchQuery, setSearchQuery] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const cache = useRef<Record<string, Track[]>>({})

  const handleSearch = useCallback((q: string) => setSearchQuery(q), [])

  useEffect(() => {
    if (!searchQuery.trim()) { setTracks([]); setError(""); return }
    if (cache.current[searchQuery]) { setTracks(cache.current[searchQuery]); return }
    let cancelled = false
    setIsLoading(true)
    import("@/lib/api").then(({ searchTracks }) =>
      searchTracks(searchQuery)
        .then(data => { if (!cancelled) { cache.current[searchQuery] = data; setTracks(data) } })
        .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Помилка пошуку") })
        .finally(() => { if (!cancelled) setIsLoading(false) })
    )
    return () => { cancelled = true }
  }, [searchQuery])

  useEffect(() => {
    if (!tracks.length && !searchQuery && activeTab === "home") {
      getRandomTracks().then(t => t.length && setTracks(t)).catch(console.error)
    }
  }, [activeTab, tracks.length, searchQuery])

  if (activeTab === "settings") return <div className={PAGE}><SettingsPanel /></div>

  if (activeTab === "profile") return (
    <div className={PAGE}>
      <h1 className="mb-6 text-3xl text-white">Особистий кабінет</h1>
      <AuthPanel />
    </div>
  )

  if (activeTab === "library") return (
    <div className={PAGE}>
      <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Бібліотека</h1>
      <TrackList tracks={listeningHistory.map((item: ListeningHistoryItem) => item.track)} title="Нещодавно прослухані" />
      {!listeningHistory.length && (
        <div className="glass-panel mt-4 rounded-[24px] p-6 text-center sm:p-8">
          <p className="text-lg font-medium text-white/40">Історія прослуховування пуста</p>
          <p className="mt-2 text-sm text-white/20">Почніть слухати музику, щоб тут з'явилася історія</p>
        </div>
      )}
    </div>
  )

  if (activeTab === "liked") return (
    <div className={PAGE}>
      <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Вподобані</h1>
      <TrackList tracks={tracks.slice(0, 3)} title="Твої улюблені треки" />
    </div>
  )

  if (activeTab === "playlists") return (
    <div className={PAGE}>
      <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Плейлисти</h1>
      <TrackList tracks={[]} />
    </div>
  )

  if (activeTab === "radio") return (
    <div className={PAGE}>
      <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Радіо</h1>
      <TrackList tracks={tracks.slice(2)} title="Радіостанції" />
    </div>
  )

  if (activeTab === "home") {
    const img = getHighResThumbnail(currentTrack?.thumbnail)

    return (
      <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="content-shell grid min-h-full grid-cols-1 gap-4 rounded-[32px] p-3 sm:p-4 xl:grid-cols-[minmax(340px,0.88fr)_minmax(0,1.12fr)]">
          <section className="hero-panel flex min-h-[480px] items-center justify-center rounded-[28px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex w-full max-w-sm flex-col items-center">
              <div className="mb-4 flex w-full items-center justify-between">
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                  Now Playing
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/45">
                  {currentTrack ? currentTrack.source : "local"}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTrack?.id || "empty"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="glass-tile relative h-56 w-56 shrink-0 overflow-hidden rounded-[32px] border-white/14 shadow-2xl sm:h-64 sm:w-64 lg:h-72 lg:w-72"
                >
                  {currentTrack
                    ? <img src={img} alt={currentTrack.title} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-5xl opacity-30">♪</div>}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.18)_65%,rgba(0,0,0,0.42)_100%)]" />
                  {isPlaying && currentTrack && (
                    <motion.div
                      className="absolute inset-0 bg-black/20"
                      animate={{ opacity: [0.18, 0.34, 0.18] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 w-full text-center">
                <h2 className="truncate text-2xl font-bold tracking-tight text-white sm:text-[2rem]">
                  {currentTrack?.title || "Оберіть трек"}
                </h2>
                <p className="mt-1 truncate text-sm text-white/52 sm:text-base">
                  {currentTrack?.channel || "AuroraTunes"}
                </p>
              </div>

              <div className="mt-5 w-full rounded-[24px] border border-white/8 bg-black/24 p-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.12]">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-300"
                    style={{ width: `${(progress || 0) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-white/40">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="control-pill mt-5 flex items-center justify-center gap-4 rounded-[26px] px-5 py-4">
                <button
                  onClick={() => setIsShuffle((state) => !state)}
                  className={cn("player-btn p-2", isShuffle ? "text-violet-400" : "")}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
                <button onClick={prevTrack} className="player-btn p-2">
                  <SkipBack className="h-5 w-5" />
                </button>
                <button onClick={togglePlay} className="player-btn-play">
                  {isPlaying
                    ? <Pause className="h-5 w-5 text-black" />
                    : <Play className="ml-0.5 h-5 w-5 text-black" />}
                </button>
                <button onClick={nextTrack} className="player-btn p-2">
                  <SkipForward className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsRepeat((state) => !state)}
                  className={cn("player-btn p-2", isRepeat ? "text-violet-400" : "")}
                >
                  <Repeat className="h-4 w-4" />
                </button>
              </div>

              <div className="control-pill mt-4 flex w-full items-center gap-3 rounded-[22px] px-4 py-3">
                <button
                  onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                  className="player-btn shrink-0"
                >
                  {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  className="flex-1 cursor-pointer"
                />
                <span className="text-xs font-medium text-white/45">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </section>

          <section className="hero-panel flex min-h-0 flex-col overflow-hidden rounded-[28px]">
            <div className="flex items-center justify-between border-b border-white/8 px-6 pb-4 pt-6 lg:px-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">Queue</p>
                <h2 className="mt-2 text-2xl font-bold text-white sm:text-[2rem]">Плейлист</h2>
              </div>
              <button className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/72 transition-colors hover:bg-white/12 hover:text-white">
                Схожі
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 lg:px-8">
              <TrackList tracks={tracks} title="Рекомендації" />
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (activeTab === "search") return (
    <div className="flex h-full min-h-0 flex-col from-transparent to-black">
      <div className="shrink-0 px-4 pt-5 sm:px-6 lg:px-8">
        <SearchBar onSearch={handleSearch} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        {isLoading
          ? <p className="text-sm text-white/50">Завантаження...</p>
          : error
            ? <p className="text-sm text-red-400">{error}</p>
            : <TrackList tracks={tracks} title={searchQuery ? `Результати: "${searchQuery}"` : "Пошук музики"} />}
      </div>
    </div>
  )

  return null
}
