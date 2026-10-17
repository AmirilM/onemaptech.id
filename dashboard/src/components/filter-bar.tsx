"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";
import { id } from "react-day-picker/locale/id";
import { Map, RotateCcw, Store } from "lucide-react";
import "react-day-picker/style.css";

// DayPicker is split into a separate chunk: only downloaded when FilterBar renders,
// so it does not weigh down dateMode="none" pages in the initial bundle.
const DayPicker = dynamic(
  () => import("react-day-picker").then((m) => m.DayPicker),
  { ssr: false },
);

type Props = {
  stores: { store_code: string; store_name: string | null }[];
  lockedStore: string | null;
  currentStore: string;
  currentFrom?: string;
  currentTo?: string;
  dateMode?: "none" | "range";
  areaManagers?: string[];
  lockedAM?: string | null;
  currentAM?: string;
};

function parseISODate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return undefined;
  }
  return dt;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeFromParams(from: string, to: string): DateRange | undefined {
  const f = from ? parseISODate(from) : undefined;
  const t = to ? parseISODate(to) : undefined;
  if (!f && !t) return undefined;
  return { from: f ?? t, to: t ?? f };
}

const monthShort = new Intl.DateTimeFormat("id-ID", { month: "short" });

function rangeLabel(r: DateRange | undefined): string {
  if (!r?.from) return "All dates";
  const f = r.from;
  if (!r.to) return `${f.getDate()} ${monthShort.format(f)} ${f.getFullYear()} – …`;
  const t = r.to;
  if (toISODate(f) === toISODate(t))
    return `${f.getDate()} ${monthShort.format(f)} ${f.getFullYear()}`;
  if (f.getFullYear() === t.getFullYear())
    return `${f.getDate()} ${monthShort.format(f)} – ${t.getDate()} ${monthShort.format(t)} ${t.getFullYear()}`;
  return `${f.getDate()} ${monthShort.format(f)} ${f.getFullYear()} – ${t.getDate()} ${monthShort.format(t)} ${t.getFullYear()}`;
}

