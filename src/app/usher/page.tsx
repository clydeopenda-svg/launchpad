import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogoutButton } from "./LogoutButton";
import { UsherDashboard } from "./UsherDashboard";

export const metadata: Metadata = { title: "Usher check-in" };

// Access is enforced by src/proxy.ts; the dashboard loads its data from the
// staff-only /api/usher routes in the browser.
export default function UsherPage() {
  return (
    <>
      <PageHeader title="Usher check-in" description="Search guests and check them in." action={<LogoutButton />} />
      <UsherDashboard />
    </>
  );
}
