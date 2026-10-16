"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { num, pctExact } from "@/lib/format";

export type QtyBarItem = {
  label: string;
  qty: number;
  fill: string;
};

function QtyTooltip({
  active,
  payload,
  label,
  total,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown }>;
  label?: string | number;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const qty = Number(payload[0]?.value ?? 0);
  const share = total ? (100 * qty) / total : null;
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
      <p style={{ color: "#4B5563", margin: "4px 0 0" }}>
        {num(qty)} unit ({pctExact(share)})
      </p>
    </div>
  );
}

export default function QtyBarChart({
  data,
  ariaLabel,
}: {
  data: QtyBarItem[];
  ariaLabel: string;
}) {
  const total = data.reduce((a, d) => a + d.qty, 0);
  const shareOf = (qty: number) => (total ? (100 * qty) / total : null);
  const summary = data.length
    ? data.map((d) => `${d.label} ${num(d.qty)} unit (${pctExact(shareOf(d.qty))})`).join("; ")
    : "Tidak ada data.";
  return (
    <div className="h-64 w-full sm:h-72">
      <p className="sr-only">
        {ariaLabel}: {summary}.
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E8E8EF" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#E8E8EF" }}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#6B7280", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => num(v)}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            content={(props) => <QtyTooltip {...props} total={total} />}
            cursor={{ fill: "rgba(124,58,237,0.08)" }}
          />
          <Bar dataKey="qty" name="Qty" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.fill} />
            ))}
            <LabelList
              dataKey="qty"
              position="top"
              formatter={(value: unknown) => {
                const qty = Number(value);
                if (!qty) return "";
                return num(qty);
              }}
              style={{
                fill: "#6B7280",
                fontSize: 10,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
