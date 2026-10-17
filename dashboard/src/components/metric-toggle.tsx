"use client";

import type { DeviceMetric } from "@/lib/product-analytics";

const OPTIONS: { value: DeviceMetric; label: string }[] = [
  { value: "qty", label: "Qty" },
  { value: "revenue", label: "Revenue" },
];

/** Segmented control metrik (Qty default, Revenue opsi kedua). */
export default function MetricToggle({
  value,
  onChange,
}: {
  value: DeviceMetric;
  onChange: (m: DeviceMetric) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Product metric"
      className="inline-flex shrink-0 rounded-xl border border-line bg-surface p-1"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[36px] rounded-lg px-3.5 text-sm font-semibold transition ${
            value === o.value
              ? "bg-primary text-white"
              : "text-soft hover:bg-violet-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
