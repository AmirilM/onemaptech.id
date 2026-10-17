import { Boxes, Layers, Tag, Trophy, type LucideIcon } from "lucide-react";
import { num, pct, rupiah } from "@/lib/format";
import type { DeviceMetric, DeviceMetrics } from "@/lib/product-analytics";

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
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
      <p className="mt-1 truncate text-xs text-muted">{sub ?? "\u00a0"}</p>
    </div>
  );
}

/** Metrik ringkas khusus produk perangkat (bukan total penjualan). */
export default function ProductMetrics({
  metrics,
  metric,
}: {
  metrics: DeviceMetrics;
  metric: DeviceMetric;
}) {
  const concentration =
    metric === "qty" ? metrics.concentrationQty : metrics.concentrationRevenue;

  return (
    <section aria-label="Device product metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Active SKUs"
        value={num(metrics.skuCount)}
        sub="distinct sap_article"
        icon={Boxes}
      />
      <MetricCard
        label="Active Sublobs"
        value={num(metrics.sublobCount)}
        sub="device models"
        icon={Layers}
      />
      <MetricCard
        label="Avg Selling Price"
        value={rupiah(metrics.asp)}
        sub="revenue ÷ qty"
        icon={Tag}
      />
      <MetricCard
        label="Top-10 Concentration"
        value={pct(concentration)}
        sub={`share of ${metric === "qty" ? "qty" : "revenue"}`}
        icon={Trophy}
      />
    </section>
  );
}
