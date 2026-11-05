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

/**
 * Builds a CSV file (RFC 4180) from rows of cells. Every cell is quoted, so
 * commas, quotes and line breaks in names are safe. Cells starting with
 * =, +, -, @ or a tab get a leading apostrophe so a spreadsheet shows them as
 * text instead of running them as a formula (CSV injection), since guest
 * names and organizations come from outside the app.
 */
export function toCsv(rows: Array<Array<string | number | null>>): string {
  const cell = (value: string | number | null) => {
    let text = value === null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  // CRLF line endings, as the CSV spec and Excel expect.
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
