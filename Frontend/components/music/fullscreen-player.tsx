"use client"

import { useState, useCallback, memo } from "react"
import { usePlayer } from "@/lib/player-context"
import { useBackground } from "@/lib/background-context"
import { Slider } from "@/components/ui/slider"
import { 
  Play, Pause, SkipBack, SkipForward, 
  Repeat, Shuffle, Volume2, VolumeX,
  Heart, Download, ChevronDown, Maximize2,
  SlidersHorizontal, Timer, Smile, X,
  Home, Library
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

// View mode menu component
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
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-white/80 text-sm font-medium transition-all duration-200 hover:scale-105"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>
          {viewMode === "lyrics" ? "Динамічний" : viewMode === "circle" ? "Яблоко" : "Розмитие"}
        </span>
      </button>

      
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden min-w-48 shadow-2xl">
          <button
            onClick={() => { onViewModeChange("lyrics"); onToggle() }}
            className={cn(
              "w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-all duration-200",
              viewMode === "lyrics" ? "bg-white/20 text-white font-semibold" : "text-white/70 hover:bg-white/15 hover:text-white"
            )}
          >
            {viewMode === "lyrics" && <span className="w-2 h-2 rounded-full bg-blue-400" />}
            Динамічний
          </button>
          <button
            onClick={() => { onViewModeChange("circle"); onToggle() }}
            className={cn(
              "w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-all duration-200",
              viewMode === "circle" ? "bg-white/20 text-white font-semibold" : "text-white/70 hover:bg-white/15 hover:text-white"
            )}
          >
            {viewMode === "circle" && <span className="w-2 h-2 rounded-full bg-blue-400" />}
            Яблоко
          </button>
          <button
            onClick={() => { onViewModeChange("minimal"); onToggle() }}
            className={cn(
              "w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-all duration-200",
              viewMode === "minimal" ? "bg-white/20 text-white font-semibold" : "text-white/70 hover:bg-white/15 hover:text-white"
            )}
          >
            {viewMode === "minimal" && <span className="w-2 h-2 rounded-full bg-blue-400" />}
            Розмитие
          </button>
        </div>
      )}
    </div>
  )
})




