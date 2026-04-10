"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ChevronRight } from "lucide-react"
import { SearchBar } from "./search-bar"
import { TrackList } from "./track-list"
import { NowPlaying } from "./now-playing"
import { SettingsPanel } from "./settings-panel"
import { AuthPanel } from "./auth-panel"
import { getStreamUrl, searchTracks } from "@/lib/api"
import { usePlayer } from "@/lib/player-context"
import type { Track, ListeningHistoryItem } from "../../lib/types"

interface MainContentProps {
  activeTab: string
}

export function MainContent({ activeTab }: MainContentProps) {
  const { listeningHistory } = usePlayer()
  const [searchQuery, setSearchQuery] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showNowPlaying, setShowNowPlaying] = useState(false)
  const tracksCache = useRef<Record<string, Track[]>>({})

  useEffect(() => {
    if (!searchQuery.trim()) {
      setTracks([])
      setError("")
      return
    }

    // Проверяем кеш
    if (tracksCache.current[searchQuery]) {
      setTracks(tracksCache.current[searchQuery])
      setError("")
      return
    }

    let isCancelled = false
    setIsLoading(true)
    setError("")

    searchTracks(searchQuery)
      .then((data) => {
        if (!isCancelled) {
          // Сохраняем в кеш
          tracksCache.current[searchQuery] = data
          setTracks(data)
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Помилка при пошуку")
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [searchQuery])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  if (activeTab === "settings") {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <SettingsPanel />
      </div>
    )
  }

  if (activeTab === "profile") {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl text-white mb-6">Особистий кабінет</h1>
        <AuthPanel />
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Track Area */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        <SearchBar onSearch={handleSearch} />
        
        
        <div className="mt-8">
          {activeTab === "home" && (
            <>
              <h1 className="text-4xl font-bold text-white mb-8">Головна</h1>
              <TrackList tracks={tracks} title="Рекомендації" />
            </>
          )}
          
          {activeTab === "search" && (
            <>
              <h1 className="text-4xl font-bold text-white mb-8">Пошук</h1>
              {isLoading ? (
                <p className="text-white/50 text-lg">Завантаження результатів...</p>
              ) : error ? (
                <p className="text-red-400 text-lg">{error}</p>
              ) : (
                <TrackList 
                  tracks={tracks} 
                  title={searchQuery ? `Результати для "${searchQuery}"` : "Пошук музики"} 
                />
              )}
            </>
          )}
          
          {activeTab === "library" && (
            <>
              <h1 className="text-4xl font-bold text-white mb-8">Бібліотека</h1>
              <TrackList 
                tracks={listeningHistory.map((item: ListeningHistoryItem) => item.track)} 
                title="Нещодавно прослухані" 
              />
              {listeningHistory.length === 0 && (
                <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-8 text-center">
                  <p className="text-white/40 text-lg font-medium">Історія прослуховування пуста</p>
                  <p className="text-white/20 text-sm mt-2">Почніть слухати музику, щоб тут з'явилася історія</p>
                </div>
              )}
            </>
          )}
          
          {activeTab === "liked" && (
            <>
              <h1 className="text-4xl font-bold text-white mb-8">Вподобані</h1>
              <TrackList tracks={tracks.slice(0, 3)} title="Твої улюблені треки" />
            </>
          )}
          
          {activeTab === "playlists" && (
            <>
              <h1 className="text-4xl font-bold text-white mb-8">Плейлисти</h1>
              <TrackList tracks={[]} />
            </>
          )}
          
          {activeTab === "radio" && (
            <>
              <h1 className="text-4xl font-bold text-white mb-8">Радіо</h1>
              <TrackList tracks={tracks.slice(2)} title="Радіостанції" />
            </>
          )}
        </div>
      </div>

      </div>
  )
}
