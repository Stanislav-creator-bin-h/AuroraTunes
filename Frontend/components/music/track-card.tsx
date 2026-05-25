"use client"

import { useState } from "react"
import { Play, Pause, Heart, ListPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSourceBadgeClass, getSourceLabel } from "@/lib/source-label"
import type { PlayMode } from "@/lib/player-context"
import type { Track } from "@/lib/types"
import { usePlayer } from "@/lib/player-context"
import { motion } from "framer-motion"
import { PlaylistModal } from "./playlist-modal"

interface TrackCardProps {
  track: Track
  index: number
  parentTracks?: Track[]
  syncPlaylist?: boolean
  playMode?: PlayMode
}

function getHighResThumbnail(url: string | undefined): string {
  if (!url) return "https://via.placeholder.com/150"
  if (url.includes("ytimg.com")) {
    return url.replace("default.jpg", "hqdefault.jpg").replace("mqdefault.jpg", "hqdefault.jpg")
  }
  if (url.includes("sndcdn.com")) {
    return url
      .replace("-large.jpg", "-t500x500.jpg")
      .replace("-small.jpg", "-t500x500.jpg")
      .replace("-tiny.jpg", "-t500x500.jpg")
      .replace("-badge.jpg", "-t500x500.jpg")
  }
  return url
}

function getTrackThumbnail(track: Track): string {
  if (track.source === "youtube" && track.id) {
    return `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`
  }
  return getHighResThumbnail(track.thumbnail)
}

export function TrackCard({
  track,
  index,
  parentTracks,
  syncPlaylist = true,
  playMode = "normal",
}: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, isLiked, toggleLike } = usePlayer()
  const isActive = currentTrack?.id === track.id && currentTrack?.source === track.source
  const liked = isLiked(track)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)

  const handlePlay = () => {
    if (isActive) {
      togglePlay()
      return
    }
    playTrack(track, {
      playlist: syncPlaylist && parentTracks?.length ? parentTracks : undefined,
      mode: playMode,
    })
  }

  const highResImage = getTrackThumbnail(track)
  const sourceLabel = getSourceLabel(track.source)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.3) }}
        className={cn(
          "glass-panel group flex min-w-0 cursor-pointer items-center gap-3 rounded-[24px] p-3 transition-all duration-300 sm:gap-4 sm:p-4",
          "hover:bg-white/15 hover:border-white/25 hover:shadow-lg",
          isActive && "bg-white/20 border-white/30 shadow-lg",
        )}
      >
        <button type="button" onClick={handlePlay} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-md sm:h-16 sm:w-16">
            <img
              src={highResImage}
              alt={track.title}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = "https://via.placeholder.com/150x150/111827/e5e7eb?text=Music"
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {isActive && isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="ml-0.5 h-6 w-6 text-white" />
              )}
            </div>
            {isActive && isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex h-4 items-end gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full bg-white"
                      animate={{ height: ["4px", "16px", "8px", "12px", "4px"] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className={cn(
              "truncate text-sm font-semibold sm:text-base",
              isActive ? "text-white" : "text-white/95",
            )}>
              {track.title}
            </p>
            <p className="truncate text-xs text-white/60 sm:text-sm">{track.channel}</p>
            {sourceLabel && (
              <p className={cn("mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]", getSourceBadgeClass(track.source))}>
                {sourceLabel}
              </p>
            )}
          </div>
        </button>

        {/* Add to playlist button */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setShowPlaylistModal(true)
          }}
          className="player-btn shrink-0 p-2 text-white/40 hover:text-violet-300 transition-colors"
          title="Додати до плейлиста"
          aria-label="Додати до плейлиста"
        >
          <ListPlus className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Like button */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            toggleLike(track)
          }}
          className={cn(
            "player-btn shrink-0 p-2",
            liked ? "text-red-400" : "text-white/40 hover:text-red-300",
          )}
          title={liked ? "Прибрати з вподобаних" : "Додати до вподобаних"}
          aria-label={liked ? "Прибрати з вподобаних" : "Додати до вподобаних"}
        >
          <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5", liked && "fill-current")} />
        </button>

        <span className="shrink-0 pr-1 text-xs font-medium text-white/50 sm:text-sm">{track.duration}</span>
      </motion.div>

      {showPlaylistModal && (
        <PlaylistModal
          track={track}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </>
  )
}
