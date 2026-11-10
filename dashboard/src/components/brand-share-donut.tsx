"use client";

import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { num, pct, pctExact } from "@/lib/format";

export type BrandShareItem = {
  name: string;
  qty: number;
  fill: string;
};

function BrandShareTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    name?: unknown;
    value?: unknown;
    payload?: unknown;
  }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const nested = row?.payload as BrandShareItem | undefined;
  const name = String(row?.name ?? nested?.name ?? "");
  const qty = Number(row?.value ?? 0);
  const share = total ? (100 * qty) / total : null;
  return (
    <div
      className="bg-surface border border-line rounded-xl p-3 text-ink shadow-[0_8px_24px_rgba(23,23,28,0.12)]"
      style={{ maxWidth: "80vw", fontSize: 12 }}
    >
      <p className="font-semibold m-0">{name}</p>
      <p className="mt-1 text-soft m-0">
        {num(qty)} unit ({pctExact(share)})
      </p>
    </div>
  );
}

export default function BrandShareDonut({
  data,
  ariaLabel,
}: {
  data: BrandShareItem[];
  ariaLabel: string;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const total = data.reduce((a, d) => a + d.qty, 0);
  const summary = total
    ? data
        .map(
          (d) =>
            `${d.name} ${num(d.qty)} units (${pctExact((100 * d.qty) / total)})`,
        )
        .join("; ")
    : "No data.";

  return (
    <div className="flex h-40 w-full flex-col sm:h-44">
      <p className="sr-only">
        {ariaLabel}: {summary}.
      </p>
      <div className="relative min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={(props) => (
                <BrandShareTooltip {...props} total={total} />
              )}
            />
            <Pie
              data={data}
              dataKey="qty"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={3}
              cornerRadius={6}
              strokeWidth={0}
              isAnimationActive={!reducedMotion}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <p className="text-2xl font-bold tracking-tight text-ink tabular-nums">
            {num(total)}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            units
          </p>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5" aria-hidden>
        {data.map((d) => {
          const share = total ? (100 * d.qty) / total : 0;
          return (
            <li
              key={d.name}
              className="flex items-center justify-between gap-3 text-xs leading-5"
            >
              <span className="flex min-w-0 items-center gap-2 text-soft">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: d.fill }}
                />
                <span className="truncate font-medium">{d.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {num(d.qty)} units ·{" "}
                <span className="font-semibold text-ink">
                  {pct(share)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
