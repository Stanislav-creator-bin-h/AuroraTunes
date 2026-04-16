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
  const { backgroundUrl, brightness } = useBackground()

  return (
    <div className="relative h-screen min-h-[600px] w-full min-w-[900px] overflow-hidden bg-black selection:bg-white/20">
      
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      
      <div
        className="absolute inset-0 z-[1] bg-black"
        style={{ opacity: 0 }}
      />
      
      <div className="relative z-10 flex h-full flex-col gap-2 p-2 sm:p-3">
        
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:flex-row lg:gap-3">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          
          <main className="glass-panel app-fade min-h-0 flex-1 overflow-hidden rounded-[28px]">
            <MainContent activeTab={activeTab} />
          </main>
        </div>

        <footer className="glass-panel overflow-hidden rounded-[28px]">
          <PlayerBar onExpandClick={() => setShowFullscreen(true)} />
        </footer>
      </div>

      {showFullscreen && (
        <div className="fixed inset-0 z-[100] animate-in fade-in zoom-in duration-300">
          <FullscreenPlayer
            onClose={() => setShowFullscreen(false)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
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