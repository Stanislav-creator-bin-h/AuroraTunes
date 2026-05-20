"use client"

import { useEffect, useMemo, useRef } from "react"
import { TrackCard } from "./track-card"
import type { Track } from "@/lib/types"
import { usePlayer } from "@/lib/player-context"

interface TrackListProps {
  tracks: Track[]
  title?: string
  syncPlaylist?: boolean
}

export function TrackList({ tracks, title, syncPlaylist = true }: TrackListProps) {
  const { setPlaylist } = usePlayer()
  const playlistSignatureRef = useRef("")
  const playlistSignature = useMemo(
    () => tracks.map((track) => `${track.source}:${track.id}`).join("|"),
    [tracks]
  )

  useEffect(() => {
    if (!syncPlaylist || tracks.length === 0 || playlistSignatureRef.current === playlistSignature) return
    playlistSignatureRef.current = playlistSignature
    setPlaylist(tracks)
  }, [playlistSignature, setPlaylist, syncPlaylist, tracks])

  if (tracks.length === 0) {
    return (
      <div className="glass-panel flex min-h-[280px] flex-col items-center justify-center rounded-[28px] px-6 py-12 text-center">
        <div className="glass-tile mb-6 flex h-24 w-24 items-center justify-center rounded-full">
          <span className="text-5xl">♪</span>
        </div>
        <p className="text-lg font-medium text-white/50">Поки що тут порожньо</p>
        <p className="mt-2 text-base text-white/30">Спробуйте знайти музику або запустити добірку</p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      {title && (
        <h2 className="mb-5 text-xl font-bold text-white sm:text-2xl">{title}</h2>
      )}
      <div className="space-y-3">
        {tracks.map((track, index) => (
          <TrackCard key={track.id} track={track} index={index} />
        ))}
      </div>
    </div>
  )
}
