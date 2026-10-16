"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { pct, rupiah, rupiahCompact } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/types";

type SortKey =
  | "rank"
  | "store_code"
  | "store_name"
  | "total_target"
  | "revenue_total"
  | "ach_total"
  | "apple_target"
  | "revenue_apple"
  | "ach_apple"
  | "android_target"
  | "revenue_android"
  | "ach_android";

type SortDir = "asc" | "desc";

const GROUPS: { label: string; cols: { key: SortKey; label: string }[] }[] = [
  {
    label: "Total",
    cols: [
      { key: "total_target", label: "Target" },
      { key: "revenue_total", label: "Sales" },
      { key: "ach_total", label: "Ach%" },
    ],
  },
  {
    label: "Apple",
    cols: [
      { key: "apple_target", label: "Target" },
      { key: "revenue_apple", label: "Sales" },
      { key: "ach_apple", label: "Ach%" },
    ],
  },
  {
    label: "Android",
    cols: [
      { key: "android_target", label: "Target" },
      { key: "revenue_android", label: "Sales" },
      { key: "ach_android", label: "Ach%" },
    ],
  },
];

function numVal(r: LeaderboardRow, key: SortKey): number | null {
  switch (key) {
    case "rank":
      return r.rank_achievement;
    case "total_target":
      return r.total_target;
    case "revenue_total":
      return r.revenue_total;
    case "ach_total":
      return r.ach_total_pct;
    case "apple_target":
      return r.apple_target;
    case "revenue_apple":
      return r.revenue_apple;
    case "ach_apple":
      return r.ach_apple_pct;
    case "android_target":
      return r.android_target;
    case "revenue_android":
      return r.revenue_android;
    case "ach_android":
      return r.ach_android_pct;
    default:
      return null;
  }
}

function compareRows(a: LeaderboardRow, b: LeaderboardRow, key: SortKey): number {
  if (key === "store_code")
    return a.store_code.localeCompare(b.store_code, "id");
  if (key === "store_name")
    return (a.store_name ?? "").localeCompare(b.store_name ?? "", "id");
  const av = numVal(a, key);
  const bv = numVal(b, key);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return av - bv;
}

function rankBadge(rank: number): string {
  if (rank === 1)
    return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300";
  if (rank === 2)
    return "bg-slate-200 text-slate-700 ring-1 ring-inset ring-slate-300";
  if (rank === 3)
    return "bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-300";
  return "bg-canvas text-muted";
}

function achStatus(v: number | null, pace: number): string {
  if (v === null || v === undefined) return "no-target";
  if (v >= 100) return "exceed";
  if (v >= pace) return "on-track";
  return "critical";
}

function achCell(v: number | null, pace: number): string {
  const s = achStatus(v, pace);
  if (s === "exceed")
    return "bg-accent/10 text-accent ring-1 ring-inset ring-accent/25";
  if (s === "on-track")
    return "bg-warning/10 text-warning ring-1 ring-inset ring-warning/25";
  if (s === "critical")
    return "bg-danger/10 text-danger ring-1 ring-inset ring-danger/25";
  return "text-muted";
}

function achTitle(
  v: number | null,
  pace: number,
): string {
  const s = achStatus(v, pace);
  if (s === "no-target") return "Tanpa target";
  if (s === "exceed") return `Exceed target (${pct(v)})`;
  if (s === "on-track") return `On-track vs pace ${pct(pace)} (${pct(v)})`;
  return `Critical vs pace ${pct(pace)} (${pct(v)})`;
}

function ariaSort(
  sortKey: SortKey,
  key: SortKey,
  sortDir: SortDir,
): "ascending" | "descending" | "none" {
  if (sortKey !== key) return "none";
  return sortDir === "asc" ? "ascending" : "descending";
}

