"use client"

import { useRef, useState, useCallback, memo } from "react"
import { Check, Upload, Trash2, Image as ImageIcon, AlertCircle } from "lucide-react"
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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

interface BackgroundItemProps {
  url: string
  index: number
  isSelected: boolean
  isUserBg: boolean
  onSelect: () => void
  onDelete: () => void
}

const BackgroundItem = memo(function BackgroundItem({ 
  url, index, isSelected, isUserBg, onSelect, onDelete 
}: BackgroundItemProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  
  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={cn(
          "relative aspect-video w-full rounded-xl overflow-hidden border-2 transition-all duration-300 shadow-md hover:shadow-lg",
          isSelected
            ? "border-white ring-2 ring-white/40 scale-105"
            : "border-white/15 hover:border-white/30 hover:scale-102"
        )}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-white/8 animate-pulse flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white/20" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400/50" />
          </div>
        ) : (
          <img
            src={url}
            alt={`Фон ${index + 1}`}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
          />
        )}
        {isSelected && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <Check className="w-5 h-5 text-black" />
            </div>
          </div>
        )}
      </button>
      {isUserBg && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  )
})

export function SettingsPanel() {
  const { backgroundUrl, setBackgroundUrl } = useBackground()
  const { user, addCustomBackground, removeCustomBackground } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const allBackgrounds = [
    ...defaultBackgrounds,
    ...extraBackgrounds,
    ...(user?.customBackgrounds || [])
  ]

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Підтримуються тільки JPG, PNG, GIF та WebP")
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Файл занадто великий (макс. 10MB)")
      return
    }

    setIsUploading(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      addCustomBackground(result)
      setBackgroundUrl(result)
      setIsUploading(false)
    }
    reader.onerror = () => {
      setUploadError("Помилка читання файлу")
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [addCustomBackground, setBackgroundUrl])

  const handleDeleteBackground = useCallback((url: string) => {
    removeCustomBackground(url)
    if (backgroundUrl === url) {
      setBackgroundUrl(defaultBackgrounds[0])
    }
  }, [backgroundUrl, removeCustomBackground, setBackgroundUrl])

  const isUserBackground = useCallback((url: string) => {
    return user?.customBackgrounds?.includes(url) ?? false
  }, [user?.customBackgrounds])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-white mb-3">Настройки</h2>
        <p className="text-white/60 text-base font-medium">Кастомізуйте свій плеєр</p>
      </div>

      {/* Background Selection */}
      <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white">Фон</h3>
            <p className="text-white/60 text-base font-medium">Виберіть фонове зображення</p>
          </div>
          {user && (
            <>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/15 font-medium"
              >
                <Upload className="w-4 h-4 mr-2" />
                Завантажити
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allBackgrounds.map((url, index) => (
            <BackgroundItem
              key={url}
              url={url}
              index={index}
              isSelected={backgroundUrl === url}
              isUserBg={isUserBackground(url)}
              onSelect={() => setBackgroundUrl(url)}
              onDelete={() => handleDeleteBackground(url)}
            />
          ))}
        </div>
        
        {uploadError && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-base font-medium">{uploadError}</p>
          </div>
        )}
        
        {isUploading && (
          <div className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-xl">
            <p className="text-white/70 text-base font-medium">Завантаження...</p>
          </div>
        )}
        
        <p className="text-white/50 text-sm mt-6 font-medium">
          Підтримуються: JPG, PNG, GIF, WebP (макс. 10MB)
        </p>
        
        {!user && (
          <p className="text-white/50 text-base mt-6 text-center font-medium">
            Увійдіть в профіль, щоб завантажувати власні фони
          </p>
        )}
      </div>

      {/* Theme Section */}
      <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-8 shadow-lg">
        <h3 className="text-2xl font-bold text-white mb-4">Тема</h3>
        <p className="text-white/60 text-base font-medium mb-5">Темна тема завжди активна</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600 border border-white/20 flex items-center justify-center shadow-md">
            <Check className="w-6 h-6 text-white font-bold" />
          </div>
          <span className="text-white/80 text-lg font-semibold">Темна</span>
        </div>
      </div>

      {/* About */}
      <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-8 shadow-lg">
        <h3 className="text-2xl font-bold text-white mb-3">Про додаток</h3>
        <p className="text-white/60 text-base font-medium">AuroraTunes v1.0.0</p>
        <p className="text-white/40 text-base mt-3 font-medium">
          Музичний плеєр у сучасному стилі з напівпрозорими елементами
        </p>
      </div>
    </div>
  )
}
