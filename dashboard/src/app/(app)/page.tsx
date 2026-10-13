import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num, pct, rupiahCompact } from "@/lib/format";
import type {
  DailyRow,
  LeaderboardRow,
  Profile,
  StoreDailyRow,
  StoreRow,
  TopProductRow,
} from "@/lib/types";
import FilterBar from "@/components/filter-bar";
import ClearRangeButton from "@/components/clear-range-button";
import GreetHead from "@/components/greet-head";
import TrendChart from "@/components/trend-chart";

type Params = { store?: string; from?: string; to?: string };

function kpiCard(
  label: string,
  revenue: number | null,
  target: number | null,
  ach: number | null,
  accent: string,
  bar: string,
) {
  const reached = ach !== null && ach >= 100;
  const over = ach !== null && ach > 100;
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
        <span className={`font-semibold ${reached ? "text-emerald-300" : accent}`}>
          {pct(ach)}
        </span>
      </div>
      <div
        className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="img"
        aria-label={`${label}: revenue ${rupiahCompact(revenue)}, target ${rupiahCompact(target)}, achievement ${pct(ach)}`}
      >
        <div className="absolute inset-y-0 left-0 w-[80%] bg-rose-400/15" />
        <div className="absolute inset-y-0 left-[80%] w-[20%] bg-amber-300/15" />
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${bar}`}
          style={{
            width: `${Math.min(100, ach ?? 0)}%`,
          }}
        />
        <div className="absolute inset-y-0 right-0 w-0.5 bg-white/70" />
      </div>
      {over && (
        <p className="mt-1 text-[11px] font-medium text-emerald-300">
          Melebihi target
        </p>
      )}
    </div>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashContent searchParams={searchParams} />
    </Suspense>
  );
}

function DashboardSkeleton() {
  const pulse = "animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]";
  return (
    <main aria-busy="true" aria-label="Memuat dashboard" className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="h-3 w-24 rounded bg-white/10" />
      <div className="mt-2 h-8 w-64 max-w-full rounded bg-white/10" />
      <div className={`mt-4 h-[76px] ${pulse}`} />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {["Total", "Apple", "Android", "Accessories", "VAS"].map((l) => (
          <div key={l} className={`${pulse} h-[132px]`} />
        ))}
      </div>
      <div className={`mt-4 h-80 ${pulse}`} />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${pulse} h-72`} />
        <div className={`${pulse} h-72`} />
      </div>
    </main>
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

  // Freshness data — independen dari filter tanggal
  const { data: latest } = await supabase
    .from("mv_dashboard_daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);
  const latestDate =
    (latest?.[0] as { date: string } | undefined)?.date ?? "-";

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
    revenue_total: number;
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
        "date,revenue_total,revenue_apple,revenue_android,revenue_accessories,revenue_vas",
      )
      .eq("store_code", store)
      .order("date");
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data } = await q;
    trend = ((data ?? []) as StoreDailyRow[]).map((d) => ({
      date: d.date,
      revenue_total: d.revenue_total,
      revenue_apple: d.revenue_apple,
      revenue_android: d.revenue_android,
      revenue_accessories: d.revenue_accessories,
      revenue_vas: d.revenue_vas,
    }));
  } else {
    let q = supabase
      .from("mv_dashboard_daily")
      .select(
        "date,revenue_total,revenue_apple,revenue_android,revenue_accessories,revenue_vas",
      )
      .order("date");
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data } = await q;
    trend = ((data ?? []) as DailyRow[]).map((d) => ({
      date: d.date,
      revenue_total: d.revenue_total,
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

  // KPI: revenue SELALU dijumlahkan dari tren (sudah kena filter
  // store+tanggal), agar basisnya konsisten antar kartu. Target = periode
  // penuh (snapshot, tanpa dimensi harian). % achievement hanya ditampilkan
  // bila filter tanggal TIDAK aktif — revenue parsial vs target penuh
  // akan menyesatkan.
  const hasDateFilter = Boolean(from || to);
  const sumTrend = (f: (p: TrendPoint) => number) =>
    trend.reduce((a, p) => a + f(p), 0);
  const kpiRevenue = {
    revenue_total: sumTrend((p) => p.revenue_total),
    revenue_apple: sumTrend((p) => p.revenue_apple),
    revenue_android: sumTrend((p) => p.revenue_android),
    revenue_accessories: sumTrend((p) => p.revenue_accessories),
    revenue_vas: sumTrend((p) => p.revenue_vas),
  };
  type KpiTargets = {
    total_target: number | null;
    apple_target: number | null;
    android_target: number | null;
    accessories_target: number | null;
    vas_target: number | null;
  };
  let kpiTargets: KpiTargets;
  if (store) {
    const { data } = await supabase
      .from("mv_dashboard_store")
      .select(
        "total_target,apple_target,android_target,accessories_target,vas_target",
      )
      .eq("store_code", store)
      .maybeSingle();
    const s = (data ?? null) as Pick<
      StoreRow,
      | "total_target"
      | "apple_target"
      | "android_target"
      | "accessories_target"
      | "vas_target"
    > | null;
    kpiTargets = {
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
    kpiTargets = {
      total_target: sum((x) => x.total_target),
      apple_target: sum((x) => x.apple_target),
      android_target: sum((x) => x.android_target),
      accessories_target: sum((x) => x.accessories_target),
      vas_target: sum((x) => x.vas_target),
    };
  }
  const kpi = { ...kpiRevenue, ...kpiTargets };
  const ach = (rev: number, tgt: number | null) =>
    tgt ? Math.round((10000 * rev) / tgt) / 100 : null;
  // Sembunyikan achievement saat filter tanggal aktif (lihat komentar di atas)
  const showAch = !hasDateFilter;

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500";
  const td = "px-3 py-2.5 text-sm tabular-nums";
  const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5";

  // Deep-link ke tampilan 1 store, periode tetap dipertahankan
  function storeHref(code: string) {
    const q = new URLSearchParams();
    q.set("store", code);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return `/?${q.toString()}`;
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
          DASHBOARD
        </p>
        <GreetHead name={prof?.sales_name ?? user.email ?? "?"} />
        <p className="mt-1 text-xs text-zinc-500">
          {prof
            ? `${prof.role}${prof.store_code ? ` · ${prof.store_code} — ${prof.store_name ?? ""}` : " · semua store"}`
            : user.email}{" "}
          · data diperbarui {latestDate}
        </p>
      </header>

      <div className="mt-4">
        <FilterBar
          stores={(storeList ?? []) as { store_code: string; store_name: string | null }[]}
          lockedStore={lockedStore}
          currentStore={store}
          currentFrom={from}
          currentTo={to}
        />
      </div>

      <section aria-label="Ringkasan revenue" className="mt-4">
        <h2 className="sr-only">Ringkasan revenue</h2>
        <p className="mb-3 text-xs text-zinc-500">
          {hasDateFilter
            ? `Revenue ${from || "…"} – ${to || "…"} · % achievement disembunyikan (target periode penuh)`
            : "Revenue periode berjalan · vs target"}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpiCard("Total Revenue", kpi.revenue_total, kpi.total_target, showAch ? ach(kpi.revenue_total, kpi.total_target) : null, "text-zinc-100", "bg-cyan-400")}
          {kpiCard("Apple", kpi.revenue_apple, kpi.apple_target, showAch ? ach(kpi.revenue_apple, kpi.apple_target) : null, "text-sky-300", "bg-sky-400")}
          {kpiCard("Android", kpi.revenue_android, kpi.android_target, showAch ? ach(kpi.revenue_android, kpi.android_target) : null, "text-violet-300", "bg-violet-400")}
          {kpiCard("Accessories", kpi.revenue_accessories, kpi.accessories_target, showAch ? ach(kpi.revenue_accessories, kpi.accessories_target) : null, "text-amber-300", "bg-amber-400")}
          {kpiCard("VAS", kpi.revenue_vas, kpi.vas_target, showAch ? ach(kpi.revenue_vas, kpi.vas_target) : null, "text-emerald-300", "bg-emerald-400")}
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold">Tren Revenue Harian</h2>
        <p className="mb-3 text-xs text-zinc-500">
          {store ? `Store ${store}` : "Semua store"} ·{" "}
          {from || to
            ? `periode ${from || "…"} – ${to || "…"}`
            : `s.d. ${latestDate}`}{" "}
          · sumbu dalam Rp
        </p>
        {trend.length ? (
          <div
            role="img"
            aria-label={`Grafik tren revenue harian, ${trend.length} titik data`}
          >
            <TrendChart data={trend} />
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-zinc-500">
              Tidak ada data pada rentang ini.
            </p>
            {(from || to) && <ClearRangeButton />}
          </div>
        )}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-sm font-semibold">Leaderboard Store</h2>
          <p className="mb-2 text-xs text-zinc-500">
            Peringkat berdasarkan achievement & revenue · snapshot periode
            berjalan
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <caption className="sr-only">
                Peringkat store berdasarkan achievement dan revenue
              </caption>
              <thead>
                <tr className="border-b border-white/10">
                  <th className={`${th} sticky left-0 bg-[#0b1220]`}>#Ach</th>
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
                    <td
                      className={`${td} sticky left-0 bg-[#0b1220] text-zinc-400`}
                    >
                      {r.rank_achievement}
                    </td>
                    <td className={td}>
                      <Link
                        href={storeHref(r.store_code)}
                        title={`Lihat store ${r.store_code}`}
                        className="font-medium text-cyan-200 underline-offset-4 hover:underline"
                      >
                        {r.store_code}
                      </Link>
                      <span className="block max-w-48 truncate text-xs text-zinc-500">
                        {r.store_name}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>
                      {rupiahCompact(r.revenue_total)}
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
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-zinc-500">Berdasarkan sublob · global</p>
            {store && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                Tidak ikut filter store
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <caption className="sr-only">
                Produk teratas berdasarkan revenue
              </caption>
              <thead>
                <tr className="border-b border-white/10">
                  <th className={`${th} sticky left-0 bg-[#0b1220]`}>#</th>
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
                    <td
                      className={`${td} sticky left-0 bg-[#0b1220] text-zinc-400`}
                    >
                      {r.rank_revenue}
                    </td>
                    <td className={`${td} max-w-[200px] break-words font-medium sm:max-w-none`}>{r.product}</td>
                    <td className={`${td} text-right`}>{num(r.total_qty)}</td>
                    <td className={`${td} text-right`}>
                      {rupiahCompact(r.revenue_total)}
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

      <footer className="mt-6 text-center text-xs text-zinc-500">
        OneMapTech · refresh harian
      </footer>
    </main>
  );
}
