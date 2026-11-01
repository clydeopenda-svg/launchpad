import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "AI assistant" };

export default function AssistantPage() {
  return (
    <>
      <PageHeader title="AI assistant" description="Ask anything about the event." />
      <Card>
        <EmptyState title="Coming in Stage 7" message="This screen is being built next." />
      </Card>
    </>
  );
}
