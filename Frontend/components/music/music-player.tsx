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

  // Brightness logic:
  // 100% (slider value) = original image (no changes) - default
  // 0% = dark overlay
  // The slider controls how much dark overlay is applied
  // At 100% brightness = no overlay, at 0% = max overlay (0.8)
  const brightnessOverlay = Math.max(0, 0.5 - brightness / 200)

  return (
    <div className="relative h-dvh min-h-0 w-full overflow-hidden bg-black selection:bg-white/20">
      {/* Background Image - clean, no filters except user-controlled overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />
      
      {/* Dark overlay - controlled by brightness slider */}
      {brightnessOverlay > 0 && (
        <div
          className="absolute inset-0 z-[1] bg-black transition-opacity duration-300"
          style={{ opacity: brightnessOverlay }}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:flex-row lg:gap-3">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

          <main className="glass-panel min-h-0 flex-1 overflow-hidden rounded-2xl">
            <MainContent activeTab={activeTab} />
          </main>
        </div>

        <footer className="glass-panel overflow-hidden rounded-2xl">
          <PlayerBar onExpandClick={() => setShowFullscreen(true)} />
        </footer>
      </div>

      {/* Fullscreen Player */}
      {showFullscreen && (
        <div className="fixed inset-0 z-[100] animate-in fade-in zoom-in-95 duration-300">
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
