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

const PAGE = "h-full min-h-0 flex-1 overflow-y-auto  from-transparent to-black px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"

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

  // ✅ useCallback — стабільне посилання, не викликає циклів у SearchBar
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
    if (!tracks.length && !searchQuery && activeTab === "home")
      getRandomTracks().then(t => t.length && setTracks(t)).catch(console.error)
  }, [activeTab, tracks.length, searchQuery])

  // ─── Прості сторінки ───────────────────────────────────────
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
      <TrackList tracks={listeningHistory.map((i: ListeningHistoryItem) => i.track)} title="Нещодавно прослухані" />
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

  // ─── Home / Player ─────────────────────────────────────────
  if (activeTab === "home") {
    const img = getHighResThumbnail(currentTrack?.thumbnail)
    return (
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden from-transparent to-black xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">

        {/* Ліва: плеєр */}
        <section className="flex min-h-[420px] items-center justify-center overflow-y-auto border-b border-white/[0.08] px-4 py-6 sm:px-6 lg:px-8 xl:border-b-0 xl:border-r xl:border-white/[0.08]">
          <div className="flex w-full max-w-sm flex-col items-center">

            {/* Обкладинка */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack?.id || "empty"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="glass-tile relative h-52 w-52 shrink-0 overflow-hidden rounded-[28px] shadow-2xl sm:h-60 sm:w-60 lg:h-64 lg:w-64"
              >
                {currentTrack
                  ? <img src={img} alt={currentTrack.title} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-5xl opacity-30">♪</div>}
                {isPlaying && currentTrack && (
                  <motion.div
                    className="absolute inset-0 bg-black/20"
                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Назва */}
            <div className="mt-5 w-full text-center">
              <h2 className="truncate text-xl font-bold text-white sm:text-2xl">
                {currentTrack?.title || "Оберіть трек"}
              </h2>
              <p className="mt-1 truncate text-sm text-white/50">
                {currentTrack?.channel || "AuroraTunes"}
              </p>
            </div>

            {/* Прогрес */}
            <div className="mt-5 w-full">
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.15] transition-all hover:h-1.5">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${(progress || 0) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-white/40">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Контроли */}
            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={() => setIsShuffle(s => !s)}
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
                onClick={() => setIsRepeat(r => !r)}
                className={cn("player-btn p-2", isRepeat ? "text-violet-400" : "")}
              >
                <Repeat className="h-4 w-4" />
              </button>
            </div>

            {/* Гучність */}
            <div className="mt-4 flex w-full items-center gap-3">
              <button
                onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                className="player-btn shrink-0"
              >
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="flex-1 cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Права: треки */}
        <section className="flex min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 px-6 pb-3 pt-6 lg:px-8">
            <h2 className="text-xl font-bold text-white sm:text-2xl">Плейлист</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6 lg:px-8">
            <TrackList tracks={tracks} title="Рекомендації" />
          </div>
        </section>
      </div>
    )
  }

  // ─── Search ────────────────────────────────────────────────
  if (activeTab === "search") return (
    <div className="flex h-full min-h-0 flex-col from-transparent to-black">
      <div className="shrink-0 px-4 pt-5 sm:px-6 lg:px-8">
        {/* ✅ handleSearch — стабільне посилання, без циклу */}
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