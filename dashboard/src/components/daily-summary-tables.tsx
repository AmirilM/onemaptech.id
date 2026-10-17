"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { formatDayMonth, num, pct, rupiah } from "@/lib/format";

export type DailySummaryRow = {
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
  qty_airpods: number;
  qty_samsung: number;
  qty_oppo: number;
  qty_xiaomi: number;
  qty_huawei: number;
  qty_infinix: number;
  qty_motorola: number;
};

const PAGE_SIZE = 10;

// --- Table design tokens (one source for all three tables) ------------------
// Spacing rhythm: body rows are tight (py-2 ±37px), header & footer feel stronger.
const CELL_X = "px-3.5";
const ROW_Y = "py-2"; // body row height
const HEAD_Y = "py-2.5"; // header & Grand Total footer

// Header with a subtle background + bottom border to separate it clearly from the body.
const th = `border-b border-line bg-canvas ${CELL_X} ${HEAD_Y} text-[11px] font-semibold uppercase tracking-[0.08em] text-muted`;
const tdBase = `border-b border-line/60 ${CELL_X} ${ROW_Y} text-sm tabular-nums`;
const td = `${tdBase} text-soft`;

// Key column block (Date + Day): fixed and identical widths across all three tables.
// (Literal classes are kept so Tailwind detects them; do not make them dynamic.)
// Sticky Date + Day only active at md+ (no freeze on mobile).
const DATE_MIN_W = "min-w-[96px]";
const DAY_MIN_W = "min-w-[120px]";
const DAY_STICKY_LEFT = "md:left-[96px]";
const dateCell = `${tdBase} ${DATE_MIN_W} md:sticky md:left-0 md:z-10 md:bg-surface font-semibold text-ink group-hover:bg-violet-50`;
const dateHead = `${th} ${DATE_MIN_W} md:sticky md:left-0 md:z-20 text-left`;
const dayCell = `${tdBase} ${DAY_MIN_W} border-r border-line md:sticky ${DAY_STICKY_LEFT} md:z-10 md:bg-surface text-muted group-hover:bg-violet-50`;
const dayHead = `${th} ${DAY_MIN_W} border-r border-line md:sticky ${DAY_STICKY_LEFT} md:z-20 text-left`;

// Metric cell & header: right-aligned numbers (revenue) / centered (qty).
const thNum = `${th} text-right`;
const thQty = `${th} text-center`;
const tdNum = `${td} text-right`;
const tdQty = `${td} text-center`;

// Grand Total footer: bold weight + a stronger top background & border as a closing row.
const footCell = `border-t-2 border-line bg-canvas ${CELL_X} ${HEAD_Y} text-sm font-bold tabular-nums text-ink`;
const footLabel = `${footCell} text-center md:sticky md:left-0 md:z-10 md:border-r md:border-line`;

function dayName(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return "-";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
}

function qtyCellClass(v: number): string {
  if (v > 0) return "font-bold text-primary tabular-nums";
  return "text-faint";
}

// Product qty columns (11) for an Excel-style color scale (per-column heatmap).
const QTY_KEYS = [
  "qty_mac",
  "qty_ipad",
  "qty_iphone",
  "qty_apple_watch",
  "qty_airpods",
  "qty_samsung",
  "qty_oppo",
  "qty_xiaomi",
  "qty_huawei",
  "qty_infinix",
  "qty_motorola",
] as const;

const REVENUE_KEYS = [
  "revenue_total",
  "revenue_apple",
  "revenue_android",
  "revenue_accessories",
  "revenue_vas",
] as const;

// Cell background proportional to the global max (0 = transparent).
// Thin alpha (max ±0.22); the text is what stands out.
function heatBg(v: number, max: number): CSSProperties | undefined {
  if (v <= 0 || max <= 0) return undefined;
  const alpha = Math.round((0.04 + (0.18 * v) / max) * 100) / 100;
  return { backgroundColor: `rgba(124, 58, 237, ${alpha})` };
}

