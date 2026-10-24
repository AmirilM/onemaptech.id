"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { num, pctExact, rupiah } from "@/lib/format";
import type { AccessoryItem } from "@/lib/accessories";

type SortKey = "description" | "brand" | "lob" | "qty" | "revenue";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 20, 50];

function compareItems(a: AccessoryItem, b: AccessoryItem, key: SortKey): number {
  if (key === "description") return a.description.localeCompare(b.description, "id");
  if (key === "brand") return a.brand.localeCompare(b.brand, "id");
  if (key === "lob") return a.lob.localeCompare(b.lob, "id");
  return a[key] - b[key];
}

function ariaSort(
  sortKey: SortKey,
  key: SortKey,
  sortDir: SortDir,
): "ascending" | "descending" | "none" {
  if (sortKey !== key) return "none";
  return sortDir === "asc" ? "ascending" : "descending";
}

export default function AccessoryItemTable({ items }: { items: AccessoryItem[] }) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [lob, setLob] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const brands = useMemo(
    () =>
      [...new Set(items.map((i) => i.brand))].sort((a, b) =>
        a.localeCompare(b, "id"),
      ),
    [items],
  );
  const lobs = useMemo(
    () =>
      [...new Set(items.map((i) => i.lob))].sort((a, b) =>
        a.localeCompare(b, "id"),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (brand && i.brand !== brand) return false;
      if (lob && i.lob !== lob) return false;
      if (!q) return true;
      return (
        i.description.toLowerCase().includes(q) ||
        i.article.toLowerCase().includes(q) ||
        i.brand.toLowerCase().includes(q) ||
        i.lob.toLowerCase().includes(q)
      );
    });
  }, [items, brand, lob, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const c = compareItems(a, b, sortKey);
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
      setSortDir(key === "qty" || key === "revenue" ? "desc" : "asc");
    }
    setPage(1);
  }

  function resetFacets() {
    setQuery("");
    setBrand("");
    setLob("");
    setPage(1);
  }

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
    <section className="card-surface p-4 md:p-5" aria-label="Detail per accessories">
      <h2 className="text-sm font-semibold text-ink">Detail per Accessories</h2>
      <p className="mt-0.5 text-xs text-muted">
        {num(items.length)} artikel · nama dari sap_description · % dari total
        revenue Accessories
      </p>

      <div className="mt-3 mb-3 flex flex-wrap items-center gap-2">
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
            placeholder="Search description / article / brand…"
            aria-label="Search accessories"
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

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[920px] border-collapse">
          <caption className="sr-only">
            Accessories per sap_article, with quantity, revenue, and share of
            total revenue
          </caption>
          <thead>
            <tr className="border-b border-line">
              <th className={`${th} text-left`} aria-sort={ariaSort(sortKey, "description", sortDir)}>
                <button
                  type="button"
                  onClick={() => toggleSort("description")}
                  aria-label="Sort by description"
                  className={sortBtn}
                >
                  Deskripsi
                  {sortIcon("description")}
                </button>
              </th>
              <th className={`${th} text-left`} aria-sort={ariaSort(sortKey, "brand", sortDir)}>
                <button
                  type="button"
                  onClick={() => toggleSort("brand")}
                  aria-label="Sort by brand"
                  className={sortBtn}
                >
                  Brand
                  {sortIcon("brand")}
                </button>
              </th>
              <th className={`${th} text-left`} aria-sort={ariaSort(sortKey, "lob", sortDir)}>
                <button
                  type="button"
                  onClick={() => toggleSort("lob")}
                  aria-label="Sort by lob"
                  className={sortBtn}
                >
                  LOB
                  {sortIcon("lob")}
                </button>
              </th>
              <th className={`${th} text-right`} aria-sort={ariaSort(sortKey, "qty", sortDir)}>
                <button
                  type="button"
                  onClick={() => toggleSort("qty")}
                  aria-label="Sort by qty"
                  className={sortBtn}
                >
                  Qty
                  {sortIcon("qty")}
                </button>
              </th>
              <th className={`${th} text-right`} aria-sort={ariaSort(sortKey, "revenue", sortDir)}>
                <button
                  type="button"
                  onClick={() => toggleSort("revenue")}
                  aria-label="Sort by revenue"
                  className={sortBtn}
                >
                  Revenue
                  {sortIcon("revenue")}
                </button>
              </th>
              <th className={`${th} text-right`}>% Total</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((i) => (
              <tr
                key={i.article}
                className="border-b border-line/60 last:border-0 hover:bg-violet-50"
              >
                <td
                  className={`${td} max-w-[320px] truncate text-left font-medium text-ink`}
                  title={`${i.description} · ${i.article}`}
                >
                  {i.description}
                </td>
                <td className={`${td} text-left`}>{i.brand}</td>
                <td className={`${td} text-left text-muted`}>{i.lob}</td>
                <td className={`${td} text-right`}>{num(i.qty)}</td>
                <td className={`${td} text-right`}>{rupiah(i.revenue)}</td>
                <td className={`${td} text-right text-muted`}>
                  {pctExact(i.revenueShare)}
                </td>
              </tr>
            ))}
            {!paged.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted">
                  {facetReset
                    ? "No accessories match the filter."
                    : "No accessory data for this scope."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
      </div>
    </section>
  );
}
