"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Eye, FileText, ImageIcon, Loader2 } from "lucide-react";
import { formatDayMonth, num, rupiah } from "@/lib/format";
import {
  formatAsp,
  formatGeneratedAt,
  totalOf,
  type AreaSaleRow,
  type DailySaleRow,
} from "@/lib/daily-store";
import {
  buildPdfBlob,
  nodeToPngBlob,
  shareOrDownload,
  showPdfInWindow,
  type PdfColumn,
} from "@/lib/daily-store-export";

type ExportColumn = {
  label: string;
  align: "left" | "right" | "center";
  /** Sheet width in px. */
  px: number;
  /** PDF width in mm. */
  mm: number;
};

const DAILY_COLUMNS: ExportColumn[] = [
  { label: "Date", align: "left", px: 110, mm: 22 },
  { label: "Total Revenue", align: "right", px: 160, mm: 38 },
  { label: "Apple", align: "right", px: 135, mm: 30 },
  { label: "Android", align: "right", px: 135, mm: 30 },
  { label: "Accessories", align: "right", px: 135, mm: 30 },
  { label: "VAS", align: "right", px: 115, mm: 23 },
  { label: "Unit Sold", align: "right", px: 100, mm: 21 },
  { label: "Apple Qty", align: "right", px: 110, mm: 23 },
  { label: "Android Qty", align: "right", px: 125, mm: 25 },
  { label: "ASP", align: "right", px: 140, mm: 31 },
];

const AREA_COLUMNS: ExportColumn[] = [
  { label: "Rank", align: "center", px: 64, mm: 10 },
  { label: "Store Name", align: "left", px: 250, mm: 42 },
  { label: "Total Revenue", align: "right", px: 160, mm: 32 },
  { label: "Apple", align: "right", px: 135, mm: 27 },
  { label: "Android", align: "right", px: 135, mm: 27 },
  { label: "Accessories", align: "right", px: 135, mm: 27 },
  { label: "VAS", align: "right", px: 115, mm: 20 },
  { label: "Unit Sold", align: "right", px: 100, mm: 18 },
  { label: "Apple Qty", align: "right", px: 110, mm: 20 },
  { label: "Android Qty", align: "right", px: 125, mm: 22 },
  { label: "ASP", align: "right", px: 140, mm: 28 },
];

type Common = {
  title: string;
  scope: string;
  meta: string;
  dataThrough: string;
  filenameBase: string;
};

type Props =
  | (Common & { kind: "daily"; rows: DailySaleRow[] })
  | (Common & { kind: "area"; rows: AreaSaleRow[] });

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 1c.8 6.2 4.8 10.2 11 11-6.2.8-10.2 4.8-11 11-.8-6.2-4.8-10.2-11-11 6.2-.8 10.2-4.8 11-11Z" />
    </svg>
  );
}

