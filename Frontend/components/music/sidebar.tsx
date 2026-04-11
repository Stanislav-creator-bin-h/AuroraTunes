"use client"

import { Home, Search, LibraryBig, Settings, Heart, ListMusic, Radio, User, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navItems = [
  { id: "home", icon: Home, label: "Головна" },
  { id: "now-playing", icon: Play, label: "Зараз грає" },
  { id: "search", icon: Search, label: "Пошук" },
  { id: "library", icon: LibraryBig, label: "Бібліотека" },
]

const libraryItems = [
  { id: "liked", icon: Heart, label: "Вподобані" },
  { id: "playlists", icon: ListMusic, label: "Плейлисти" },
  { id: "radio", icon: Radio, label: "Радіо" },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside 
      className={cn(
        // 1. ЗМЕНШЕННЯ ШИРИНИ ТА ВІДСТУПІВ
        "w-[58px] h-fit max-h-[calc(100vh-40px)] ml-3 my-auto", 
        // 2. ПРОЗОРІСТЬ 50%
        "bg-[#121212]/50 backdrop-blur-2xl", 
        "rounded-[20px] flex flex-col items-center py-4 border border-white/5 shadow-2xl"
      )}
    >
      
      {/* Лого - зробив меншим */}
      <div className="mb-6">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center">
          <span className="text-white/30 text-xs">♪</span>
        </div>
      </div>

      {/* Навігація - зменшено GAP (відступ між іконками) з 5 до 3 */}
      <nav className="flex flex-col items-center gap-3 w-full">
        <div className="flex flex-col gap-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300",
                activeTab === item.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-[20px] h-[20px]", // Зменшено іконки з 24px до 20px
                item.id === "now-playing" && activeTab === item.id && "fill-current"
              )} />
            </button>
          ))}
        </div>

        {/* Тонка лінія розриву */}
        <div className="w-6 h-px bg-white/5 my-1" />

        <div className="flex flex-col gap-3">
          {libraryItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg transition-all",
                activeTab === item.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              )}
            >
              <item.icon className="w-[20px] h-[20px]" />
            </button>
          ))}
        </div>
      </nav>

      {/* Нижня частина - компактна */}
      <div className="mt-6 flex flex-col items-center gap-4 pt-4 border-t border-white/5">
        <button
          onClick={() => onTabChange("settings")}
          className="text-white/40 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => onTabChange("profile")}
          className={cn(
            "w-8 h-8 rounded-full border transition-all overflow-hidden",
            activeTab === "profile" ? "border-white" : "border-white/10"
          )}
        >
          <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
             <User className="w-4 h-4 text-white/40" />
          </div>
        </button>
      </div>
    </aside>
  )
}