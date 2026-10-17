import { pct, pctExact } from "@/lib/format";

type Props = {
  elapsed: number;
  daysInMonth: number;
  pacePct: number;
  latestDate: string;
};

export default function PaceCard({ elapsed, daysInMonth, pacePct, latestDate }: Props) {
  const safeDays = daysInMonth > 0 ? daysInMonth : 0;
  const safeElapsed = Math.min(Math.max(elapsed, 0), safeDays || elapsed);
  const remaining = safeDays > 0 ? Math.max(safeDays - safeElapsed, 0) : 0;
  const ringPct = Math.min(Math.max(pacePct, 0), 100);

  // Thin progress ring
  const size = 44;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (ringPct / 100) * c;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-3 py-2 shadow-sm backdrop-blur"
      role="img"
      aria-label={`Current period day ${safeElapsed} of ${safeDays}, pace ${pctExact(pacePct)}, ${remaining} days remaining, data updated ${latestDate}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          className="stroke-primary"
        />
      </svg>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-semibold text-ink tabular-nums">
          Day {safeElapsed}/{safeDays} · Pace {pct(pacePct)}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted tabular-nums">
          {remaining} days remaining · data updated {latestDate}
        </p>
      </div>
    </div>
  );
}
