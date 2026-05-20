"use client"

import { Heart, Share2, MoreHorizontal } from "lucide-react"
import { usePlayer } from "@/lib/player-context"
import { motion } from "framer-motion"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function NowPlaying() {
  const { currentTrack, isPlaying } = usePlayer()
  const [isLiked, setIsLiked] = useState(false)

  if (!currentTrack) {
    return (
      <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-8 text-center">
        <div className="aspect-square bg-white/8 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <span className="text-6xl text-white/30">♪</span>
        </div>
        <p className="text-white/40 text-lg font-medium">Виберіть трек</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-lg"
    >
      {/* Album Art */}
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-6 shadow-xl">
        <img
          src={currentTrack.thumbnail}
          alt={currentTrack.title}
          className="w-full h-full object-cover"
        />
        {isPlaying && (
          <div className="absolute bottom-4 left-4">
            <div className="flex items-end gap-1.5 h-6">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-white rounded-full"
                  animate={{
                    height: ["6px", "24px", "12px", "18px", "6px"],
                  }}
                  transition={{
                    duration: 0.7,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Action Buttons Overlay */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="p-2 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 transition-all duration-200 hover:scale-110"
          >
            <Heart className={cn("w-5 h-5", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
          </button>
          <button className="p-2 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 transition-all duration-200 hover:scale-110">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Track Info */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white truncate">{currentTrack.title}</h3>
        <p className="text-base text-white/60 truncate font-medium">{currentTrack.channel}</p>
      </div>

      {/* Additional Actions */}
      <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/15">
        <span className="text-white/50 text-sm font-semibold">{currentTrack.duration}</span>
        <button className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110">
          <MoreHorizontal className="w-5 h-5 text-white/50 hover:text-white" />
        </button>
      </div>
    </motion.div>
  )
}
