"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { num, pct, pctExact, rupiah } from "@/lib/format";
import {
  computeAccessoryBrands,
  computeAccessoryTotals,
  type AccessoryBrand,
  type AccessoryRow,
} from "@/lib/accessories";
import MetricToggle from "@/components/metric-toggle";
import type { DeviceMetric } from "@/lib/product-analytics";

type SortKey =
  | "label"
  | "qty"
  | "revenue"
  | "asp"
  | "share"
  | "total"
  | "sku";
type SortDir = "asc" | "desc";

const CARD = "card-surface p-4 md:p-5";
const TH =
  "px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap";
const TD = "px-3 py-2.5 align-middle text-sm tabular-nums whitespace-nowrap";
const LABEL_TD = "px-3 py-2.5 align-middle text-sm";
const SORT_BTN =
  "inline-flex items-center gap-1 rounded-md px-1 py-1 uppercase hover:bg-violet-50 hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none";

type Sortable = {
  qty: number;
  revenue: number;
  asp: number | null;
  qtyShare: number;
  revenueShare: number;
  totalRevenueShare: number;
  skuCount: number;
};

function sortValue(row: Sortable, key: SortKey, metric: DeviceMetric): number {
  switch (key) {
    case "asp":
      return row.asp ?? -1;
    case "share":
      return metric === "qty" ? row.qtyShare : row.revenueShare;
    case "total":
      return row.totalRevenueShare;
    case "sku":
      return row.skuCount;
    case "qty":
      return row.qty;
    case "revenue":
      return row.revenue;
    default:
      return 0;
  }
}

function compare(
  a: Sortable,
  b: Sortable,
  key: SortKey,
  labelA: string,
  labelB: string,
  metric: DeviceMetric,
): number {
  if (key === "label") return labelA.localeCompare(labelB, "id");
  return sortValue(a, key, metric) - sortValue(b, key, metric);
}

function aspLabel(value: number | null): string {
  return value === null ? "-" : rupiah(Math.round(value));
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={CARD}>
      <p className="text-xs font-medium leading-4 tracking-wide text-muted">
        {label}
      </p>
      <p
        className="mt-2 text-xl font-bold tracking-tight text-ink tabular-nums"
        title={value}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}

