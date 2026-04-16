"use client"

import { Home, Search, LibraryBig, Settings, Heart, ListMusic, Radio, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navItems = [
  { id: "home", icon: Home, label: "Home" },
  { id: "search", icon: Search, label: "Search" },
  { id: "library", icon: LibraryBig, label: "Library" },
  { id: "liked", icon: Heart, label: "Liked" },
  { id: "playlists", icon: ListMusic, label: "Playlists" },
  { id: "radio", icon: Radio, label: "Radio" },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside
  className={cn(
    "glass-panel-sidebar shrink-0 flex flex-col items-center",
    "h-[calc(100vh-140px)] w-[64px] my-auto ml-4", 
    "rounded-[20px] z-40 py-6",
  )}
>
      {/* Логотип зверху */}
      <div className="mb-4 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs font-bold text-white/60">A</span>
        </div>
      </div>

      {/* ГРУПА ІКОНОК ПО ЦЕНТРУ (як у Win11) */}
      <nav className="flex-1 w-full flex flex-col items-center justify-center gap-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center transition-all duration-300 my-0.5",
              activeTab === item.id ? "text-white" : "text-white/80 hover:text-white"
            )}
            title={item.label}
          >
            {/* Індикатор активності */}
            {activeTab === item.id && (
              <div className="absolute left-[-12px] h-4 w-1 rounded-r-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            )}
            
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
              activeTab === item.id ? "bg-white/10 scale-105" : "group-hover:bg-white/5"
            )}>
              <item.icon className="h-[18px] w-[18px]" />
            </div>
          </button>
        ))}
      </nav>

      {/* Налаштування та Профіль знизу */}
      <div className="mt-4 flex flex-col items-center gap-3 shrink-0">
        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
            activeTab === "settings" ? "bg-white/10 text-white" : "text-white/80 hover:text-white"
          )}
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
        
        <button
          onClick={() => onTabChange("profile")}
          className={cn(
            "h-9 w-9 overflow-hidden rounded-xl border-2 transition-all duration-300",
            activeTab === "profile" ? "border-white" : "border-transparent opacity-80 hover:opacity-100"
          )}
        >
          <div className="flex h-full w-full items-center justify-center bg-neutral-800">
            <User className="h-4 w-4 text-white/80" />
          </div>
        </button>
      </div>
    </aside>
  )
}