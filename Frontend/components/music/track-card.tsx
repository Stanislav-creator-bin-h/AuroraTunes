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

// Функція для примусового завантаження картинок високої якості
function getHighResThumbnail(url: string | undefined): string {
  if (!url) return "https://via.placeholder.com/150"; // Заглушка, якщо картинки немає
  
  // Покращення для YouTube (заміна default/mqdefault на hqdefault)
  if (url.includes("ytimg.com")) {
    return url.replace("default.jpg", "hqdefault.jpg")
              .replace("mqdefault.jpg", "hqdefault.jpg");
  }
  
  // Покращення для SoundCloud (заміна малих форматів на 500x500)
  if (url.includes("sndcdn.com")) {
    return url.replace("-large.jpg", "-t500x500.jpg")
              .replace("-small.jpg", "-t500x500.jpg")
              .replace("-tiny.jpg", "-t500x500.jpg")
              .replace("-badge.jpg", "-t500x500.jpg");
  }
  
  return url;
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

  // Отримуємо якісну картинку перед рендером
  const highResImage = getHighResThumbnail(track.thumbnail);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300",
        "bg-white/8 backdrop-blur-xl border border-white/15",
        "hover:bg-white/15 hover:border-white/25 hover:shadow-lg",
        isActive && "bg-white/20 border-white/30 shadow-lg"
      )}
    >
      {/* Thumbnail with Play Overlay */}
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
        <img
          src={highResImage}
          alt={track.title}
          className="w-full h-full object-cover"
        />
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          {isActive && isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </motion.div>
        {isActive && isPlaying && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-4">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-white rounded-full"
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

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-base font-semibold truncate transition-colors",
          isActive ? "text-white" : "text-white/95"
        )}>
          {track.title}
        </p>
        <p className="text-sm text-white/60 truncate">{track.channel}</p>
      </div>

      {/* Duration */}
      <span className="text-sm text-white/50 shrink-0 font-medium">{track.duration}</span>
    </motion.div>
  )
}