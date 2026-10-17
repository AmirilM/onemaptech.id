"use client";

import { useMemo } from "react";
import { num, pct, rupiah, rupiahCompact } from "@/lib/format";
import {
  bestSellerByGroup,
  type BestSeller,
  type DeviceMetric,
  type DeviceProductRow,
} from "@/lib/product-analytics";

/** Label nilai ringkas: "4.025 units" (Qty) atau "Rp 108,7 M" (Revenue). */
function valueLabel(value: number, metric: DeviceMetric): string {
  return metric === "qty" ? `${num(value)} units` : rupiahCompact(value);
}

/** Nilai penuh untuk tooltip (tanpa disingkat). */
function valueTitle(value: number, metric: DeviceMetric): string {
  return metric === "qty" ? `${num(value)} units` : rupiah(value);
}

/** Satu baris fakta berpola "label … nilai" agar setiap angka punya keterangan. */
function FactRow({
  label,
  value,
  title,
  strong,
  accent,
}: {
  label: string;
  value: string;
  title: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px] text-muted">{label}</span>
      <span
        className={`min-w-0 truncate text-right tabular-nums ${
          accent
            ? "text-sm font-semibold text-primary"
            : strong
              ? "text-sm font-semibold text-ink"
              : "text-xs font-medium text-ink"
        }`}
        title={title}
      >
        {value}
      </span>
    </div>
  );
}

type Kind = "LOB" | "Brand";

function BestSellerCard({
  item,
  metric,
  kind,
}: {
  item: BestSeller;
  metric: DeviceMetric;
  kind: Kind;
}) {
  const share = Math.max(0, Math.min(100, item.share));
  return (
    <div className="flex flex-col rounded-xl border border-line bg-canvas p-3">
      {/* Level lini */}
      <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        {item.group}
      </p>
      <div className="mt-2">
        <FactRow
          label={`Total ${kind}`}
          value={valueLabel(item.groupValue, metric)}
          title={valueTitle(item.groupValue, metric)}
        />
      </div>

      <div className="my-2.5 border-t border-line" aria-hidden />

      {/* Level produk */}
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
        Top Product
      </p>
      <p
        className="mt-1 truncate text-sm font-semibold text-ink"
        title={item.top.sublob}
      >
        {item.top.sublob}
      </p>
      <div className="mt-2 space-y-1.5">
        <FactRow
          label={metric === "qty" ? "Qty" : "Revenue"}
          value={valueLabel(item.topValue, metric)}
          title={valueTitle(item.topValue, metric)}
          strong
        />
        <FactRow
          label="Contribution"
          value={`${pct(item.share)} of ${kind}`}
          title={`${pct(item.share)} of total ${kind}`}
          accent
        />
      </div>
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-track"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

function Panel({
  title,
  items,
  metric,
  kind,
}: {
  title: string;
  items: BestSeller[];
  metric: DeviceMetric;
  kind: Kind;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-soft">
        {title}
      </h3>
      {items.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <BestSellerCard key={it.group} item={it} metric={metric} kind={kind} />
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted">No data.</p>
      )}
    </div>
  );
}

/**
 * Ringkasan "Top Product per Line": produk terlaris di tiap lini.
 * Apple dikelompokkan per LOB, Android per brand. Menggantikan treemap —
 * lebih mudah dibaca oleh Store Supervisor: total lini, produk terlaris,
 * dan kontribusinya.
 */
export default function DeviceBestSeller({
  rows,
  metric,
}: {
  rows: DeviceProductRow[];
  metric: DeviceMetric;
}) {
  const apple = useMemo(
    () => bestSellerByGroup(rows, metric, "apple-lob"),
    [rows, metric],
  );
  const android = useMemo(
    () => bestSellerByGroup(rows, metric, "android-brand"),
    [rows, metric],
  );

  return (
    <div className="space-y-5">
      <Panel title="Apple · by LOB" items={apple} metric={metric} kind="LOB" />
      <Panel
        title="Android · by Brand"
        items={android}
        metric={metric}
        kind="Brand"
      />
    </div>
  );
}
