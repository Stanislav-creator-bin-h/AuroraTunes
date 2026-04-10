"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface User {
  id: string
  username: string
  email: string
  avatar: string | null
  createdAt: string
  customBackgrounds: string[]
}

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

const STORAGE_KEY = "aurora_user"
const USERS_KEY = "aurora_users"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const saveUser = (userData: User) => {
    setUser(userData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    
    // Update in users list
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]")
    const idx = users.findIndex((u: User) => u.id === userData.id)
    if (idx >= 0) {
      users[idx] = userData
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]")
    const found = users.find((u: User & { password: string }) => 
      u.email === email && u.password === password
    )
    
    if (found) {
      const { password: _, ...userData } = found
      saveUser(userData)
      return true
    }
    return false
  }

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]")
    
    if (users.some((u: User) => u.email === email)) {
      return false
    }

    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      username,
      email,
      password,
      avatar: null,
      createdAt: new Date().toISOString(),
      customBackgrounds: []
    }

    users.push(newUser)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))

    const { password: _, ...userData } = newUser
    saveUser(userData)
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const updateAvatar = (avatarUrl: string) => {
    if (user) {
      saveUser({ ...user, avatar: avatarUrl })
    }
  }

  const addCustomBackground = (imageUrl: string) => {
    if (user) {
      const updated = {
        ...user,
        customBackgrounds: [...user.customBackgrounds, imageUrl]
      }
      saveUser(updated)
    }
  }

  const removeCustomBackground = (imageUrl: string) => {
    if (user) {
      const updated = {
        ...user,
        customBackgrounds: user.customBackgrounds.filter(bg => bg !== imageUrl)
      }
      saveUser(updated)
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
        removeCustomBackground
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
