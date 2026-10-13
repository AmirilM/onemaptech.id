"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { num } from "@/lib/format";

export type QtyBarItem = {
  label: string;
  qty: number;
  fill: string;
};

export default function QtyBarChart({
  data,
  ariaLabel,
}: {
  data: QtyBarItem[];
  ariaLabel: string;
}) {
  const summary = data.length
    ? data.map((d) => `${d.label} ${num(d.qty)} unit`).join("; ")
    : "Tidak ada data.";
  return (
    <div className="h-64 w-full sm:h-72">
      <p className="sr-only">
        {ariaLabel}: {summary}.
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-zinc-400)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            interval={0}
          />
          <YAxis
            tick={{ fill: "var(--color-zinc-400)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => num(v)}
            width={40}
            allowDecimals={false}
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
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
            formatter={(value) => [`${num(Number(value))} unit`, "Qty"]}
          />
          <Bar dataKey="qty" name="Qty" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
