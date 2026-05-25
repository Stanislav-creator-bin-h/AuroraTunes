"use client"

import { useState, useCallback } from "react"
import { SearchBar, type SearchSource } from "./search-bar"
import { TrackList } from "./track-list"
import { SettingsPanel } from "./settings-panel"
import { AuthPanel } from "./auth-panel"
import { InfiniteTrackScroll } from "./infinite-track-scroll"
import { NowPlayingPanel } from "./now-playing-panel"
import { AiPanel } from "./ai-panel"
import { PlaylistsPanel } from "./playlists-panel"
import { useInfiniteTracks } from "@/hooks/use-infinite-tracks"
import { useInfiniteSearch } from "@/hooks/use-infinite-search"
import { usePlayer } from "@/lib/player-context"
import type { Track, ListeningHistoryItem } from "../../lib/types"

interface MainContentProps { activeTab: string }

function getHighResThumbnail(url?: string): string {
  if (!url) return "https://via.placeholder.com/150"
  if (url.includes("ytimg.com")) return url.replace("default.jpg", "hqdefault.jpg").replace("mqdefault.jpg", "hqdefault.jpg")
  if (url.includes("sndcdn.com")) return url.replace("-large.jpg", "-t500x500.jpg").replace("-small.jpg", "-t500x500.jpg")
  return url
}

function getTrackThumbnail(track: Track | null): string {
  if (!track) return "https://via.placeholder.com/500x500/111827/e5e7eb?text=Music"
  if (track.source === "youtube" && track.id) {
    return `https://img.youtube.com/vi/${track.id}/hqdefault.jpg`
  }
  return getHighResThumbnail(track.thumbnail)
}

const PAGE = "h-full min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white/[0.02] to-transparent px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"

export function MainContent({ activeTab }: MainContentProps) {
  const {
    currentTrack, isPlaying, progress, duration, volume, currentTime,
    listeningHistory, likedTracks, togglePlay, nextTrack, prevTrack, setVolume, seek,
    isShuffle, isRepeat, toggleShuffle, toggleRepeat, toggleLike, isLiked,
  } = usePlayer()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchSource, setSearchSource] = useState<SearchSource>("youtube")

  const handleSearch = useCallback((q: string) => setSearchQuery(q), [])
  const handleSourceChange = useCallback((s: SearchSource) => setSearchSource(s), [])

  const homeTracks = useInfiniteTracks(activeTab === "home")
  const radioTracks = useInfiniteTracks(activeTab === "radio")
  const searchTracksState = useInfiniteSearch(activeTab === "search", searchQuery, searchSource)

  if (activeTab === "settings") return <div className={PAGE}><SettingsPanel /></div>
  if (activeTab === "ai") return <AiPanel />

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
        </div>
      )}
    </div>
  )

  if (activeTab === "liked") return (
    <div className={PAGE}>
      <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Вподобані</h1>
      <TrackList tracks={likedTracks} title="Твої улюблені треки" />
      {!likedTracks.length && (
        <div className="glass-panel mt-4 rounded-[24px] p-6 text-center text-white/40">
          Натисніть сердечко на головному екрані або в списку треків
        </div>
      )}
    </div>
  )

  if (activeTab === "playlists") return (
    <div className={PAGE}>
      <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Плейлисти</h1>
      <PlaylistsPanel />
    </div>
  )

  if (activeTab === "radio") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 px-4 pb-3 pt-5 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Радіо</h1>
          <p className="mt-1 text-sm text-white/45">Натисніть трек — далі гратиме випадково</p>
        </div>
        <InfiniteTrackScroll
          enabled={activeTab === "radio"}
          tracks={radioTracks.tracks}
          loadMore={radioTracks.loadMore}
          loadingMore={radioTracks.loadingMore}
          hasMore={radioTracks.hasMore}
          error={radioTracks.error}
          title="Радіо-добірка"
          playMode="radio"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2 sm:px-6 lg:px-8"
        />
      </div>
    )
  }

  if (activeTab === "home") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
        <div className="content-shell flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-[32px] p-3 sm:p-4 xl:grid xl:grid-cols-[minmax(300px,0.42fr)_minmax(0,1fr)] xl:grid-rows-1">
          <NowPlayingPanel
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            duration={duration}
            currentTime={currentTime}
            volume={volume}
            isShuffle={isShuffle}
            isRepeat={isRepeat}
            thumbnailUrl={getTrackThumbnail(currentTrack)}
            onTogglePlay={togglePlay}
            onPrev={prevTrack}
            onNext={nextTrack}
            onSeek={seek}
            onVolumeChange={setVolume}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
            isLiked={currentTrack ? isLiked(currentTrack) : false}
            onToggleLike={currentTrack ? () => toggleLike(currentTrack) : undefined}
          />

          <section className="hero-panel flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-[28px] xl:min-h-0">
            <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-6 pb-4 pt-5 lg:px-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">Queue</p>
                <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">Плейлист</h2>
              </div>
            </div>
            <InfiniteTrackScroll
              enabled={activeTab === "home"}
              tracks={homeTracks.tracks}
              loadMore={homeTracks.loadMore}
              loadingMore={homeTracks.loadingMore}
              hasMore={homeTracks.hasMore}
              error={homeTracks.error}
              title="Рекомендації"
            />
          </section>
        </div>
      </div>
    )
  }

  if (activeTab === "search") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-5 sm:px-6 lg:px-8">
          <SearchBar onSearch={handleSearch} source={searchSource} onSourceChange={handleSourceChange} />
        </div>
        <InfiniteTrackScroll
          enabled={searchQuery.trim().length >= 2}
          tracks={searchTracksState.tracks}
          loadMore={searchTracksState.loadMore}
          loadingMore={searchTracksState.loadingMore}
          hasMore={searchTracksState.hasMore}
          error={searchTracksState.error || undefined}
          title={searchQuery ? `Результати: "${searchQuery}"` : "Пошук музики"}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 lg:px-8"
          emptyMessage={searchQuery.trim().length < 2 ? "Введіть запит (мінімум 2 символи)" : "Нічого не знайдено"}
        />
      </div>
    )
  }

  return null
}
