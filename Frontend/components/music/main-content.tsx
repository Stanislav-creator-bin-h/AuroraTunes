"use client"

import { useState, useEffect, useRef } from "react"
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

const PAGE = "flex-1 p-8 overflow-y-auto bg-gradient-to-b from-transparent to-black"

export function MainContent({ activeTab }: MainContentProps) {
  const { currentTrack, isPlaying, progress, duration, volume, currentTime,
    listeningHistory, togglePlay, nextTrack, prevTrack, setVolume } = usePlayer()
  const [searchQuery, setSearchQuery] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const cache = useRef<Record<string, Track[]>>({})

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

  if (activeTab === "settings") return <div className={PAGE}><SettingsPanel /></div>

  if (activeTab === "profile") return (
    <div className={PAGE}>
      <h1 className="text-3xl text-white mb-6">Особистий кабінет</h1>
      <AuthPanel />
    </div>
  )

  if (activeTab === "library") return (
    <div className={PAGE}>
      <h1 className="text-4xl font-bold text-white mb-8">Бібліотека</h1>
      <TrackList tracks={listeningHistory.map((i: ListeningHistoryItem) => i.track)} title="Нещодавно прослухані" />
      {!listeningHistory.length && (
        <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-lg font-medium">Історія прослуховування пуста</p>
          <p className="text-white/20 text-sm mt-2">Почніть слухати музику, щоб тут з'явилася історія</p>
        </div>
      )}
    </div>
  )

  if (activeTab === "liked") return (
    <div className={PAGE}>
      <h1 className="text-4xl font-bold text-white mb-8">Вподобані</h1>
      <TrackList tracks={tracks.slice(0, 3)} title="Твої улюблені треки" />
    </div>
  )

  if (activeTab === "playlists") return (
    <div className={PAGE}>
      <h1 className="text-4xl font-bold text-white mb-8">Плейлисти</h1>
      <TrackList tracks={[]} />
    </div>
  )

  if (activeTab === "radio") return (
    <div className={PAGE}>
      <h1 className="text-4xl font-bold text-white mb-8">Радіо</h1>
      <TrackList tracks={tracks.slice(2)} title="Радіостанції" />
    </div>
  )

  if (activeTab === "home") {
    const img = getHighResThumbnail(currentTrack?.thumbnail)
    return (
      // overflow-hidden — щоб контент не виходив за межі і не з'їжджав вниз
      <div className="flex-1 flex overflow-hidden bg-gradient-to-b from-transparent to-black">

        {/* Ліва панель: плеєр — центрується всередині без виходу за межі */}
        <div className="w-1/2 flex items-center justify-center overflow-y-auto py-6 px-8">
          <div className="flex flex-col items-center w-full max-w-xs">

            {/* Обкладинка */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack?.id || "empty"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative w-60 h-60 rounded-3xl overflow-hidden shadow-2xl bg-white/10 shrink-0"
              >
                {currentTrack
                  ? <img src={img} alt={currentTrack.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>}
                {isPlaying && currentTrack && (
                  <motion.div className="absolute inset-0 bg-black/20"
                    animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2, repeat: Infinity }} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Назва */}
            <div className="mt-5 text-center w-full">
              <h2 className="text-xl font-bold text-white truncate">{currentTrack?.title || "Оберіть трек"}</h2>
              <p className="text-white/60 text-sm mt-1 truncate">{currentTrack?.channel || "AuroraTunes"}</p>
            </div>

            {/* Прогрес */}
            <div className="w-full mt-4">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${(progress || 0) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs text-white/50 mt-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Контроли */}
            <div className="flex items-center gap-5 mt-4">
              <button onClick={() => setIsShuffle(s => !s)}
                className={cn("p-2 rounded-full transition", isShuffle ? "text-purple-400" : "text-white/60 hover:text-white")}>
                <Shuffle className="w-5 h-5" />
              </button>
              <button onClick={prevTrack} className="p-2 text-white/80 hover:text-white transition">
                <SkipBack className="w-6 h-6" />
              </button>
              <button onClick={togglePlay} className="p-4 bg-white rounded-full hover:scale-105 transition shadow-lg">
                {isPlaying ? <Pause className="w-7 h-7 text-black" /> : <Play className="w-7 h-7 text-black ml-0.5" />}
              </button>
              <button onClick={nextTrack} className="p-2 text-white/80 hover:text-white transition">
                <SkipForward className="w-6 h-6" />
              </button>
              <button onClick={() => setIsRepeat(r => !r)}
                className={cn("p-2 rounded-full transition", isRepeat ? "text-purple-400" : "text-white/60 hover:text-white")}>
                <Repeat className="w-5 h-5" />
              </button>
            </div>

            {/* Гучність */}
            <div className="flex items-center gap-3 mt-4 w-full">
              <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="text-white/60 hover:text-white transition">
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="flex-1 accent-white cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Права панель: треки — окремий скрол */}
        <div className="w-1/2 flex flex-col overflow-hidden border-l border-white/10">
          <div className="px-8 pt-8 pb-4 shrink-0">
            <h2 className="text-2xl font-bold text-white">Плейлист</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <TrackList tracks={tracks} title="Рекомендації" />
          </div>
        </div>

      </div>
    )
  }

  if (activeTab === "search") return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-transparent to-black">
      <div className="p-6"><SearchBar onSearch={setSearchQuery} /></div>
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? <p className="text-white/50">Завантаження...</p>
          : error ? <p className="text-red-400">{error}</p>
          : <TrackList tracks={tracks} title={searchQuery ? `Результати: "${searchQuery}"` : "Пошук музики"} />}
      </div>
    </div>
  )

  return null
}