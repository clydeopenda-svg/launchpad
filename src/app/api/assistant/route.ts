import { buildAssistantPrompt } from "@/lib/assistantPrompt";
import { getAttendanceStats, getPolls } from "@/lib/db/queries";
import { GeminiError, generateReply, type GeminiErrorKind } from "@/lib/gemini";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import type { ChatMessage } from "@/types";

// This endpoint is public and every call spends Gemini quota, so input is
// capped: message length, how much history is sent, and requests per visitor.
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY = 10;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 5 * 60 * 1000;

// What the attendee sees for each failure. Technical details are logged on
// the server only.
const errorResponses: Record<GeminiErrorKind, { status: number; message: string }> = {
  not_configured: { status: 503, message: "The assistant isn't set up yet. Please ask at the check-in desk." },
  auth: { status: 503, message: "The assistant is unavailable right now. Please ask at the check-in desk." },
  rate_limited: { status: 503, message: "The assistant is very busy. Please try again in a minute." },
  blocked: { status: 422, message: "Sorry, I can't help with that. Try asking about the event." },
  failed: { status: 502, message: "The assistant couldn't answer just now. Please try again." },
};

function isChatMessage(value: unknown): value is ChatMessage {
  const m = value as ChatMessage;
  return (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string";
}

/** POST /api/assistant  { messages: ChatMessage[] } → { reply } */
export async function POST(request: Request) {
  if (!rateLimit(`assistant:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return Response.json(
      { error: "You've asked a lot of questions! Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const messages: unknown = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isChatMessage)) {
    return Response.json({ error: "messages must be a non-empty list of chat messages." }, { status: 400 });
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user" || !last.content.trim()) {
    return Response.json({ error: "The last message must be a question." }, { status: 400 });
  }
  if (last.content.length > MAX_MESSAGE_CHARS) {
    return Response.json({ error: `Please keep questions under ${MAX_MESSAGE_CHARS} characters.` }, { status: 400 });
  }

  // Recent history only; older turns add cost without helping short Q&A.
  // Gemini expects the conversation to start with a user turn.
  let history = messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS * 4) }));
  while (history.length && history[0].role !== "user") history = history.slice(1);

  try {
    // Fetched per question so poll results and attendance are always current.
    const [polls, stats] = await Promise.all([getPolls(), getAttendanceStats()]);
    const reply = await generateReply(buildAssistantPrompt(polls, stats), history);
    return Response.json({ reply });
  } catch (error) {
    if (error instanceof GeminiError) {
      console.error(`Assistant error (${error.kind}):`, error.message);
      const { status, message } = errorResponses[error.kind];
      return Response.json({ error: message }, { status });
    }
    console.error("Assistant failed:", error);
    return Response.json({ error: errorResponses.failed.message }, { status: 500 });
  }
}