export default function FilterBar({
  stores,
  lockedStore,
  currentStore,
  currentFrom = "",
  currentTo = "",
  dateMode = "range",
  areaManagers = [],
  lockedAM = null,
  currentAM = "",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [store, setStore] = useState(currentStore);
  const [am, setAm] = useState(lockedAM ?? currentAM);
  const [range, setRange] = useState<DateRange | undefined>(() =>
    dateMode !== "none" ? rangeFromParams(currentFrom, currentTo) : undefined,
  );
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches
      ? 2
      : 1,
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync on back/forward navigation — render-time adjust (no effect)
  const [prev, setPrev] = useState({ s: currentStore, f: currentFrom, t: currentTo, a: lockedAM ?? currentAM });
  if (currentStore !== prev.s || (dateMode !== "none" && (currentFrom !== prev.f || currentTo !== prev.t)) || (lockedAM ?? currentAM) !== prev.a) {
    setPrev({ s: currentStore, f: currentFrom, t: currentTo, a: lockedAM ?? currentAM });
    setStore(currentStore);
    setAm(lockedAM ?? currentAM);
    if (dateMode !== "none") setRange(rangeFromParams(currentFrom, currentTo));
  }

  // 2 months on screens >= md, 1 month on mobile
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setMonths(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Close the popover on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  function push(storeVal: string, r: DateRange | undefined, amVal: string = am) {
    const next = new URLSearchParams(params.toString());
    if (storeVal) next.set("store", storeVal);
    else next.delete("store");
    if (amVal) next.set("am", amVal);
    else next.delete("am");
    if (dateMode !== "none") {
      if (r?.from && r?.to) {
        next.set("from", toISODate(r.from));
        next.set("to", toISODate(r.to));
      } else {
        next.delete("from");
        next.delete("to");
      }
    } else {
      next.delete("from");
      next.delete("to");
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  function handleStore(v: string) {
    setStore(v);
    push(v, range);
  }

  function handleAM(v: string) {
    // Strict: changing the AM resets the store (the store must belong to that AM).
    setAm(v);
    setStore("");
    push("", range, v);
  }

  function handleSelect(r: DateRange | undefined) {
    setRange(r);
    // Auto-run only when the range is complete; the first click (from only) does not push yet
    if (r?.from && r?.to) push(store, { from: r.from, to: r.to });
  }

  function clearRange() {
    setRange(undefined);
    push(store, undefined);
  }

  function reset() {
    const s = lockedStore ?? "";
    setStore(s);
    setAm(lockedAM ?? "");
    setRange(undefined);
    setOpen(false);
    startTransition(() => {
      if (lockedAM || lockedStore) {
        const next = new URLSearchParams();
        if (lockedAM) next.set("am", lockedAM);
        if (lockedStore) next.set("store", lockedStore);
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      } else {
        router.replace(pathname);
      }
    });
  }

  const input =
    "min-h-[44px] rounded-lg border border-line bg-canvas px-3 py-2 text-base text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30 md:text-sm";

  return (
    <>
      <style>{`@keyframes omt-progress{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}} .omt-progress-bar{animation:omt-progress 1.1s ease-in-out infinite}`}</style>
      {isPending && (
        <div
          aria-hidden
          className="fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-primary/15"
        >
          <div className="omt-progress-bar h-full w-1/4 rounded-full bg-primary" />
        </div>
      )}
      <span role="status" className="sr-only">
        {isPending ? "Loading data…" : ""}
      </span>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm xl:flex-nowrap">
      {(areaManagers.length > 0 || lockedAM) && (
        <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-muted sm:flex-1">
          Area Manager
          <span className="relative block">
            <Map
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <select
              value={am}
              onChange={(e) => handleAM(e.target.value)}
              disabled={!!lockedAM || isPending}
              className={`${input} w-full disabled:opacity-60 pl-10`}
            >
              <option value="">All areas</option>
              {(lockedAM ? [lockedAM] : areaManagers).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </span>
        </label>
      )}
      <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-muted sm:flex-1">
        Store
        <span className="relative block">
          <Store
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <select
            value={store}
            onChange={(e) => handleStore(e.target.value)}
            disabled={!!lockedStore || isPending}
            className={`${input} w-full disabled:opacity-60 pl-10`}
          >
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.store_code} value={s.store_code}>
                {s.store_code} — {s.store_name ?? "-"}
              </option>
            ))}
          </select>
        </span>
      </label>

      {dateMode !== "none" && (
      <div ref={panelRef} className="relative w-full sm:w-auto">
        <span id="period-label" className="mb-1 flex items-center gap-2 text-xs text-muted">
          Period
          {isPending && <span className="text-primary">Loading…</span>}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={isPending}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-labelledby="period-label period-value"
          className={`${input} flex w-full items-center justify-between gap-3 sm:w-auto sm:min-w-64`}
        >
          <span
            id="period-value"
            className={range?.from ? "text-ink" : "text-faint"}
          >
            {rangeLabel(range)}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="shrink-0 text-muted"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-2xl border border-line bg-surface p-3 shadow-xl">
            <DayPicker
              mode="range"
              locale={id}
              weekStartsOn={1}
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={months}
              showOutsideDays
              className="rdp-premium"
            />
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
              <span className="px-1 text-xs text-muted">
                {range?.from && !range.to
                  ? "Select the end date for the range"
                  : rangeLabel(range)}
              </span>
              <span className="flex gap-2">
                {range?.from && (
                  <button
                    type="button"
                    onClick={clearRange}
                    className="min-h-[36px] rounded-lg px-3 py-1 text-xs text-muted hover:bg-violet-50 active:bg-violet-100"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-[36px] rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-hover"
                >
                  Close
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
      )}

      <button
        type="button"
        onClick={reset}
        disabled={isPending}
        className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-soft hover:bg-violet-50 active:bg-violet-100 disabled:opacity-60"
      >
        <RotateCcw size={16} aria-hidden />
        {isPending ? "Loading…" : "Reset"}
      </button>
      {lockedStore && (
        <span className="w-full text-xs text-warning sm:w-auto">
          Locked to store {lockedStore} (your role).
        </span>
      )}
      {lockedAM && !lockedStore && (
        <span className="w-full text-xs text-warning sm:w-auto">
          Locked to area {lockedAM} — only your stores are shown.
        </span>
      )}
      </div>
    </>
  );
}
