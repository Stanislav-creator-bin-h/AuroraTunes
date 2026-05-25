"use client"

import { useState } from "react"
import { Plus, Play, Trash2, ListMusic, Music2, ChevronLeft, Loader2, Crown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { usePlayer } from "@/lib/player-context"
import { useAuth } from "@/lib/auth-context"
import type { Playlist, Track } from "@/lib/types"

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })
  } catch {
    return iso
  }
}

function getTrackThumbnail(track: Track): string {
  if (track.source === "youtube" && track.id) {
    return `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`
  }
  return track.thumbnail || "https://via.placeholder.com/64"
}

export function PlaylistsPanel() {
  const { user } = useAuth()
  const { playlists, createPlaylist, deletePlaylist, playTrack, setPlaylist } = usePlayer()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const selected = playlists.find((p) => p.id === selectedId) ?? null

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    try {
      await createPlaylist(name)
      setNewName("")
      setShowForm(false)
      const { toast } = await import("sonner")
      toast.success(`Плейлист «${name}» створено`)
    } catch {
      const { toast } = await import("sonner")
      toast.error("Не вдалося створити плейлист")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(pl: Playlist) {
    setDeletingId(pl.id)
    try {
      await deletePlaylist(pl.id)
      if (selectedId === pl.id) setSelectedId(null)
      const { toast } = await import("sonner")
      toast.success(`Плейлист «${pl.name}» видалено`)
    } catch {
      const { toast } = await import("sonner")
      toast.error("Не вдалося видалити плейлист")
    } finally {
      setDeletingId(null)
    }
  }

  function handlePlayAll(pl: Playlist) {
    if (!pl.tracks.length) return
    playTrack(pl.tracks[0], { playlist: pl.tracks })
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/8">
          <ListMusic className="h-8 w-8 text-white/30" />
        </div>
        <p className="text-lg font-semibold text-white/50">Увійдіть, щоб бачити плейлисти</p>
      </div>
    )
  }

  // ── Playlist detail view ──
  if (selected) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {/* Back + title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-bold text-white">{selected.name}</h2>
                {selected.isSystem && (
                  <Crown className="h-4 w-4 shrink-0 text-amber-400" />
                )}
              </div>
              <p className="text-xs text-white/40">{formatDate(selected.createdAt)} · {selected.tracks.length} треків</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePlayAll(selected)}
                disabled={!selected.tracks.length}
                className="flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40 transition-all shadow-lg shadow-violet-500/20"
              >
                <Play className="h-4 w-4 fill-current" />
                Грати
              </button>
              {!selected.isSystem && (
                <button
                  type="button"
                  onClick={() => handleDelete(selected)}
                  disabled={deletingId === selected.id}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50 transition-all"
                  title="Видалити плейлист"
                >
                  {deletingId === selected.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </button>
              )}
            </div>
          </div>

          {/* Tracks */}
          {selected.tracks.length === 0 ? (
            <div className="glass-panel rounded-[24px] py-12 text-center">
              <Music2 className="mx-auto mb-3 h-8 w-8 text-white/20" />
              <p className="text-sm text-white/35">Плейлист порожній</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selected.tracks.map((track, idx) => (
                <motion.button
                  key={`${track.source}:${track.id}`}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.25) }}
                  onClick={() => playTrack(track, { playlist: selected.tracks })}
                  className="glass-panel group flex w-full items-center gap-3 rounded-[20px] p-3 text-left transition-all hover:bg-white/15 hover:border-white/20"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl shadow">
                    <img
                      src={getTrackThumbnail(track)}
                      alt={track.title}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/48x48/111827/e5e7eb?text=♪" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white/90">{track.title}</p>
                    <p className="truncate text-xs text-white/45">{track.channel}</p>
                  </div>
                  <span className="shrink-0 text-xs text-white/35">{track.duration}</span>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  // ── Playlist list view ──
  return (
    <div className="flex flex-col gap-4">
      {/* Create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{playlists.filter(p => !p.isSystem).length} плейлистів</p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all",
            showForm
              ? "bg-white/10 text-white/50"
              : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 hover:text-violet-200",
          )}
        >
          <Plus className={cn("h-4 w-4 transition-transform duration-200", showForm && "rotate-45")} />
          {showForm ? "Скасувати" : "Новий плейлист"}
        </button>
      </div>

      {/* New playlist form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel flex gap-3 rounded-[20px] p-4">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
                placeholder="Назва плейлиста..."
                className="flex-1 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-400/60 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-all"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Створити"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist cards */}
      {playlists.length === 0 ? (
        <div className="glass-panel rounded-[24px] py-16 text-center">
          <ListMusic className="mx-auto mb-3 h-10 w-10 text-white/20" />
          <p className="text-base font-medium text-white/35">Плейлистів ще немає</p>
          <p className="mt-1 text-sm text-white/25">Натисніть «Новий плейлист» або використайте кнопку + на треку</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {playlists.map((pl, idx) => {
            const firstThumbnail = pl.tracks[0]
              ? getTrackThumbnail(pl.tracks[0])
              : null
            return (
              <motion.div
                key={pl.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                className="glass-panel group relative overflow-hidden rounded-[24px] p-4 transition-all hover:bg-white/15 hover:border-white/20 cursor-pointer"
                onClick={() => setSelectedId(pl.id)}
              >
                {/* Thumbnail mosaic */}
                <div className="mb-3 flex gap-1.5">
                  {pl.tracks.slice(0, 4).map((t, i) => (
                    <div key={i} className="h-12 w-12 overflow-hidden rounded-xl shadow flex-shrink-0">
                      <img
                        src={getTrackThumbnail(t)}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/48x48/111827/e5e7eb?text=♪" }}
                      />
                    </div>
                  ))}
                  {pl.tracks.length === 0 && (
                    <div className="h-12 w-12 rounded-xl bg-white/8 flex items-center justify-center">
                      <Music2 className="h-5 w-5 text-white/25" />
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-white">{pl.name}</p>
                      {pl.isSystem && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">{pl.tracks.length} треків</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handlePlayAll(pl) }}
                      disabled={!pl.tracks.length}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/30 text-violet-300 hover:bg-violet-500/50 disabled:opacity-30 transition-all"
                      title="Грати"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                    {!pl.isSystem && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(pl) }}
                        disabled={deletingId === pl.id}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-all"
                        title="Видалити"
                      >
                        {deletingId === pl.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
