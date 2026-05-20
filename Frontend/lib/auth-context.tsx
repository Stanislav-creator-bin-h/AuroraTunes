"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  clearAuthToken,
  createBackground,
  deleteBackground,
  getBackgrounds,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  setAuthToken,
  updateCurrentUser,
} from "./api"
import type { CustomBackground, User } from "./types"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (username: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateAvatar: (avatarUrl: string) => void
  addCustomBackground: (imageUrl: string) => void
  removeCustomBackground: (imageUrl: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [backgrounds, setBackgrounds] = useState<CustomBackground[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const applyUserBackgrounds = (nextUser: User, nextBackgrounds: CustomBackground[]) => {
    setUser({
      ...nextUser,
      customBackgrounds: nextBackgrounds.map((background) => background.imageUrl),
    })
    setBackgrounds(nextBackgrounds)
  }

  const refreshUser = async (fallbackUser?: User) => {
    const nextUser = fallbackUser ?? await getCurrentUser()
    const nextBackgrounds = await getBackgrounds().catch(() => [])
    applyUserBackgrounds(nextUser, nextBackgrounds)
  }

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const currentUser = await getCurrentUser()
        if (!cancelled) {
          await refreshUser(currentUser)
        }
      } catch {
        clearAuthToken()
        if (!cancelled) {
          setUser(null)
          setBackgrounds([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await loginUser(email, password)
      setAuthToken(response.token)
      await refreshUser(response.user)
      return true
    } catch {
      return false
    }
  }

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await registerUser(username, email, password)
      setAuthToken(response.token)
      await refreshUser(response.user)
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    logoutUser()
    clearAuthToken()
    setUser(null)
    setBackgrounds([])
  }

  const updateAvatar = async (avatarUrl: string) => {
    if (!user) return
    const previous = user
    setUser({ ...user, avatar: avatarUrl })

    try {
      const updated = await updateCurrentUser({ avatarUrl })
      setUser({ ...updated, customBackgrounds: previous.customBackgrounds })
    } catch {
      setUser(previous)
    }
  }

  const addCustomBackground = async (imageUrl: string) => {
    if (!user) return

    const optimisticBackground: CustomBackground = {
      id: `local-${crypto.randomUUID()}`,
      userId: user.id,
      imageUrl,
      createdAt: new Date().toISOString(),
    }
    const previousBackgrounds = backgrounds
    applyUserBackgrounds(user, [optimisticBackground, ...backgrounds])

    try {
      const saved = await createBackground(imageUrl)
      applyUserBackgrounds(user, [saved, ...previousBackgrounds])
    } catch {
      applyUserBackgrounds(user, previousBackgrounds)
    }
  }

  const removeCustomBackground = async (imageUrl: string) => {
    if (!user) return

    const target = backgrounds.find((background) => background.imageUrl === imageUrl)
    const previousBackgrounds = backgrounds
    const nextBackgrounds = backgrounds.filter((background) => background.imageUrl !== imageUrl)
    applyUserBackgrounds(user, nextBackgrounds)

    if (!target || target.id.startsWith("local-")) return

    try {
      await deleteBackground(target.id)
    } catch {
      applyUserBackgrounds(user, previousBackgrounds)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateAvatar,
        addCustomBackground,
        removeCustomBackground,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
