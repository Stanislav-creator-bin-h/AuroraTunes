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
    <div className="relative h-screen w-full overflow-hidden bg-black selection:bg-white/20">
      
      {/* 1. Dynamic Background Layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      
      {/* 2. Overlay - тут налаштовується загальна темрява фону */}
      <div className="absolute inset-0 z-[1] bg-black/50" />
      
      {/* 3. App Container */}
      <div className="relative z-10 h-full flex flex-col p-2 sm:p-3 gap-2 sm:gap-3">
        
        {/* Верхня частина: Сайдбар + Контент */}
        <div className="flex-1 flex gap-2 sm:gap-3 overflow-hidden">
          {/* Сайдбар тепер передає свою прозорість сам, тут ми просто даємо йому місце */}
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          
          {/* Основне вікно (плитка з контентом) */}
          <main className="flex-1 bg-black/20 backdrop-blur-md rounded-[24px] border border-white/5 overflow-hidden">
            <MainContent activeTab={activeTab} />
          </main>
        </div>

        {/* Плеєр (нижня плитка) */}
        <footer className="h-20 sm:h-24 bg-black/30 backdrop-blur-xl rounded-[24px] border border-white/5 shadow-2xl">
          <PlayerBar onExpandClick={() => setShowFullscreen(true)} />
        </footer>
      </div>

      {/* Fullscreen Player із плавним переходом */}
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