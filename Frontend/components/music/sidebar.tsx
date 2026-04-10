"use client"

import { Home, Search, Library, Settings, Heart, ListMusic, Radio, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navItems = [
  { id: "home", icon: Home },
  { id: "search", icon: Search },
  { id: "library", icon: Library },
]

const libraryItems = [
  { id: "liked", icon: Heart },
  { id: "playlists", icon: ListMusic },
  { id: "radio", icon: Radio },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user } = useAuth()
  
  return (
    <aside className="w-20 h-screen bg-black/90 flex flex-col items-center py-4 border-r border-white/5">
      {/* Logo */}
      <div className="mb-6 flex justify-center w-full">
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
          <span className="text-white text-xl">{"♪"}</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="w-full flex flex-col items-center px-3 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            title={item.id} // Додає підказку при наведенні миші
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200",
              "hover:bg-white/10",
              activeTab === item.id
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white"
            )}
          >
            <item.icon className="w-6 h-6 shrink-0" />
          </button>
        ))}

        <div className="py-3 w-full flex justify-center">
          <div className="w-8 h-px bg-white/10" />
        </div>

        {libraryItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            title={item.id}
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200",
              "hover:bg-white/10",
              activeTab === item.id
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white"
            )}
          >
            <item.icon className="w-6 h-6 shrink-0" />
          </button>
        ))}
      </nav>

      {/* Profile & Settings */}
      <div className="w-full flex flex-col items-center px-3 pt-4 border-t border-white/10 space-y-2">
        <button
          onClick={() => onTabChange("profile")}
          title="Профіль"
          className={cn(
            "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200",
            "hover:bg-white/10",
            activeTab === "profile"
              ? "bg-white/15 text-white"
              : "text-white/60 hover:text-white"
          )}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <User className="w-6 h-6 shrink-0" />
          )}
        </button>
        <button
          onClick={() => onTabChange("settings")}
          title="Налаштування"
          className={cn(
            "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200",
            "hover:bg-white/10",
            activeTab === "settings"
              ? "bg-white/15 text-white"
              : "text-white/60 hover:text-white"
          )}
        >
          <Settings className="w-6 h-6 shrink-0" />
        </button>
      </div>
    </aside>
  )
}