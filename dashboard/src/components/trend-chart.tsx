"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  revenue_apple: number;
  revenue_android: number;
  revenue_accessories: number;
  revenue_vas: number;
};

function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000_000)
    return `${(v / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (a >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (a >= 1_000)
    return `${(v / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
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
      }}
    >
      <p style={{ color: "#17171C", margin: 0, fontWeight: 600 }}>{label}</p>
      {payload.map((row, i) => (
        <p key={i} style={{ color: "#4B5563", margin: "4px 0 0" }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: String(row.color ?? "#fff"),
              marginRight: 6,
            }}
          />
          {String(row.name)}: Rp{Number(row.value ?? 0).toLocaleString("id-ID")}
        </p>
      ))}
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
    const total = (f: (p: Point) => number) =>
      data.reduce((a, p) => a + f(p), 0);
    const fmtRp = (v: number) => `Rp${v.toLocaleString("id-ID")}`;
    const parts: [string, (p: Point) => number][] = [
      ["Apple", (p) => p.revenue_apple],
      ["Android", (p) => p.revenue_android],
      ["Accessories", (p) => p.revenue_accessories],
      ["VAS", (p) => p.revenue_vas],
    ];
    return parts
      .map(([name, f]) => `${name} total ${fmtRp(total(f))}`)
      .join("; ");
  })();

  return (
    <div className="h-64 w-full sm:h-72">
      <p className="sr-only">Ringkasan tren: {summary}.</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#E8E8EF" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6B7280", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#E8E8EF" }}
            tickFormatter={(d: string) => d.slice(5)}
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
            cursor={{ stroke: "rgba(124,58,237,0.35)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6B7280" }} iconSize={8} iconType="circle" />
          <Line
            type="monotone"
            dataKey="revenue_apple"
            name="Apple"
            stroke="#7C3AED"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={!reducedMotion}
          />
          <Line
            type="monotone"
            dataKey="revenue_android"
            name="Android"
            stroke="#0891B2"
            strokeWidth={2}
            strokeDasharray="7 4"
            dot={false}
            isAnimationActive={!reducedMotion}
          />
          <Line
            type="monotone"
            dataKey="revenue_accessories"
            name="Accessories"
            stroke="#059669"
            strokeWidth={2}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={!reducedMotion}
          />
          <Line
            type="monotone"
            dataKey="revenue_vas"
            name="VAS"
            stroke="#94A3B8"
            strokeWidth={2}
            strokeDasharray="9 3 2 3"
            dot={false}
            isAnimationActive={!reducedMotion}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
