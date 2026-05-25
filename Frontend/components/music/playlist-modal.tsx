"use client"

import { useState, useEffect, useRef } from "react"
import { X, Plus, Check, ListMusic, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { usePlayer } from "@/lib/player-context"
import { useAuth } from "@/lib/auth-context"
import type { Track, Playlist } from "@/lib/types"

interface PlaylistModalProps {
  track: Track
  onClose: () => void
}

export function PlaylistModal({ track, onClose }: PlaylistModalProps) {
  const { user } = useAuth()
  const { playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } = usePlayer()
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Exclude the system "Liked Songs" playlist from the modal list
  const userPlaylists = playlists.filter((p) => !p.isSystem)

  useEffect(() => {
    if (showNewForm) inputRef.current?.focus()
  }, [showNewForm])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  function isInPlaylist(pl: Playlist): boolean {
    return pl.tracks.some((t) => t.id === track.id && t.source === track.source)
  }

  async function handleToggle(pl: Playlist) {
    setLoadingId(pl.id)
    try {
      if (isInPlaylist(pl)) {
        await removeTrackFromPlaylist(pl.id, track.source ?? "youtube", track.id)
      } else {
        await addTrackToPlaylist(pl.id, track)
      }
    } catch (err) {
      console.error("Playlist toggle failed:", err)
      const { toast } = await import("sonner")
      toast.error("Не вдалося оновити плейлист")
    } finally {
      setLoadingId(null)
    }
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    try {
      const pl = await createPlaylist(name)
      await addTrackToPlaylist(pl.id, track)
      setNewName("")
      setShowNewForm(false)
      const { toast } = await import("sonner")
      toast.success(`Плейлист «${name}» створено`)
    } catch (err) {
      console.error("Create playlist failed:", err)
      const { toast } = await import("sonner")
      toast.error("Не вдалося створити плейлист")
    } finally {
      setCreating(false)
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br from-white/10 to-white/5 shadow-2xl"
          style={{ backdropFilter: "blur(24px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <ListMusic className="h-5 w-5 text-violet-400" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Додати до</p>
                <h2 className="text-base font-bold text-white leading-tight">Плейлиста</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/50 hover:bg-white/15 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Track info */}
          <div className="flex items-center gap-3 border-b border-white/8 px-5 py-3">
            <img
              src={track.thumbnail || "https://via.placeholder.com/40"}
              alt={track.title}
              className="h-10 w-10 rounded-xl object-cover shadow"
              onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/40x40/111827/e5e7eb?text=♪" }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{track.title}</p>
              <p className="truncate text-xs text-white/50">{track.channel}</p>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-64 overflow-y-auto px-3 py-3 space-y-1">
            {!user && (
              <p className="px-2 py-3 text-sm text-white/40 text-center">
                Увійдіть, щоб керувати плейлистами
              </p>
            )}

            {user && userPlaylists.length === 0 && !showNewForm && (
              <p className="px-2 py-3 text-sm text-white/40 text-center">
                Немає плейлистів. Створіть перший!
              </p>
            )}

            {user && userPlaylists.map((pl) => {
              const inList = isInPlaylist(pl)
              const loading = loadingId === pl.id
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => handleToggle(pl)}
                  disabled={loading}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all",
                    inList
                      ? "bg-violet-500/20 hover:bg-violet-500/30"
                      : "hover:bg-white/10",
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all",
                    inList ? "bg-violet-500/40" : "bg-white/10",
                  )}>
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                      : inList
                        ? <Check className="h-4 w-4 text-violet-300" />
                        : <ListMusic className="h-4 w-4 text-white/50" />
                    }
                  </div>
                  <span className={cn(
                    "flex-1 truncate text-sm font-medium",
                    inList ? "text-violet-200" : "text-white/80",
                  )}>
                    {pl.name}
                  </span>
                  <span className="shrink-0 text-xs text-white/30">{pl.tracks.length}</span>
                </button>
              )
            })}

            {/* New playlist form */}
            <AnimatePresence>
              {showNewForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-1 pb-0.5">
                    <input
                      ref={inputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
                      placeholder="Назва плейлиста..."
                      className="flex-1 rounded-2xl border border-white/15 bg-white/8 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-400/60 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
                    />
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={creating || !newName.trim()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-50 transition-all"
                    >
                      {creating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Check className="h-4 w-4" />
                      }
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {user && (
            <div className="border-t border-white/8 px-3 py-3">
              <button
                type="button"
                onClick={() => setShowNewForm((v) => !v)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  showNewForm
                    ? "bg-white/8 text-white/60"
                    : "hover:bg-white/10 text-violet-300 hover:text-violet-200",
                )}
              >
                <Plus className={cn("h-4 w-4 transition-transform", showNewForm && "rotate-45")} />
                {showNewForm ? "Скасувати" : "Новий плейлист"}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