export function FullscreenPlayer({ onClose, viewMode, onViewModeChange }: FullscreenPlayerProps) {
  const { currentTrack, isPlaying, togglePlay, progress, volume, setVolume, currentTime, duration, seek, nextTrack, prevTrack } = usePlayer()
  const { backgroundUrl } = useBackground()
  const [isLiked, setIsLiked] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const handleSeek = useCallback((value: number[]) => {
    if (duration) seek((value[0] / 100) * duration)
  }, [duration, seek])

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0] / 100)
  }, [setVolume])

  const cycleSpeed = useCallback(() => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setPlaybackSpeed(speeds[nextIndex])
  }, [playbackSpeed])

  if (!currentTrack) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Top Navigation Bar - Dotify style */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 bg-white/8 backdrop-blur-2xl border-b border-white/15 z-20 shadow-lg">
        {/* Left - Navigation */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/15 rounded-lg transition-all duration-200 hover:scale-110"
          >
            <Home className="w-0 h-5" />
          </button>
          <button aria-label="Бібліотека" className="p-2 text-white/60 hover:text-white hover:bg-white/15 rounded-lg transition-all duration-200 hover:scale-110">
            <Library className="w-5 h-5" />
          </button>
        </div>

        {/* Center - Close indicator */}
        <button 
          onClick={onClose}
          aria-label="Закрити"
          className="absolute left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full hover:bg-white/50 transition-colors"
        />

        {/* Right - Settings */}
        <div className="flex items-center gap-2">
          <ViewModeMenu 
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            isOpen={showMenu}
            onToggle={() => setShowMenu(!showMenu)}
          />
          <button aria-label="Повноекранний режим" className="p-2 text-white/60 hover:text-white hover:bg-white/15 rounded-lg transition-all duration-200 hover:scale-110">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lyrics View */}
      {viewMode === "lyrics" && (
        <div className="h-full flex items-center px-8 md:px-16 pt-20 pb-24">
          <div className="flex items-start gap-12 max-w-6xl w-full mx-auto">
            {/* Album Art with shadow */}
            <div className="w-72 md:w-80 shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 rounded-2xl" />
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full aspect-square object-cover rounded-2xl shadow-2xl"
                />
              </div>
              <h2 className="text-2xl text-white mt-6 text-center">{currentTrack.title}</h2>
              <p className="text-lg text-white/50 text-center">{currentTrack.channel}</p>
              
              {/* Progress under album */}
              <div className="mt-6 px-2">
                <div className="flex items-center justify-between text-sm text-white/50 mb-2">
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
            
            {/* Lyrics */}
            <div className="flex-1 pt-4">
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin">
                <p className="text-2xl md:text-3xl leading-relaxed text-white/50 text-center">
                  Текст пісні буде завантажений тут
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Circle/Apple View */}
      {viewMode === "circle" && (
        <div className="h-full flex items-center justify-center px-8 pt-20 pb-24">
          <div className="flex items-center gap-16 md:gap-24 max-w-5xl w-full">
            {/* Circular Album Art */}
            <div className="w-64 md:w-80 shrink-0">
              <div 
                className={cn(
                  "w-full aspect-square rounded-full overflow-hidden shadow-2xl border-4 border-white/10",
                  isPlaying && "animate-[spin_20s_linear_infinite]"
                )}
              >
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Controls Section */}
            <div className="flex-1 max-w-md">
              {/* Track Info */}
              <div className="mb-6">
                <h2 className="text-3xl text-white flex items-center gap-2">
                  {currentTrack.title}
                  <span className="text-orange-500">{"🔥"}</span>
                </h2>
                <p className="text-lg text-white/50">{currentTrack.channel}</p>
              </div>
              
              {/* Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm text-white/50 mb-2">
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

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <button className="p-2.5 text-white/50 hover:text-white transition-colors">
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={cn(
                    "p-2.5 transition-colors",
                    isRepeat ? "text-green-500" : "text-white/50 hover:text-white"
                  )}
                >
                  <Repeat className="w-5 h-5" />
                </button>
                <button 
                  onClick={prevTrack}
                  className="p-2.5 text-white/50 hover:text-white transition-colors"
                >
                  <SkipBack className="w-6 h-6" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7" fill="currentColor" />
                  ) : (
                    <Play className="w-7 h-7 ml-1" fill="currentColor" />
                  )}
                </button>
                <button 
                  onClick={nextTrack}
                  className="p-2.5 text-white/50 hover:text-white transition-colors"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={cn(
                    "p-2.5 transition-colors",
                    isShuffle ? "text-green-500" : "text-white/50 hover:text-white"
                  )}
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-white/50 hover:text-white transition-colors">
                  <Timer className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-white/50 hover:text-white transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                    className="p-2 text-white/50 hover:text-white transition-colors"
                  >
                    {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <Slider
                    value={[volume * 100]}
                    max={100}
                    onValueChange={handleVolumeChange}
                    className="w-24 cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={cycleSpeed}
                    className="px-2 py-1 text-white/50 hover:text-white text-sm transition-colors"
                  >
                    {playbackSpeed}x
                  </button>
                  <button className="p-2 text-white/50 hover:text-white transition-colors">
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-white/50 hover:text-white transition-colors">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal/Blur View */}
      {viewMode === "minimal" && (
        <div className="h-full flex flex-col items-center justify-center px-8 pt-20 pb-24">
          {/* Extra blur from album */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-50 blur-[80px]"
            style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
          />
          
          <div className="relative z-10 text-center max-w-lg w-full">
            {/* Album Art */}
            <div className="w-56 md:w-64 mx-auto mb-8">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full aspect-square object-cover rounded-2xl shadow-2xl"
              />
            </div>
            
            {/* Track Info */}
            <h2 className="text-2xl md:text-3xl text-white mb-1 flex items-center justify-center gap-2">
              {currentTrack.title}
              <button 
                onClick={() => setIsLiked(!isLiked)}
                className="transition-colors"
              >
                <Heart 
                  className={cn(
                    "w-5 h-5",
                    isLiked ? "text-orange-500 fill-orange-500" : "text-white/50 hover:text-white"
                  )}
                />
              </button>
            </h2>
            <p className="text-lg text-white/50 mb-8">{currentTrack.channel}</p>
            
            {/* Progress */}
            <div className="mb-6 w-full">
              <div className="flex items-center justify-between text-sm text-white/50 mb-2">
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

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button 
                onClick={() => setIsRepeat(!isRepeat)}
                className={cn(
                  "p-2 transition-colors",
                  isRepeat ? "text-green-500" : "text-white/50 hover:text-white"
                )}
              >
                <Repeat className="w-5 h-5" />
              </button>
              <button 
                onClick={prevTrack}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <SkipBack className="w-6 h-6" />
              </button>
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" fill="currentColor" />
                ) : (
                  <Play className="w-7 h-7 ml-1" fill="currentColor" />
                )}
              </button>
              <button 
                onClick={nextTrack}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <SkipForward className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setIsShuffle(!isShuffle)}
                className={cn(
                  "p-2 transition-colors",
                  isShuffle ? "text-green-500" : "text-white/50 hover:text-white"
                )}
              >
                <Shuffle className="w-5 h-5" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <Slider
                value={[volume * 100]}
                max={100}
                onValueChange={handleVolumeChange}
                className="w-32 cursor-pointer"
              />
              <span className="text-white/40 text-sm w-8">{Math.round(volume * 100)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}
