"use client"

import { Home, Search, LibraryBig, Settings, Heart, ListMusic, Radio, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navItems = [
  { id: "home", icon: Home, label: "Головна" },
  { id: "search", icon: Search, label: "Пошук" },
  { id: "library", icon: LibraryBig, label: "Бібліотека" },
  { id: "liked", icon: Heart, label: "Вподобані" },
  { id: "playlists", icon: ListMusic, label: "Плейлисти" },
  { id: "radio", icon: Radio, label: "Радіо" },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside
      className={cn(
        "glass-panel-sidebar z-40 shrink-0 rounded-[24px] border border-white/12",
        "mx-2 mt-2 flex flex-col gap-3 p-3",
        "lg:m-0 lg:h-full lg:w-[84px] lg:items-center lg:rounded-[28px] lg:px-3 lg:py-5",
      )}
    >
      <div className="hidden shrink-0 lg:block">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <span className="text-xs font-bold text-white/60">A</span>
        </div>
      </div>

      <nav className="flex min-h-0 w-full flex-1 gap-2 overflow-x-auto overflow-y-hidden lg:flex-col lg:items-center lg:justify-center lg:overflow-x-hidden lg:overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "group relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
              "lg:h-11 lg:w-11 lg:justify-center lg:px-0 lg:py-0",
              activeTab === item.id
                ? "bg-white/12 text-white shadow-[0_14px_36px_-20px_rgba(255,255,255,0.65)]"
                : "text-white/62 hover:bg-white/8 hover:text-white"
            )}
            title={item.label}
          >
            {activeTab === item.id && (
              <div className="absolute inset-y-2 left-0 hidden w-1 rounded-r-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] lg:block" />
            )}

            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                activeTab === item.id ? "bg-white/12 lg:scale-105" : "group-hover:bg-white/5"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
            </div>
            <span className="pr-1 lg:hidden">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex shrink-0 gap-2 border-t border-white/8 pt-3 lg:mt-2 lg:flex-col lg:items-center lg:border-t-0 lg:pt-0">
        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 transition-all lg:w-10 lg:px-0",
            activeTab === "settings" ? "bg-white/12 text-white" : "text-white/62 hover:bg-white/8 hover:text-white"
          )}
          title="Налаштування"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>

        <button
          onClick={() => onTabChange("profile")}
          className={cn(
            "h-10 w-10 overflow-hidden rounded-2xl border-2 transition-all duration-300",
            activeTab === "profile" ? "border-white" : "border-transparent opacity-80 hover:opacity-100"
          )}
          title="Профіль"
        >
          <div className="flex h-full w-full items-center justify-center bg-neutral-800">
            <User className="h-4 w-4 text-white/80" />
          </div>
        </button>
      </div>
    </aside>
  )
}
