"use client"

import { Search, X } from "lucide-react"
import { useState, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { useEffect } from "react"

interface SearchBarProps {
  onSearch: (query: string) => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    onSearch(debouncedQuery)
  }, [debouncedQuery, onSearch])

  const clearSearch = useCallback(() => {
    setQuery("")
  }, [])

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Шукати треки, виконавців..."
        className="w-full pl-12 pr-10 py-3 bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl
                   text-white text-base placeholder:text-white/50 font-medium
                   focus:outline-none focus:border-white/30 focus:bg-white/12
                   transition-all duration-300 shadow-md"
      />
      {query && (
        <button
          onClick={clearSearch}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors hover:scale-110 duration-200"
        >
          <X className="w-4 h-4 text-white/50 hover:text-white" />
        </button>
      )}
    </div>
  )
}
