"use client"

import { useState, useCallback, memo } from "react"
import { usePlayer } from "@/lib/player-context"
import { useBackground } from "@/lib/background-context"
import { Slider } from "@/components/ui/slider"
import { 
  Play, Pause, SkipBack, SkipForward, 
  Repeat, Shuffle, Volume2, VolumeX,
  Heart, X, ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FullscreenPlayerProps {
  onClose: () => void
  viewMode: "lyrics" | "minimal" | "circle"
  onViewModeChange: (mode: "lyrics" | "minimal" | "circle") => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const ViewModeMenu = memo(function ViewModeMenu({ 
  viewMode, 
  onViewModeChange,
  isOpen,
  onToggle
}: { 
  viewMode: string
  onViewModeChange: (mode: "lyrics" | "minimal" | "circle") => void
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm font-medium transition-all duration-200 hover:text-white"
      >
        <span>
          {viewMode === "lyrics" ? "Динамічний" : viewMode === "circle" ? "Вініл" : "Мінімальний"}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden min-w-36 shadow-xl">
          {[
            { id: "lyrics" as const, label: "Динамічний" },
            { id: "circle" as const, label: "Вініл" },
            { id: "minimal" as const, label: "Мінімальний" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => { onViewModeChange(mode.id); onToggle() }}
              className={cn(
                "w-full px-4 py-2.5 text-left text-sm transition-all duration-200",
                viewMode === mode.id 
                  ? "bg-white/10 text-white" 
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export function FullscreenPlayer({ onClose, viewMode, onViewModeChange }: FullscreenPlayerProps) {
  const { currentTrack, isPlaying, togglePlay, progress, volume, setVolume, currentTime, duration, seek, nextTrack, prevTrack } = usePlayer()
  const { backgroundUrl, brightness } = useBackground()
  const [isLiked, setIsLiked] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // Brightness logic: 0 = dark (0.5), 50 = default (0.25), 100 = original (0)
  const brightnessOverlay = Math.max(0, 0.5 - brightness / 200)

  const handleSeek = useCallback((value: number[]) => {
    if (duration) seek((value[0] / 100) * duration)
  }, [duration, seek])

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0] / 100)
  }, [setVolume])

  if (!currentTrack) return null

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 z-10 bg-black/50" />
      
      {/* Purple accent */}
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(100,80,200,0.15),transparent_50%)]" />
      
      {/* Edge vignette */}
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,transparent_30%,rgba(0,0,0,0.4)_100%)]" />

      {/* Top Bar */}
      <div className="relative z-20 top-0 left-0 right-0 h-14 flex items-center justify-between px-4 sm:px-5">
        <button 
          onClick={onClose}
          className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        <ViewModeMenu 
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          isOpen={showMenu}
          onToggle={() => setShowMenu(!showMenu)}
        />
      </div>

      {/* Lyrics View */}
      {viewMode === "lyrics" && (
        <div className="relative z-20 h-full flex items-center px-6 md:px-12 pt-16 pb-20">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12 max-w-4xl w-full mx-auto">
            <div className="w-56 md:w-64 lg:w-72 shrink-0">
              <div className="relative">
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full aspect-square object-cover rounded-2xl shadow-2xl"
                />
              </div>
              <h2 className="text-xl font-semibold text-white mt-5 text-center lg:text-left">{currentTrack.title}</h2>
              <p className="text-sm text-white/40 text-center lg:text-left">{currentTrack.channel}</p>
              
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-white/40 mb-2 tabular-nums">
                  <span>{formatTime(currentTime)}</span>
                  <span>{currentTrack.duration}</span>
                </div>
                <Slider
                  value={[progress * 100]}
                  max={100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center lg:pt-6">
              <p className="text-lg text-white/25 text-center leading-relaxed max-w-md">
                Текст пісні буде завантажений тут...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Circle/Vinyl View */}
      {viewMode === "circle" && (
        <div className="relative z-20 h-full flex items-center justify-center px-6 pt-16 pb-20">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-3xl w-full">
            <div className="w-48 md:w-60 shrink-0">
              <div 
                className={cn(
                  "w-full aspect-square rounded-full overflow-hidden shadow-2xl ring-2 ring-white/10",
                  isPlaying && "animate-spin-slow"
                )}
                style={{ animationDuration: "8s" }}
              >
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div className="flex-1 max-w-sm w-full">
              <div className="mb-5 text-center lg:text-left">
                <h2 className="text-2xl font-semibold text-white">{currentTrack.title}</h2>
                <p className="text-sm text-white/40">{currentTrack.channel}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-white/40 mb-2 tabular-nums">
                  <span>{formatTime(currentTime)}</span>
                  <span>{currentTrack.duration}</span>
                </div>
                <Slider
                  value={[progress * 100]}
                  max={100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-center gap-3 mb-6">
                <button 
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={cn("p-2 transition-colors", isRepeat ? "text-white" : "text-white/40 hover:text-white")}
                >
                  <Repeat className="w-4 h-4" />
                </button>
                <button onClick={prevTrack} className="p-2 text-white/40 hover:text-white transition-colors">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transition-all duration-200 hover:scale-105"
                >
                  {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-0.5" fill="currentColor" />}
                </button>
                <button onClick={nextTrack} className="p-2 text-white/40 hover:text-white transition-colors">
                  <SkipForward className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={cn("p-2 transition-colors", isShuffle ? "text-white" : "text-white/40 hover:text-white")}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <Slider
                  value={[volume * 100]}
                  max={100}
                  onValueChange={handleVolumeChange}
                  className="w-24 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal View */}
      {viewMode === "minimal" && (
        <div className="relative z-20 h-full flex flex-col items-center justify-center px-6 pt-16 pb-20">
          <div 
            className="absolute inset-0 z-10 bg-cover bg-center opacity-30 blur-[60px]"
            style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
          />
          
          <div className="relative z-30 text-center max-w-md w-full">
            <div className="w-44 md:w-52 mx-auto mb-6">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full aspect-square object-cover rounded-2xl shadow-2xl"
              />
            </div>
            
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-1 flex items-center justify-center gap-2">
              {currentTrack.title}
              <button onClick={() => setIsLiked(!isLiked)}>
                <Heart 
                  className={cn("w-5 h-5 transition-colors", isLiked ? "text-white fill-white" : "text-white/40 hover:text-white")}
                />
              </button>
            </h2>
            <p className="text-sm text-white/40 mb-6">{currentTrack.channel}</p>
            
            <div className="mb-6 w-full">
              <div className="flex items-center justify-between text-xs text-white/40 mb-2 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{currentTrack.duration}</span>
              </div>
              <Slider
                value={[progress * 100]}
                max={100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              <button 
                onClick={() => setIsRepeat(!isRepeat)}
                className={cn("p-2 transition-colors", isRepeat ? "text-white" : "text-white/40 hover:text-white")}
              >
                <Repeat className="w-4 h-4" />
              </button>
              <button onClick={prevTrack} className="p-2 text-white/40 hover:text-white transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-0.5" fill="currentColor" />}
              </button>
              <button onClick={nextTrack} className="p-2 text-white/40 hover:text-white transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsShuffle(!isShuffle)}
                className={cn("p-2 transition-colors", isShuffle ? "text-white" : "text-white/40 hover:text-white")}
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                className="p-2 text-white/40 hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <Slider
                value={[volume * 100]}
                max={100}
                onValueChange={handleVolumeChange}
                className="w-28 cursor-pointer"
              />
              <span className="text-white/30 text-xs tabular-nums w-8">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {showMenu && (
        <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setShowMenu(false)} />
      )}
    </div>
  )
}