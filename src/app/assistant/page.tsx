import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AssistantChat } from "./AssistantChat";

export const metadata: Metadata = { title: "AI assistant" };

export default function AssistantPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="AI assistant" description="Ask anything about the event." />
      <AssistantChat />
    </div>
  );
}
