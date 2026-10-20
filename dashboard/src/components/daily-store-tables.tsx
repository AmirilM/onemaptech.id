"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { formatDayMonth, num } from "@/lib/format";
import {
  formatAsp,
  formatIsoLong,
  totalOf,
  type AreaSaleRow,
  type DailySaleRow,
  type StoreOption,
} from "@/lib/daily-store";
import DailyStoreExport from "@/components/daily-store-export";

const CELL_X = "px-3.5";
const ROW_Y = "py-2";
const TH = `border-b border-line bg-canvas ${CELL_X} py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted`;
const TD = `border-b border-line/60 ${CELL_X} ${ROW_Y} text-sm tabular-nums`;
const TD_NUM = `${TD} text-right`;
const FOOT = `border-t-2 border-line bg-canvas ${CELL_X} py-2.5 text-sm font-bold tabular-nums text-ink`;

function valueClass(value: number, strong = false): string {
  if (value === 0) return "text-faint";
  return strong ? "font-semibold text-ink" : "text-soft";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
        {rank}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ede9fe] text-[11px] font-bold text-primary">
        {rank}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f5f3ff] text-[11px] font-bold text-primary">
        {rank}
      </span>
    );
  }
  return (
    <span className="text-xs tabular-nums text-muted">{rank}</span>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const button =
    "min-h-[36px] min-w-[36px] rounded-lg border border-line px-2 text-xs tabular-nums text-soft hover:bg-violet-50 active:bg-violet-100 disabled:opacity-40";
  return (
    <nav aria-label="Pagination Daily Sales Store Area" className="flex items-center gap-1">
      <button
        type="button"
        className={button}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPage(item)}
          aria-current={item === page ? "page" : undefined}
          className={`${button} ${
            item === page
              ? "border-primary bg-primary/10 font-semibold text-primary"
              : ""
          }`}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        className={button}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}

type Props = {
  dailyRows: DailySaleRow[];
  areaRows: AreaSaleRow[];
  showAreaTable: boolean;
  stores: StoreOption[];
  canFilterStore: boolean;
  currentStore: string;
  scopeLabel: string;
  areaLabel: string;
  periodLabel: string;
  selectedDate: string;
  minDate: string;
  maxDate: string;
  dataThrough: string;
  dailyFilenameBase: string;
  areaFilenameBase: string;
};

