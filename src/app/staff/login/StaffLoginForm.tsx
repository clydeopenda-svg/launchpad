"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import { safeNextPath } from "@/lib/auth/safeNextPath";

export function StaffLoginForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Login failed. Please try again.");
        setLoading(false);
        return;
      }
      // Read ?next= at submit time rather than with useSearchParams, so the
      // page itself stays static. A full navigation makes sure the proxy
      // sees the new cookie.
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(safeNextPath(next));
    } catch {
      setError("Couldn't reach the server. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Staff PIN"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        autoFocus
        required
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        error={error}
      />
      <Button type="submit" loading={loading}>
        Log in
      </Button>
    </form>
  );
}
