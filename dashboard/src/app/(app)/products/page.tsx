import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { num, pct, rupiah } from "@/lib/format";
import type { TopProductRow } from "@/lib/types";
import { effectiveAM, getStoresOfAM, storeInScope } from "@/lib/scope";

type Params = { store?: string; am?: string };

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-muted">
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
  const lockedAM = session?.lockedAM ?? null;
  const am = effectiveAM(lockedAM, params.am || "");
  const amStores = await getStoresOfAM(supabase, am);
  const amScopeBroken = am !== "" && amStores.length === 0;
  const store = storeInScope(lockedStore ?? (params.store || ""), am, amStores);
  const scopeLabel = store ? `Store ${store}` : am ? `Area ${am}` : "Semua store";

  // Top product global (MV tanpa dimensi store)
  const { data: topRaw } = await supabase
    .from("mv_top_product")
    .select("*")
    .order("rank_revenue")
    .limit(50);
  const top = (topRaw ?? []) as TopProductRow[];

  // Share kategori dari agregat harian (ikut filter store / area bila ada)
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
  } else if (am && amStores.length) {
    const { data } = await supabase
      .from("mv_dashboard_store_daily")
      .select("revenue_apple,revenue_android,revenue_accessories,revenue_vas")
      .in("store_code", amStores);
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
  } else if (amScopeBroken) {
    cat = [
      { label: "Apple", revenue: 0 },
      { label: "Android", revenue: 0 },
      { label: "Accessories", revenue: 0 },
      { label: "VAS", revenue: 0 },
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
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "px-3 py-2.5 text-sm tabular-nums text-soft";
  const card = "rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5";
  const bar = ["bg-primary", "bg-[#8B5CF6]", "bg-[#A78BFA]", "bg-accent"];

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
        PRODUCT ANALYTICS
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Analitik Produk
      </h1>
      <p className="mt-1 text-xs text-muted">
        {scopeLabel} · by sublob (tanpa NULL/0)
      </p>

      {amScopeBroken && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-warning">Data area tidak terbaca</p>
          <p className="mt-1 text-muted">
            Mapping store area ({am}) tidak dapat dimuat. Minta admin menjalankan{" "}
            <code>sql/dashboard-rls.sql</code> terbaru di SQL Editor, lalu muat ulang.
          </p>
        </div>
      )}

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold text-ink">Share Kategori</h2>
        <div className="mt-3 flex flex-col gap-3">
          {cat.map((c, i) => (
            <div key={c.label}>
              <div className="flex justify-between text-xs">
                <span className="text-soft">{c.label}</span>
                <span className="text-muted">
                  {rupiah(c.revenue)} · {pct((100 * c.revenue) / total)}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-track">
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
        <h2 className="text-sm font-semibold text-ink">Top Product (Top 50)</h2>
        <p className="mb-2 text-xs text-muted">
          Global{(store || am) ? " — tidak ikut filter store/area" : ""}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-line">
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
                  className="border-b border-line/60 last:border-0 hover:bg-violet-50"
                >
                  <td className={`${td} text-muted`}>{r.rank_revenue}</td>
                  <td className={`${td} text-muted`}>{r.rank_qty}</td>
                  <td className={`${td} max-w-[200px] break-words font-medium text-ink sm:max-w-none`}>{r.product}</td>
                  <td className={`${td} text-right`}>{num(r.total_qty)}</td>
                  <td className={`${td} text-right`}>{rupiah(r.revenue_total)}</td>
                  <td className={`${td} text-right text-muted`}>
                    {num(r.trx_count)}
                  </td>
                </tr>
              ))}
              {!top.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted">
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
