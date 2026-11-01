"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, LoadingState, ProgressBar, StatCard } from "@/components/ui";
import { cn, formatTime, percent } from "@/lib/utils";
import type { AttendanceStats, Guest, Poll } from "@/types";

// Same cadence as the usher and attendee screens, so the whole event view
// is never more than a few seconds behind.
const REFRESH_MS = 5000;

interface Overview {
  stats: AttendanceStats;
  voters: number;
  participationPercent: number;
  polls: Poll[];
  recentCheckIns: Pick<Guest, "id" | "fullName" | "organization" | "ticketType" | "checkedInAt">[];
}

export function OrganizerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Overview>();
  const [error, setError] = useState<string>();
  // Aborts an older refresh if a newer one starts (e.g. right after a poll
  // change), so a slow stale response can't overwrite fresher data.
  const requestRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch("/api/organizer/overview", { signal: controller.signal, cache: "no-store" });
      if (response.status === 401) {
        router.replace(`/staff/login?next=${encodeURIComponent("/organizer")}`);
        return;
      }
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error);
      setData(await response.json());
      setError(undefined);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error && err.message ? err.message : "Couldn't load the dashboard.");
    }
  }, [router]);

  useEffect(() => {
    // Initial load straight away, then keep the numbers live.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(timer);
      requestRef.current?.abort();
    };
  }, [load]);

  if (!data) return error ? <ErrorState message={error} onRetry={load} /> : <LoadingState message="Loading dashboard…" />;

  const { stats, voters, participationPercent, polls, recentCheckIns } = data;
  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-sm text-danger">
          {error} Showing the last loaded numbers.
        </p>
      )}

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Checked in" value={stats.checkedIn} detail={`of ${stats.totalGuests} guests`} />
        <StatCard label="Still to arrive" value={stats.notCheckedIn} />
        <Card className="flex flex-col gap-2 p-4">
          <p className="text-sm text-muted">Attendance</p>
          <p className="text-3xl font-semibold tabular-nums">{stats.attendancePercent}%</p>
          <ProgressBar value={stats.attendancePercent} label="Attendance" />
        </Card>
        <StatCard label="Voters" value={voters} detail={`${participationPercent}% of checked-in guests`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-label="Polls" className="flex flex-col gap-4 lg:col-span-2">
          {polls.length === 0 ? (
            <Card>
              <EmptyState title="No polls yet" message="Run npm run db:seed to add the sample polls." />
            </Card>
          ) : (
            polls.map((poll) => <PollResults key={poll.id} poll={poll} onChanged={load} />)
          )}
        </section>

        <Card className="h-fit">
          <CardHeader title="Recent arrivals" />
          {recentCheckIns.length === 0 ? (
            <EmptyState title="No one has checked in yet" />
          ) : (
            <ul className="divide-y divide-border">
              {recentCheckIns.map((guest) => (
                <li key={guest.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{guest.fullName}</p>
                    <p className="truncate text-xs text-muted">{guest.organization}</p>
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-muted">
                    {guest.checkedInAt && formatTime(guest.checkedInAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function PollResults({ poll, onChanged }: { poll: Poll; onChanged: () => Promise<void> }) {
  // Which control is busy, so only that button shows a spinner.
  const [pending, setPending] = useState<"status" | "results">();
  const [error, setError] = useState<string>();

  const isOpen = poll.status === "open";
  const topVotes = Math.max(0, ...poll.options.map((o) => o.votes));

  async function change(field: "status" | "results", body: Partial<Pick<Poll, "status" | "showResults">>) {
    setPending(field);
    setError(undefined);
    try {
      const response = await fetch(`/api/organizer/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setError((await response.json().catch(() => ({}))).error ?? "Couldn't update the poll.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      await onChanged();
      setPending(undefined);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-2">
        <h2 className="font-semibold">{poll.question}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone={isOpen ? "success" : "neutral"}>{isOpen ? "Open" : "Closed"}</Badge>
          <Badge tone={poll.showResults ? "neutral" : "warning"}>
            {poll.showResults ? "Results visible to attendees" : "Results hidden from attendees"}
          </Badge>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {poll.options.map((option) => {
          const share = percent(option.votes, poll.totalVotes);
          // Highlight the leader(s) once there are votes; ties all highlight.
          const leading = poll.totalVotes > 0 && option.votes === topVotes;
          return (
            <li key={option.id}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className={cn(leading && "font-semibold")}>{option.label}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {option.votes} · {share}%
                </span>
              </div>
              <ProgressBar value={share} label={`${option.label}: ${option.votes} votes, ${share}%`} />
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">
        {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
      </p>

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
        <Button
          variant="secondary"
          loading={pending === "status"}
          disabled={pending !== undefined}
          onClick={() => change("status", { status: isOpen ? "closed" : "open" })}
        >
          {isOpen ? "Close poll" : "Reopen poll"}
        </Button>
        <Button
          variant="secondary"
          loading={pending === "results"}
          disabled={pending !== undefined}
          onClick={() => change("results", { showResults: !poll.showResults })}
        >
          {poll.showResults ? "Hide results from attendees" : "Show results to attendees"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
