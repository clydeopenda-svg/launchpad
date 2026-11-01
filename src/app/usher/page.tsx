import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Usher check-in" };

export default function UsherPage() {
  return (
    <>
      <PageHeader title="Usher check-in" description="Search guests and check them in." />
      <Card>
        <EmptyState title="Coming in Stage 4" message="This screen is being built next." />
      </Card>
    </>
  );
}
