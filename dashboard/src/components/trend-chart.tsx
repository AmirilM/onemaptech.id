"use client";

import { formatDayMonth } from "@/lib/format";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  revenue_total: number;
};

function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000_000)
    return `${(v / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (a >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
  if (a >= 1_000)
    return `${(v / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} Rb`;
  return v.toLocaleString("id-ID");
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    name?: unknown;
    value?: unknown;
    color?: unknown;
  }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E8E8EF",
        borderRadius: 12,
        fontSize: 12,
        maxWidth: "80vw",
        padding: "8px 12px",
        boxShadow: "0 8px 24px rgba(23,23,28,0.12)",
        whiteSpace: "nowrap",
      }}
    >
      <p style={{ color: "#17171C", margin: 0, fontWeight: 600 }}>
        {formatDayMonth(String(label ?? ""))}
      </p>
      <p
        style={{
          color: "#4B5563",
          margin: "4px 0 0",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: "#7C3AED",
            marginRight: 6,
          }}
        />
        Total: Rp {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

export default function TrendChart({ data }: { data: Point[] }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const summary = (() => {
    if (!data.length) return "Tidak ada data.";
    const total = data.reduce((a, p) => a + p.revenue_total, 0);
    return `Total revenue Rp ${total.toLocaleString("id-ID")} dari ${data.length} hari.`;
  })();

  return (
    <div className="h-64 w-full sm:h-72">
      <p className="sr-only">Ringkasan tren: {summary}.</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#E8E8EF"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6B7280", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#E8E8EF" }}
            tickFormatter={(d: string) => formatDayMonth(d)}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: "#6B7280", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={compact}
            width={52}
          />
          <Tooltip
            content={<TrendTooltip />}
            cursor={{
              stroke: "#7C3AED",
              strokeOpacity: 0.35,
              strokeDasharray: "4 4",
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue_total"
            name="Total"
            stroke="#7C3AED"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#7C3AED",
              stroke: "#FFFFFF",
              strokeWidth: 2,
            }}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls
            isAnimationActive={!reducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