function growthTotal(rows: DailySummaryRow[], i: number): number | null {
  if (i === 0) return null;
  const prev = rows[i - 1].revenue_total;
  if (!prev) return null;
  return (
    Math.round((10000 * (rows[i].revenue_total - prev)) / prev) / 100
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
  label,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  label: string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const btn =
    "min-h-[40px] min-w-[40px] rounded-lg border border-line px-2 text-sm tabular-nums text-soft hover:bg-violet-50 active:bg-violet-100 disabled:opacity-40";
  return (
    <nav
      aria-label={label}
      className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-line/60 pt-3"
    >
      <button
        type="button"
        className={btn}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPage(p)}
          aria-current={p === page ? "page" : undefined}
          className={`${btn} ${p === page ? "border-primary bg-primary/10 font-semibold text-primary" : ""}`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className={btn}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}

function usePaged(length: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(length / PAGE_SIZE));
  const safe = Math.min(Math.max(1, page), totalPages);
  const start = (safe - 1) * PAGE_SIZE;
  return { page: safe, totalPages, start, end: start + PAGE_SIZE, setPage };
}

export default function DailySummaryTables({
  rows,
}: {
  rows: DailySummaryRow[];
}) {
  // Global max across all qty columns for the full month, for the global-scale heatmap.
  const globalMax = useMemo(() => {
    let mx = 0;
    for (const r of rows)
      for (const k of QTY_KEYS) if (r[k] > mx) mx = r[k];
    return mx;
  }, [rows]);

  // Grand Total for the full month (not per page) for each table's footer.
  const totals = useMemo(() => {
    const keys = [...REVENUE_KEYS, ...QTY_KEYS];
    const acc = Object.fromEntries(keys.map((k) => [k, 0])) as Record<
      (typeof keys)[number],
      number
    >;
    for (const r of rows) for (const k of keys) acc[k] += r[k] ?? 0;
    return acc;
  }, [rows]);

  const summary = usePaged(rows.length);
  const apple = usePaged(rows.length);
  const android = usePaged(rows.length);

  const card =
    "card-surface p-4 md:p-5";

  return (
    <div className="mt-4 space-y-4">
      <section className={card} aria-label="Daily Sales Summary">
        <h2 className="text-sm font-semibold text-ink">
          Daily Sales Summary
        </h2>
        <p className="mt-1 text-xs text-muted">
          1st – end of month · all days shown (0 when no transactions)
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[1000px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 96 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr>
                <th className={dateHead}>Date</th>
                <th className={dayHead}>Day</th>
                <th className={thNum}>Total Revenue</th>
                <th className={thNum}>Apple</th>
                <th className={thNum}>Android</th>
                <th className={thNum}>Accessories</th>
                <th className={thNum}>VAS</th>
                <th className={thNum}>Total vs Yesterday</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice(summary.start, summary.end)
                .map((r) => {
                  const i = rows.findIndex((x) => x.date === r.date);
                  const g = growthTotal(rows, i);
                  return (
                    <tr
                      key={r.date}
                      className="group hover:bg-violet-50 last:[&>td]:border-b-0"
                    >
                      <td
                        className={dateCell}
                        title={r.date}
                      >
                        {formatDayMonth(r.date)}
                      </td>
                      <td className={dayCell}>{dayName(r.date)}</td>
                      <td className={tdNum}>
                        {rupiah(r.revenue_total)}
                      </td>
                      <td className={tdNum}>
                        {rupiah(r.revenue_apple)}
                      </td>
                      <td className={tdNum}>
                        {rupiah(r.revenue_android)}
                      </td>
                      <td className={tdNum}>
                        {rupiah(r.revenue_accessories)}
                      </td>
                      <td className={tdNum}>
                        {rupiah(r.revenue_vas)}
                      </td>
                      <td
                        // Manual (not reusing `td`): avoid a `text-soft`
                        // vs growth-color conflict — Tailwind cascade order is not guaranteed.
                        className={`border-b border-line/60 ${CELL_X} ${ROW_Y} text-right text-sm font-semibold tabular-nums ${
                          g === null
                            ? "text-faint"
                            : g >= 0
                              ? "text-accent"
                              : "text-danger"
                        }`}
                      >
                        {g === null
                          ? "-"
                          : `${g >= 0 ? "▲" : "▼"} ${pct(Math.abs(g))}`}
                      </td>
                    </tr>
                  );
                })}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={8}
                    className={`${CELL_X} py-8 text-center text-sm text-muted`}
                  >
                    No data.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td className={footLabel} colSpan={2}>
                    Grand Total
                  </td>
                  <td className={`${footCell} text-right`}>
                    {rupiah(totals.revenue_total)}
                  </td>
                  <td className={`${footCell} text-right`}>
                    {rupiah(totals.revenue_apple)}
                  </td>
                  <td className={`${footCell} text-right`}>
                    {rupiah(totals.revenue_android)}
                  </td>
                  <td className={`${footCell} text-right`}>
                    {rupiah(totals.revenue_accessories)}
                  </td>
                  <td className={`${footCell} text-right`}>
                    {rupiah(totals.revenue_vas)}
                  </td>
                  <td className={`${footCell} text-right`}>
                    <span className="text-faint">—</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination
          page={summary.page}
          totalPages={summary.totalPages}
          onPage={summary.setPage}
          label="Pagination Daily Sales Summary"
        />
      </section>

      <section className={card} aria-label="Apple Daily Product">
        <h2 className="text-sm font-semibold text-ink">
          Apple Daily Product
        </h2>
        <p className="mt-1 text-xs text-muted">
          Qty per day · Mac / iPad / iPhone / Watch / AirPods · global
          color scale, the darker the higher
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 96 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr>
                <th className={dateHead}>Date</th>
                <th className={dayHead}>Day</th>
                <th className={thQty}>Mac</th>
                <th className={thQty}>iPad</th>
                <th className={thQty}>iPhone</th>
                <th className={thQty}>Apple Watch</th>
                <th className={thQty}>AirPods</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(apple.start, apple.end).map((r) => (
                <tr
                  key={r.date}
                  className="group hover:bg-violet-50 last:[&>td]:border-b-0"
                >
                  <td
                    className={dateCell}
                    title={r.date}
                  >
                    {formatDayMonth(r.date)}
                  </td>
                  <td className={dayCell}>{dayName(r.date)}</td>
                  <td className={tdQty} style={heatBg(r.qty_mac, globalMax)}><span className={qtyCellClass(r.qty_mac)}>{num(r.qty_mac)}</span></td>
                  <td className={tdQty} style={heatBg(r.qty_ipad, globalMax)}><span className={qtyCellClass(r.qty_ipad)}>{num(r.qty_ipad)}</span></td>
                  <td className={tdQty} style={heatBg(r.qty_iphone, globalMax)}><span className={qtyCellClass(r.qty_iphone)}>{num(r.qty_iphone)}</span></td>
                  <td className={tdQty} style={heatBg(r.qty_apple_watch, globalMax)}>
                    <span className={qtyCellClass(r.qty_apple_watch)}>{num(r.qty_apple_watch)}</span>
                  </td>
                  <td className={tdQty} style={heatBg(r.qty_airpods, globalMax)}>
                    <span className={qtyCellClass(r.qty_airpods)}>{num(r.qty_airpods)}</span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={7}
                    className={`${CELL_X} py-8 text-center text-sm text-muted`}
                  >
                    No data.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td className={footLabel} colSpan={2}>
                    Grand Total
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_mac)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_ipad)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_iphone)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_apple_watch)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_airpods)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination
          page={apple.page}
          totalPages={apple.totalPages}
          onPage={apple.setPage}
          label="Pagination Apple Daily Product"
        />
      </section>

      <section className={card} aria-label="Android Daily Product">
        <h2 className="text-sm font-semibold text-ink">
          Android Daily Product
        </h2>
        <p className="mt-1 text-xs text-muted">
          Qty per day · per Android brand · global color scale, the
          darker the higher
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[1000px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 96 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr>
                <th className={dateHead}>Date</th>
                <th className={dayHead}>Day</th>
                <th className={thQty}>Samsung</th>
                <th className={thQty}>Oppo</th>
                <th className={thQty}>Xiaomi</th>
                <th className={thQty}>Huawei</th>
                <th className={thQty}>Infinix</th>
                <th className={thQty}>Motorola</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(android.start, android.end).map((r) => (
                <tr
                  key={r.date}
                  className="group hover:bg-violet-50 last:[&>td]:border-b-0"
                >
                  <td
                    className={dateCell}
                    title={r.date}
                  >
                    {formatDayMonth(r.date)}
                  </td>
                  <td className={dayCell}>{dayName(r.date)}</td>
                  <td className={tdQty} style={heatBg(r.qty_samsung, globalMax)}>
                    <span className={qtyCellClass(r.qty_samsung)}>{num(r.qty_samsung)}</span>
                  </td>
                  <td className={tdQty} style={heatBg(r.qty_oppo, globalMax)}><span className={qtyCellClass(r.qty_oppo)}>{num(r.qty_oppo)}</span></td>
                  <td className={tdQty} style={heatBg(r.qty_xiaomi, globalMax)}><span className={qtyCellClass(r.qty_xiaomi)}>{num(r.qty_xiaomi)}</span></td>
                  <td className={tdQty} style={heatBg(r.qty_huawei, globalMax)}><span className={qtyCellClass(r.qty_huawei)}>{num(r.qty_huawei)}</span></td>
                  <td className={tdQty} style={heatBg(r.qty_infinix, globalMax)}><span className={qtyCellClass(r.qty_infinix)}>{num(r.qty_infinix)}</span></td>
                  <td className={tdQty} style={heatBg(r.qty_motorola, globalMax)}>
                    <span className={qtyCellClass(r.qty_motorola)}>{num(r.qty_motorola)}</span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={8}
                    className={`${CELL_X} py-8 text-center text-sm text-muted`}
                  >
                    No data.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td className={footLabel} colSpan={2}>
                    Grand Total
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_samsung)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_oppo)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_xiaomi)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_huawei)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_infinix)}
                  </td>
                  <td className={`${footCell} text-center`}>
                    {num(totals.qty_motorola)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination
          page={android.page}
          totalPages={android.totalPages}
          onPage={android.setPage}
          label="Pagination Android Daily Product"
        />
      </section>
    </div>
  );
}
