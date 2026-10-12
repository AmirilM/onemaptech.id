import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { num, pct, rupiah } from "@/lib/format";
import type { TopProductRow } from "@/lib/types";

type Params = { store?: string };

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-zinc-500">
          Memuat product analytics...
        </main>
      }
    >
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const session = await getSessionProfile();
  const lockedStore = session?.lockedStore ?? null;
  const store = lockedStore ?? (params.store || "");

  // Top product global (MV tanpa dimensi store)
  const { data: topRaw } = await supabase
    .from("mv_top_product")
    .select("*")
    .order("rank_revenue")
    .limit(50);
  const top = (topRaw ?? []) as TopProductRow[];

  // Share kategori dari agregat harian (ikut filter store bila ada)
  let cat: { label: string; revenue: number }[];
  if (store) {
    const { data } = await supabase
      .from("mv_dashboard_store_daily")
      .select("revenue_apple,revenue_android,revenue_accessories,revenue_vas")
      .eq("store_code", store);
    const rows = (data ?? []) as {
      revenue_apple: number;
      revenue_android: number;
      revenue_accessories: number;
      revenue_vas: number;
    }[];
    const s = (f: (r: (typeof rows)[number]) => number) =>
      rows.reduce((a, r) => a + f(r), 0);
    cat = [
      { label: "Apple", revenue: s((r) => r.revenue_apple) },
      { label: "Android", revenue: s((r) => r.revenue_android) },
      { label: "Accessories", revenue: s((r) => r.revenue_accessories) },
      { label: "VAS", revenue: s((r) => r.revenue_vas) },
    ];
  } else {
    const { data } = await supabase
      .from("mv_dashboard_daily")
      .select("revenue_apple,revenue_android,revenue_accessories,revenue_vas");
    const rows = (data ?? []) as {
      revenue_apple: number;
      revenue_android: number;
      revenue_accessories: number;
      revenue_vas: number;
    }[];
    const s = (f: (r: (typeof rows)[number]) => number) =>
      rows.reduce((a, r) => a + f(r), 0);
    cat = [
      { label: "Apple", revenue: s((r) => r.revenue_apple) },
      { label: "Android", revenue: s((r) => r.revenue_android) },
      { label: "Accessories", revenue: s((r) => r.revenue_accessories) },
      { label: "VAS", revenue: s((r) => r.revenue_vas) },
    ];
  }
  const total = cat.reduce((a, c) => a + c.revenue, 0) || 1;

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500";
  const td = "px-3 py-2.5 text-sm tabular-nums";
  const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-5";
  const bar = ["bg-cyan-400", "bg-violet-400", "bg-amber-400", "bg-emerald-400"];

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
        PRODUCT ANALYTICS
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
        Analitik Produk
      </h1>
      <p className="mt-1 text-xs text-zinc-500">
        {store ? `Store ${store}` : "Semua store"} · by sublob (tanpa NULL/0)
      </p>

      <section className={`mt-5 ${card}`}>
        <h2 className="text-sm font-semibold">Share Kategori</h2>
        <div className="mt-3 flex flex-col gap-3">
          {cat.map((c, i) => (
            <div key={c.label}>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">{c.label}</span>
                <span className="text-zinc-500">
                  {rupiah(c.revenue)} · {pct((100 * c.revenue) / total)}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${bar[i % bar.length]}`}
                  style={{ width: `${(100 * c.revenue) / total}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold">Top Product (Top 50)</h2>
        <p className="mb-2 text-xs text-zinc-500">
          Global{store ? " — tidak ikut filter store" : ""}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>#Rev</th>
                <th className={th}>#Qty</th>
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>Trx</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r) => (
                <tr
                  key={r.product}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className={`${td} text-zinc-400`}>{r.rank_revenue}</td>
                  <td className={`${td} text-zinc-400`}>{r.rank_qty}</td>
                  <td className={`${td} font-medium`}>{r.product}</td>
                  <td className={`${td} text-right`}>{num(r.total_qty)}</td>
                  <td className={`${td} text-right`}>{rupiah(r.revenue_total)}</td>
                  <td className={`${td} text-right text-zinc-400`}>
                    {num(r.trx_count)}
                  </td>
                </tr>
              ))}
              {!top.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
