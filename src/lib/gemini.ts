// Minimal Google Gemini client using the REST API directly via fetch, so the
// project doesn't need an SDK dependency for a single call.
// Docs: https://ai.google.dev/api/generate-content
//
// Server-only: reads GEMINI_API_KEY.

import type { ChatMessage } from "@/types";

// Google recommends the 3.5 Flash-Lite model for new projects: fast and the
// cheapest option, which suits short event Q&A. Access to the older 2.5
// models is restricted to keys that have used them before.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Gemini counts any internal "thinking" tokens towards this limit too, so it
// is set well above the length of a typical answer.
const MAX_OUTPUT_TOKENS = 1024;
const TIMEOUT_MS = 20_000;

export type GeminiErrorKind = "not_configured" | "auth" | "rate_limited" | "blocked" | "failed";

export class GeminiError extends Error {
  constructor(
    public kind: GeminiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

interface GeminiPart {
  text?: string;
  /** Internal reasoning, not part of the answer. */
  thought?: boolean;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

/** Sends a conversation to Gemini and returns the reply text. Throws GeminiError on failure. */
export async function generateReply(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiError("not_configured", "GEMINI_API_KEY is not set.");
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header rather than ?key= so the key never appears in URLs or logs.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        // Gemini calls the assistant's turns "model".
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        // Low temperature: answers should stick closely to the event facts.
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new GeminiError("failed", timedOut ? "Gemini took too long to respond." : `Couldn't reach Gemini: ${error}`);
  }

  const data: GeminiResponse = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 429) throw new GeminiError("rate_limited", detail);
    // An invalid key comes back as 400/401/403 depending on the failure.
    if (response.status === 401 || response.status === 403 || /api key/i.test(detail)) {
      throw new GeminiError("auth", detail);
    }
    throw new GeminiError("failed", detail);
  }

  if (data.promptFeedback?.blockReason) {
    throw new GeminiError("blocked", `Prompt blocked: ${data.promptFeedback.blockReason}`);
  }

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join("")
    .trim();

  if (!text) {
    const reason = candidate?.finishReason ?? "no candidates";
    throw new GeminiError(reason === "SAFETY" ? "blocked" : "failed", `Empty reply (${reason}).`);
  }
  return text;
}
