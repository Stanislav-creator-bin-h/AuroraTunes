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
  const { currentTrack, isPlaying, togglePlay, volume, setVolume, progress, currentTime, duration, seek } = usePlayer()
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
    <div className="h-24 bg-white/8 backdrop-blur-2xl border-t border-white/15 px-6 flex items-center shadow-2xl">
      {/* Left: Track Info */}
      <div className="w-1/4 flex items-center gap-4">
        {currentTrack ? (
          <>
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/10 shrink-0 shadow-lg">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-white text-base font-semibold truncate">{currentTrack.title}</p>
              <p className="text-white/60 text-sm truncate">{currentTrack.channel}</p>
            </div>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="ml-2 p-2 hover:bg-white/10 rounded-full transition-colors hover:scale-110 duration-200"
            >
              <Heart className={cn("w-5 h-5", isLiked ? "fill-red-500 text-red-500" : "text-white/50 hover:text-white")} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-white/8 flex items-center justify-center shadow-md">
              <ListMusic className="w-6 h-6 text-white/30" />
            </div>
            <div>
              <p className="text-white/50 text-base font-medium">Черга пуста</p>
              <p className="text-white/30 text-sm">Виберіть трек</p>
            </div>
          </div>
        )}
      </div>

      {/* Center: Controls */}
      <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-6">
          <button className="p-2 text-white/50 hover:text-white transition-colors hover:scale-110 duration-200">
            <Shuffle className="w-4 h-4" />
          </button>
          <button className="p-2 text-white/50 hover:text-white transition-colors hover:scale-110 duration-200">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 font-bold text-lg shadow-lg",
              currentTrack
                ? "bg-gradient-to-r from-blue-400 to-purple-600 text-white hover:scale-110 hover:shadow-xl"
                : "bg-white/20 text-white/50 cursor-not-allowed"
            )}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>
          <button className="p-2 text-white/50 hover:text-white transition-colors hover:scale-110 duration-200">
            <SkipForward className="w-5 h-5" />
          </button>
          <button className="p-2 text-white/50 hover:text-white transition-colors hover:scale-110 duration-200">
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex items-center gap-3">
          <span className="text-white/50 text-xs w-10 text-right font-medium">{formatTime(currentTime)}</span>
          <Slider
            value={[progress]}
            max={1}
            step={0.001}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-white/50 text-xs w-10 font-medium">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume & Expand */}
      <div className="w-1/4 flex items-center justify-end gap-3">
        <button onClick={handleVolumeToggle} className="p-2 text-white/50 hover:text-white transition-colors hover:scale-110 duration-200">
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
          className="w-24"
        />
        {currentTrack && (
          <button
            onClick={onExpandClick}
            className="p-2 text-white/50 hover:text-white transition-colors hover:scale-110 duration-200 ml-2"
            title="Розгорнути плеєр"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
