import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui";
import { StaffLoginForm } from "./StaffLoginForm";

export const metadata: Metadata = { title: "Staff login" };

export default function StaffLoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <PageHeader title="Staff login" description="Enter the staff PIN to open the usher and organizer pages." />
      <Card>
        <StaffLoginForm />
      </Card>
    </div>
  );
}
