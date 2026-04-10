"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { MainContent } from "./main-content"
import { PlayerBar } from "./player-bar"
import { FullscreenPlayer } from "./fullscreen-player"
import { PlayerProvider } from "@/lib/player-context"
import { BackgroundProvider, useBackground } from "@/lib/background-context"
import { AuthProvider } from "@/lib/auth-context"

function MusicPlayerInner() {
  const [activeTab, setActiveTab] = useState("home")
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<"lyrics" | "minimal" | "circle">("lyrics")
  const { backgroundUrl } = useBackground()

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* App Container */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <MainContent activeTab={activeTab} />
        </div>
        <PlayerBar onExpandClick={() => setShowFullscreen(true)} />
      </div>

      {/* Fullscreen Player */}
      {showFullscreen && (
        <FullscreenPlayer
          onClose={() => setShowFullscreen(false)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}
    </div>
  )
}

export function MusicPlayer() {
  return (
    <AuthProvider>
      <BackgroundProvider>
        <PlayerProvider>
          <MusicPlayerInner />
        </PlayerProvider>
      </BackgroundProvider>
    </AuthProvider>
  )
}
