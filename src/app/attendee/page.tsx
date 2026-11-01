import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendeeVoting } from "./AttendeeVoting";

export const metadata: Metadata = { title: "Live polls" };

export default function AttendeePage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Live polls" description="Enter your check-in code to vote and see results." />
      <AttendeeVoting />
    </div>
  );
}
