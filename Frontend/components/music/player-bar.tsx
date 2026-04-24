"use client"

import { usePlayer } from "@/lib/player-context"
import { 
  Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Repeat, Shuffle,
  Maximize2, ListMusic, Heart
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useCallback } from "react"
import { Slider } from "@/components/ui/slider"
import { motion, AnimatePresence } from "framer-motion"

interface PlayerBarProps {
  onExpandClick: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function PlayerBar({ onExpandClick }: PlayerBarProps) {
  const {
    currentTrack,
    isPlaying,
    progress,
    volume,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    setVolume,
    seek
  } = usePlayer()

  const [isLiked, setIsLiked] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)

  const handleSeek = useCallback((value: number[]) => {
    if (duration) seek((value[0] / 100) * duration)
  }, [duration, seek])

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0] / 100)
  }, [setVolume])

  return (
    <>
      {/* Background gradient layer - elegant blur */}
      
      <motion.div
  initial={{ y: 100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: 100, opacity: 0 }}
  transition={{ 
    type: "spring",
    stiffness: 200,
    damping: 25,
    mass: 0.8
  }}
  /* Додано клас player-bar */
  className="relative flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3 min-h-[72px] player-bar"
>
        
        {/* Track Info - Left */}
        <motion.div 
          className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-48"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {currentTrack ? (
              <motion.div
                key="track-info"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 min-w-0"
              >
                <motion.div
                  className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl overflow-hidden cursor-pointer group"
                  onClick={onExpandClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-white/70" />
                    </motion.div>
                  </div>
                  <div className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
                </motion.div>
                
                <div className="min-w-0 flex-1">
                  <motion.p 
                    className="text-sm font-medium text-white/90 truncate leading-tight"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    {currentTrack.title}
                  </motion.p>
                  <motion.p 
                    className="text-[11px] text-white/35 truncate leading-tight"
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {currentTrack.channel}
                  </motion.p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-track"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  <ListMusic className="w-4 h-4 text-white/15" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/25">Нічого не грає</p>
                  <p className="text-[10px] text-white/15">Оберіть трек зі списку</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Center Controls - Compact */}
        <motion.div 
          className="flex flex-col items-center gap-1.5 flex-1 max-w-[280px]"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Main Buttons Row */}
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsShuffle(!isShuffle)}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200",
                isShuffle 
                  ? "bg-white/10 text-white" 
                  : "text-white/35 hover:text-white/60 hover:bg-white/5"
              )}
            >
              <Shuffle className="w-3.5 h-3.5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={prevTrack}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-white/60 hover:text-white/90 hover:bg-white/5 transition-all duration-200"
            >
              <SkipBack className="w-4.5 h-4.5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              className="flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-white/90 to-white/70 text-black shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all duration-200"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center justify-center pl-0.5"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center justify-center pl-0.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={nextTrack}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-white/60 hover:text-white/90 hover:bg-white/5 transition-all duration-200"
            >
              <SkipForward className="w-4.5 h-4.5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsRepeat(!isRepeat)}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200",
                isRepeat 
                  ? "bg-white/10 text-white" 
                  : "text-white/35 hover:text-white/60 hover:bg-white/5"
              )}
            >
              <Repeat className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Progress Bar - Minimal */}
          <div className="w-full flex items-center gap-2.5 px-1">
            <span className="text-[9px] font-medium text-white/30 tabular-nums w-8 text-right flex-shrink-0">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[progress * 100]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-[9px] font-medium text-white/30 tabular-nums w-8 flex-shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </motion.div>

        {/* Right Actions - Hidden on mobile, visible on lg+ */}
        <motion.div 
          className="hidden lg:flex items-center gap-1.5"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsLiked(!isLiked)}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200",
              isLiked 
                ? "text-white bg-red-500/20" 
                : "text-white/35 hover:text-white/60 hover:bg-white/5"
            )}
          >
            <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-current")} />
          </motion.button>
          
          <div className="w-px h-5 bg-white/10 mx-1" />
          
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all duration-200"
            >
              {volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : volume < 0.5 ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </motion.button>
            <div className="w-14">
              <Slider
                value={[volume * 100]}
                max={100}
                onValueChange={handleVolumeChange}
                className="cursor-pointer"
              />
            </div>
          </div>
          
          <div className="w-px h-5 bg-white/10 mx-1" />   
        </motion.div>
      </motion.div>
    </>
  )
}
