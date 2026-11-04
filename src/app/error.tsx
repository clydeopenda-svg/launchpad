"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

// Catches unexpected rendering errors in any page so attendees see a friendly
// message with a retry button instead of a blank screen. In production Next.js
// replaces server error messages with a generic one, so nothing sensitive
// reaches the browser; `digest` matches the full error in the server logs.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className="mx-auto max-w-md">
      <ErrorState
        message={digest ? `This page couldn't load. Reference: ${digest}` : "This page couldn't load."}
        onRetry={retry}
      />
    </div>
  );
}