export default function DailyStoreTables({
  dailyRows,
  areaRows,
  showAreaTable,
  stores,
  canFilterStore,
  currentStore,
  scopeLabel,
  areaLabel,
  periodLabel,
  selectedDate,
  minDate,
  maxDate,
  dataThrough,
  dailyFilenameBase,
  areaFilenameBase,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [prevDate, setPrevDate] = useState(selectedDate);
  if (selectedDate !== prevDate) {
    setPrevDate(selectedDate);
    setPage(1);
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    startTransition(() =>
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  function resetFilters() {
    startTransition(() =>
      router.replace(pathname, { scroll: false }),
    );
  }

  const totalPages =
    pageSize === 0 ? 1 : Math.max(1, Math.ceil(areaRows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = pageSize === 0 ? 0 : (safePage - 1) * pageSize;
  const visibleAreaRows =
    pageSize === 0
      ? areaRows
      : areaRows.slice(startIndex, startIndex + pageSize);
  const endIndex =
    pageSize === 0
      ? areaRows.length
      : Math.min(startIndex + pageSize, areaRows.length);

  const totals = totalOf(dailyRows);
  const areaTotals = totalOf(areaRows);

  const input =
    "min-h-[38px] rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

  return (
    <div className="mt-4 space-y-4">
      <section className="card-surface p-4 md:p-5" aria-label="Daily Sales Store">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">Daily Sales Store</h2>
            <p className="mt-0.5 text-xs text-muted">
              {scopeLabel} · {periodLabel} · nilai dalam Rupiah
              {isPending && <span className="ml-1 text-primary">Updating…</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canFilterStore && (
              <label className="flex flex-col gap-1 text-[11px] text-muted">
                Store
                <select
                  value={currentStore}
                  onChange={(event) => setParam("store", event.target.value)}
                  disabled={isPending}
                  className={`${input} max-w-[280px]`}
                >
                  <option value="">All stores</option>
                  {stores.map((store) => (
                    <option key={store.store_code} value={store.store_code}>
                      {store.store_code} — {store.store_name ?? "-"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <DailyStoreExport
              kind="daily"
              title="Daily Sales Store"
              scope={scopeLabel}
              meta={periodLabel}
              dataThrough={dataThrough}
              rows={dailyRows}
              filenameBase={dailyFilenameBase}
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[1200px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 112 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 128 }} />
              <col style={{ width: 128 }} />
              <col style={{ width: 128 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 92 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: 116 }} />
              <col style={{ width: 132 }} />
            </colgroup>
            <thead>
              <tr>
                <th className={`${TH} md:sticky md:left-0 md:z-20 text-left`}>
                  Date
                </th>
                <th className={`${TH} text-right`}>Total Revenue</th>
                <th className={`${TH} text-right`}>Apple</th>
                <th className={`${TH} text-right`}>Android</th>
                <th className={`${TH} text-right`}>Accessories</th>
                <th className={`${TH} text-right`}>VAS</th>
                <th className={`${TH} text-right`}>Unit Sold</th>
                <th className={`${TH} text-right`}>Apple Qty</th>
                <th className={`${TH} text-right`}>Android Qty</th>
                <th className={`${TH} text-right`}>ASP</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((row) => (
                <tr
                  key={row.date}
                  className="group bg-surface even:bg-[#fafafc] hover:bg-violet-50"
                >
                  <td
                    className={`${TD} bg-inherit font-semibold text-ink md:sticky md:left-0 md:z-10`}
                    title={row.date}
                  >
                    {formatDayMonth(row.date)}
                  </td>
                  <td className={TD_NUM}>
                    <span className={valueClass(row.revenue_total, true)}>
                      {num(row.revenue_total)}
                    </span>
                  </td>
                  <td className={TD_NUM}>
                    <span className={valueClass(row.revenue_apple)}>
                      {num(row.revenue_apple)}
                    </span>
                  </td>
                  <td className={TD_NUM}>
                    <span className={valueClass(row.revenue_android)}>
                      {num(row.revenue_android)}
                    </span>
                  </td>
                  <td className={TD_NUM}>
                    <span className={valueClass(row.revenue_accessories)}>
                      {num(row.revenue_accessories)}
                    </span>
                  </td>
                  <td className={TD_NUM}>
                    <span className={valueClass(row.revenue_vas)}>
                      {num(row.revenue_vas)}
                    </span>
                  </td>
                  <td className={TD_NUM}>
                    <span className={valueClass(row.unit_sold)}>
                      {num(row.unit_sold)}
                    </span>
                  </td>
                  <td className={TD_NUM}>
                    <span className={valueClass(row.apple_qty)}>
                      {num(row.apple_qty)}
                    </span>
                  </td>
                  <td className={TD_NUM}>
                    <span className={valueClass(row.android_qty)}>
                      {num(row.android_qty)}
                    </span>
                  </td>
                  <td className={TD_NUM}>
                    <span
                      className={
                        row.asp === null ? "text-faint" : "text-soft"
                      }
                    >
                      {formatAsp(row.asp)}
                    </span>
                  </td>
                </tr>
              ))}
              {!dailyRows.length && (
                <tr>
                  <td
                    colSpan={10}
                    className={`${CELL_X} py-10 text-center text-sm text-muted`}
                  >
                    No data for this period.
                  </td>
                </tr>
              )}
            </tbody>
            {dailyRows.length > 0 && (
              <tfoot>
                <tr>
                  <td className={`${FOOT} whitespace-nowrap text-left md:sticky md:left-0 md:z-10`}>
                    Grand Total
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {num(totals.revenue_total)}
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {num(totals.revenue_apple)}
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {num(totals.revenue_android)}
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {num(totals.revenue_accessories)}
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {num(totals.revenue_vas)}
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {num(totals.unit_sold)}
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {num(totals.apple_qty)}
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {num(totals.android_qty)}
                  </td>
                  <td className={`${FOOT} text-right`}>
                    {formatAsp(totals.asp)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="mt-3 text-[11px] text-muted">
          Apple Qty = iPhone, Mac, iPad, Watch · Android Qty = Samsung, Oppo,
          Xiaomi, Huawei, Infinix, Motorola · ASP = (Apple + Android revenue) ÷
          Unit Sold
        </p>
      </section>

      {showAreaTable && (
        <section
          className="card-surface p-4 md:p-5"
          aria-label="Daily Sales Store Area"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">
                Daily Sales Store Area
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {areaLabel} · {formatIsoLong(selectedDate)} · nilai dalam
                Rupiah
                {isPending && (
                  <span className="ml-1 text-primary">Updating…</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-end justify-end gap-2">
              <label className="flex flex-col gap-1 text-[11px] text-muted">
                Date
                <input
                  type="date"
                  value={selectedDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(event) =>
                    setParam("date", event.target.value)
                  }
                  disabled={isPending}
                  className={input}
                />
              </label>
              <DailyStoreExport
                kind="area"
                title="Daily Sales Store Area"
                scope={areaLabel}
                meta={formatIsoLong(selectedDate)}
                dataThrough={dataThrough}
                rows={areaRows}
                filenameBase={areaFilenameBase}
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[1280px] table-fixed border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: 52 }} />
                <col style={{ width: 210 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 94 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 112 }} />
                <col style={{ width: 118 }} />
              </colgroup>
              <thead>
                <tr>
                  <th
                    className={`${TH} text-center md:sticky md:left-0 md:z-20`}
                  >
                    Rank
                  </th>
                  <th
                    className={`${TH} border-r border-line text-left md:sticky md:left-[52px] md:z-20`}
                  >
                    Store Name
                  </th>
                  <th className={`${TH} text-right`}>Total Revenue</th>
                  <th className={`${TH} text-right`}>Apple</th>
                  <th className={`${TH} text-right`}>Android</th>
                  <th className={`${TH} text-right`}>Accessories</th>
                  <th className={`${TH} text-right`}>VAS</th>
                  <th className={`${TH} text-right`}>Unit Sold</th>
                  <th className={`${TH} text-right`}>Apple Qty</th>
                  <th className={`${TH} text-right`}>Android Qty</th>
                  <th className={`${TH} text-right`}>ASP</th>
                </tr>
              </thead>
              <tbody>
                {visibleAreaRows.map((row) => (
                  <tr
                    key={row.store_code}
                    className="group bg-surface even:bg-[#fafafc] hover:bg-violet-50"
                  >
                    <td
                      className={`${TD} bg-inherit text-center md:sticky md:left-0 md:z-10`}
                    >
                      <RankBadge rank={row.rank} />
                    </td>
                    <td
                      className={`${TD} border-r border-line bg-inherit md:sticky md:left-[52px] md:z-10`}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="shrink-0 font-semibold text-ink">
                          {row.store_code}
                        </span>
                        <span
                          className="min-w-0 truncate text-muted"
                          title={row.store_name ?? "-"}
                        >
                          · {row.store_name ?? "-"}
                        </span>
                      </div>
                    </td>
                    <td className={TD_NUM}>
                      <span className={valueClass(row.revenue_total, true)}>
                        {num(row.revenue_total)}
                      </span>
                    </td>
                    <td className={TD_NUM}>
                      <span className={valueClass(row.revenue_apple)}>
                        {num(row.revenue_apple)}
                      </span>
                    </td>
                    <td className={TD_NUM}>
                      <span className={valueClass(row.revenue_android)}>
                        {num(row.revenue_android)}
                      </span>
                    </td>
                    <td className={TD_NUM}>
                      <span className={valueClass(row.revenue_accessories)}>
                        {num(row.revenue_accessories)}
                      </span>
                    </td>
                    <td className={TD_NUM}>
                      <span className={valueClass(row.revenue_vas)}>
                        {num(row.revenue_vas)}
                      </span>
                    </td>
                    <td className={TD_NUM}>
                      <span className={valueClass(row.unit_sold)}>
                        {num(row.unit_sold)}
                      </span>
                    </td>
                    <td className={TD_NUM}>
                      <span className={valueClass(row.apple_qty)}>
                        {num(row.apple_qty)}
                      </span>
                    </td>
                    <td className={TD_NUM}>
                      <span className={valueClass(row.android_qty)}>
                        {num(row.android_qty)}
                      </span>
                    </td>
                    <td className={TD_NUM}>
                      <span
                        className={
                          row.asp === null ? "text-faint" : "text-soft"
                        }
                      >
                        {formatAsp(row.asp)}
                      </span>
                    </td>
                  </tr>
                ))}
                {!areaRows.length && (
                  <tr>
                    <td
                      colSpan={11}
                      className={`${CELL_X} py-10 text-center text-sm text-muted`}
                    >
                      No stores in this scope.
                    </td>
                  </tr>
                )}
              </tbody>
              {areaRows.length > 0 && (
                <tfoot>
                  <tr>
                    <td className={`${FOOT} text-center md:sticky md:left-0 md:z-10`}>
                      {""}
                    </td>
                    <td
                      className={`${FOOT} whitespace-nowrap border-r border-line text-left md:sticky md:left-[52px] md:z-10`}
                    >
                      Grand Total
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {num(areaTotals.revenue_total)}
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {num(areaTotals.revenue_apple)}
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {num(areaTotals.revenue_android)}
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {num(areaTotals.revenue_accessories)}
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {num(areaTotals.revenue_vas)}
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {num(areaTotals.unit_sold)}
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {num(areaTotals.apple_qty)}
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {num(areaTotals.android_qty)}
                    </td>
                    <td className={`${FOOT} text-right`}>
                      {formatAsp(areaTotals.asp)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
            <p className="text-xs text-muted">
              {areaRows.length
                ? pageSize === 0
                  ? `All ${areaRows.length} stores`
                  : `${startIndex + 1}–${endIndex} of ${areaRows.length} stores`
                : "No stores"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-muted">
                Rows
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className={`${input} min-h-[34px] py-1`}
                  aria-label="Rows per page"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>All</option>
                </select>
              </label>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPage={setPage}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted">
              Apple Qty = iPhone, Mac, iPad, Watch · Android Qty = Samsung, Oppo,
              Xiaomi, Huawei, Infinix, Motorola · ASP = (Apple + Android
              revenue) ÷ Unit Sold
            </p>
            <button
              type="button"
              onClick={resetFilters}
              disabled={isPending}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-line px-2.5 text-[11px] text-muted hover:bg-violet-50 active:bg-violet-100 disabled:opacity-50"
            >
              <RotateCcw size={12} aria-hidden />
              Reset
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
