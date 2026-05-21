"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { searchTracksPage } from "@/lib/api"
import type { SearchSource } from "@/components/music/search-bar"
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

export function useInfiniteSearch(enabled: boolean, query: string, source: SearchSource) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [error, setError] = useState("")
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  const fetchNextPage = useCallback(async (reset: boolean): Promise<boolean> => {
    const trimmed = query.trim()
    if (!enabled || trimmed.length < 2) return false

    if (loadingRef.current) return false
    loadingRef.current = true

    if (reset) {
      setLoadingInitial(true)
      cursorRef.current = null
    } else {
      setLoadingMore(true)
    }

    try {
      const page = await searchTracksPage(trimmed, source, reset ? undefined : cursorRef.current ?? undefined)
      cursorRef.current = page.nextCursor
      setHasMore(Boolean(page.nextCursor))

      if (!page.tracks.length && !page.nextCursor) {
        setHasMore(false)
      }

      setTracks((prev) => (reset ? page.tracks : mergeTracks(prev, page.tracks)))
      setError("")
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка пошуку")
      if (reset) setTracks([])
      setHasMore(false)
      return false
    } finally {
      loadingRef.current = false
      setLoadingInitial(false)
      setLoadingMore(false)
    }
  }, [enabled, query, source])

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      setTracks([])
      setError("")
      setHasMore(true)
      cursorRef.current = null
      return
    }

    void fetchNextPage(true)
  }, [enabled, query, source, fetchNextPage])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current || loadingInitial) return false
    return fetchNextPage(false)
  }, [fetchNextPage, hasMore, loadingInitial])

  return { tracks, loadMore, loadingMore: loadingMore || loadingInitial, loadingInitial, error, hasMore }
}
