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
      <PageHeader title="Organizer dashboard" description="Live attendance and poll results." action={<LogoutButton />} />
      <OrganizerDashboard />
    </>
  );
}
