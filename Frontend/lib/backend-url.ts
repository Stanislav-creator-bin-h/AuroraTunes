/**
 * Backend URL resolution:
 * - NEXT_PUBLIC_BACKEND_BASE_URL if set (Electron / static build)
 * - otherwise /api (proxied to Flask by next.config rewrites in `next dev`)
 */
export function getBackendBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "")
  }
  return "/api"
}

export function getBackendUnreachableMessage(): string {
  const base = getBackendBaseUrl()
  if (base.startsWith("/")) {
    return "Backend недоступний. Запустіть Flask: cd Backend && python main.py (порт 5000)."
  }
  return `Backend недоступний за адресою ${base}. Перевірте, чи запущений сервер.`
}
