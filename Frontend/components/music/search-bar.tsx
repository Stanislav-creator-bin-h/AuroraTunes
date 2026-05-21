"use client"

import { Search, X } from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"
import { useDebounce } from "@/hooks/use-debounce"

export type SearchSource = "youtube" | "soundcloud"

interface SearchBarProps {
  onSearch: (query: string) => void
  onSourceChange?: (source: SearchSource) => void
  source?: SearchSource
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function SoundCloudIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.057 0 .09-.035.104-.094l.199-1.282-.199-1.332c-.014-.057-.047-.094-.104-.094zm1.848-1.6c-.064 0-.104.044-.11.108l-.221 2.918.221 2.768c.006.063.046.108.11.108.061 0 .104-.045.108-.108l.248-2.768-.248-2.918c-.004-.064-.047-.108-.108-.108zm.904-.806c-.073 0-.12.05-.124.125l-.209 3.724.209 3.567c.004.075.05.125.124.125.073 0 .118-.05.124-.125l.234-3.567-.234-3.724c-.006-.075-.05-.125-.124-.125zm.932-.598c-.083 0-.135.06-.14.14l-.193 4.322.193 4.027c.005.083.057.14.14.14.08 0 .135-.057.14-.14l.222-4.027-.222-4.322c-.005-.08-.06-.14-.14-.14zm.933-.25c-.09 0-.148.065-.152.155l-.18 4.572.18 4.273c.004.09.062.155.152.155.088 0 .148-.065.152-.155l.204-4.273-.204-4.572c-.004-.09-.064-.155-.152-.155zm.976-.4c-.098 0-.163.074-.166.17l-.168 4.972.168 4.47c.003.1.068.17.166.17.096 0 .163-.07.166-.17l.19-4.47-.19-4.972c-.003-.096-.07-.17-.166-.17zm.99-.296c-.11 0-.178.08-.18.186l-.155 5.268.155 4.6c.002.107.07.186.18.186.107 0 .178-.08.18-.186l.176-4.6-.176-5.268c-.002-.106-.073-.186-.18-.186zm1.01-.156c-.117 0-.19.09-.192.2l-.143 5.424.143 4.69c.002.114.075.2.192.2.115 0 .19-.086.192-.2l.162-4.69-.162-5.424c-.002-.11-.077-.2-.192-.2zm1.04-.176c-.126 0-.203.098-.205.217l-.13 5.6.13 4.728c.002.12.079.217.205.217.124 0 .203-.097.204-.217l.148-4.728-.148-5.6c-.001-.12-.08-.217-.204-.217zm1.063-.09c-.135 0-.214.105-.215.232l-.118 5.69.118 4.745c.001.128.08.232.215.232.133 0 .214-.104.215-.232l.134-4.745-.134-5.69c-.001-.127-.082-.231-.215-.231zm1.12.296c-.142 0-.226.113-.228.248l-.104 5.394.104 4.74c.002.136.086.248.228.248.14 0 .226-.112.227-.248l.118-4.74-.118-5.394c-.001-.135-.087-.248-.227-.248zm1.073-.652c-.15 0-.238.12-.24.263l-.092 6.046.092 4.724c.002.144.09.263.24.263.148 0 .238-.12.239-.263l.104-4.724-.104-6.046c-.001-.143-.091-.263-.24-.263zm1.895.236c-.032-.018-.07-.027-.108-.027-.04 0-.076.009-.108.027-.064.036-.106.104-.108.183l-.082 5.826.082 4.686c.002.08.044.147.108.184.032.018.068.027.108.027.04 0 .076-.009.108-.027.064-.037.106-.104.108-.184l.093-4.686-.093-5.826c-.002-.08-.044-.147-.108-.183zm3.143-1.018c-.166 0-.305.053-.425.152-.096-.97-.54-1.843-1.195-2.473-.66-.635-1.54-.99-2.475-.99-.376 0-.747.067-1.1.194-.13.047-.165.098-.168.193v9.16c.003.098.068.18.162.198.016.003 5.2.005 5.2.005.878 0 1.59-.72 1.59-1.603 0-.884-.712-1.603-1.59-1.603z" />
    </svg>
  )
}

export function SearchBar({ onSearch, onSourceChange, source = "youtube" }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onSearch(debouncedQuery)
  }, [debouncedQuery])

  const clearSearch = useCallback(() => setQuery(""), [])

  return (
    <div className="flex items-center gap-2">
      {/* Search input */}
      <div className="relative group flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 transition-colors group-focus-within:text-white/70" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Шукати треки, виконавців..."
          className="
            w-full pl-11 pr-10 py-3
            bg-white/[0.07] hover:bg-white/[0.10] focus:bg-white/[0.10]
            backdrop-blur-xl
            border border-white/[0.10] focus:border-white/[0.25]
            rounded-2xl
            text-white text-sm placeholder:text-white/40
            outline-none
            transition-all duration-200
          "
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/[0.10] transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/50 hover:text-white transition-colors" />
          </button>
        )}
      </div>

      {/* Source toggle */}
      <div className="relative flex shrink-0 rounded-2xl border border-white/[0.10] bg-white/[0.07] backdrop-blur-xl p-1 gap-0.5">
        {/* Animated highlight */}
        <div
          className="absolute top-1 bottom-1 rounded-xl bg-white/[0.12] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: "calc(50% - 4px)",
            left: source === "youtube" ? "4px" : "calc(50% + 0px)",
          }}
        />

        <button
          onClick={() => onSourceChange?.("youtube")}
          className={`
            relative z-10 flex items-center gap-1.5 rounded-xl px-3 py-2
            text-xs font-medium transition-all duration-200
            ${source === "youtube"
              ? "text-red-400"
              : "text-white/40 hover:text-white/60"
            }
          `}
          title="YouTube"
        >
          <YouTubeIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">YT</span>
        </button>

        <button
          onClick={() => onSourceChange?.("soundcloud")}
          className={`
            relative z-10 flex items-center gap-1.5 rounded-xl px-3 py-2
            text-xs font-medium transition-all duration-200
            ${source === "soundcloud"
              ? "text-orange-400"
              : "text-white/40 hover:text-white/60"
            }
          `}
          title="SoundCloud"
        >
          <SoundCloudIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SC</span>
        </button>
      </div>
    </div>
  )
}