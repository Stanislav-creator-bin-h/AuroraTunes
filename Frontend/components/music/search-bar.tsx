"use client"

import { Search, X } from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchBarProps {
  onSearch: (query: string) => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
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
    <div className="relative group">
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
  )
}