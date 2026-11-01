"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingState, ProgressBar, StatCard } from "@/components/ui";
import { formatTime } from "@/lib/utils";
import type { AttendanceStats, Guest } from "@/types";

// Several ushers work the door at once, so the list refreshes on a timer to
// show check-ins made on other devices.
const REFRESH_MS = 5000;
// Wait for a pause in typing before searching, instead of one request per key.
const SEARCH_DELAY_MS = 250;

interface GuestsResponse {
  guests: Guest[];
  totalMatches: number;
  stats: AttendanceStats;
}

type Feedback = { tone: "success" | "warning" | "danger"; message: string };

export function UsherDashboard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<GuestsResponse>();
  const [loadError, setLoadError] = useState<string>();
  const [checkingInId, setCheckingInId] = useState<number>();
  const [feedback, setFeedback] = useState<Feedback>();
  // Lets a newer request cancel an older one still in flight, so slow
  // responses for an old search can't overwrite newer results.
  const requestRef = useRef<AbortController | null>(null);

  const loadGuests = useCallback(async (search: string) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch(`/api/usher/guests?q=${encodeURIComponent(search)}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.status === 401) {
        // Session expired or PIN changed: send the usher back to log in.
        router.replace(`/staff/login?next=${encodeURIComponent("/usher")}`);
        return;
      }
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error);
      setData(await response.json());
      setLoadError(undefined);
    } catch (error) {
      if (controller.signal.aborted) return;
      setLoadError(error instanceof Error && error.message ? error.message : "Couldn't load guests.");
    }
  }, [router]);

  // Search after typing pauses, then keep the results fresh on a timer.
  useEffect(() => {
    const searchTimer = setTimeout(() => loadGuests(query), SEARCH_DELAY_MS);
    const refreshTimer = setInterval(() => loadGuests(query), REFRESH_MS);
    return () => {
      clearTimeout(searchTimer);
      clearInterval(refreshTimer);
    };
  }, [query, loadGuests]);

  // Cancel any in-flight request when leaving the page.
  useEffect(() => () => requestRef.current?.abort(), []);

  async function handleCheckIn(guest: Guest) {
    setCheckingInId(guest.id);
    setFeedback(undefined);
    try {
      const response = await fetch("/api/usher/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ tone: "danger", message: result.error ?? "Check-in failed." });
      } else if (result.status === "already_checked_in") {
        setFeedback({
          tone: "warning",
          message: `${guest.fullName} was already checked in at ${formatTime(result.guest.checkedInAt)}.`,
        });
      } else {
        setFeedback({ tone: "success", message: `${guest.fullName} is checked in.` });
      }
    } catch {
      setFeedback({ tone: "danger", message: "Couldn't reach the server. Check your connection." });
    } finally {
      setCheckingInId(undefined);
      // Refresh straight away so the list and counts reflect the change.
      loadGuests(query);
    }
  }

  const stats = data?.stats;

  return (
    <div className="flex flex-col gap-6">
      {/* Three across even on phones, so the search box stays near the top of the screen at the door. */}
      <section aria-label="Attendance" className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Checked in" value={stats?.checkedIn ?? "–"} detail={stats ? `of ${stats.totalGuests} guests` : undefined} />
        <StatCard label="Still to arrive" value={stats?.notCheckedIn ?? "–"} />
        <Card className="flex flex-col justify-center gap-3 p-4">
          <p className="text-sm text-muted">Attendance</p>
          <p className="text-3xl font-semibold tabular-nums">{stats ? `${stats.attendancePercent}%` : "–"}</p>
          <ProgressBar value={stats?.attendancePercent ?? 0} label="Attendance" />
        </Card>
      </section>

      <Card>
        <Input
          label="Find a guest"
          type="search"
          placeholder="Name, organization or check-in code"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* aria-live announces check-in results to screen reader users. */}
        <div aria-live="polite" className="mt-4 empty:hidden">
          {feedback && (
            <p
              className={
                feedback.tone === "success"
                  ? "rounded-card bg-success-soft px-4 py-3 text-sm font-medium text-success"
                  : feedback.tone === "warning"
                    ? "rounded-card bg-warning-soft px-4 py-3 text-sm font-medium text-warning"
                    : "rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
              }
            >
              {feedback.message}
            </p>
          )}
        </div>

        <div className="mt-4">
          {loadError && !data ? (
            <ErrorState message={loadError} onRetry={() => loadGuests(query)} />
          ) : !data ? (
            <LoadingState message="Loading guests…" />
          ) : data.guests.length === 0 ? (
            <EmptyState title="No guests found" message="Check the spelling, or search by check-in code instead." />
          ) : (
            <>
              {loadError && <p className="mb-3 text-sm text-danger">{loadError} Showing the last results.</p>}
              <ul className="divide-y divide-border">
                {data.guests.map((guest) => (
                  <GuestRow
                    key={guest.id}
                    guest={guest}
                    checkingIn={checkingInId === guest.id}
                    onCheckIn={() => handleCheckIn(guest)}
                  />
                ))}
              </ul>
              {data.totalMatches > data.guests.length && (
                <p className="mt-3 text-sm text-muted">
                  Showing {data.guests.length} of {data.totalMatches} guests. Search to narrow the list.
                </p>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function GuestRow({ guest, checkingIn, onCheckIn }: { guest: Guest; checkingIn: boolean; onCheckIn: () => void }) {
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {guest.fullName}
          <Badge>{guest.ticketType}</Badge>
        </p>
        <p className="truncate text-sm text-muted">
          {guest.organization} · <span className="font-mono">{guest.checkinCode}</span>
        </p>
      </div>
      {guest.checkedInAt ? (
        <Badge tone="success">Checked in {formatTime(guest.checkedInAt)}</Badge>
      ) : (
        <Button onClick={onCheckIn} loading={checkingIn} className="sm:w-32">
          Check in
        </Button>
      )}
    </li>
  );
}
