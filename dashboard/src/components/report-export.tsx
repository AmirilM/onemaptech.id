"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

type Props = {
  rows: Record<string, string | number | null>[];
  filename: string;
};

function toCsv(rows: Record<string, string | number | null>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: string | number | null) => {
    if (v === null || v === undefined) return "NULL";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join(
    "\n",
  );
}

function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportExport({ rows, filename }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  function exportCsv() {
    setBusy("csv");
    try {
      download(`${filename}.csv`, toCsv(rows), "text/csv;charset=utf-8");
    } finally {
      setBusy(null);
    }
  }

  function exportExcel() {
    setBusy("xlsx");
    try {
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => {
          const out: Record<string, string | number> = {};
          for (const [k, v] of Object.entries(r)) out[k] = v ?? "NULL";
          return out;
        }),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "transactions");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      download(`${filename}.xlsx`, buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60";

  return (
    <div className="flex gap-2">
      <button
        onClick={exportCsv}
        disabled={!rows.length || !!busy}
        className={`${btn} bg-cyan-400 text-slate-950 hover:bg-cyan-300`}
      >
        {busy === "csv" ? "..." : `CSV (${rows.length})`}
      </button>
      <button
        onClick={exportExcel}
        disabled={!rows.length || !!busy}
        className={`${btn} bg-emerald-400 text-slate-950 hover:bg-emerald-300`}
      >
        {busy === "xlsx" ? "..." : `Excel (${rows.length})`}
      </button>
    </div>
  );
}
