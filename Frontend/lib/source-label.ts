export function getSourceLabel(source?: string): string | null {
  if (source === "youtube") return "YouTube"
  if (source === "soundcloud") return "SoundCloud"
  return null
}

export function getSourceBadgeClass(source?: string): string {
  if (source === "youtube") return "text-red-400/90"
  if (source === "soundcloud") return "text-orange-400/90"
  return "text-white/50"
}
