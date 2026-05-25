"use client"

import { useState } from "react"
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart, Volume2, VolumeX, Volume1 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface Track {
  id: string
  title: string
  artist: string
  thumbnail?: string
  duration?: number
}

interface NowPlayingPanelProps {
  currentTrack: Track | null
  isPlaying: boolean
  duration: number
  currentTime: number
  volume: number
  isShuffle: boolean
  isRepeat: boolean
  thumbnailUrl: string
  isLiked: boolean
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  onToggleLike?: () => void
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function VolumeIcon({ volume, muted }: { volume: number; muted: boolean }) {
  if (muted || volume === 0) return <VolumeX className="size-5" />
  if (volume < 0.5) return <Volume1 className="size-5" />
  return <Volume2 className="size-5" />
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
  isLiked,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
}: NowPlayingPanelProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(volume)

  const handleVolumeToggle = () => {
    if (isMuted) {
      onVolumeChange(prevVolume || 0.5)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      onVolumeChange(0)
      setIsMuted(true)
    }
  }

  const handleVolumeSlider = (value: number[]) => {
    const newVolume = value[0]
    onVolumeChange(newVolume)
    if (newVolume > 0) setIsMuted(false)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="glass-panel player-glow flex h-full flex-col rounded-3xl p-6 lg:p-8">
      {/* Album Art */}
      <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-2xl bg-secondary/50">
        <img
          src={thumbnailUrl}
          alt={currentTrack?.title || "Album art"}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          crossOrigin="anonymous"
        />
        {/* Reflection effect */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/5" />
      </div>

      {/* Track Info */}
      <div className="mb-6 min-h-[4rem] text-center">
        <h2 className="mb-1 truncate text-xl font-bold text-foreground lg:text-2xl">
          {currentTrack?.title || "Немає треку"}
        </h2>
        <p className="truncate text-sm text-muted-foreground lg:text-base">
          {currentTrack?.artist || "Виберіть пісню"}
        </p>
      </div>

      {/* Progress Slider */}
      <div className="mb-4 space-y-2">
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={1}
          onValueChange={(value) => onSeek(value[0])}
          className="cursor-pointer"
        />
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <span className="tabular-nums">-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <button
          onClick={onToggleShuffle}
          className={cn(
            "glass-button rounded-full p-2.5 transition-all",
            isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Shuffle"
        >
          <Shuffle className="size-4" />
        </button>

        <button
          onClick={onPrev}
          className="glass-button rounded-full p-3 text-foreground transition-all hover:scale-105"
          aria-label="Previous track"
        >
          <SkipBack className="size-5" fill="currentColor" />
        </button>

        <button
          onClick={onTogglePlay}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/40 active:scale-95 lg:size-16"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-6 lg:size-7" fill="currentColor" />
          ) : (
            <Play className="size-6 translate-x-0.5 lg:size-7" fill="currentColor" />
          )}
        </button>

        <button
          onClick={onNext}
          className="glass-button rounded-full p-3 text-foreground transition-all hover:scale-105"
          aria-label="Next track"
        >
          <SkipForward className="size-5" fill="currentColor" />
        </button>

        <button
          onClick={onToggleRepeat}
          className={cn(
            "glass-button rounded-full p-2.5 transition-all",
            isRepeat ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Repeat"
        >
          <Repeat className="size-4" />
        </button>
      </div>

      {/* Volume & Like */}
      <div className="mt-auto flex items-center gap-4">
        <button
          onClick={onToggleLike}
          className={cn(
            "rounded-full p-2 transition-all",
            isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <Heart className={cn("size-5", isLiked && "fill-current")} />
        </button>

        <div className="flex flex-1 items-center gap-3">
          <button
            onClick={handleVolumeToggle}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <VolumeIcon volume={volume} muted={isMuted} />
          </button>
          <Slider
            value={[isMuted ? 0 : volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeSlider}
            className="flex-1 cursor-pointer"
          />
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round((isMuted ? 0 : volume) * 100)}
          </span>
        </div>
      </div>
    </div>
  )
}
