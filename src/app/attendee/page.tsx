import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Live polls" };

export default function AttendeePage() {
  return (
    <>
      <PageHeader title="Live polls" description="Enter your check-in code to vote." />
      <Card>
        <EmptyState title="Coming in Stage 5" message="This screen is being built next." />
      </Card>
    </>
  );
}
