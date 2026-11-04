import Link from "next/link";
import { EmptyState } from "@/components/ui";

// Shown for unknown URLs and anywhere notFound() is called. Renders inside the
// root layout, so the site header stays visible and guests can navigate away.
export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      message="That page doesn't exist. Check the address, or head back to the event home page."
      action={
        <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to LaunchPad home
        </Link>
      }
    />
  );
}
