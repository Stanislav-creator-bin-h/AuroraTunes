"use client"

import { Sparkles } from "lucide-react"
import { AI_ASSISTANT_ENABLED, getAiAssistantStatus } from "@/lib/ai/assistant"

const PAGE = "h-full min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white/[0.02] to-transparent px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"

export function AiPanel() {
  const status = getAiAssistantStatus()

  return (
    <div className={PAGE}>
      <div className="glass-panel mx-auto flex max-w-lg flex-col items-center rounded-[28px] px-8 py-14 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 ring-1 ring-white/15">
          <Sparkles className="h-10 w-10 text-violet-300" />
        </div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">AI-помічник</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/50 sm:text-base">
          Розділ підключено. Код асистента буде в{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">lib/ai/assistant.ts</code>
        </p>
        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/35">
          Статус: {AI_ASSISTANT_ENABLED ? status : "скоро"}
        </p>
      </div>
    </div>
  )
}
