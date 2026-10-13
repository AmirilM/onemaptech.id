"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  stores: { store_code: string; store_name: string | null }[];
  lockedStore: string | null;
  currentStore: string;
  currentFrom: string;
  currentTo: string;
};

export default function FilterBar({
  stores,
  lockedStore,
  currentStore,
  currentFrom,
  currentTo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [store, setStore] = useState(currentStore);
  const [from, setFrom] = useState(currentFrom);
  const [to, setTo] = useState(currentTo);

  // Sync saat back/forward navigation — render-time adjust (tanpa effect)
  const [prev, setPrev] = useState({ s: currentStore, f: currentFrom, t: currentTo });
  if (currentStore !== prev.s || currentFrom !== prev.f || currentTo !== prev.t) {
    setPrev({ s: currentStore, f: currentFrom, t: currentTo });
    setStore(currentStore);
    setFrom(currentFrom);
    setTo(currentTo);
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (store) next.set("store", store);
    else next.delete("store");
    if (from) next.set("from", from);
    else next.delete("from");
    if (to) next.set("to", to);
    else next.delete("to");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  function reset() {
    setStore(lockedStore ?? "");
    setFrom("");
    setTo("");
    startTransition(() => router.push(pathname));
  }

  const input =
    "min-h-[44px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-zinc-100 outline-none focus:border-cyan-400/60 md:text-sm";

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <label className="flex w-full flex-col gap-1 text-xs text-zinc-400 sm:w-auto">
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
      <label className="flex w-full flex-col gap-1 text-xs text-zinc-400 sm:w-auto">
        Dari
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={`${input} w-full sm:w-auto`}
        />
      </label>
      <label className="flex w-full flex-col gap-1 text-xs text-zinc-400 sm:w-auto">
        Sampai
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={`${input} w-full sm:w-auto`}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-60"
      >
        {isPending ? "..." : "Terapkan"}
      </button>
      <button
        type="button"
        onClick={reset}
        className="min-h-[44px] rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 active:bg-white/10"
      >
        Reset
      </button>
      {lockedStore && (
        <span className="w-full text-xs text-amber-300/90 sm:w-auto">
          Terkunci ke store {lockedStore} (role kamu).
        </span>
      )}
    </form>
  );
}