export default function AccessoryAnalytics({ rows }: { rows: AccessoryRow[] }) {
  const totals = useMemo(() => computeAccessoryTotals(rows), [rows]);
  const brands = useMemo(() => computeAccessoryBrands(rows), [rows]);

  const [metric, setMetric] = useState<DeviceMetric>("revenue");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Brand teratas terbuka sejak awal; LOB dibuka sendiri oleh user.
  const [openBrands, setOpenBrands] = useState<Set<string>>(
    () => new Set(brands.slice(0, 2).map((b) => b.brand)),
  );
  const [openLobs, setOpenLobs] = useState<Set<string>>(() => new Set());

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "label" ? "asc" : "desc");
    }
  }

  function toggleIn(set: Set<string>, key: string): Set<string> {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  /** Sort diterapkan di tiap level: brand, LOB dalam brand, produk dalam LOB. */
  const sortedBrands = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...brands]
      .sort((a, b) => dir * compare(a, b, sortKey, a.brand, b.brand, metric))
      .map((b) => ({
        ...b,
        lobs: [...b.lobs]
          .sort((x, y) => dir * compare(x, y, sortKey, x.lob, y.lob, metric))
          .map((l) => ({
            ...l,
            products: [...l.products].sort(
              (p, q) =>
                dir *
                compare(p, q, sortKey, p.description, q.description, metric),
            ),
          })),
      }));
  }, [brands, sortKey, sortDir, metric]);

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ArrowUp size={12} aria-hidden />
    ) : (
      <ArrowDown size={12} aria-hidden />
    );
  }

  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  function header(
    label: string,
    key: SortKey,
    align: "left" | "right" = "right",
  ) {
    return (
      <th
        className={`${TH} ${align === "left" ? "text-left" : "text-right"}`}
        aria-sort={ariaSort(key)}
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          aria-label={`Sort by ${label}`}
          className={SORT_BTN}
        >
          {label}
          {sortIcon(key)}
        </button>
      </th>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <section
        aria-label="Accessories summary"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <MetricCard
          label="Total Revenue"
          value={rupiah(totals.revenue)}
          sub="seluruh accessories"
        />
        <MetricCard label="Qty Terjual" value={num(totals.qty)} sub="unit" />
        <MetricCard
          label="Brand Aktif"
          value={num(totals.brandCount)}
          sub="brand_name"
        />
        <MetricCard
          label="Artikel Aktif"
          value={num(totals.articleCount)}
          sub="sap_article"
        />
      </section>

      <section className={CARD} aria-label="Kontribusi brand, LOB, dan produk">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">
              Kontribusi Brand &amp; LOB &amp; Produk
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Persen mengikuti induknya: brand terhadap total · LOB terhadap
              brand · produk terhadap LOB. % Total selalu revenue terhadap
              seluruh Accessories. Klik baris untuk buka/tutup.
            </p>
          </div>
          <MetricToggle value={metric} onChange={setMetric} />
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                {header("Brand / LOB / Produk", "label", "left")}
                {header("Qty", "qty")}
                {header("Revenue", "revenue")}
                {header("ASP", "asp")}
                {header(metric === "qty" ? "% Qty" : "% Revenue", "share")}
                {header("% Total", "total")}
                {header("SKU", "sku")}
              </tr>
            </thead>
            <tbody>
              {sortedBrands.map((b: AccessoryBrand) => {
                const brandOpen = openBrands.has(b.brand);
                return (
                  <Fragment key={b.brand}>
                    <tr className="border-b border-line/60 bg-canvas hover:bg-violet-50">
                      <td className={`${LABEL_TD} min-w-[280px] text-left`}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenBrands((prev) => toggleIn(prev, b.brand))
                          }
                          aria-expanded={brandOpen}
                          className="inline-flex items-start gap-1.5 rounded-md text-left focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                        >
                          <ChevronRight
                            size={14}
                            aria-hidden
                            className={`mt-1 shrink-0 text-muted transition-transform ${
                              brandOpen ? "rotate-90" : ""
                            }`}
                          />
                          <span>
                            <span className="font-semibold text-ink">
                              {b.brand}
                            </span>
                            <span className="ml-1.5 text-[11px] font-normal text-faint">
                              {b.lobs.length} LOB
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className={`${TD} text-right font-semibold text-ink`}>
                        {num(b.qty)}
                      </td>
                      <td className={`${TD} text-right font-semibold text-ink`}>
                        {rupiah(b.revenue)}
                      </td>
                      <td className={`${TD} text-right text-soft`}>
                        {aspLabel(b.asp)}
                      </td>
                      <td className={`${TD} text-right text-muted`}>
                        {pct(metric === "qty" ? b.qtyShare : b.revenueShare)}
                      </td>
                      <td className={`${TD} text-right text-muted`}>
                        {pctExact(b.totalRevenueShare)}
                      </td>
                      <td className={`${TD} text-right text-muted`}>
                        {num(b.skuCount)}
                      </td>
                    </tr>

                    {brandOpen &&
                      b.lobs.map((l) => {
                        const lobKey = `${b.brand}|${l.lob}`;
                        const lobOpen = openLobs.has(lobKey);
                        return (
                          <Fragment key={lobKey}>
                            <tr className="border-b border-line/60 hover:bg-violet-50">
                              <td className={`${LABEL_TD} pl-8 text-left`}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenLobs((prev) => toggleIn(prev, lobKey))
                                  }
                                  aria-expanded={lobOpen}
                                  className="inline-flex items-start gap-1.5 rounded-md text-left focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                                >
                                  <ChevronRight
                                    size={13}
                                    aria-hidden
                                    className={`mt-1 shrink-0 text-faint transition-transform ${
                                      lobOpen ? "rotate-90" : ""
                                    }`}
                                  />
                                  <span>
                                    <span className="text-soft">{l.lob}</span>
                                    <span className="ml-1.5 text-[11px] font-normal text-faint">
                                      {l.products.length} produk
                                    </span>
                                  </span>
                                </button>
                              </td>
                              <td className={`${TD} text-right text-soft`}>
                                {num(l.qty)}
                              </td>
                              <td className={`${TD} text-right text-soft`}>
                                {rupiah(l.revenue)}
                              </td>
                              <td className={`${TD} text-right text-muted`}>
                                {aspLabel(l.asp)}
                              </td>
                              <td className={`${TD} text-right text-muted`}>
                                {pct(
                                  metric === "qty" ? l.qtyShare : l.revenueShare,
                                )}
                              </td>
                              <td className={`${TD} text-right text-muted`}>
                                {pctExact(l.totalRevenueShare)}
                              </td>
                              <td className={`${TD} text-right text-muted`}>
                                {num(l.skuCount)}
                              </td>
                            </tr>

                            {lobOpen &&
                              l.products.map((p) => (
                                <tr
                                  key={`${lobKey}|${p.article}`}
                                  className="border-b border-line/60 last:border-0 hover:bg-violet-50"
                                >
                                  <td
                                    className={`${LABEL_TD} pl-14 text-left text-soft`}
                                  >
                                    <span className="block">
                                      {p.description}
                                    </span>
                                    <span className="block text-[11px] text-faint">
                                      {p.article}
                                    </span>
                                  </td>
                                  <td className={`${TD} text-right text-soft`}>
                                    {num(p.qty)}
                                  </td>
                                  <td className={`${TD} text-right text-soft`}>
                                    {rupiah(p.revenue)}
                                  </td>
                                  <td className={`${TD} text-right text-muted`}>
                                    {aspLabel(p.asp)}
                                  </td>
                                  <td className={`${TD} text-right text-muted`}>
                                    {pct(
                                      metric === "qty" ? p.qtyShare : p.revenueShare,
                                    )}
                                  </td>
                                  <td className={`${TD} text-right text-muted`}>
                                    {pctExact(p.totalRevenueShare)}
                                  </td>
                                  <td className={`${TD} text-right text-muted`}>
                                    {num(p.skuCount)}
                                  </td>
                                </tr>
                              ))}
                          </Fragment>
                        );
                      })}
                  </Fragment>
                );
              })}
              {!sortedBrands.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted">
                    No accessories for this scope.
                  </td>
                </tr>
              )}
            </tbody>
            {sortedBrands.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-line bg-canvas">
                  <td className={`${LABEL_TD} text-left font-bold text-ink`}>
                    Grand Total
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>
                    {num(totals.qty)}
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>
                    {rupiah(totals.revenue)}
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>
                    {aspLabel(
                      totals.qty > 0 ? totals.revenue / totals.qty : null,
                    )}
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>100%</td>
                  <td className={`${TD} text-right font-bold text-ink`}>100%</td>
                  <td className={`${TD} text-right font-bold text-ink`}>
                    {num(totals.articleCount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}
