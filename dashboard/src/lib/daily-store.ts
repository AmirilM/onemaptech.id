import { num } from "@/lib/format";

// Daily Store data model.
// Source: v_dashboard_store_daily / mv_dashboard_store_daily (store x date)
// and v_dashboard_daily / mv_dashboard_daily (global date) for "All stores".
//
// Metric definitions (keep in sync with the table + export):
// - Apple Qty     = iPhone + Mac + iPad + Apple Watch (AirPods excluded)
// - Android Qty   = Samsung + Oppo + Xiaomi + Huawei + Infinix + Motorola
// - Unit Sold     = Apple Qty + Android Qty (devices only)
// - Device revenue = Apple revenue + Android revenue
// - ASP           = Device revenue / Unit Sold

export type MetricsRow = {
  date: string;
  revenue_total: number;
  revenue_apple: number;
  revenue_android: number;
  revenue_accessories: number;
  revenue_vas: number;
  qty_mac: number;
  qty_ipad: number;
  qty_iphone: number;
  qty_apple_watch: number;
  qty_samsung: number;
  qty_oppo: number;
  qty_xiaomi: number;
  qty_huawei: number;
  qty_infinix: number;
  qty_motorola: number;
};

export type DailySaleRow = MetricsRow & {
  apple_qty: number;
  android_qty: number;
  unit_sold: number;
  device_revenue: number;
  asp: number | null;
};

export type AreaSaleRow = DailySaleRow & {
  store_code: string;
  store_name: string | null;
  rank: number;
};

export type StoreOption = {
  store_code: string;
  store_name: string | null;
};

/** Columns fetched from the scoped views. */
export const METRIC_COLS = [
  "date",
  "revenue_total",
  "revenue_apple",
  "revenue_android",
  "revenue_accessories",
  "revenue_vas",
  "qty_mac",
  "qty_ipad",
  "qty_iphone",
  "qty_apple_watch",
  "qty_samsung",
  "qty_oppo",
  "qty_xiaomi",
  "qty_huawei",
  "qty_infinix",
  "qty_motorola",
].join(",");

export const STORE_METRIC_COLS = `store_code,store_name,${METRIC_COLS}`;

const METRIC_KEYS = [
  "revenue_total",
  "revenue_apple",
  "revenue_android",
  "revenue_accessories",
  "revenue_vas",
  "qty_mac",
  "qty_ipad",
  "qty_iphone",
  "qty_apple_watch",
  "qty_samsung",
  "qty_oppo",
  "qty_xiaomi",
  "qty_huawei",
  "qty_infinix",
  "qty_motorola",
] as const;

export function zeroMetrics(date = ""): MetricsRow {
  return {
    date,
    revenue_total: 0,
    revenue_apple: 0,
    revenue_android: 0,
    revenue_accessories: 0,
    revenue_vas: 0,
    qty_mac: 0,
    qty_ipad: 0,
    qty_iphone: 0,
    qty_apple_watch: 0,
    qty_samsung: 0,
    qty_oppo: 0,
    qty_xiaomi: 0,
    qty_huawei: 0,
    qty_infinix: 0,
    qty_motorola: 0,
  };
}

export function sumInto(target: MetricsRow, row: MetricsRow): MetricsRow {
  for (const key of METRIC_KEYS) target[key] += Number(row[key] ?? 0);
  return target;
}

export function sumMetrics(rows: MetricsRow[]): MetricsRow {
  const out = zeroMetrics();
  for (const row of rows) sumInto(out, row);
  return out;
}

export function derive(row: MetricsRow): DailySaleRow {
  const apple_qty =
    Number(row.qty_iphone ?? 0) +
    Number(row.qty_mac ?? 0) +
    Number(row.qty_ipad ?? 0) +
    Number(row.qty_apple_watch ?? 0);
  const android_qty =
    Number(row.qty_samsung ?? 0) +
    Number(row.qty_oppo ?? 0) +
    Number(row.qty_xiaomi ?? 0) +
    Number(row.qty_huawei ?? 0) +
    Number(row.qty_infinix ?? 0) +
    Number(row.qty_motorola ?? 0);
  const unit_sold = apple_qty + android_qty;
  const device_revenue =
    Number(row.revenue_apple ?? 0) + Number(row.revenue_android ?? 0);
  return {
    ...row,
    apple_qty,
    android_qty,
    unit_sold,
    device_revenue,
    asp: unit_sold > 0 ? device_revenue / unit_sold : null,
  };
}

