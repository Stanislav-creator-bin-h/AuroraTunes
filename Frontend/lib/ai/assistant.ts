/**
 * AI assistant module — logic will be implemented here later.
 * Connected from the sidebar "AI" tab via AiPanel.
 */

export const AI_ASSISTANT_ENABLED = false

export type AiAssistantStatus = "idle" | "loading" | "ready" | "error"

export function getAiAssistantStatus(): AiAssistantStatus {
  return AI_ASSISTANT_ENABLED ? "ready" : "idle"
}
