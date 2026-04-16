"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface BackgroundContextType {
  backgroundUrl: string
  brightness: number
  setBackgroundUrl: (url: string) => void
  setBrightness: (value: number) => void
}

const BackgroundContext = createContext<BackgroundContextType | null>(null)

const defaultBackgrounds = [
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1920&q=80",
  "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?w=1920&q=80",
]

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [backgroundUrl, setBackgroundUrl] = useState(defaultBackgrounds[0])
  const [brightness, setBrightness] = useState(50)

  return (
    <BackgroundContext.Provider value={{ backgroundUrl, brightness, setBackgroundUrl, setBrightness }}>
      {children}
    </BackgroundContext.Provider>
  )
}

export function useBackground() {
  const context = useContext(BackgroundContext)
  if (!context) {
    throw new Error("useBackground must be used within BackgroundProvider")
  }
  return context
}

export { defaultBackgrounds }