/** Inclusive list of ISO dates (YYYY-MM-DD). */
export function datesInRange(start: string, end: string): string[] {
  const a = parseISO(start);
  const b = parseISO(end);
  if (!a || !b || a > b) return [];
  const out: string[] = [];
  for (
    let t = Date.UTC(a.y, a.m, a.d);
    t <= Date.UTC(b.y, b.m, b.d);
    t += 86_400_000
  ) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function buildDailyRows(
  rows: MetricsRow[],
  dates: string[],
): DailySaleRow[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return dates.map((date) => derive(byDate.get(date) ?? zeroMetrics(date)));
}

/** Aggregate store x date rows into one row per date (area scope). */
export function aggregateByDate(
  rows: (MetricsRow & { store_code: string })[],
): MetricsRow[] {
  const byDate = new Map<string, MetricsRow>();
  for (const row of rows) {
    const current = byDate.get(row.date) ?? zeroMetrics(row.date);
    sumInto(current, row);
    byDate.set(row.date, current);
  }
  return [...byDate.values()];
}

/**
 * Area table: one row per store for the selected date. Stores without
 * transactions are kept (0 values) so the ranking is complete.
 */
export function buildAreaRows(
  rows: (MetricsRow & { store_code: string; store_name: string | null })[],
  stores: StoreOption[],
  date: string,
): AreaSaleRow[] {
  const byStore = new Map(rows.map((r) => [r.store_code, r]));
  const seen = new Set<string>();
  const items: Omit<AreaSaleRow, "rank">[] = [];

  for (const store of stores) {
    if (seen.has(store.store_code)) continue;
    seen.add(store.store_code);
    const source = byStore.get(store.store_code);
    const derived = derive({ ...(source ?? zeroMetrics(date)), date });
    items.push({
      ...derived,
      store_code: store.store_code,
      store_name: source?.store_name || store.store_name,
    });
  }

  items.sort(
    (a, b) =>
      b.revenue_total - a.revenue_total ||
      (a.store_name ?? "").localeCompare(b.store_name ?? "") ||
      a.store_code.localeCompare(b.store_code),
  );

  return items.map((row, i) => ({ ...row, rank: i + 1 }));
}

export function totalOf(rows: MetricsRow[]): DailySaleRow {
  return derive(sumMetrics(rows));
}

/** ASP formatting: plain number (the report states "nilai dalam Rupiah"). */
export function formatAsp(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  return num(Math.round(value));
}

export function formatIsoLong(iso: string): string {
  const d = parseISO(iso);
  if (!d) return iso || "-";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${String(d.d).padStart(2, "0")} ${months[d.m]} ${d.y}`;
}

export function formatPeriod(start: string, end: string): string {
  if (!start || !end) return "-";
  if (start === end) return formatIsoLong(start);
  const a = parseISO(start);
  const b = parseISO(end);
  if (!a || !b) return `${start} – ${end}`;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (a.y === b.y && a.m === b.m) {
    return `${String(a.d).padStart(2, "0")}–${String(b.d).padStart(2, "0")} ${months[b.m]} ${b.y}`;
  }
  if (a.y === b.y) {
    return `${String(a.d).padStart(2, "0")} ${months[a.m]} – ${String(b.d).padStart(2, "0")} ${months[b.m]} ${b.y}`;
  }
  return `${formatIsoLong(start)} – ${formatIsoLong(end)}`;
}

export function formatGeneratedAt(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")} WIB`;
}

export function isIsoDate(value: string): boolean {
  const p = parseISO(value);
  if (!p) return false;
  return formatIso(p.y, p.m, p.d) === value;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "report"
  );
}

function parseISO(
  iso: string,
): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

function formatIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
