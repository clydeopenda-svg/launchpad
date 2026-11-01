import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Organizer dashboard" };

export default function OrganizerPage() {
  return (
    <>
      <PageHeader title="Organizer dashboard" description="Live attendance and poll results." />
      <Card>
        <EmptyState title="Coming in Stage 6" message="This screen is being built next." />
      </Card>
    </>
  );
}
