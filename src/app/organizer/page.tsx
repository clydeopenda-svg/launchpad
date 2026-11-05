import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogoutButton } from "@/components/staff/LogoutButton";
import { OrganizerDashboard } from "./OrganizerDashboard";

export const metadata: Metadata = { title: "Organizer dashboard" };

// Access is enforced by src/proxy.ts; data comes from the staff-only
// /api/organizer routes in the browser.
export default function OrganizerPage() {
  return (
    <>
      <PageHeader
        title="Organizer dashboard"
        description="Live attendance and poll results."
        action={
          <div className="flex gap-2">
            {/* A plain link: the browser downloads the CSV using the staff cookie, no JavaScript needed. */}
            <a
              href="/api/organizer/export"
              download
              className="inline-flex min-h-11 items-center justify-center rounded-card border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Export guests (CSV)
            </a>
            <LogoutButton />
          </div>
        }
      />
      <OrganizerDashboard />
    </>
  );
}
