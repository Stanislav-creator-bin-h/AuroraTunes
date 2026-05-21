"use client"

import { TrackList } from "./track-list"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import type { Track } from "@/lib/types"

import type { PlayMode } from "@/lib/player-context"

interface InfiniteTrackScrollProps {
  tracks: Track[]
  loadMore: () => Promise<boolean>
  loadingMore: boolean
  hasMore: boolean
  enabled: boolean
  title?: string
  className?: string
  emptyMessage?: string
  error?: string | null
  playMode?: PlayMode
}

export function InfiniteTrackScroll({
  tracks,
  loadMore,
  loadingMore,
  hasMore,
  enabled,
  title,
  className,
  emptyMessage,
  error,
  playMode = "normal",
}: InfiniteTrackScrollProps) {
  const { scrollRef, sentinelRef } = useInfiniteScroll({
    enabled,
    hasMore,
    onLoadMore: loadMore,
  })

  return (
    <div
      ref={scrollRef}
      className={className ?? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5 lg:px-8"}
    >
      {error && (
        <div className="mb-4 rounded-[20px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {tracks.length === 0 && !loadingMore ? (
        <div className="glass-panel flex min-h-[200px] flex-col items-center justify-center rounded-[28px] px-6 py-10 text-center">
          <p className="text-sm text-white/45">{error ?? emptyMessage ?? "Поки що тут порожньо"}</p>
        </div>
      ) : (
        <TrackList tracks={tracks} title={title} playMode={playMode} />
      )}
      <div ref={sentinelRef} className="h-24 w-full shrink-0" aria-hidden />
      {loadingMore && (
        <p className="py-4 text-center text-sm text-white/40">Завантаження ще треків...</p>
      )}
    </div>
  )
}
