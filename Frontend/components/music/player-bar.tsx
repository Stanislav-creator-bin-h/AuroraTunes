"use client"

import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, Heart, ListMusic, Maximize2 } from "lucide-react"
import { usePlayer } from "@/lib/player-context"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { useState } from "react"

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

interface PlayerBarProps {
  onExpandClick?: () => void
}

export function PlayerBar({ onExpandClick }: PlayerBarProps) {
  const { currentTrack, isPlaying, togglePlay, volume, setVolume, progress, currentTime, duration, seek, prevTrack, nextTrack } = usePlayer()
  const [isLiked, setIsLiked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(volume)

  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(prevVolume)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      setVolume(0)
      setIsMuted(true)
    }
  }

  const handleSeek = (value: number[]) => {
    if (duration) {
      seek(value[0] * duration)
    }
  }

  return (
    <div className="grid gap-4 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,1.5fr)_minmax(0,1fr)] lg:items-center">
      <div className="min-w-0">
        {currentTrack ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="glass-tile relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white sm:text-base">{currentTrack.title}</p>
              <p className="truncate text-xs text-white/60 sm:text-sm">{currentTrack.channel}</p>
            </div>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="hidden rounded-2xl p-2 transition-colors duration-200 hover:bg-white/10 hover:scale-110 sm:block"
            >
              <Heart className={cn("w-5 h-5", isLiked ? "fill-red-500 text-red-500" : "text-white/50 hover:text-white")} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="glass-tile flex h-14 w-14 items-center justify-center rounded-2xl">
              <ListMusic className="w-6 h-6 text-white/30" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/50 sm:text-base">Черга пуста</p>
              <p className="text-xs text-white/30 sm:text-sm">Виберіть трек</p>
            </div>
          </div>
        )}
      </div>

      <div className="order-first flex min-w-0 flex-col gap-3 lg:order-none">
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <button className="p-2 text-white/50 transition-colors duration-200 hover:scale-110 hover:text-white">
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={prevTrack}
            disabled={!currentTrack}
            className="p-2 text-white/50 transition-colors duration-200 hover:scale-110 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold shadow-lg transition-all duration-300 sm:h-14 sm:w-14",
              currentTrack
                ? "bg-gradient-to-r from-blue-400 to-purple-600 text-white hover:scale-110 hover:shadow-xl"
                : "cursor-not-allowed bg-white/20 text-white/50"
            )}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="ml-1 w-6 h-6" />}
          </button>
          <button
            onClick={nextTrack}
            disabled={!currentTrack}
            className="p-2 text-white/50 transition-colors duration-200 hover:scale-110 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipForward className="w-5 h-5" />
          </button>
          <button className="p-2 text-white/50 transition-colors duration-200 hover:scale-110 hover:text-white">
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
          <span className="w-10 shrink-0 text-right text-[11px] font-medium text-white/50 sm:text-xs">{formatTime(currentTime)}</span>
          <Slider
            value={[progress]}
            max={1}
            step={0.001}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="w-10 shrink-0 text-[11px] font-medium text-white/50 sm:text-xs">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-end">
        <button onClick={handleVolumeToggle} className="p-2 text-white/50 transition-colors duration-200 hover:scale-110 hover:text-white">
          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={(v) => {
            setVolume(v[0])
            setIsMuted(false)
          }}
          className="w-full max-w-32"
        />
        {currentTrack && (
          <button
            onClick={onExpandClick}
            className="ml-1 p-2 text-white/50 transition-colors duration-200 hover:scale-110 hover:text-white"
            title="Розгорнути плеєр"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
