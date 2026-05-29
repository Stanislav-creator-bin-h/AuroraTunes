"use client"

import { useState } from "react"
import { Sparkles, Loader2, Play, Check, RotateCcw, AlertCircle, FolderPlus, Youtube, Radio, ArrowLeft, Disc } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePlayer } from "@/lib/player-context"
import { useAuth } from "@/lib/auth-context"
import { TrackCard } from "./track-card"
import { generateAiPlaylist, createPlaylistWithTracks, type GeneratedAiPlaylist } from "@/lib/api"
import type { Track } from "@/lib/types"

const PAGE = "h-full min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white/[0.02] to-transparent px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"

const PRESETS = [
  { text: "Енергійний хіп-хоп для тренувань", icon: "⚡" },
  { text: "Вечірній розслабляючий Lo-Fi для роботи", icon: "☕" },
  { text: "Меланхолійний акустичний рок для дощового дня", icon: "🌧️" },
  { text: "Атмосферний синтвейв для нічної поїздки", icon: "🌌" },
  { text: "Заспокійлива класика для сну та медитації", icon: "🧘" }
]

export function AiPanel() {
  const { playTrack, loadPlaylists } = usePlayer()
  const { user } = useAuth()

  const [prompt, setPrompt] = useState("")
  const [source, setSource] = useState<"all" | "youtube" | "soundcloud">("all")
  
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState<GeneratedAiPlaylist | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Cycle loading messages to show step progress
  const startLoadingAnimation = () => {
    setIsLoading(true)
    setLoadingStep(0)
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= 2) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 4500)
    return interval
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    setError(null)
    setResult(null)
    setSaveSuccess(false)
    const intervalId = startLoadingAnimation()

    try {
      const data = await generateAiPlaylist(prompt.trim(), source)
      setResult(data)
    } catch (err: any) {
      setError(err?.message || "Не вдалося згенерувати плейлист. Спробуйте пізніше.")
    } finally {
      clearInterval(intervalId)
      setIsLoading(false)
    }
  }

  const handleSavePlaylist = async () => {
    if (!result || isSaving) return
    setIsSaving(true)
    try {
      const { toast } = await import("sonner")
      const newPlaylist = await createPlaylistWithTracks(result.name, result.tracks)
      await loadPlaylists() // refresh global playlists
      setSaveSuccess(true)
      toast.success(`Плейлист «${result.name}» успішно збережено!`)
    } catch (err: any) {
      const { toast } = await import("sonner")
      toast.error(err?.message || "Не вдалося зберегти плейлист")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePresetClick = (text: string) => {
    setPrompt(text)
  }

  const handlePlayAll = () => {
    if (!result?.tracks?.length) return
    playTrack(result.tracks[0], { playlist: result.tracks })
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setPrompt("")
    setSaveSuccess(false)
  }

  if (!user) {
    return (
      <div className={PAGE}>
        <div className="glass-panel mx-auto flex max-w-lg flex-col items-center rounded-[28px] px-8 py-14 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 ring-1 ring-white/15">
            <Sparkles className="h-10 w-10 text-violet-300" />
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Розумний асистент</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50 sm:text-base">
            Будь ласка, увійдіть у свій обліковий запис у розділі «Кабінет», щоб створювати унікальні плейлисти за допомогою штучного інтелекту.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={PAGE}>
      <div className="mx-auto max-w-4xl">
        <AnimatePresence mode="wait">
          
          {/* 1. INPUT FORM STATE */}
          {!isLoading && !result && !error && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30">
                    <Sparkles className="h-5 w-5 text-violet-300" />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    Генератор плейлистів
                  </h1>
                </div>
                <p className="text-sm text-white/50 sm:text-base">
                  Опишіть свій настрій, бажаний жанр або активність, а ШІ створить ідеальний музичний мікс.
                </p>
              </div>

              <form onSubmit={handleGenerate} className="flex flex-col gap-6">
                <div className="relative group">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Наприклад: Музика для вечірньої поїздки містом, сповнена ностальгії..."
                    className="w-full bg-white/[0.02] border border-white/10 rounded-[24px] p-5 text-white placeholder-white/25 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 outline-none text-base sm:text-lg transition-all h-36 resize-none shadow-inner shadow-black/20"
                    required
                  />
                  <div className="absolute right-4 bottom-4 text-xs text-white/20 select-none">
                    Gemini AI
                  </div>
                </div>

                {/* Preset tags */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Швидкі ідеї</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.text}
                        type="button"
                        onClick={() => handlePresetClick(preset.text)}
                        className="glass-panel text-left flex items-center gap-2 rounded-2xl px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white hover:border-white/25 active:scale-98 transition-all"
                      >
                        <span className="text-base select-none">{preset.icon}</span>
                        <span className="truncate max-w-[280px] sm:max-w-none">{preset.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Source Selector */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Джерело пошуку треків</span>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSource("all")}
                      className={`flex flex-col items-center justify-center rounded-[20px] p-4 border text-center transition-all ${
                        source === "all"
                          ? "bg-violet-500/15 border-violet-500/40 text-violet-200"
                          : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/5 hover:border-white/15"
                      }`}
                    >
                      <Disc className="h-5 w-5 mb-1.5" />
                      <span className="text-xs font-bold sm:text-sm">Всі джерела</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSource("youtube")}
                      className={`flex flex-col items-center justify-center rounded-[20px] p-4 border text-center transition-all ${
                        source === "youtube"
                          ? "bg-violet-500/15 border-violet-500/40 text-violet-200"
                          : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/5 hover:border-white/15"
                      }`}
                    >
                      <Youtube className="h-5 w-5 mb-1.5" />
                      <span className="text-xs font-bold sm:text-sm">YouTube</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSource("soundcloud")}
                      className={`flex flex-col items-center justify-center rounded-[20px] p-4 border text-center transition-all ${
                        source === "soundcloud"
                          ? "bg-violet-500/15 border-violet-500/40 text-violet-200"
                          : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/5 hover:border-white/15"
                      }`}
                    >
                      <Radio className="h-5 w-5 mb-1.5" />
                      <span className="text-xs font-bold sm:text-sm">SoundCloud</span>
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!prompt.trim() || isLoading}
                  className="mt-2 relative flex items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 px-8 text-base font-extrabold text-white hover:from-violet-500 hover:to-fuchsia-500 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-violet-500/25 disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none"
                >
                  <Sparkles className="h-5 w-5" />
                  Згенерувати плейлист
                </button>
              </form>
            </motion.div>
          )}

          {/* 2. LOADING STATE */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
                <div className="absolute inset-2 rounded-full border border-fuchsia-500/10 border-b-fuchsia-400 animate-spin [animation-duration:1.5s]" />
                <Sparkles className="h-8 w-8 text-violet-300 animate-pulse" />
              </div>
              
              <AnimatePresence mode="wait">
                {loadingStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-2"
                  >
                    <h2 className="text-xl font-bold text-white">Штучний інтелект аналізує запит...</h2>
                    <p className="text-sm text-white/45">Gemini підбирає тематичні треки відповідно до вашого опису</p>
                  </motion.div>
                )}
                {loadingStep === 1 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-2"
                  >
                    <h2 className="text-xl font-bold text-white">Шукаємо аудіофайли в мережі...</h2>
                    <p className="text-sm text-white/45">Здійснюємо паралельний пошук кращих версій на обраних платформах</p>
                  </motion.div>
                )}
                {loadingStep >= 2 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-2"
                  >
                    <h2 className="text-xl font-bold text-white">Збираємо обкладинки та оформлення...</h2>
                    <p className="text-sm text-white/45">Вже майже готово, завершуємо формування плейлиста</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 3. RESULTS STATE */}
          {result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              {/* Back button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Повернутися
                </button>
              </div>

              {/* Playlist details panel */}
              <div className="glass-panel rounded-[28px] p-6 relative overflow-hidden bg-gradient-to-br from-violet-950/20 via-transparent to-transparent">
                <div className="absolute top-0 right-0 h-40 w-40 bg-violet-500/10 rounded-full blur-[80px] -z-10" />
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-violet-500/20 border border-violet-500/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                      ШІ генерація
                    </span>
                    <span className="text-xs text-white/35">
                      · {result.tracks?.length || 0} треків
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">
                    {result.name}
                  </h1>
                  <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
                    {result.description}
                  </p>
                  
                  {/* Warnings if any */}
                  {result.warning && (
                    <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-300/90 mt-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{result.warning}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <button
                      type="button"
                      onClick={handlePlayAll}
                      disabled={!result.tracks?.length}
                      className="flex items-center gap-2 rounded-2xl bg-white text-black hover:bg-white/90 active:scale-98 px-5 py-2.5 text-sm font-extrabold transition-all disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none shadow-md shadow-white/5"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Слухати все
                    </button>

                    {saveSuccess ? (
                      <div className="flex items-center gap-2 rounded-2xl bg-green-500/15 border border-green-500/30 px-5 py-2.5 text-sm font-bold text-green-400">
                        <Check className="h-4 w-4" />
                        Збережено в бібліотеку
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSavePlaylist}
                        disabled={isSaving || !result.tracks?.length}
                        className="flex items-center gap-2 rounded-2xl bg-violet-600/30 border border-violet-500/30 hover:bg-violet-600/40 hover:border-violet-400/40 text-violet-200 active:scale-98 px-5 py-2.5 text-sm font-extrabold transition-all disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FolderPlus className="h-4 w-4" />
                        )}
                        Зберегти плейлист
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tracks Listing */}
              <div className="flex flex-col gap-4 min-w-0">
                <h3 className="text-lg font-bold text-white/80">Список композицій</h3>
                <div className="space-y-3">
                  {result.tracks?.map((track: Track & { aiReason?: string }, index: number) => (
                    <div key={`${track.source}:${track.id}`} className="group flex flex-col">
                      <TrackCard
                        track={track}
                        index={index}
                        parentTracks={result.tracks}
                        playMode="normal"
                      />
                      {track.aiReason && (
                        <div className="mt-1 ml-14 flex items-start gap-1.5 rounded-lg bg-white/[0.01] border border-white/[0.03] px-3 py-1.5 max-w-fit">
                          <Sparkles className="h-3 w-3 shrink-0 text-violet-400 mt-0.5" />
                          <span className="text-xs text-white/50 leading-normal select-none italic font-medium">
                            {track.aiReason}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 4. ERROR STATE */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-panel mx-auto flex max-w-lg flex-col items-center rounded-[28px] px-8 py-10 text-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">Помилка генерації</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {error}
              </p>
              <div className="mt-8 flex flex-col gap-2 w-full sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-white/90 py-2.5 px-5 text-sm font-bold transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Спробувати знову
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
