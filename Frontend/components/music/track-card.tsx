"use client"

import { Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Track } from "@/lib/types"
import { usePlayer } from "@/lib/player-context"
import { motion } from "framer-motion"

interface TrackCardProps {
  track: Track
  index: number
}

function getHighResThumbnail(url: string | undefined): string {
  if (!url) return "https://via.placeholder.com/150"

  if (url.includes("ytimg.com")) {
    return url.replace("default.jpg", "hqdefault.jpg")
      .replace("mqdefault.jpg", "hqdefault.jpg")
  }

  if (url.includes("sndcdn.com")) {
    return url.replace("-large.jpg", "-t500x500.jpg")
      .replace("-small.jpg", "-t500x500.jpg")
      .replace("-tiny.jpg", "-t500x500.jpg")
      .replace("-badge.jpg", "-t500x500.jpg")
  }

  return url
}

export function TrackCard({ track, index }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer()
  const isActive = currentTrack?.id === track.id

  const handleClick = () => {
    if (isActive) {
      togglePlay()
    } else {
      playTrack(track)
    }
  }

  const highResImage = getHighResThumbnail(track.thumbnail)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className={cn(
        "glass-panel group flex min-w-0 cursor-pointer items-center gap-3 rounded-[24px] p-3 transition-all duration-300 sm:gap-4 sm:p-4",
        "hover:bg-white/15 hover:border-white/25 hover:shadow-lg",
        isActive && "bg-white/20 border-white/30 shadow-lg"
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-md sm:h-16 sm:w-16">
        <img
          src={highResImage}
          alt={track.title}
          className="h-full w-full object-cover"
        />
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          {isActive && isPlaying ? (
            <Pause className="h-6 w-6 text-white" />
          ) : (
            <Play className="ml-0.5 h-6 w-6 text-white" />
          )}
        </motion.div>
        {isActive && isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-4 items-end gap-0.5">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-white"
                  animate={{
                    height: ["4px", "16px", "8px", "12px", "4px"],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn(
          "truncate text-sm font-semibold transition-colors sm:text-base",
          isActive ? "text-white" : "text-white/95"
        )}>
          {track.title}
        </p>
        <p className="truncate text-xs text-white/60 sm:text-sm">{track.channel}</p>
      </div>

      <span className="shrink-0 text-xs font-medium text-white/50 sm:text-sm">{track.duration}</span>
    </motion.div>
  )
}
