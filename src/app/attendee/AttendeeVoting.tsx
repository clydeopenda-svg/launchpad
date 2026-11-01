"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingState, ProgressBar } from "@/components/ui";
import { cn, percent } from "@/lib/utils";
import type { AttendeePoll } from "@/types";

// Remember the code on this device so a refresh doesn't make the attendee
// type it again. Storage can be unavailable (private mode), so every access
// is wrapped — the page still works, it just won't remember.
const STORAGE_KEY = "launchpad_attendee_code";
// Results update live while the attendee watches.
const REFRESH_MS = 5000;

function loadSavedCode(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveCode(code: string | null) {
  try {
    if (code) localStorage.setItem(STORAGE_KEY, code);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not remembered on this device; nothing else to do.
  }
}

interface PollsResponse {
  guest: { firstName: string; checkedIn: boolean };
  polls: AttendeePoll[];
}

async function fetchPolls(code: string): Promise<{ data?: PollsResponse; error?: string; notFound?: boolean }> {
  const response = await fetch("/api/attendee/polls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.ok) return { data: body };
  return { error: body.error ?? "Couldn't load polls.", notFound: response.status === 404 };
}

export function AttendeeVoting() {
  const [code, setCode] = useState<string | null>(null);
  // false until we've checked localStorage, so we don't flash the code form.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Reading localStorage has to wait until we're in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(loadSavedCode() || null);
    setReady(true);
  }, []);

  const signIn = useCallback((newCode: string) => {
    saveCode(newCode);
    setCode(newCode);
  }, []);

  // Stable identity: PollList's refresh effect depends on it.
  const signOut = useCallback(() => {
    saveCode(null);
    setCode(null);
  }, []);

  if (!ready) return <LoadingState />;
  return code ? <PollList code={code} onSignOut={signOut} /> : <CodeForm onSignIn={signIn} />;
}

function CodeForm({ onSignIn }: { onSignIn: (code: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      // Check the code before switching screens, so a typo shows an error here.
      const result = await fetchPolls(value);
      if (result.data) onSignIn(value.trim().toUpperCase());
      else setError(result.error);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Check-in code"
          placeholder="LP-XXXX"
          hint="It's on your ticket and confirmation email."
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
          required
          className="font-mono uppercase"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={error}
        />
        <Button type="submit" loading={loading}>
          See polls
        </Button>
      </form>
    </Card>
  );
}

function PollList({ code, onSignOut }: { code: string; onSignOut: () => void }) {
  const [data, setData] = useState<PollsResponse>();
  const [error, setError] = useState<string>();
  // Ignore responses that arrive after the attendee has signed out.
  const activeRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const result = await fetchPolls(code);
      if (!activeRef.current) return;
      if (result.notFound) {
        // The saved code is no longer valid (e.g. the database was re-seeded).
        onSignOut();
        return;
      }
      if (result.data) setData(result.data);
      setError(result.error);
    } catch {
      if (activeRef.current) setError("Couldn't reach the server. Check your connection.");
    }
  }, [code, onSignOut]);

  useEffect(() => {
    activeRef.current = true;
    // Initial load straight away, then keep results live.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      activeRef.current = false;
      clearInterval(timer);
    };
  }, [load]);

  if (!data) return error ? <ErrorState message={error} onRetry={load} /> : <LoadingState message="Loading polls…" />;

  const { guest, polls } = data;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-medium">Hi {guest.firstName} 👋</p>
        <Button variant="ghost" onClick={onSignOut}>
          Not you? Change code
        </Button>
      </div>

      {!guest.checkedIn && (
        <p role="status" className="rounded-card bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          Voting opens once you&apos;ve checked in at the door. This page will update by itself.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error} Showing the last results.</p>}

      {polls.length === 0 ? (
        <Card>
          <EmptyState title="No polls yet" message="Polls will appear here during the event." />
        </Card>
      ) : (
        polls.map((poll) => (
          <PollCard key={poll.id} poll={poll} code={code} canVote={guest.checkedIn} onVoted={load} />
        ))
      )}
    </div>
  );
}

function PollCard({
  poll,
  code,
  canVote,
  onVoted,
}: {
  poll: AttendeePoll;
  code: string;
  canVote: boolean;
  onVoted: () => Promise<void>;
}) {
  const headingId = useId();
  const [selected, setSelected] = useState<number>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const hasVoted = poll.myOptionId !== null;
  const isOpen = poll.status === "open";
  const votable = isOpen && !hasVoted && canVote;

  async function submitVote() {
    if (selected === undefined) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/attendee/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pollId: poll.id, optionId: selected }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Your vote didn't go through.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      // Reload either way: on success to show results, on "already voted"
      // or "closed" to show the poll's real state.
      await onVoted();
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 id={headingId} className="font-semibold">
          {poll.question}
        </h2>
        {!isOpen ? <Badge>Closed</Badge> : hasVoted ? <Badge tone="success">Voted</Badge> : null}
      </div>

      {votable ? (
        // Labelled by the heading above, so screen readers don't hear the question twice.
        <fieldset aria-labelledby={headingId} className="flex flex-col gap-2">
          {poll.options.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-card border px-4 py-2 transition",
                selected === option.id ? "border-primary bg-primary-soft" : "border-border hover:bg-primary-soft",
              )}
            >
              <input
                type="radio"
                name={`poll-${poll.id}`}
                value={option.id}
                checked={selected === option.id}
                onChange={() => setSelected(option.id)}
                className="size-4 accent-primary"
              />
              {option.label}
            </label>
          ))}
          <Button onClick={submitVote} loading={submitting} disabled={selected === undefined} className="mt-2">
            Submit vote
          </Button>
          <p className="text-center text-xs text-muted">Votes are final.</p>
        </fieldset>
      ) : poll.resultsVisible ? (
        <Results poll={poll} />
      ) : (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {poll.options.map((option) => (
              <li
                key={option.id}
                className={cn(
                  "rounded-card border px-4 py-2 text-sm",
                  option.id === poll.myOptionId ? "border-primary font-medium" : "border-border text-muted",
                )}
              >
                {option.label}
                {option.id === poll.myOptionId && " — your vote"}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            {hasVoted
              ? "Thanks for voting! Results will be shared by the organizers."
              : !isOpen
                ? "This poll has closed."
                : "Check in at the door to vote."}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}

function Results({ poll }: { poll: AttendeePoll }) {
  const total = poll.totalVotes ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {poll.options.map((option) => {
          const share = percent(option.votes ?? 0, total);
          const mine = option.id === poll.myOptionId;
          return (
            <li key={option.id}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className={cn(mine && "font-semibold")}>
                  {option.label}
                  {mine && " (your vote)"}
                </span>
                <span className="tabular-nums text-muted">{share}%</span>
              </div>
              <ProgressBar value={share} label={`${option.label}: ${share}%`} />
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        {total} {total === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}
