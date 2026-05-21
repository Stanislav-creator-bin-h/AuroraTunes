"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getRandomTracks } from "@/lib/api"
import type { Track } from "@/lib/types"

function trackKey(track: Track): string {
  return `${track.source ?? "unknown"}:${track.id}`
}

function mergeTracks(existing: Track[], incoming: Track[]): Track[] {
  const keys = new Set(existing.map(trackKey))
  const merged = [...existing]
  for (const track of incoming) {
    const key = trackKey(track)
    if (!keys.has(key)) {
      keys.add(key)
      merged.push(track)
    }
  }
  return merged
}

export function useInfiniteTracks(enabled: boolean) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const enabledRef = useRef(enabled)

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current) return false
    setLoadingMore(true)
    try {
      const batch = await getRandomTracks(20)
      setError(null)

      if (!batch.length) {
        return true
      }

      setTracks((prev) => mergeTracks(prev, batch))
      setHasMore(true)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не вдалося завантажити треки"
      setError(message)
      setHasMore(false)
      return false
    } finally {
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    enabledRef.current = enabled
    if (!enabled) return
    setTracks([])
    setHasMore(true)
    setError(null)
    void loadMore()
  }, [enabled, loadMore])

  return { tracks, loadMore, loadingMore, hasMore, error }
}
