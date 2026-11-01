"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button, Card, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

// Keep in sync with MAX_MESSAGE_CHARS in /api/assistant.
const MAX_CHARS = 500;

const SUGGESTIONS = [
  "What's on the agenda after lunch?",
  "What's the Wi-Fi password?",
  "How do I vote in a poll?",
  "Which session is winning the poll?",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function ask(question: string, history: ChatMessage[] = messages) {
    const text = question.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...history, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setError(undefined);
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.reply !== "string") {
        setError(body.error ?? "The assistant couldn't answer just now.");
        return;
      }
      setMessages([...next, { role: "assistant", content: body.reply }]);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // Retry re-sends the last unanswered question without duplicating it.
  function retry() {
    const last = messages[messages.length - 1];
    if (last?.role === "user") ask(last.content, messages.slice(0, -1));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  // Enter sends; Shift+Enter adds a new line.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      ask(draft);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      {/* role="log" + aria-live: screen readers announce new replies. */}
      <div role="log" aria-live="polite" aria-label="Conversation" className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-muted">Ask about the schedule, venue, food, Wi-Fi or live poll results. Try:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-card px-4 py-2.5 text-sm",
                m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-primary-soft",
              )}
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
              {m.content}
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 self-start text-sm text-muted">
            <Spinner className="size-4" label="Assistant is typing" /> Thinking…
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 self-start rounded-card bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error}
            <Button variant="ghost" className="min-h-8 px-2 text-danger" onClick={retry}>
              Try again
            </Button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
        <label htmlFor="assistant-question" className="sr-only">
          Your question
        </label>
        <textarea
          id="assistant-question"
          rows={2}
          maxLength={MAX_CHARS}
          placeholder="Ask a question…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-11 w-full flex-1 resize-none rounded-card border border-border bg-surface px-3 py-2 text-base placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-primary"
        />
        <Button type="submit" loading={loading} disabled={!draft.trim()}>
          Send
        </Button>
      </form>
      <p className="text-xs text-muted">Answers come from AI using the event information and can occasionally be wrong.</p>
    </Card>
  );
}
