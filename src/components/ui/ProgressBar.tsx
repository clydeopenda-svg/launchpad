import { cn } from "@/lib/utils";

/** Horizontal bar used for attendance and poll results. value is 0–100. */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-primary-soft", className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${clamped}%` }} />
    </div>
  );
}
