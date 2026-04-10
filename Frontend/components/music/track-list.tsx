"use client"

import { TrackCard } from "./track-card"
import type { Track } from "@/lib/types"

interface TrackListProps {
  tracks: Track[]
  title?: string
}

export function TrackList({ tracks, title }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-white/8 backdrop-blur-xl flex items-center justify-center mb-6 shadow-lg">
          <span className="text-5xl">🎵</span>
        </div>
        <p className="text-white/50 text-lg font-medium">Поки що нічого немає</p>
        <p className="text-white/30 text-base mt-2">Шукайте улюблену музику</p>
      </div>
    )
  }

  return (
    <div>
      {title && (
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      )}
      <div className="space-y-3">
        {tracks.map((track, index) => (
          <TrackCard key={track.id} track={track} index={index} />
        ))}
      </div>
    </div>
  )
}
