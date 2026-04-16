"use client"

import { useRef, useState, useCallback, memo } from "react"
import { Check, Upload, Trash2, Image as ImageIcon, AlertCircle, Plus, Download } from "lucide-react"
import { useBackground, defaultBackgrounds } from "@/lib/background-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const extraBackgrounds = [
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80",
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80",
  "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1920&q=80",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

interface BackgroundItemProps {
  url: string
  index: number
  isSelected: boolean
  isUserBg: boolean
  onSelect: () => void
  onDelete: () => void
  onDownload?: () => void
}

const BackgroundItem = memo(function BackgroundItem({
  url, index, isSelected, isUserBg, onSelect, onDelete, onDownload
}: BackgroundItemProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-[24px] border-2 transition-all duration-300 shadow-md hover:shadow-lg",
          isSelected
            ? "border-white ring-2 ring-white/40 scale-[1.02]"
            : "border-white/15 hover:border-white/30"
        )}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/8 animate-pulse">
            <ImageIcon className="h-8 w-8 text-white/20" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <AlertCircle className="h-8 w-8 text-red-400/50" />
          </div>
        ) : (
          <img
            src={url}
            alt={`Фон ${index + 1}`}
            className={cn("h-full w-full object-cover transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0")}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
          />
        )}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
              <Check className="h-5 w-5 text-black" />
            </div>
          </div>
        )}
      </button>
      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isUserBg && onDownload && (
          <button
            onClick={onDownload}
            className="rounded-xl bg-blue-500/80 p-1.5 hover:bg-blue-500"
            title="Завантажити"
          >
            <Download className="h-3 w-3 text-white" />
          </button>
        )}
        {isUserBg && (
          <button
            onClick={onDelete}
            className="rounded-xl bg-red-500/80 p-1.5 hover:bg-red-500"
          >
            <Trash2 className="h-3 w-3 text-white" />
          </button>
        )}
      </div>
    </div>
  )
})

export function SettingsPanel() {
  const { backgroundUrl, setBackgroundUrl, brightness, setBrightness } = useBackground()
  const { user, addCustomBackground, removeCustomBackground } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const allBackgrounds = [
    ...defaultBackgrounds,
    ...extraBackgrounds,
    ...(user?.customBackgrounds || []),
  ]

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    if (!ALLOWED_TYPES.includes(file.type)) { setUploadError("Підтримуються тільки JPG, PNG, GIF та WebP"); return }
    if (file.size > MAX_FILE_SIZE) { setUploadError("Файл занадто великий (макс. 10MB)"); return }
    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (response.ok && data.url) {
        addCustomBackground(data.url)
        setBackgroundUrl(data.url)
      } else {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const result = ev.target?.result as string
          addCustomBackground(result)
          setBackgroundUrl(result)
        }
        reader.readAsDataURL(file)
      }
    } catch {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = ev.target?.result as string
        addCustomBackground(result)
        setBackgroundUrl(result)
      }
      reader.readAsDataURL(file)
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [addCustomBackground, setBackgroundUrl])

  const handleDeleteBackground = useCallback((url: string) => {
    removeCustomBackground(url)
    if (backgroundUrl === url) setBackgroundUrl(defaultBackgrounds[0])
  }, [backgroundUrl, removeCustomBackground, setBackgroundUrl])

  const handleDownloadBackground = useCallback(async (url: string) => {
    try {
      const filename = url.split("/").pop() || "background.jpg"
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error("Download error:", err)
    }
  }, [])

  const isUserBackground = useCallback((url: string) =>
    user?.customBackgrounds?.includes(url) ?? false, [user?.customBackgrounds])

  return (
    <div className="space-y-6 pb-8 sm:space-y-8 sm:pb-10">
      {/* Header */}
      <div>
        <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl tracking-tight">Налаштування</h2>
        <p className="text-sm font-medium text-white/60 sm:text-base">Створіть свою ідеальну атмосферу</p>
      </div>

      <div className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white">Фонове зображення</h3>
          <p className="text-sm font-medium text-white/50">Виберіть зі списку або завантажте власну картинку чи GIF</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* ІНТЕРАКТИВНА ПЛИТКА ЗАВАНТАЖЕННЯ */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative aspect-video cursor-pointer overflow-hidden rounded-[24px] border-2 border-dashed transition-all duration-300",
              "flex flex-col items-center justify-center gap-2",
              "border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10 group",
              isUploading && "animate-pulse cursor-wait"
            )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 transition-transform group-hover:scale-110">
                <Plus className="h-6 w-6 text-white/60 group-hover:text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-white/40 group-hover:text-white/80">
                {isUploading ? "Обробка..." : "Додати свій"}
              </span>
          </div>

          {/* СПИСОК ФОНІВ */}
          {allBackgrounds.map((url, index) => (
            <BackgroundItem
              key={url}
              url={url}
              index={index}
              isSelected={backgroundUrl === url}
              isUserBg={isUserBackground(url)}
              onSelect={() => setBackgroundUrl(url)}
              onDelete={() => handleDeleteBackground(url)}
              onDownload={isUserBackground(url) ? () => handleDownloadBackground(url) : undefined}
            />
          ))}
        </div>

        {/* ERROR MESSAGE */}
        {uploadError && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm font-medium text-red-400">{uploadError}</p>
          </div>
        )}
      </div>

      <div className="glass-panel rounded-[28px] p-5 sm:p-6 lg:p-8">
        <h3 className="mb-2 text-2xl font-bold text-white">Яскравість фону</h3>
        <p className="mb-6 text-sm font-medium text-white/60 sm:text-base">Налаштуйте затемнення фонового зображення</p>
        <div className="grid gap-3 sm:grid-cols-[64px_minmax(0,1fr)_64px_auto] sm:items-center sm:gap-4">
          <span className="text-sm font-medium text-white/50">Темний</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={brightness ?? 50}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 transition-colors hover:bg-white/30
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-lg"
          />
          <span className="text-sm font-medium text-white/50 sm:text-right">Світлий</span>
          <span className="text-right text-sm font-mono text-white/70">{brightness ?? 50}%</span>
        </div>
      </div>

      <div className="glass-panel rounded-[28px] p-5 sm:p-6 lg:p-8">
        <h3 className="mb-2 text-2xl font-bold text-white">Тема</h3>
        <p className="mb-5 text-base font-medium text-white/60">Темна тема завжди активна</p>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 from-blue-400 to-purple-600 shadow-md">
            <Check className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg font-semibold text-white/80">Темна</span>
        </div>
      </div>

      <div className="glass-panel rounded-[28px] p-5 sm:p-6 lg:p-8">
        <h3 className="mb-3 text-2xl font-bold text-white">Про додаток</h3>
        <p className="text-base font-medium text-white/60">AuroraTunes v1.0.0</p>
        <p className="mt-3 text-base font-medium text-white/40">
          Музичний плеєр у сучасному стилі з напівпрозорими елементами
        </p>
      </div>
    </div>
  )
}