export default function LeaderboardTable({
  rows,
  am,
  pacePct,
}: {
  rows: LeaderboardRow[];
  am: string;
  pacePct: number;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.store_code.toLowerCase().includes(q) ||
        (r.store_name ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const c = compareRows(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "store_code" || key === "store_name" ? "asc" : "desc");
      if (key === "rank") setSortDir("asc");
    }
    setPage(1);
  }

  function storeHref(code: string) {
    const q = new URLSearchParams();
    if (am) q.set("am", am);
    q.set("store", code);
    return `/?${q.toString()}`;
  }

  const th =
    "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap";
  const td = "h-11 px-3 align-middle text-xs tabular-nums text-soft whitespace-nowrap";
  const sortBtn =
    "inline-flex items-center gap-1 rounded-md px-1 py-1 uppercase hover:bg-violet-50 hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none";
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      sortDir === "asc" ? (
        <ArrowUp size={12} aria-hidden />
      ) : (
        <ArrowDown size={12} aria-hidden />
      )
    ) : null;
  // Kolom identitas sticky: zebra ikut menempel via varian even:
  const stickyCell = "sticky bg-surface even:bg-canvas";

  const from = sorted.length === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, sorted.length);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kode / nama toko…"
            aria-label="Cari kode atau nama toko"
            className="w-full rounded-xl border border-line bg-canvas py-2 pr-3 pl-9 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none"
          />
        </div>
        <p className="ml-auto text-xs text-muted tabular-nums" aria-live="polite">
          {sorted.length} toko
          {query.trim() ? ` · hasil cari "${query.trim()}"` : ""}
        </p>
      </div>
      <div
        className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted"
        aria-label={`Level achievement: pace periode berjalan ${pct(pacePct)}`}
      >
        <span className="tabular-nums">Pace {pct(pacePct)}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-accent" aria-hidden />
          Exceed ≥100%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-warning" aria-hidden />
          On-track ≥pace
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-danger" aria-hidden />
          Critical &lt;pace
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px] border-collapse">
          <caption className="sr-only">
            Peringkat store berdasarkan achievement Total Sales vs Total Target,
            dirinci Apple dan Android
          </caption>
          <thead>
            <tr className="border-b border-line">
              <th
                rowSpan={2}
                aria-sort={ariaSort(sortKey, "rank", sortDir)}
                className={`${th} ${stickyCell} left-0 w-16 min-w-16 text-left`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort("rank")}
                  aria-label="Urutkan berdasarkan Rank"
                  className={sortBtn}
                >
                  Rank
                  {sortIcon("rank")}
                </button>
              </th>
              <th
                rowSpan={2}
                aria-sort={ariaSort(sortKey, "store_code", sortDir)}
                className={`${th} ${stickyCell} left-16 border-r border-line text-left`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort("store_code")}
                  aria-label="Urutkan berdasarkan Store code"
                  className={sortBtn}
                >
                  Kode
                  {sortIcon("store_code")}
                </button>
              </th>
              <th
                rowSpan={2}
                aria-sort={ariaSort(sortKey, "store_name", sortDir)}
                className={`${th} text-left`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort("store_name")}
                  aria-label="Urutkan berdasarkan Store Name"
                  className={sortBtn}
                >
                  Store Name
                  {sortIcon("store_name")}
                </button>
              </th>
              {GROUPS.map((g, gi) => (
                <th
                  key={g.label}
                  colSpan={3}
                  scope="colgroup"
                  className={`bg-canvas/60 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-soft whitespace-nowrap border-l border-line ${gi === GROUPS.length - 1 ? "border-r" : ""}`}
                >
                  {g.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-line">
              {GROUPS.flatMap((g, gi) =>
                g.cols.map((c, i) => (
                  <th
                    key={c.key}
                    aria-sort={ariaSort(sortKey, c.key, sortDir)}
                    className={`${th} text-right ${i === 0 ? "border-l border-line" : ""} ${gi === GROUPS.length - 1 && i === g.cols.length - 1 ? "border-r border-line" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      aria-label={`Urutkan berdasarkan ${c.label} ${g.label}`}
                      className={sortBtn}
                    >
                      {c.label}
                      {sortIcon(c.key)}
                    </button>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr
                key={r.store_code}
                className="border-b border-line/60 last:border-0 odd:bg-surface even:bg-canvas hover:bg-violet-50"
              >
                <td className={`${td} ${stickyCell} left-0`}>
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-px text-[10px] leading-4 font-bold tabular-nums ${rankBadge(r.rank_achievement)}`}
                  >
                    {r.rank_achievement}
                  </span>
                </td>
                <td className={`${td} ${stickyCell} left-16 border-r border-line text-[13px]`}>
                  <Link
                    href={storeHref(r.store_code)}
                    title={`Lihat store ${r.store_code}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {r.store_code}
                  </Link>
                </td>
                <td
                  className={`${td} max-w-[220px] truncate text-[13px] text-ink`}
                  title={r.store_name ?? ""}
                >
                  {r.store_name ?? "-"}
                </td>
                <td className={`${td} border-l border-line text-right`} title={rupiah(r.total_target)}>
                  {rupiahCompact(r.total_target)}
                </td>
                <td className={`${td} text-right`} title={rupiah(r.revenue_total)}>
                  {rupiahCompact(r.revenue_total)}
                </td>
                <td className={`${td} text-right`}>
                  <span
                    title={achTitle(r.ach_total_pct, pacePct)}
                    className={`inline-block rounded-full px-1.5 py-px text-[10px] leading-4 font-semibold tabular-nums ${achCell(r.ach_total_pct, pacePct)}`}
                  >
                    {pct(r.ach_total_pct)}
                  </span>
                </td>
                <td className={`${td} border-l border-line text-right`} title={rupiah(r.apple_target)}>
                  {rupiahCompact(r.apple_target)}
                </td>
                <td className={`${td} text-right`} title={rupiah(r.revenue_apple)}>
                  {rupiahCompact(r.revenue_apple)}
                </td>
                <td className={`${td} text-right`}>
                  <span
                    title={achTitle(r.ach_apple_pct, pacePct)}
                    className={`inline-block rounded-full px-1.5 py-px text-[10px] leading-4 font-semibold tabular-nums ${achCell(r.ach_apple_pct, pacePct)}`}
                  >
                    {pct(r.ach_apple_pct)}
                  </span>
                </td>
                <td className={`${td} border-l border-line text-right`} title={rupiah(r.android_target)}>
                  {rupiahCompact(r.android_target)}
                </td>
                <td className={`${td} text-right`} title={rupiah(r.revenue_android)}>
                  {rupiahCompact(r.revenue_android)}
                </td>
                <td className={`${td} border-r border-line text-right`}>
                  <span
                    title={achTitle(r.ach_android_pct, pacePct)}
                    className={`inline-block rounded-full px-1.5 py-px text-[10px] leading-4 font-semibold tabular-nums ${achCell(r.ach_android_pct, pacePct)}`}
                  >
                    {pct(r.ach_android_pct)}
                  </span>
                </td>
              </tr>
            ))}
            {!paged.length && (
              <tr>
                <td colSpan={12} className="py-8 text-center text-sm text-muted">
                  {query.trim()
                    ? `Tidak ada toko cocok "${query.trim()}".`
                    : "Tidak ada data."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <label className="inline-flex items-center gap-1.5">
          Baris
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Jumlah baris per halaman"
            className="rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-ink focus:border-primary focus:outline-none"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p className="tabular-nums" aria-live="polite">
          Menampilkan {from}–{to} dari {sorted.length}
        </p>
        <div className="ml-auto inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label="Halaman sebelumnya"
            className="rounded-lg border border-line p-1.5 disabled:opacity-40 enabled:hover:bg-violet-50"
          >
            <ChevronLeft size={14} aria-hidden />
          </button>
          <span className="px-2 tabular-nums" aria-live="polite">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            aria-label="Halaman berikutnya"
            className="rounded-lg border border-line p-1.5 disabled:opacity-40 enabled:hover:bg-violet-50"
          >
            <ChevronRight size={14} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
