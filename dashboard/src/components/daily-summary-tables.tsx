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

const th =
  "border-b border-line px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted";
const tdBase = "border-b border-line/60 px-3 py-2.5 text-sm tabular-nums";
const td = `${tdBase} text-soft`;
// Single source untuk lebar kolom Date = offset sticky kolom Day (desktop saja).
// (Literal class dijaga agar terdeteksi Tailwind; jangan jadikan dinamis.)
// Opsi B: tanpa freeze di mobile — sticky Date + Day hanya aktif di md+.
const DATE_MIN_W = "min-w-[84px]";
const DAY_STICKY_LEFT = "md:left-[84px]";
const dateCell = `${tdBase} md:sticky md:left-0 md:bg-surface font-medium text-ink group-hover:bg-violet-50 ${DATE_MIN_W}`;
const dateHead = `${th} md:sticky md:left-0 md:bg-surface ${DATE_MIN_W}`;
const dayCell = `${tdBase} md:sticky md:border-r md:border-line md:bg-surface text-soft group-hover:bg-violet-50 ${DAY_STICKY_LEFT}`;
const dayHead = `${th} md:sticky md:border-r md:border-line md:bg-surface ${DAY_STICKY_LEFT}`;

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

// Kolom qty produk (11) untuk color-scale ala Excel (heatmap per kolom).
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

// Background sel proporsional ke max global (0 = transparan).
// Alpha tipis (maks ±0.22); yang ditonjolkan adalah teks.
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
    "min-h-[36px] min-w-[36px] rounded-lg border border-line px-2 text-sm tabular-nums text-soft hover:bg-violet-50 active:bg-violet-100 disabled:opacity-40";
  return (
    <nav
      aria-label={label}
      className="mt-2 flex flex-wrap items-center justify-end gap-1.5 border-t border-line/60 pt-3"
    >
      <button
        type="button"
        className={btn}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Halaman sebelumnya"
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
        aria-label="Halaman berikutnya"
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
  // Max global seluruh kolom qty sebulan penuh untuk heatmap skala global.
  const globalMax = useMemo(() => {
    let mx = 0;
    for (const r of rows)
      for (const k of QTY_KEYS) if (r[k] > mx) mx = r[k];
    return mx;
  }, [rows]);
  const summary = usePaged(rows.length);
  const apple = usePaged(rows.length);
  const android = usePaged(rows.length);

  const card =
    "rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5";

  return (
    <div className="mt-4 space-y-4">
      <section className={card} aria-label="Daily Sales Summary">
        <h2 className="text-sm font-semibold text-ink">
          Daily Sales Summary
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Tgl 1 – akhir bulan · semua hari tampil (0 bila tanpa transaksi)
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1112px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 84 }} />
              <col style={{ width: 128 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-line">
                <th className={dateHead}>Date</th>
                <th className={dayHead}>Day</th>
                <th className={`${th} text-center`}>Total Revenue</th>
                <th className={`${th} text-center`}>Apple</th>
                <th className={`${th} text-center`}>Android</th>
                <th className={`${th} text-center`}>Accessories</th>
                <th className={`${th} text-center`}>VAS</th>
                <th className={`${th} text-center`}>Total vs Yesterday</th>
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
                      <td className={`${td} text-right`}>
                        {rupiah(r.revenue_total)}
                      </td>
                      <td className={`${td} text-right`}>
                        {rupiah(r.revenue_apple)}
                      </td>
                      <td className={`${td} text-right`}>
                        {rupiah(r.revenue_android)}
                      </td>
                      <td className={`${td} text-right`}>
                        {rupiah(r.revenue_accessories)}
                      </td>
                      <td className={`${td} text-right`}>
                        {rupiah(r.revenue_vas)}
                      </td>
                      <td
                        // Manual (bukan reuse `td`): hindari konflik `text-soft`
                        // vs warna growth — urutan cascade Tailwind tak dijamin.
                        className={`border-b border-line/60 px-3 py-2.5 text-right text-sm font-semibold tabular-nums ${
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
                    className="py-8 text-center text-sm text-muted"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
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
        <p className="mt-0.5 text-xs text-muted">
          Qty per hari · Mac / iPad / iPhone / Watch / AirPods · warna
          skala global, makin pekat makin tinggi
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[712px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 84 }} />
              <col style={{ width: 128 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-line">
                <th className={dateHead}>Date</th>
                <th className={dayHead}>Day</th>
                <th className={`${th} text-center`}>Mac</th>
                <th className={`${th} text-center`}>iPad</th>
                <th className={`${th} text-center`}>iPhone</th>
                <th className={`${th} text-center`}>Apple Watch</th>
                <th className={`${th} text-center`}>AirPods</th>
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
                  <td className={`${td} text-center`} style={heatBg(r.qty_mac, globalMax)}><span className={qtyCellClass(r.qty_mac)}>{num(r.qty_mac)}</span></td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_ipad, globalMax)}><span className={qtyCellClass(r.qty_ipad)}>{num(r.qty_ipad)}</span></td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_iphone, globalMax)}><span className={qtyCellClass(r.qty_iphone)}>{num(r.qty_iphone)}</span></td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_apple_watch, globalMax)}>
                    <span className={qtyCellClass(r.qty_apple_watch)}>{num(r.qty_apple_watch)}</span>
                  </td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_airpods, globalMax)}>
                    <span className={qtyCellClass(r.qty_airpods)}>{num(r.qty_airpods)}</span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
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
        <p className="mt-0.5 text-xs text-muted">
          Qty per hari · per brand Android · warna skala global, makin
          pekat makin tinggi
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[812px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 84 }} />
              <col style={{ width: 128 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-line">
                <th className={dateHead}>Date</th>
                <th className={dayHead}>Day</th>
                <th className={`${th} text-center`}>Samsung</th>
                <th className={`${th} text-center`}>Oppo</th>
                <th className={`${th} text-center`}>Xiaomi</th>
                <th className={`${th} text-center`}>Huawei</th>
                <th className={`${th} text-center`}>Infinix</th>
                <th className={`${th} text-center`}>Motorola</th>
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
                  <td className={`${td} text-center`} style={heatBg(r.qty_samsung, globalMax)}>
                    <span className={qtyCellClass(r.qty_samsung)}>{num(r.qty_samsung)}</span>
                  </td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_oppo, globalMax)}><span className={qtyCellClass(r.qty_oppo)}>{num(r.qty_oppo)}</span></td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_xiaomi, globalMax)}><span className={qtyCellClass(r.qty_xiaomi)}>{num(r.qty_xiaomi)}</span></td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_huawei, globalMax)}><span className={qtyCellClass(r.qty_huawei)}>{num(r.qty_huawei)}</span></td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_infinix, globalMax)}><span className={qtyCellClass(r.qty_infinix)}>{num(r.qty_infinix)}</span></td>
                  <td className={`${td} text-center`} style={heatBg(r.qty_motorola, globalMax)}>
                    <span className={qtyCellClass(r.qty_motorola)}>{num(r.qty_motorola)}</span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
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
