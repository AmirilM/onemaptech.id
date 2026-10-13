"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  stores: { store_code: string; store_name: string | null }[];
  lockedStore: string | null;
  currentStore: string;
  currentMonth: string;
  areaManagers?: string[];
  lockedAM?: string | null;
  currentAM?: string;
};

export default function DailyFilter({
  stores,
  lockedStore,
  currentStore,
  currentMonth,
  areaManagers = [],
  lockedAM = null,
  currentAM = "",
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [store, setStore] = useState(currentStore);
  const [month, setMonth] = useState(currentMonth);
  const [am, setAm] = useState(lockedAM ?? currentAM);

  // Sync saat back/forward navigation — render-time adjust (tanpa effect)
  const [prev, setPrev] = useState({ s: currentStore, m: currentMonth, a: lockedAM ?? currentAM });
  if (currentStore !== prev.s || currentMonth !== prev.m || (lockedAM ?? currentAM) !== prev.a) {
    setPrev({ s: currentStore, m: currentMonth, a: lockedAM ?? currentAM });
    setStore(currentStore);
    setMonth(currentMonth);
    setAm(lockedAM ?? currentAM);
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (store) next.set("store", store);
    else next.delete("store");
    if (am) next.set("am", am);
    else next.delete("am");
    if (month) next.set("month", month);
    else next.delete("month");
    startTransition(() => router.push(`/daily?${next.toString()}`));
  }

  const input =
    "min-h-[44px] rounded-lg border border-line bg-canvas px-3 py-2 text-base text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30 md:text-sm";

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm"
    >
      {(areaManagers.length > 0 || lockedAM) && (
        <label className="flex w-full flex-col gap-1 text-xs text-muted sm:w-auto">
          Area Manager
          <select
            value={am}
            onChange={(e) => {
              // Ketat: ganti AM → reset store.
              setAm(e.target.value);
              setStore("");
            }}
            disabled={!!lockedAM}
            className={`${input} w-full disabled:opacity-60 sm:w-auto sm:min-w-56`}
          >
            <option value="">Semua area</option>
            {(lockedAM ? [lockedAM] : areaManagers).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex w-full flex-col gap-1 text-xs text-muted sm:w-auto">
        Store
        <select
          value={store}
          onChange={(e) => setStore(e.target.value)}
          disabled={!!lockedStore}
          className={`${input} w-full disabled:opacity-60 sm:w-auto sm:min-w-56`}
        >
          <option value="">Semua store</option>
          {stores.map((s) => (
            <option key={s.store_code} value={s.store_code}>
              {s.store_code} — {s.store_name ?? "-"}
            </option>
          ))}
        </select>
      </label>
      <label className="flex w-full flex-col gap-1 text-xs text-muted sm:w-auto">
        Bulan
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className={`${input} w-full sm:w-auto`}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "..." : "Terapkan"}
      </button>
      {lockedStore && (
        <span className="w-full text-xs text-warning sm:w-auto">
          Terkunci ke store {lockedStore} (role kamu).
        </span>
      )}
      {lockedAM && !lockedStore && (
        <span className="w-full text-xs text-warning sm:w-auto">
          Terkunci ke area {lockedAM} — hanya store milikmu yang tampil.
        </span>
      )}
    </form>
  );
}
