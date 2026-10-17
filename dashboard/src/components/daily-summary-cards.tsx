import type { ReactNode } from "react";
import type { DailySummaryRow } from "@/components/daily-summary-tables";
import { formatDayMonth, num, pct, rupiah } from "@/lib/format";
import {
  Activity,
  Boxes,
  CalendarDays,
  Trophy,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Product qty labels for the "top product" — a single source for easy maintenance.
const QTY_LABELS: Record<string, string> = {
  qty_mac: "Mac",
  qty_ipad: "iPad",
  qty_iphone: "iPhone",
  qty_apple_watch: "Apple Watch",
  qty_airpods: "AirPods",
  qty_samsung: "Samsung",
  qty_oppo: "Oppo",
  qty_xiaomi: "Xiaomi",
  qty_huawei: "Huawei",
  qty_infinix: "Infinix",
  qty_motorola: "Motorola",
};
const QTY_KEYS = Object.keys(QTY_LABELS) as (keyof DailySummaryRow)[];

const DASH = "—";

function Kpi({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | null;
  icon: LucideIcon;
}) {
  return (
    <div className="card-surface relative flex flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-medium leading-4 tracking-wide text-muted">
          {label}
        </p>
        <span
          className="shrink-0 rounded-[10px] bg-primary/10 p-1.5 text-primary ring-1 ring-inset ring-primary/25"
          aria-hidden
        >
          <Icon size={14} strokeWidth={2} />
        </span>
      </div>
      <p
        className="mt-2.5 truncate text-xl font-bold tracking-tight text-ink tabular-nums"
        title={value}
      >
        {value}
      </p>
      {sub ? (
        <p
          className={`mt-1 truncate text-xs ${
            tone === "up"
              ? "text-accent"
              : tone === "down"
                ? "text-danger"
                : "text-muted"
          }`}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2">
        <span
          className="rounded-[10px] bg-primary/10 p-1.5 text-primary ring-1 ring-inset ring-primary/25"
          aria-hidden
        >
          <Icon size={14} strokeWidth={2} />
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <dl className="mt-3 space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`font-semibold tabular-nums ${
          tone === "up"
            ? "text-accent"
            : tone === "down"
              ? "text-danger"
              : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export default function DailySummaryCards({
  rows,
  daysElapsed,
}: {
  rows: DailySummaryRow[];
  daysElapsed: number;
}) {
  const totalDays = rows.length;
  const activeRows = rows.filter((r) => r.revenue_total > 0);
  const activeDays = activeRows.length;
  const hasData = activeDays > 0;

  const totalRevenue = rows.reduce((a, r) => a + r.revenue_total, 0);
  const avgPerActive = activeDays ? totalRevenue / activeDays : 0;

  let best: DailySummaryRow | null = null;
  for (const r of rows) if (!best || r.revenue_total > best.revenue_total) best = r;
  const bestValue = best?.revenue_total ?? 0;

  const unitsByKey = QTY_KEYS.map((k) => ({
    label: QTY_LABELS[k as string],
    qty: rows.reduce((a, r) => a + (r[k] as number), 0),
  }));
  const totalUnits = unitsByKey.reduce((a, x) => a + x.qty, 0);
  const topProduct = unitsByKey.reduce(
    (m, x) => (x.qty > m.qty ? x : m),
    unitsByKey[0],
  );

  // Momentum: last day with data vs the previous day (calendar, within the month).
  let lastIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].revenue_total > 0) {
      lastIdx = i;
      break;
    }
  }
  const lastDay = lastIdx >= 0 ? rows[lastIdx] : null;
  const prevDay = lastIdx > 0 ? rows[lastIdx - 1] : null;
  const deltaAbs =
    lastDay && prevDay ? lastDay.revenue_total - prevDay.revenue_total : null;
  const deltaPct =
    lastDay && prevDay && prevDay.revenue_total > 0
      ? Math.round(
          (10000 * (lastDay.revenue_total - prevDay.revenue_total)) /
            prevDay.revenue_total,
        ) / 100
      : null;

  // Average daily growth (between consecutive days with data).
  let growthSum = 0;
  let growthN = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].revenue_total;
    const b = rows[i].revenue_total;
    if (a > 0 && b > 0) {
      growthSum += ((b - a) / a) * 100;
      growthN++;
    }
  }
  const avgGrowth = growthN ? growthSum / growthN : null;

  const aboveAvg = activeRows.filter((r) => r.revenue_total > avgPerActive).length;
  // Count only the days that have elapsed (not future zero-filled days).
  const safeElapsed = Math.min(daysElapsed, totalDays);
  const emptyDays = Math.max(0, safeElapsed - activeDays);

  const deltaTone: "up" | "down" | null =
    deltaPct === null ? null : deltaPct >= 0 ? "up" : "down";
  const growthTone: "up" | "down" | null =
    avgGrowth === null ? null : avgGrowth >= 0 ? "up" : "down";

  return (
    <div className="mt-4 space-y-4" aria-label="Daily overview">
      {/* Group 1 — current-month headline */}
      <section
        aria-label="Daily headline"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <Kpi
          label="Total Revenue (MTD)"
          value={hasData ? rupiah(totalRevenue) : DASH}
          sub="Month-to-date"
          icon={Wallet}
        />
        <Kpi
          label="Avg / Day"
          value={hasData ? rupiah(avgPerActive) : DASH}
          sub={`${activeDays} active days`}
          icon={CalendarDays}
        />
        <Kpi
          label="Best Day"
          value={hasData && best ? formatDayMonth(best.date) : DASH}
          sub={hasData ? rupiah(bestValue) : undefined}
          icon={Trophy}
        />
        <Kpi
          label="Total Units"
          value={hasData ? num(totalUnits) : DASH}
          sub={hasData && topProduct.qty > 0 ? `top: ${topProduct.label}` : undefined}
          icon={Boxes}
        />
      </section>

      {/* Group 2 — daily behaviour (unique to this page, not on the Dashboard) */}
      <section
        aria-label="Daily behaviour"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <InfoCard title="Momentum" icon={TrendingUp}>
          <Row
            label="Last day"
            value={
              lastDay
                ? `${formatDayMonth(lastDay.date)} · ${rupiah(lastDay.revenue_total)}`
                : DASH
            }
          />
          <Row
            label="vs previous day"
            value={
              deltaPct === null
                ? DASH
                : `${deltaPct >= 0 ? "▲" : "▼"} ${pct(Math.abs(deltaPct))} · ${rupiah(Math.abs(deltaAbs ?? 0))}`
            }
            tone={deltaTone}
          />
          <Row
            label="Avg daily growth"
            value={
              avgGrowth === null
                ? DASH
                : `${avgGrowth >= 0 ? "▲" : "▼"} ${pct(Math.abs(avgGrowth))}`
            }
            tone={growthTone}
          />
        </InfoCard>

        <InfoCard title="Consistency" icon={Activity}>
          <Row label="Active days" value={`${activeDays} / ${totalDays} days`} />
          <Row label="Days with no transactions" value={num(emptyDays)} />
          <Row label="Days above average" value={num(aboveAvg)} />
        </InfoCard>
      </section>
    </div>
  );
}
