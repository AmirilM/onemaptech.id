"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [store, setStore] = useState(currentStore);
  const [from, setFrom] = useState(currentFrom);
  const [to, setTo] = useState(currentTo);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (store) next.set("store", store);
    else next.delete("store");
    if (from) next.set("from", from);
    else next.delete("from");
    if (to) next.set("to", to);
    else next.delete("to");
    startTransition(() => router.push(`/?${next.toString()}`));
  }

  function reset() {
    setStore(lockedStore ?? "");
    setFrom("");
    setTo("");
    startTransition(() => router.push("/"));
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
        Dari
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Sampai
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
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
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
      >
        Reset
      </button>
      {lockedStore && (
        <span className="text-xs text-amber-300/90">
          Terkunci ke store {lockedStore} (role kamu).
        </span>
      )}
    </form>
  );
}
