"use client"

import { useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, LogOut, Upload, Trash2, Image as ImageIcon, AlertCircle } from "lucide-react"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

export function AuthPanel() {
  const { user, login, register, logout, updateAvatar, addCustomBackground, removeCustomBackground } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (isLogin) {
        const success = await login(email, password)
        if (!success) {
          setError("Невірний email або пароль")
        }
      } else {
        if (username.length < 3) {
          setError("Ім'я користувача має бути мінімум 3 символи")
          setIsLoading(false)
          return
        }
        const success = await register(username, email, password)
        if (!success) {
          setError("Користувач з таким email вже існує")
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLogin, email, password, username, login, register])

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadError("")
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Підтримуються тільки JPG, PNG, GIF та WebP")
      return
    }
    
    if (file.size > MAX_AVATAR_SIZE) {
      setUploadError("Аватар занадто великий (макс. 2MB)")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      updateAvatar(result)
    }
    reader.readAsDataURL(file)
    
    if (avatarInputRef.current) avatarInputRef.current.value = ""
  }, [updateAvatar])

  const handleBackgroundUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadError("")
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Підтримуються тільки JPG, PNG, GIF та WebP")
      return
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Файл занадто великий (макс. 10MB)")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      addCustomBackground(result)
    }
    reader.readAsDataURL(file)
    
    if (bgInputRef.current) bgInputRef.current.value = ""
  }, [addCustomBackground])

  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-10 shadow-lg">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white text-center mb-8">
            {isLogin ? "Вхід" : "Реєстрація"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-3">
                  {"Ім'я користувача"}
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/10 border-white/20 text-white text-base h-12 rounded-lg"
                  placeholder="username"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-white/70 text-sm font-semibold mb-3">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white text-base h-12 rounded-lg"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm font-semibold mb-3">Пароль</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white text-base h-12 rounded-lg"
                placeholder="********"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-red-400 text-base text-center font-medium">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-400 to-purple-600 text-white hover:from-blue-500 hover:to-purple-700 text-base font-bold h-12 rounded-lg"
            >
              {isLoading ? "Завантаження..." : isLogin ? "Увійти" : "Зареєструватися"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError("")
              }}
              className="text-white/60 hover:text-white text-base font-medium transition-colors"
            >
              {isLogin ? "Немає акаунту? Зареєструватися" : "Вже є акаунт? Увійти"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Upload Error */}
      {uploadError && (
        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-400 text-base font-medium">{uploadError}</p>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-lg border border-white/20">
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-14 h-14 text-white/60" />
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-all duration-200 hover:bg-black/70"
            >
              <Upload className="w-7 h-7 text-white" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{user.username}</h2>
            <p className="text-white/60 text-base font-medium">{user.email}</p>
            <p className="text-white/40 text-sm mt-2 font-medium">
              Зареєстровано: {new Date(user.createdAt).toLocaleDateString("uk-UA")}
            </p>
          </div>

          <Button
            onClick={logout}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/15 font-semibold"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Вийти
          </Button>
        </div>
      </div>

      {/* Custom Backgrounds */}
      <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Мої фони</h3>
          <Button
            onClick={() => bgInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="border-white/30 text-white hover:bg-white/15 font-semibold"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Додати фон
          </Button>
          <input
            ref={bgInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleBackgroundUpload}
            className="hidden"
          />
        </div>

        {user.customBackgrounds.length === 0 ? (
          <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl p-12 text-center">
            <ImageIcon className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/50 text-lg font-semibold">Немає завантажених фонів</p>
            <p className="text-white/40 text-base mt-2 font-medium">Завантажте зображення (JPG, PNG, GIF, WebP до 10MB)</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {user.customBackgrounds.map((bg, index) => (
              <div key={index} className="relative group aspect-video rounded-xl overflow-hidden shadow-md border border-white/15">
                <img src={bg} alt={`Background ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeCustomBackground(bg)}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
