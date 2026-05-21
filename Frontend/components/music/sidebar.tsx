"use client"

import { Home, Search, LibraryBig, Settings, Heart, ListMusic, Radio, User, Sparkles } from "lucide-react"
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
  { id: "ai", icon: Sparkles, label: "AI" },
  { id: "settings", icon: Settings, label: "Налаштування" },
]

function NavButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: typeof Home
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
        "lg:h-11 lg:w-11 lg:justify-center lg:px-0 lg:py-0",
        active
          ? "bg-white/12 text-white shadow-[0_14px_36px_-20px_rgba(255,255,255,0.65)]"
          : "text-white/62 hover:bg-white/8 hover:text-white",
      )}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <div className="absolute inset-y-2 left-0 hidden w-1 rounded-r-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] lg:block" />
      )}
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
          active ? "bg-white/12 lg:scale-105" : "group-hover:bg-white/5",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <span className="pr-1 lg:hidden">{label}</span>
    </button>
  )
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside
      className={cn(
        "glass-panel-sidebar z-40 flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-[24px] border border-white/12",
        "mx-2 mt-2 p-3",
        "lg:m-0 lg:h-full lg:w-[84px] lg:items-stretch lg:rounded-[28px] lg:px-3 lg:py-4",
      )}
    >
      <div className="mb-3 hidden shrink-0 lg:flex lg:justify-center">
        <div className="flex h-12 w-12 items-center justify-center">
          <img
            src="/Icon/AuroraTune_icon_White2.png"
            alt="AuroraTunes Logo"
            className="h-full w-full object-contain invert saturate-0 opacity-90 transition-opacity hover:opacity-100"
          />
        </div>
      </div>

      <nav
        className={cn(
          "flex min-h-0 flex-1 gap-2",
          "flex-row overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1",
          "lg:flex-col lg:items-center lg:gap-1.5 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-y-contain lg:pb-0",
        )}
      >
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            active={activeTab === item.id}
            label={item.label}
            icon={item.icon}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </nav>

      <div className="mt-2 flex shrink-0 items-center justify-end border-t border-white/8 pt-3 lg:mt-auto lg:justify-center lg:border-t lg:border-white/10 lg:pt-3">
        <button
          type="button"
          onClick={() => onTabChange("profile")}
          className={cn(
            "flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border-2 transition-all duration-300",
            activeTab === "profile" ? "border-white bg-white/10" : "border-transparent bg-neutral-800/80 opacity-90 hover:opacity-100",
          )}
          title="Профіль"
          aria-label="Профіль"
          aria-current={activeTab === "profile" ? "page" : undefined}
        >
          <User className="h-4 w-4 text-white/80" />
        </button>
      </div>
    </aside>
  )
}
