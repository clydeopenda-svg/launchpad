import { Card } from "./Card";

/** A single headline number, e.g. "Checked in: 66". */
export function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
    </Card>
  );
}
