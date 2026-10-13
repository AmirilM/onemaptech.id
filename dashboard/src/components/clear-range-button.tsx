"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function ClearRangeButton() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function clear() {
    const next = new URLSearchParams(params.toString());
    next.delete("from");
    next.delete("to");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <button
      type="button"
      onClick={clear}
      disabled={isPending}
      className="mt-3 min-h-[44px] rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 active:bg-white/10 disabled:opacity-60"
    >
      {isPending ? "Memuat…" : "Hapus filter tanggal"}
    </button>
  );
}
