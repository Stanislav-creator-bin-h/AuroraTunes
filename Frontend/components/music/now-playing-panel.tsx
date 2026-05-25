"use client"

import { motion, AnimatePresence } from "framer-motion"
import { SkipBack, Play, Pause, SkipForward, Repeat, Shuffle, Volume2, VolumeX, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSourceLabel } from "@/lib/source-label"
import type { Track } from "@/lib/types"

interface NowPlayingPanelProps {
  currentTrack: Track | null
  isPlaying: boolean
  duration: number
  currentTime: number
  volume: number
  isShuffle: boolean
  isRepeat: boolean
  thumbnailUrl: string
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  isLiked?: boolean
  onToggleLike?: () => void
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

export function NowPlayingPanel({
  currentTrack,
  isPlaying,
  duration,
  currentTime,
  volume,
  isShuffle,
  isRepeat,
  thumbnailUrl,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  isLiked = false,
  onToggleLike,
}: NowPlayingPanelProps) {
  return (
    <section className="hero-panel flex min-h-0 flex-col overflow-hidden rounded-[28px] xl:min-h-0 xl:flex-1">
      <div className="min-h-0 flex-1 overscroll-contain px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center pb-2">
          <div className="mb-3 flex w-full items-center justify-between gap-2">
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentTrack?.id || "empty"}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="glass-tile relative aspect-square w-full max-w-[220px] shrink-0 overflow-hidden rounded-[28px] border-white/14 shadow-2xl sm:max-w-[260px] lg:max-w-[280px]"
            >
              {currentTrack ? (
                <img
                  src={thumbnailUrl}
                  alt={currentTrack.title}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = "https://via.placeholder.com/500x500/111827/e5e7eb?text=Music"
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl opacity-30">♪</div>
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.18)_65%,rgba(0,0,0,0.42)_100%)]" />
              {currentTrack && onToggleLike && (
                <button
                  type="button"
                  onClick={onToggleLike}
                  className={cn(
                    "absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 backdrop-blur-md transition-colors",
                    isLiked ? "text-red-400" : "text-white/80 hover:text-red-300",
                  )}
                  title={isLiked ? "Прибрати з вподобаних" : "Додати до вподобаних"}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                </button>
              )}
              {isPlaying && currentTrack && (
                <motion.div
                  className="absolute inset-0 bg-black/20"
                  animate={{ opacity: [0.18, 0.34, 0.18] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 w-full text-center">
            <h2 className="line-clamp-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {currentTrack?.title || "Оберіть трек"}
            </h2>
            <p className="mt-1 truncate text-sm text-white/52">{currentTrack?.channel || "AuroraTunes"}</p>
            {currentTrack && getSourceLabel(currentTrack.source) && (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
                Завантажено з {getSourceLabel(currentTrack.source)}
              </p>
            )}
          </div>

          <div className="mt-4 w-full rounded-[22px] border border-white/8 bg-black/24 p-3 sm:p-4">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => onSeek(Number(event.target.value))}
              disabled={!duration}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.12] accent-white disabled:cursor-not-allowed disabled:opacity-40"
            />
            <div className="mt-2 flex justify-between text-xs text-white/40">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="control-pill mt-4 flex w-full items-center justify-center gap-3 rounded-[24px] px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <button type="button" onClick={onToggleShuffle} className={cn("player-btn p-2", isShuffle && "text-violet-400")}>
              <Shuffle className="h-4 w-4" />
            </button>
            <button type="button" onClick={onPrev} className="player-btn p-2">
              <SkipBack className="h-5 w-5" />
            </button>
            <button type="button" onClick={onTogglePlay} className="player-btn-play shrink-0">
              {isPlaying ? <Pause className="h-5 w-5 text-black" /> : <Play className="ml-0.5 h-5 w-5 text-black" />}
            </button>
            <button type="button" onClick={onNext} className="player-btn p-2">
              <SkipForward className="h-5 w-5" />
            </button>
            <button type="button" onClick={onToggleRepeat} className={cn("player-btn p-2", isRepeat && "text-violet-400")}>
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          <div className="control-pill mt-3 flex w-full items-center gap-3 rounded-[20px] px-4 py-3">
            <button
              type="button"
              onClick={() => onVolumeChange(volume === 0 ? 0.7 : 0)}
              className="player-btn shrink-0"
            >
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              className="flex-1 cursor-pointer"
            />
            <span className="text-xs font-medium text-white/45">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>
    </section>
  )
}
