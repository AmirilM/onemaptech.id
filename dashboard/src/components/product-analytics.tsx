"use client";

import { useMemo, useState } from "react";
import MetricToggle from "@/components/metric-toggle";
import ProductMetrics from "@/components/product-metrics";
import DeviceBestSeller from "@/components/device-best-seller";
import DeviceRankingTable from "@/components/device-ranking-table";
import {
  computeDeviceMetrics,
  type DeviceMetric,
  type DeviceProductRow,
} from "@/lib/product-analytics";

const CARD = "card-surface p-4 md:p-5";

export default function ProductAnalyticsView({
  rows,
  initialMetric,
  scopeLabel,
  exportName,
}: {
  rows: DeviceProductRow[];
  initialMetric: DeviceMetric;
  scopeLabel: string;
  exportName: string;
}) {
  const [metric, setMetric] = useState<DeviceMetric>(initialMetric);
  const metrics = useMemo(() => computeDeviceMetrics(rows), [rows]);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {scopeLabel} · device products (Apple + Android) · metric drives
          ranking, share &amp; contribution
        </p>
        <MetricToggle value={metric} onChange={setMetric} />
      </div>

      <ProductMetrics metrics={metrics} metric={metric} />

      <section className={CARD} aria-label="Top product per line">
        <h2 className="text-sm font-semibold text-ink">
          Top Product per Line
        </h2>
        <p className="mt-0.5 mb-3 text-xs text-muted">
          Total LOB/Brand = all sales of that line · Contribution = the top
          product&apos;s share of that line
        </p>
        <DeviceBestSeller rows={rows} metric={metric} />
      </section>

      <section className={CARD} aria-label="Device product ranking">
        <h2 className="text-sm font-semibold text-ink">
          Device Product Ranking
        </h2>
        <p className="mt-0.5 mb-3 text-xs text-muted">
          All sublobs ranked by {metric === "qty" ? "quantity" : "revenue"} ·
          share &amp; cumulative computed over the full device set
          {metric === "qty" ? " (Qty)" : " (Revenue)"}
        </p>
        <DeviceRankingTable
          rows={rows}
          metric={metric}
          exportName={exportName}
        />
      </section>
    </div>
  );
}
