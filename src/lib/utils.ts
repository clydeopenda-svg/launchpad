/** Joins class names, skipping empty values: cn("a", false && "b", "c") -> "a c". */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Percentage of part in total, rounded to one decimal. Safe when total is 0. */
export function percent(part: number, total: number): number {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

/** "2026-11-14T09:42:00.000Z" -> "9:42 AM" in the viewer's local time. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
