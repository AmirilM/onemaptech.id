"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  stores: { store_code: string; store_name: string | null }[];
  lockedStore: string | null;
  currentStore: string;
  currentMonth: string;
};

export default function DailyFilter({
  stores,
  lockedStore,
  currentStore,
  currentMonth,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [store, setStore] = useState(currentStore);
  const [month, setMonth] = useState(currentMonth);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (store) next.set("store", store);
    else next.delete("store");
    if (month) next.set("month", month);
    else next.delete("month");
    startTransition(() => router.push(`/daily?${next.toString()}`));
  }

  const input =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400/60";

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Store
        <select
          value={store}
          onChange={(e) => setStore(e.target.value)}
          disabled={!!lockedStore}
          className={`${input} min-w-56 disabled:opacity-60`}
        >
          <option value="">Semua store</option>
          {stores.map((s) => (
            <option key={s.store_code} value={s.store_code}>
              {s.store_code} — {s.store_name ?? "-"}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Bulan
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className={input}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
      >
        {isPending ? "..." : "Terapkan"}
      </button>
      {lockedStore && (
        <span className="text-xs text-amber-300/90">
          Terkunci ke store {lockedStore} (role kamu).
        </span>
      )}
    </form>
  );
}
