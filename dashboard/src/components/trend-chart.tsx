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
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--color-zinc-400)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickFormatter={(d: string) => d.slice(5)}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: "var(--color-zinc-400)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={compact}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-panel)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              fontSize: 12,
              maxWidth: "80vw",
            }}
            labelStyle={{ color: "var(--color-zinc-200)" }}
            cursor={{ stroke: "rgba(255,255,255,0.2)" }}
            formatter={(value, name) => [
              `Rp${Number(value).toLocaleString("id-ID")}`,
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconSize={8} iconType="circle" />
          <Line
            type="monotone"
            dataKey="revenue_apple"
            name="Apple"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reducedMotion}
          />
          <Line
            type="monotone"
            dataKey="revenue_android"
            name="Android"
            stroke="#a78bfa"
            strokeWidth={2}
            strokeDasharray="7 4"
            dot={false}
            isAnimationActive={!reducedMotion}
          />
          <Line
            type="monotone"
            dataKey="revenue_accessories"
            name="Accessories"
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={!reducedMotion}
          />
          <Line
            type="monotone"
            dataKey="revenue_vas"
            name="VAS"
            stroke="#34d399"
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
