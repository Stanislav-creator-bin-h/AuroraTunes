"use client"

import { useCallback, useEffect, useRef } from "react"

interface UseInfiniteScrollOptions {
  enabled: boolean
  hasMore: boolean
  onLoadMore: () => Promise<boolean>
}

export function useInfiniteScroll({ enabled, hasMore, onLoadMore }: UseInfiniteScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(hasMore)
  const onLoadMoreRef = useRef(onLoadMore)

  hasMoreRef.current = hasMore
  onLoadMoreRef.current = onLoadMore

  const tryLoad = useCallback(async () => {
    if (!enabled || !hasMoreRef.current || loadingRef.current) return
    loadingRef.current = true
    try {
      const ok = await onLoadMoreRef.current()
      if (!ok || !hasMoreRef.current) return

      const root = scrollRef.current
      const sentinel = sentinelRef.current
      if (!root || !sentinel) return

      requestAnimationFrame(() => {
        if (!hasMoreRef.current || loadingRef.current) return
        const rootRect = root.getBoundingClientRect()
        const sentinelRect = sentinel.getBoundingClientRect()
        const nearBottom = sentinelRect.top <= rootRect.bottom + 400
        const notScrollable = root.scrollHeight <= root.clientHeight + 24
        if (nearBottom || notScrollable) {
          void tryLoad()
        }
      })
    } finally {
      loadingRef.current = false
    }
  }, [enabled])

  useEffect(() => {
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!enabled || !root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void tryLoad()
        }
      },
      { root, rootMargin: "0px 0px 600px 0px", threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled, tryLoad])

  useEffect(() => {
    if (enabled && hasMore) {
      const timer = window.setTimeout(() => void tryLoad(), 120)
      return () => window.clearTimeout(timer)
    }
  }, [enabled, hasMore, tryLoad])

  return { scrollRef, sentinelRef }
}
