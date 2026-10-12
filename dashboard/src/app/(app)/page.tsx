import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { greeting } from "@/lib/names";
import { num, pct, rupiah, rupiahCompact } from "@/lib/format";
import type {
  DailyRow,
  LeaderboardRow,
  Profile,
  StoreDailyRow,
  StoreRow,
  TopProductRow,
} from "@/lib/types";
import FilterBar from "@/components/filter-bar";
import TrendChart from "@/components/trend-chart";

type Params = { store?: string; from?: string; to?: string };

function kpiCard(
  label: string,
  revenue: number | null,
  target: number | null,
  ach: number | null,
  accent: string,
) {
  return (
    <div
      key={label}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <p className="text-xs font-medium tracking-wide text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">
        {rupiahCompact(revenue)}
      </p>
      <div className="mt-2 flex items-baseline justify-between text-xs">
        <span className="text-zinc-500">Target {rupiahCompact(target)}</span>
        <span className={`font-semibold ${accent}`}>{pct(ach)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
          style={{
            width: `${Math.min(100, ach ?? 0)}%`,
          }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-zinc-500">
          Memuat dashboard...
        </main>
      }
    >
      <DashContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6 text-sm">
          <p className="font-semibold text-amber-200">Supabase belum dikonfigurasi</p>
          <p className="mt-2 text-zinc-300">
            Copy <code>dashboard/.env.example</code> ke{" "}
            <code>dashboard/.env.local</code> lalu isi{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, kemudian restart dev
            server.
          </p>
        </div>
      </main>
    );
  }
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const salesId = (user.user_metadata?.sales_id as string | undefined) ?? "";
  const { data: profile } = salesId
    ? await supabase
        .from("profiles")
        .select("sales_id,sales_name,store_code,store_name,role")
        .eq("sales_id", salesId)
        .maybeSingle()
    : { data: null };
  const prof = profile as Profile | null;

  const lockedStore =
    prof?.role === "Store Supervisor" ? (prof?.store_code ?? null) : null;
  const store = lockedStore ?? (params.store || "");
  const from = params.from || "";
  const to = params.to || "";

  // Daftar store untuk filter
  const { data: storeList } = await supabase
    .from("mv_leaderboard_store")
    .select("store_code,store_name")
    .order("store_code");

  // Leaderboard
  let lbQuery = supabase
    .from("mv_leaderboard_store")
    .select("*")
    .order("ach_total_pct", { ascending: false, nullsFirst: false });
  if (store) lbQuery = lbQuery.eq("store_code", store);
  const { data: leaderboard } = await lbQuery;
  const lb = (leaderboard ?? []) as LeaderboardRow[];

  // Tren: per store+date bila filter store, global harian bila tidak
  type TrendPoint = {
    date: string;
    revenue_apple: number;
    revenue_android: number;
    revenue_accessories: number;
    revenue_vas: number;
  };
  let trend: TrendPoint[] = [];
  if (store) {
    let q = supabase
      .from("mv_dashboard_store_daily")
      .select(
        "date,revenue_apple,revenue_android,revenue_accessories,revenue_vas",
      )
      .eq("store_code", store)
      .order("date");
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data } = await q;
    trend = ((data ?? []) as StoreDailyRow[]).map((d) => ({
      date: d.date,
      revenue_apple: d.revenue_apple,
      revenue_android: d.revenue_android,
      revenue_accessories: d.revenue_accessories,
      revenue_vas: d.revenue_vas,
    }));
  } else {
    let q = supabase
      .from("mv_dashboard_daily")
      .select(
        "date,revenue_apple,revenue_android,revenue_accessories,revenue_vas",
      )
      .order("date");
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data } = await q;
    trend = ((data ?? []) as DailyRow[]).map((d) => ({
      date: d.date,
      revenue_apple: d.revenue_apple,
      revenue_android: d.revenue_android,
      revenue_accessories: d.revenue_accessories,
      revenue_vas: d.revenue_vas,
    }));
  }

  // Top product (global — MV tanpa dimensi store)
  const { data: topRaw } = await supabase
    .from("mv_top_product")
    .select("*")
    .order("rank_revenue")
    .limit(10);
  const top = (topRaw ?? []) as TopProductRow[];

  // KPI: 1 store -> ambil langsung; global -> agregat leaderboard + master_target
  let kpi: {
    revenue_total: number;
    revenue_apple: number;
    revenue_android: number;
    revenue_accessories: number;
    revenue_vas: number;
    total_target: number | null;
    apple_target: number | null;
    android_target: number | null;
    accessories_target: number | null;
    vas_target: number | null;
  };
  if (store) {
    const { data } = await supabase
      .from("mv_dashboard_store")
      .select(
        "revenue_total,revenue_apple,revenue_android,revenue_accessories,revenue_vas,total_target,apple_target,android_target,accessories_target,vas_target",
      )
      .eq("store_code", store)
      .maybeSingle();
    const s = (data ?? null) as StoreRow | null;
    kpi = {
      revenue_total: s?.revenue_total ?? 0,
      revenue_apple: s?.revenue_apple ?? 0,
      revenue_android: s?.revenue_android ?? 0,
      revenue_accessories: s?.revenue_accessories ?? 0,
      revenue_vas: s?.revenue_vas ?? 0,
      total_target: s?.total_target ?? null,
      apple_target: s?.apple_target ?? null,
      android_target: s?.android_target ?? null,
      accessories_target: s?.accessories_target ?? null,
      vas_target: s?.vas_target ?? null,
    };
  } else {
    const { data: targets } = await supabase
      .from("master_target")
      .select(
        "total_target,apple_target,android_target,accessories_target,vas_target",
      );
    const t = (targets ?? []) as Pick<
      StoreRow,
      | "total_target"
      | "apple_target"
      | "android_target"
      | "accessories_target"
      | "vas_target"
    >[];
    const sum = (f: (x: (typeof t)[number]) => number | null) =>
      t.reduce<number | null>(
        (acc, x) => (acc ?? 0) + (f(x) ?? 0),
        t.length ? 0 : null,
      );
    const sumLb = (f: (x: LeaderboardRow) => number) =>
      lb.reduce((a, x) => a + f(x), 0);
    const rev = {
      revenue_total: sumLb((x) => x.revenue_total),
      revenue_apple: 0,
      revenue_android: 0,
      revenue_accessories: 0,
      revenue_vas: 0,
    };
    // Ambil breakdown global dari tren (jumlahkan per grup)
    for (const p of trend) {
      rev.revenue_apple += p.revenue_apple;
      rev.revenue_android += p.revenue_android;
      rev.revenue_accessories += p.revenue_accessories;
      rev.revenue_vas += p.revenue_vas;
    }
    const tt = sum((x) => x.total_target);
    const at = sum((x) => x.apple_target);
    const ant = sum((x) => x.android_target);
    const act = sum((x) => x.accessories_target);
    const vt = sum((x) => x.vas_target);
    kpi = {
      ...rev,
      total_target: tt,
      apple_target: at,
      android_target: ant,
      accessories_target: act,
      vas_target: vt,
    };
  }
  const ach = (rev: number, tgt: number | null) =>
    tgt ? Math.round((10000 * rev) / tgt) / 100 : null;

  const lastUpdated = trend.length ? trend[trend.length - 1].date : "-";

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500";
  const td = "px-3 py-2.5 text-sm tabular-nums";
  const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-5";

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
          DASHBOARD
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          {greeting()},{" "}
          {prof?.sales_name ?? user.email}
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          {prof
            ? `${prof.role}${prof.store_code ? ` · ${prof.store_code} — ${prof.store_name ?? ""}` : " · semua store"}`
            : user.email}{" "}
          · data s.d. {lastUpdated}
        </p>
      </header>

      <div className="mt-5">
        <FilterBar
          stores={(storeList ?? []) as { store_code: string; store_name: string | null }[]}
          lockedStore={lockedStore}
          currentStore={store}
          currentFrom={from}
          currentTo={to}
        />
      </div>

      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCard("Total Revenue", kpi.revenue_total, kpi.total_target, ach(kpi.revenue_total, kpi.total_target), "text-cyan-300")}
        {kpiCard("Apple", kpi.revenue_apple, kpi.apple_target, ach(kpi.revenue_apple, kpi.apple_target), "text-cyan-300")}
        {kpiCard("Android", kpi.revenue_android, kpi.android_target, ach(kpi.revenue_android, kpi.android_target), "text-violet-300")}
        {kpiCard("Accessories", kpi.revenue_accessories, kpi.accessories_target, ach(kpi.revenue_accessories, kpi.accessories_target), "text-amber-300")}
        {kpiCard("VAS", kpi.revenue_vas, kpi.vas_target, ach(kpi.revenue_vas, kpi.vas_target), "text-emerald-300")}
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold">Tren Revenue Harian</h2>
        <p className="mb-3 text-xs text-zinc-500">
          {store ? `Store ${store}` : "Semua store"}
        </p>
        {trend.length ? (
          <TrendChart data={trend} />
        ) : (
          <p className="py-10 text-center text-sm text-zinc-500">
            Tidak ada data pada rentang ini.
          </p>
        )}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-sm font-semibold">Leaderboard Store</h2>
          <p className="mb-2 text-xs text-zinc-500">
            Rank by achievement & revenue
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>#Ach</th>
                  <th className={th}>Store</th>
                  <th className={`${th} text-right`}>Revenue</th>
                  <th className={`${th} text-right`}>Ach</th>
                </tr>
              </thead>
              <tbody>
                {lb.map((r) => (
                  <tr
                    key={r.store_code}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className={`${td} text-zinc-400`}>
                      {r.rank_achievement}
                    </td>
                    <td className={td}>
                      <span className="font-medium">{r.store_code}</span>
                      <span className="block max-w-48 truncate text-xs text-zinc-500">
                        {r.store_name}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>
                      {rupiah(r.revenue_total)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-semibold text-cyan-300">
                      {pct(r.ach_total_pct)}
                    </td>
                  </tr>
                ))}
                {!lb.length && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold">Top Product</h2>
          <p className="mb-2 text-xs text-zinc-500">
            By sublob · global{store ? " (tidak ikut filter store)" : ""}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>#</th>
                  <th className={th}>Product</th>
                  <th className={`${th} text-right`}>Qty</th>
                  <th className={`${th} text-right`}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r) => (
                  <tr
                    key={r.product}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className={`${td} text-zinc-400`}>{r.rank_revenue}</td>
                    <td className={`${td} font-medium`}>{r.product}</td>
                    <td className={`${td} text-right`}>{num(r.total_qty)}</td>
                    <td className={`${td} text-right`}>
                      {rupiah(r.revenue_total)}
                    </td>
                  </tr>
                ))}
                {!top.length && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="mt-6 text-center text-xs text-zinc-600">
        OneMapTech · refresh harian · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
