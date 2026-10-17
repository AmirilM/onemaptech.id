"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { num, pct, rupiah } from "@/lib/format";
import {
  NO_SUBLOB,
  rankDeviceRows,
  rowAsp,
  rowKey,
  type DeviceMetric,
  type DeviceProductRow,
  type RankedDeviceRow,
} from "@/lib/product-analytics";
import ReportExport from "@/components/report-export";

type SortKey = "brand" | "lob" | "sublob" | "qty" | "revenue" | "asp";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 20, 50];

function compareRows(
  a: DeviceProductRow,
  b: DeviceProductRow,
  key: SortKey,
): number {
  if (key === "brand") return a.brand.localeCompare(b.brand, "id");
  if (key === "lob") return a.lob.localeCompare(b.lob, "id");
  if (key === "sublob") return a.sublob.localeCompare(b.sublob, "id");
  if (key === "qty") return a.qty - b.qty;
  if (key === "revenue") return a.revenue - b.revenue;
  const av = rowAsp(a);
  const bv = rowAsp(b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return av - bv;
}

function ariaSort(
  sortKey: SortKey,
  key: SortKey,
  sortDir: SortDir,
): "ascending" | "descending" | "none" {
  if (sortKey !== key) return "none";
  return sortDir === "asc" ? "ascending" : "descending";
}

export default function DeviceRankingTable({
  rows,
  metric,
  exportName,
}: {
  rows: DeviceProductRow[];
  metric: DeviceMetric;
  exportName: string;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [lob, setLob] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(metric);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Ganti metrik -> urutkan ulang sesuai metrik (pengurutan default = ranking).
  // Render-time adjust (pola FilterBar) — hindari setState di dalam effect.
  const [prevMetric, setPrevMetric] = useState(metric);
  if (prevMetric !== metric) {
    setPrevMetric(metric);
    setSortKey(metric);
    setSortDir("desc");
    setPage(1);
  }

  const brands = useMemo(
    () => [...new Set(rows.map((r) => r.brand))].sort((a, b) => a.localeCompare(b, "id")),
    [rows],
  );
  const lobs = useMemo(
    () => [...new Set(rows.map((r) => r.lob))].sort((a, b) => a.localeCompare(b, "id")),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (brand && r.brand !== brand) return false;
      if (lob && r.lob !== lob) return false;
      if (!q) return true;
      return (
        r.sublob.toLowerCase().includes(q) ||
        r.lob.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q)
      );
    });
  }, [rows, brand, lob, query]);

  // Rank/share/cumulative selalu mengikuti metrik & dihitung atas himpunan terfilter.
  const ranked = useMemo(() => rankDeviceRows(filtered, metric), [filtered, metric]);
  const rankMap = useMemo(() => {
    const m = new Map<string, RankedDeviceRow>();
    for (const x of ranked) m.set(rowKey(x.row), x);
    return m;
  }, [ranked]);

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
  const from = sorted.length === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, sorted.length);

  const facetReset = brand || lob || query.trim();

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "brand" || key === "lob" || key === "sublob" ? "asc" : "desc");
    }
    setPage(1);
  }

  function resetFacets() {
    setQuery("");
    setBrand("");
    setLob("");
    setPage(1);
  }

  const exportRows = ranked.map((x) => ({
    Rank: x.rank,
    Brand: x.row.brand,
    LOB: x.row.lob,
    Sublob: x.row.sublob === NO_SUBLOB ? "" : x.row.sublob,
    Qty: x.row.qty,
    "Share %": Math.round(x.share * 100) / 100,
    "Cum %": Math.round(x.cumulative * 100) / 100,
    Revenue: x.row.revenue,
    ASP: x.row.qty > 0 ? Math.round(x.row.revenue / x.row.qty) : null,
  }));

  const th =
    "px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap";
  const td = "h-11 px-3 align-middle text-sm tabular-nums text-soft whitespace-nowrap";
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
  const input =
    "min-h-[40px] rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/25";

  return (
    <div>
      {/* Filter facet + search */}
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
            placeholder="Search sublob / lob / brand…"
            aria-label="Search product"
            className={`${input} w-full pl-9`}
          />
        </div>
        <select
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by brand"
          className={input}
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={lob}
          onChange={(e) => {
            setLob(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by lob"
          className={input}
        >
          <option value="">All lobs</option>
          {lobs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        {facetReset && (
          <button
            type="button"
            onClick={resetFacets}
            className="min-h-[40px] rounded-lg border border-line px-3 text-sm text-soft hover:bg-violet-50"
          >
            Reset
          </button>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[880px] border-collapse">
          <caption className="sr-only">
            Device product ranking per sublob, by {metric === "qty" ? "quantity" : "revenue"}
          </caption>
          <thead>
            <tr className="border-b border-line">
              <th className={`${th} text-right`}>Rank</th>
              <th className={`${th} text-left`} aria-sort={ariaSort(sortKey, "brand", sortDir)}>
                <button type="button" onClick={() => toggleSort("brand")} aria-label="Sort by brand" className={sortBtn}>
                  Brand
                  {sortIcon("brand")}
                </button>
              </th>
              <th className={`${th} text-left`} aria-sort={ariaSort(sortKey, "lob", sortDir)}>
                <button type="button" onClick={() => toggleSort("lob")} aria-label="Sort by lob" className={sortBtn}>
                  LOB
                  {sortIcon("lob")}
                </button>
              </th>
              <th className={`${th} text-left`} aria-sort={ariaSort(sortKey, "sublob", sortDir)}>
                <button type="button" onClick={() => toggleSort("sublob")} aria-label="Sort by sublob" className={sortBtn}>
                  Sublob
                  {sortIcon("sublob")}
                </button>
              </th>
              <th className={`${th} text-right`} aria-sort={ariaSort(sortKey, "qty", sortDir)}>
                <button type="button" onClick={() => toggleSort("qty")} aria-label="Sort by qty" className={sortBtn}>
                  Qty
                  {sortIcon("qty")}
                </button>
              </th>
              <th className={`${th} text-right`}>Share %</th>
              <th className={`${th} text-right`}>Cum %</th>
              <th className={`${th} text-right`} aria-sort={ariaSort(sortKey, "revenue", sortDir)}>
                <button type="button" onClick={() => toggleSort("revenue")} aria-label="Sort by revenue" className={sortBtn}>
                  Revenue
                  {sortIcon("revenue")}
                </button>
              </th>
              <th className={`${th} text-right`} aria-sort={ariaSort(sortKey, "asp", sortDir)}>
                <button type="button" onClick={() => toggleSort("asp")} aria-label="Sort by average selling price" className={sortBtn}>
                  ASP
                  {sortIcon("asp")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => {
              const rk = rankMap.get(rowKey(r));
              const noSub = r.sublob === NO_SUBLOB;
              return (
                <tr
                  key={rowKey(r)}
                  className="border-b border-line/60 last:border-0 hover:bg-violet-50"
                >
                  <td className={`${td} text-right`}>
                    <span className="inline-flex min-w-6 justify-center rounded-full bg-canvas px-1.5 py-px text-[10px] leading-4 font-bold text-muted tabular-nums">
                      {rk?.rank ?? "-"}
                    </span>
                  </td>
                  <td className={`${td} text-left`}>{r.brand}</td>
                  <td className={`${td} text-left text-muted`}>{r.lob}</td>
                  <td className={`${td} max-w-[260px] truncate text-left font-medium text-ink`} title={r.sublob}>
                    {noSub ? <span className="italic text-faint">{r.sublob}</span> : r.sublob}
                  </td>
                  <td className={`${td} text-right`}>{num(r.qty)}</td>
                  <td className={`${td} text-right text-muted`}>{pct(rk?.share ?? null)}</td>
                  <td className={`${td} text-right text-muted`}>{pct(rk?.cumulative ?? null)}</td>
                  <td className={`${td} text-right`}>{rupiah(r.revenue)}</td>
                  <td className={`${td} text-right text-muted`}>{rupiah(rowAsp(r))}</td>
                </tr>
              );
            })}
            {!paged.length && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-sm text-muted">
                  {facetReset ? "No products match the filter." : "No device data for this scope."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + export */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <label className="inline-flex items-center gap-1.5">
          Rows
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Rows per page"
            className="rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-ink focus:border-primary focus:outline-none"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p className="tabular-nums" aria-live="polite">
          Showing {from}–{to} of {sorted.length}
        </p>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label="Previous page"
            className="min-h-[36px] rounded-lg border border-line px-3 disabled:opacity-40 enabled:hover:bg-violet-50"
          >
            Prev
          </button>
          <span className="px-2 tabular-nums" aria-live="polite">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            aria-label="Next page"
            className="min-h-[36px] rounded-lg border border-line px-3 disabled:opacity-40 enabled:hover:bg-violet-50"
          >
            Next
          </button>
        </div>
        <div className="ml-auto">
          <ReportExport rows={exportRows} filename={exportName} />
        </div>
      </div>
    </div>
  );
}
