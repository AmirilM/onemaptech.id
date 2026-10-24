"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { num, pct, rupiah } from "@/lib/format";
import {
  computeAccessoryBrands,
  computeAccessoryItems,
  computeAccessoryTotals,
  type AccessoryRow,
} from "@/lib/accessories";
import AccessoryItemTable from "@/components/accessory-item-table";

const CARD = "card-surface p-4 md:p-5";
const TH =
  "px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap";
const TD = "h-11 px-3 align-middle text-sm tabular-nums whitespace-nowrap";

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
      <p className="truncate text-xs font-medium leading-4 tracking-wide text-muted">
        {label}
      </p>
      <p
        className="mt-2 truncate text-xl font-bold tracking-tight text-ink tabular-nums"
        title={value}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-muted">{sub}</p>
    </div>
  );
}

function ShareCell({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (100 * value) / max)) : 0;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="hidden h-1 w-12 rounded-full bg-violet-100 sm:inline-block">
        <span
          className="block h-1 rounded-full bg-primary"
          style={{ width: `${width}%` }}
        />
      </span>
      {pct(value)}
    </span>
  );
}

export default function AccessoryAnalytics({
  rows,
}: {
  rows: AccessoryRow[];
}) {
  const totals = useMemo(() => computeAccessoryTotals(rows), [rows]);
  const brands = useMemo(() => computeAccessoryBrands(rows), [rows]);
  const items = useMemo(() => computeAccessoryItems(rows), [rows]);

  // Brand teratas terbuka sejak awal; sisanya bisa dibuka sendiri.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(brands.slice(0, 2).map((b) => b.brand)),
  );

  function toggle(brand: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }

  const shareMax = brands[0]?.revenueShare ?? 0;

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
        <MetricCard
          label="Qty Terjual"
          value={num(totals.qty)}
          sub="unit"
        />
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

      <section className={CARD} aria-label="Kontribusi brand">
        <h2 className="text-sm font-semibold text-ink">Kontribusi Brand</h2>
        <p className="mt-0.5 text-xs text-muted">
          Porsi tiap brand terhadap total Accessories · urut revenue
        </p>

        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className={`${TH} text-left`}>Brand</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={`${TH} text-right`}>Revenue</th>
                <th className={`${TH} text-right`}>% Qty</th>
                <th className={`${TH} text-right`}>% Revenue</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr
                  key={b.brand}
                  className="border-b border-line/60 last:border-0 hover:bg-violet-50"
                >
                  <td className={`${TD} text-left font-medium text-ink`}>
                    {b.brand}
                  </td>
                  <td className={`${TD} text-right text-soft`}>{num(b.qty)}</td>
                  <td className={`${TD} text-right text-soft`}>
                    {rupiah(b.revenue)}
                  </td>
                  <td className={`${TD} text-right text-muted`}>
                    {pct(b.qtyShare)}
                  </td>
                  <td className={`${TD} text-right text-soft`}>
                    <ShareCell value={b.revenueShare} max={shareMax} />
                  </td>
                </tr>
              ))}
              {!brands.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted"
                  >
                    No accessories for this scope.
                  </td>
                </tr>
              )}
            </tbody>
            {brands.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-line bg-canvas">
                  <td className={`${TD} text-left font-bold text-ink`}>
                    Grand Total
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>
                    {num(totals.qty)}
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>
                    {rupiah(totals.revenue)}
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>100%</td>
                  <td className={`${TD} text-right font-bold text-ink`}>100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className={CARD} aria-label="Kontribusi LOB per brand">
        <h2 className="text-sm font-semibold text-ink">
          Kontribusi LOB per Brand
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Porsi tiap LOB di dalam brand-nya · klik brand untuk buka/tutup
        </p>

        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className={`${TH} text-left`}>Brand / LOB</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={`${TH} text-right`}>Revenue</th>
                <th className={`${TH} text-right`}>% Qty Brand</th>
                <th className={`${TH} text-right`}>% Revenue Brand</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => {
                const expanded = open.has(b.brand);
                return (
                  <Fragment key={b.brand}>
                    <tr
                      className="border-b border-line/60 bg-canvas hover:bg-violet-50"
                    >
                      <td className={`${TD} text-left`}>
                        <button
                          type="button"
                          onClick={() => toggle(b.brand)}
                          aria-expanded={expanded}
                          className="inline-flex items-center gap-1.5 rounded-md text-left font-semibold text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                        >
                          <ChevronRight
                            size={14}
                            aria-hidden
                            className={`text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
                          />
                          {b.brand}
                          <span className="text-[11px] font-normal text-faint">
                            {b.lobs.length} LOB
                          </span>
                        </button>
                      </td>
                      <td className={`${TD} text-right font-semibold text-ink`}>
                        {num(b.qty)}
                      </td>
                      <td className={`${TD} text-right font-semibold text-ink`}>
                        {rupiah(b.revenue)}
                      </td>
                      <td className={`${TD} text-right text-muted`}>100%</td>
                      <td className={`${TD} text-right text-muted`}>100%</td>
                    </tr>
                    {expanded &&
                      b.lobs.map((l) => (
                        <tr
                          key={`${b.brand}-${l.lob}`}
                          className="border-b border-line/60 last:border-0 hover:bg-violet-50"
                        >
                          <td className={`${TD} pl-9 text-left text-muted`}>
                            {l.lob}
                          </td>
                          <td className={`${TD} text-right text-soft`}>
                            {num(l.qty)}
                          </td>
                          <td className={`${TD} text-right text-soft`}>
                            {rupiah(l.revenue)}
                          </td>
                          <td className={`${TD} text-right text-muted`}>
                            {pct(l.qtyShare)}
                          </td>
                          <td className={`${TD} text-right text-muted`}>
                            {pct(l.revenueShare)}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
              {!brands.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted"
                  >
                    No accessories for this scope.
                  </td>
                </tr>
              )}
            </tbody>
            {brands.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-line bg-canvas">
                  <td className={`${TD} text-left font-bold text-ink`}>
                    Grand Total
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>
                    {num(totals.qty)}
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>
                    {rupiah(totals.revenue)}
                  </td>
                  <td className={`${TD} text-right font-bold text-ink`}>—</td>
                  <td className={`${TD} text-right font-bold text-ink`}>—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <AccessoryItemTable items={items} />
    </div>
  );
}