export default function DailyStoreExport(props: Props) {
  const [busy, setBusy] = useState<"preview" | "pdf" | "png" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  const isDaily = props.kind === "daily";
  const columns = isDaily ? DAILY_COLUMNS : AREA_COLUMNS;
  const rows = props.rows;
  const totals = totalOf(rows);
  const sheetWidth = isDaily ? 1440 : 1560;
  const totalColumnIndex = isDaily ? 1 : 2;

  function cells(): string[][] {
    if (props.kind === "daily") {
      return props.rows.map((row) => [
        formatDayMonth(row.date),
        num(row.revenue_total),
        num(row.revenue_apple),
        num(row.revenue_android),
        num(row.revenue_accessories),
        num(row.revenue_vas),
        num(row.unit_sold),
        num(row.apple_qty),
        num(row.android_qty),
        formatAsp(row.asp),
      ]);
    }
    return props.rows.map((row) => [
      String(row.rank),
      `${row.store_code} · ${row.store_name ?? "-"}`,
      num(row.revenue_total),
      num(row.revenue_apple),
      num(row.revenue_android),
      num(row.revenue_accessories),
      num(row.revenue_vas),
      num(row.unit_sold),
      num(row.apple_qty),
      num(row.android_qty),
      formatAsp(row.asp),
    ]);
  }

  function foot(): string[] {
    if (isDaily) {
      return [
        "Grand Total",
        num(totals.revenue_total),
        num(totals.revenue_apple),
        num(totals.revenue_android),
        num(totals.revenue_accessories),
        num(totals.revenue_vas),
        num(totals.unit_sold),
        num(totals.apple_qty),
        num(totals.android_qty),
        formatAsp(totals.asp),
      ];
    }
    return [
      "",
      "Grand Total",
      num(totals.revenue_total),
      num(totals.revenue_apple),
      num(totals.revenue_android),
      num(totals.revenue_accessories),
      num(totals.revenue_vas),
      num(totals.unit_sold),
      num(totals.apple_qty),
      num(totals.android_qty),
      formatAsp(totals.asp),
    ];
  }

  const summary = [
    { label: "Total Revenue", value: rupiah(totals.revenue_total) },
    { label: "Unit Sold", value: num(totals.unit_sold) },
    {
      label: "ASP",
      value:
        totals.asp === null ? "-" : rupiah(Math.round(totals.asp)),
    },
    ...(isDaily
      ? []
      : [{ label: "Stores", value: num(props.rows.length) }]),
  ];

  function pdfColumns(): PdfColumn[] {
    return columns.map((column) => ({
      label: column.label.toUpperCase(),
      align: column.align,
      width: column.mm,
    }));
  }

  async function buildPdf(stamp: string): Promise<Blob> {
    return buildPdfBlob({
      title: props.title,
      scope: props.scope,
      meta: props.meta,
      dataThrough: props.dataThrough,
      generatedAt: stamp,
      summary,
      columns: pdfColumns(),
      rows: cells(),
      foot: foot(),
      totalColumnIndex,
      filename: `${props.filenameBase}.pdf`,
    });
  }

  async function handlePreview() {
    if (busy || !rows.length) return;
    setError(null);
    const win = window.open("", "_blank");
    if (win) {
      win.document.title = "Menyiapkan PDF…";
      win.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;padding:24px;color:#4b5563">Menyiapkan PDF…</p>';
    }
    setBusy("preview");
    try {
      const blob = await buildPdf(formatGeneratedAt());
      showPdfInWindow(win, blob, `${props.filenameBase}.pdf`);
    } catch (err) {
      win?.close();
      setError(err instanceof Error ? err.message : "Gagal membuat PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function handlePdf() {
    if (busy || !rows.length) return;
    setError(null);
    setBusy("pdf");
    try {
      const blob = await buildPdf(formatGeneratedAt());
      await shareOrDownload(
        blob,
        `${props.filenameBase}.pdf`,
        props.title,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function handlePng() {
    if (busy || !rows.length || !sheetRef.current) return;
    setError(null);
    setBusy("png");
    try {
      flushSync(() => setGeneratedAt(formatGeneratedAt()));
      const blob = await nodeToPngBlob(sheetRef.current);
      await shareOrDownload(
        blob,
        `${props.filenameBase}.png`,
        props.title,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat PNG.");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!!busy || !rows.length}
            title="Preview PDF di tab browser"
            aria-label={`Preview PDF ${props.title}`}
            className={`${btn} border-primary/30 bg-surface text-primary hover:bg-violet-50 active:bg-violet-100`}
          >
            {busy === "preview" ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Eye size={14} aria-hidden />
            )}
            Preview
          </button>
          <button
            type="button"
            onClick={handlePdf}
            disabled={!!busy || !rows.length}
            title="PDF — share atau download"
            aria-label={`Export PDF ${props.title}`}
            className={`${btn} border-line bg-surface text-soft hover:bg-violet-50 active:bg-violet-100`}
          >
            {busy === "pdf" ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <FileText size={14} aria-hidden />
            )}
            PDF
          </button>
          <button
            type="button"
            onClick={handlePng}
            disabled={!!busy || !rows.length}
            title="PNG — share atau download"
            aria-label={`Export PNG ${props.title}`}
            className={`${btn} border-line bg-surface text-soft hover:bg-violet-50 active:bg-violet-100`}
          >
            {busy === "png" ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <ImageIcon size={14} aria-hidden />
            )}
            PNG
          </button>
        </div>
        {error && (
          <p role="alert" className="max-w-[240px] text-right text-[10px] text-danger">
            {error}
          </p>
        )}
      </div>

      {/* Off-screen export sheet: PNG capture only. */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 -left-[10000px] z-[-1]"
      >
        <div
          ref={sheetRef}
          className="rounded-[24px] border border-[#ece9fb] bg-[linear-gradient(135deg,#ffffff,#ffffff_55%,#f7f6fe)] p-8"
          style={{ width: sheetWidth }}
        >
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkle className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-soft">
                OneMapTech
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Daily Sales
            </span>
          </header>

          <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-tight text-ink">
            {props.title}
          </h1>
          <p className="mt-1 text-[12px] font-semibold text-soft">
            {props.scope}
          </p>
          <p className="text-[11px] text-muted">
            {props.meta} · Data s/d {props.dataThrough}
          </p>
          <p className="mt-0.5 text-[10px] text-faint">
            Generated {generatedAt || "—"}
          </p>

          <div className="mt-5 flex flex-wrap gap-x-14 gap-y-4 border-y border-line py-4">
            {summary.map((item) => (
              <div key={item.label}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {item.label}
                </p>
                <p className="mt-1 text-[20px] font-bold leading-none tracking-tight text-ink tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-line">
            <table
              className="w-full table-fixed border-separate border-spacing-0"
              aria-label={props.title}
            >
              <colgroup>
                {columns.map((column) => (
                  <col key={column.label} style={{ width: column.px }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.label}
                      className={`border-b border-line bg-canvas px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted ${
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                            ? "text-center"
                            : "text-left"
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cells().map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="even:bg-[#fafafc] last:[&>td]:border-b-0"
                  >
                    {row.map((cell, cellIndex) => {
                      const column = columns[cellIndex];
                      const zero =
                        cell === "0" || cell === "-" || cell === "…";
                      return (
                        <td
                          key={cellIndex}
                          className={`border-b border-line/70 px-2.5 py-[7px] text-[10.5px] tabular-nums ${
                            column.align === "right"
                              ? "text-right"
                              : column.align === "center"
                                ? "text-center"
                                : "text-left"
                          } ${
                            zero
                              ? "text-faint"
                              : cellIndex === totalColumnIndex
                                ? "font-semibold text-ink"
                                : "text-soft"
                          }`}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-3 py-8 text-center text-[11px] text-muted"
                    >
                      No data.
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    {foot().map((cell, index) => {
                      const column = columns[index];
                      return (
                        <td
                          key={index}
                          className={`border-t-2 border-line bg-canvas px-2.5 py-2 text-[10.5px] font-bold text-ink tabular-nums ${
                            column.align === "right"
                              ? "text-right"
                              : column.align === "center"
                                ? "text-center"
                                : "text-left"
                          }`}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <footer className="mt-5 border-t border-line pt-3">
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>
                OneMapTech · daily report · data s/d {props.dataThrough}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[8px] font-semibold tracking-[0.12em] text-faint">
              <Sparkle className="h-2.5 w-2.5 text-primary/50" />
              <span>
                Powered by{" "}
                <span className="font-bold text-soft">Amiril M</span>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
