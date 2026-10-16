import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num, pct, pctExact, rupiah } from "@/lib/format";
import type {
  DailyRow,
  LeaderboardRow,
  Profile,
  StoreDailyRow,
  StoreRow,
} from "@/lib/types";
import FilterBar from "@/components/filter-bar";
import LeaderboardTable from "@/components/leaderboard-table";
import { distinctAMs, effectiveAM, getStoreMap, storeInScope } from "@/lib/scope";
import GreetHead from "@/components/greet-head";
import PaceCard from "@/components/pace-card";
import QtyBarChart, { type QtyBarItem } from "@/components/qty-bar-chart";
import BrandShareDonut, {
  type BrandShareItem,
} from "@/components/brand-share-donut";
import {
  Apple,
  Headphones,
  Smartphone,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type Params = { store?: string; am?: string };

function getWibPeriod(): { elapsed: number; daysInMonth: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    elapsed: day >= 1 ? day : 1,
    daysInMonth: daysInMonth >= 1 ? daysInMonth : 30,
  };
}

function kpiCard(
  label: string,
  actual: number,
  target: number | null,
  elapsed: number,
  daysInMonth: number,
  Icon: LucideIcon,
) {
  const ach = target ? Math.round((10000 * actual) / target) / 100 : null;
  const estimated =
    elapsed > 0 ? Math.round((actual / elapsed) * daysInMonth) : null;
  const estPct =
    estimated !== null && target
      ? Math.round((10000 * estimated) / target) / 100
      : null;
  const variance = target !== null ? actual - target : null;
  const shortfall = variance !== null && variance < 0;
  const covered = variance !== null && variance >= 0;
  const reached = ach !== null && ach >= 100;
  const over = ach !== null && ach > 100;
  const actualStr = rupiah(actual);
  const targetStr = rupiah(target);
  const varianceStr = rupiah(variance);
  const estimatedStr = rupiah(estimated);
  const actualSize =
    actualStr.length <= 12
      ? "text-[20px]"
      : actualStr.length <= 16
        ? "text-[15px]"
        : "text-[13px]";
  const detailSize = (s: string) =>
    s.length > 14 ? "text-[11px]" : "text-xs";
  const row =
    "flex min-w-0 items-center justify-between gap-2 overflow-hidden text-xs leading-4 tabular-nums";
  return (
    <div
      key={label}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm"
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-primary opacity-100" />
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-medium leading-4 tracking-wide text-muted">
          {label}
        </p>
        <span
          className="shrink-0 rounded-[10px] bg-primary/10 p-1.5 text-primary ring-1 ring-inset ring-primary/25"
          aria-hidden
        >
          <Icon size={14} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-2.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-muted">
        Actual Sales
      </p>
      <div className="mt-1 flex h-6 min-w-0 items-center overflow-hidden">
        <p className={`whitespace-nowrap font-bold tracking-tight text-ink tabular-nums ${actualSize}`} title={actualStr}>
          {actualStr}
        </p>
      </div>
      <dl className="mt-3 space-y-1.5">
        <div className={row}>
          <dt className="shrink-0 text-muted">Target</dt>
          <dd className={`min-w-0 max-w-full overflow-hidden text-right font-medium whitespace-nowrap text-ink tabular-nums ${detailSize(targetStr)}`} title={targetStr}>{targetStr}</dd>
        </div>
        <div className={row}>
          <dt className="shrink-0 text-muted">Variance</dt>
          <dd
            title={varianceStr}
            className={`min-w-0 max-w-full overflow-hidden whitespace-nowrap text-right font-semibold tabular-nums rounded-full px-2 py-[2px] ${detailSize(varianceStr)} ${
              shortfall
                ? "bg-danger/10 text-danger ring-1 ring-inset ring-danger/25"
                : covered
                  ? "bg-accent/10 text-accent ring-1 ring-inset ring-accent/25"
                  : "bg-canvas text-ink"
            }`}
          >
            {varianceStr}
          </dd>
        </div>
        <div className={row}>
          <dt className="shrink-0 text-muted">Estimated</dt>
          <dd className={`min-w-0 max-w-full overflow-hidden text-right font-medium whitespace-nowrap text-ink tabular-nums ${detailSize(estimatedStr)}`} title={estimatedStr}>
            {estimatedStr}
          </dd>
        </div>
      </dl>
      <div className="my-3 border-t border-line" />
      <div className="space-y-1">
        <div className={row}>
          <span className="text-muted">Achievement</span>
          <span
            className={`text-[14px] leading-5 font-bold tabular-nums ${reached ? "text-accent" : "text-ink"}`}
          >
            {pct(ach)}
          </span>
        </div>
        <div className={row}>
          <span className="text-muted">Estimated</span>
          <span className="text-xs font-medium text-soft tabular-nums">
            {pct(estPct)}
          </span>
        </div>
      </div>
      <div
        className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-track"
        role="img"
        aria-label={`${label}: actual ${rupiah(actual)}, target ${rupiah(target)}, achievement ${pctExact(ach)}, estimated ${pctExact(estPct)}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary opacity-25"
          style={{
            width: `${Math.min(100, estPct ?? 0)}%`,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{
            width: `${Math.min(100, ach ?? 0)}%`,
          }}
        />
        {(ach ?? 0) < 100 && (
          <div className="absolute inset-y-0 right-0 w-0.5 bg-primary/30" />
        )}
      </div>
      <div className="mt-1.5 h-4">
        {over && (
          <p className="text-[11px] leading-4 font-medium text-accent">
            Melebihi target
          </p>
        )}
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
    <Suspense fallback={<DashboardSkeleton />}>
      <DashContent searchParams={searchParams} />
    </Suspense>
  );
}

function DashboardSkeleton() {
  const pulse = "animate-pulse rounded-2xl border border-line bg-surface";
  return (
    <main aria-busy="true" aria-label="Memuat dashboard" className="mx-auto max-w-[1600px] bg-transparent p-4 md:p-8">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-2 h-8 w-64 max-w-full rounded bg-slate-200" />
      <div className={`mt-4 h-[76px] ${pulse}`} />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {["Total", "Apple", "Android", "Accessories", "VAS"].map((l) => (
          <div key={l} className={`${pulse} h-[232px]`} />
        ))}
      </div>
      <div className={`mt-4 h-80 ${pulse}`} />
      <div className={`mt-4 h-96 ${pulse}`} />
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
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
          <p className="font-semibold text-warning">Supabase belum dikonfigurasi</p>
          <p className="mt-2 text-muted">
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
  // Query independen (auth, mapping, filter list, freshness) jalan satu batch.
  const [userRes, storeMap, storeListRes, latestRes] = await Promise.all([
    supabase.auth.getUser(),
    getStoreMap(supabase),
    supabase
      .from("mv_leaderboard_store")
      .select("store_code,store_name")
      .order("store_code"),
    supabase
      .from("mv_dashboard_daily")
      .select("date")
      .order("date", { ascending: false })
      .limit(1),
  ]);
  const {
    data: { user },
  } = userRes;
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
  const lockedAM =
    prof?.role === "Area Manager" ? (prof?.sales_name ?? null) : null;
  // Scope AM (ketat): peta store → AM dari master_stores.
  const storeListRaw = storeListRes.data;
  const amList = distinctAMs(storeMap);
  const am = effectiveAM(lockedAM, params.am || "");
  const amStores = am
    ? storeMap.filter((r) => r.area_manager === am).map((r) => r.store_code)
    : [];
  // Bila filter area aktif tapi mapping tak terbaca (mis. akses master_stores
  // belum dibuka), jangan tampilkan angka global yang menyesatkan.
  const amScopeBroken = am !== "" && amStores.length === 0;
  const store = storeInScope(lockedStore ?? (params.store || ""), am, amStores);

  // Daftar store untuk filter (ketat: AM hanya lihat store miliknya)
  const storeList = (
    (storeListRaw ?? []) as { store_code: string; store_name: string | null }[]
  ).filter((s) => !am || amStores.includes(s.store_code));

  // Freshness data — independen dari filter tanggal
  const latest = latestRes.data;
  const latestDate =
    (latest?.[0] as { date: string } | undefined)?.date ?? "-";

  // Leaderboard
  let lbQuery = supabase
    .from("mv_leaderboard_store")
    .select("*")
    .order("ach_total_pct", { ascending: false, nullsFirst: false });
  if (store) lbQuery = lbQuery.eq("store_code", store);
  else if (am && amStores.length) lbQuery = lbQuery.in("store_code", amStores);
  else if (amScopeBroken) lbQuery = lbQuery.eq("store_code", "__no_match__");
  const lbPromise = lbQuery.then(
    (r) => (r.data ?? []) as LeaderboardRow[],
  );

  // Tren: per store bila filter store, global harian bila tidak —
  // periode berjalan penuh (tanpa filter tanggal)
  type TrendPoint = {
    date: string;
    revenue_total: number;
    revenue_apple: number;
    revenue_android: number;
    revenue_accessories: number;
    revenue_vas: number;
    qty_mac: number;
    qty_iphone: number;
    qty_ipad: number;
    qty_apple_watch: number;
    qty_samsung: number;
    qty_oppo: number;
    qty_xiaomi: number;
    qty_huawei: number;
    qty_infinix: number;
    qty_motorola: number;
  };
  const QTY_SELECT =
    "date,revenue_total,revenue_apple,revenue_android,revenue_accessories,revenue_vas,qty_mac,qty_iphone,qty_ipad,qty_apple_watch,qty_samsung,qty_oppo,qty_xiaomi,qty_huawei,qty_infinix,qty_motorola";
  const toTrendPoint = (d: DailyRow) => ({
    date: d.date,
    revenue_total: d.revenue_total,
    revenue_apple: d.revenue_apple,
    revenue_android: d.revenue_android,
    revenue_accessories: d.revenue_accessories,
    revenue_vas: d.revenue_vas,
    qty_mac: d.qty_mac,
    qty_iphone: d.qty_iphone,
    qty_ipad: d.qty_ipad,
    qty_apple_watch: d.qty_apple_watch,
    qty_samsung: d.qty_samsung,
    qty_oppo: d.qty_oppo,
    qty_xiaomi: d.qty_xiaomi,
    qty_huawei: d.qty_huawei,
    qty_infinix: d.qty_infinix,
    qty_motorola: d.qty_motorola,
  });
  // Function declaration (hoisted) agar bisa dipanggil paralel di bawah.
  // Logic cabang dipertahankan persis seperti semula.
  async function fetchTrend(): Promise<TrendPoint[]> {
    if (store) {
      const { data } = await supabase
        .from("mv_dashboard_store_daily")
        .select(QTY_SELECT)
        .eq("store_code", store)
        .order("date");
      return ((data ?? []) as StoreDailyRow[]).map(toTrendPoint);
    } else if (am && amStores.length) {
      const { data } = await supabase
        .from("mv_dashboard_store_daily")
        .select(QTY_SELECT)
        .in("store_code", amStores)
        .order("date");
      return ((data ?? []) as StoreDailyRow[]).map(toTrendPoint);
    } else if (am) {
      return [];
    } else {
      const { data } = await supabase
        .from("mv_dashboard_daily")
        .select(QTY_SELECT)
        .order("date");
      return ((data ?? []) as DailyRow[]).map(toTrendPoint);
    }
  }
  // Leaderboard + tren + target independen satu sama lain → satu batch.
  // fetchTargets dideklarasikan di bawah (hoisted, aman dipanggil di sini).
  const [lb, trend, kpiTargets] = await Promise.all([
    lbPromise,
    fetchTrend(),
    fetchTargets(),
  ]);
  const byQtyDesc = (items: Omit<QtyBarItem, "fill">[]) =>
    [...items].sort((a, b) => b.qty - a.qty);
  const APPLE_FILLS = ["#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD"];
  const ANDROID_FILLS = [
    "#6D28D9",
    "#7C3AED",
    "#8B5CF6",
    "#A78BFA",
    "#C4B5FD",
    "#DDD6FE",
  ];
  const withRankFills = (
    items: Omit<QtyBarItem, "fill">[],
    fills: string[],
  ): QtyBarItem[] =>
    byQtyDesc(items).map((d, i) => ({ ...d, fill: fills[i] ?? fills[fills.length - 1] }));
  const appleQty = withRankFills(
    [
      {
        label: "iPhone",
        qty: trend.reduce((a, p) => a + p.qty_iphone, 0),
      },
      {
        label: "Mac",
        qty: trend.reduce((a, p) => a + p.qty_mac, 0),
      },
      {
        label: "iPad",
        qty: trend.reduce((a, p) => a + p.qty_ipad, 0),
      },
      {
        label: "Watch",
        qty: trend.reduce((a, p) => a + p.qty_apple_watch, 0),
      },
    ],
    APPLE_FILLS,
  );
  const androidQty = withRankFills(
    [
      {
        label: "Samsung",
        qty: trend.reduce((a, p) => a + p.qty_samsung, 0),
      },
      {
        label: "Oppo",
        qty: trend.reduce((a, p) => a + p.qty_oppo, 0),
      },
      {
        label: "Xiaomi",
        qty: trend.reduce((a, p) => a + p.qty_xiaomi, 0),
      },
      {
        label: "Huawei",
        qty: trend.reduce((a, p) => a + p.qty_huawei, 0),
      },
      {
        label: "Infinix",
        qty: trend.reduce((a, p) => a + p.qty_infinix, 0),
      },
      {
        label: "Motorola",
        qty: trend.reduce((a, p) => a + p.qty_motorola, 0),
      },
    ],
    ANDROID_FILLS,
  );

  const appleTotalQty = appleQty.reduce((a, d) => a + d.qty, 0);
  const androidTotalQty = androidQty.reduce((a, d) => a + d.qty, 0);
  const brandShare: BrandShareItem[] = [
    { name: "Apple", qty: appleTotalQty, fill: "#7C3AED" },
    { name: "Android", qty: androidTotalQty, fill: "#C4B5FD" },
  ];
  const brandShareTotal = appleTotalQty + androidTotalQty;

  // KPI: revenue dijumlahkan dari tren periode berjalan penuh
  // (ikut filter store, abaikan filter tanggal). Target = periode
  // penuh (snapshot, tanpa dimensi harian).
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
  async function fetchTargets(): Promise<KpiTargets> {
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
    return {
      total_target: s?.total_target ?? null,
      apple_target: s?.apple_target ?? null,
      android_target: s?.android_target ?? null,
      accessories_target: s?.accessories_target ?? null,
      vas_target: s?.vas_target ?? null,
    };
  } else if (am && amStores.length) {
    const { data: targets } = await supabase
      .from("mv_dashboard_store")
      .select(
        "total_target,apple_target,android_target,accessories_target,vas_target",
      )
      .in("store_code", amStores);
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
    return {
      total_target: sum((x) => x.total_target),
      apple_target: sum((x) => x.apple_target),
      android_target: sum((x) => x.android_target),
      accessories_target: sum((x) => x.accessories_target),
      vas_target: sum((x) => x.vas_target),
    };
  } else if (amScopeBroken) {
    // Mapping area tak terbaca: jangan tampilkan target global yang menyesatkan.
    return {
      total_target: null,
      apple_target: null,
      android_target: null,
      accessories_target: null,
      vas_target: null,
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
    return {
      total_target: sum((x) => x.total_target),
      apple_target: sum((x) => x.apple_target),
      android_target: sum((x) => x.android_target),
      accessories_target: sum((x) => x.accessories_target),
      vas_target: sum((x) => x.vas_target),
    };
  }
  }
  const kpi = { ...kpiRevenue, ...kpiTargets };
  const { elapsed, daysInMonth } = getWibPeriod();
  const pacePct =
    daysInMonth > 0 ? Math.round((10000 * elapsed) / daysInMonth) / 100 : 0;

  const card = "rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5";

  const scopeLabel = store ? `Store ${store}` : am ? `Area ${am}` : "Semua store";

  return (
    <main className="mx-auto max-w-[1600px] p-4 md:p-8">
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7 2xl:col-span-5">
          <header>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary">
              DASHBOARD
            </p>
            <GreetHead name={prof?.sales_name ?? user.email ?? "?"} />
            <p className="mt-1 text-xs text-muted">
              {prof
                ? `${prof.role}${lockedAM ? ` · ${lockedAM}` : prof.store_code ? ` · ${prof.store_code} — ${prof.store_name ?? ""}` : " · semua store"}`
                : user.email}{" "}
              · data diperbarui {latestDate}
            </p>
          </header>

          <div className="mt-4">
            <FilterBar
              stores={(storeList ?? []) as { store_code: string; store_name: string | null }[]}
              lockedStore={lockedStore}
              currentStore={store}
              dateMode="none"
              areaManagers={lockedAM ? [] : amList}
              lockedAM={lockedAM}
              currentAM={am}
            />
          </div>
        </div>
        {/* Graphic header + pace card — dekoratif di bawah, fungsional di kanan atas, hanya desktop lebar */}
        <div className="relative hidden min-w-0 select-none xl:col-span-5 xl:block 2xl:col-span-7">
          <div className="pointer-events-none absolute right-0 top-0 z-10">
            <PaceCard
              elapsed={elapsed}
              daysInMonth={daysInMonth}
              pacePct={pacePct}
              latestDate={latestDate}
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none flex items-end justify-end gap-2 pt-16"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/header-phone.webp"
              alt=""
              width={1200}
              height={400}
              className="w-[76%] object-contain"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/header-tagline.webp"
              alt=""
              width={520}
              height={316}
              className="w-[22%] max-w-[220px] object-contain"
            />
          </div>
        </div>
      </div>

      {amScopeBroken && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-warning">Data area tidak terbaca</p>
          <p className="mt-1 text-muted">
            Mapping store area ({am}) tidak dapat dimuat. Minta admin menjalankan{" "}
            <code>sql/dashboard-rls.sql</code> terbaru di SQL Editor, lalu muat ulang.
          </p>
        </div>
      )}

      <section aria-label="Ringkasan revenue" className="mt-4">
        <h2 className="sr-only">Ringkasan revenue</h2>
        <p className="mb-3 text-xs text-muted">
          Revenue periode berjalan · vs target
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 items-stretch">
          {kpiCard("Total Revenue", kpi.revenue_total, kpi.total_target, elapsed, daysInMonth, Wallet)}
          {kpiCard("Apple Revenue", kpi.revenue_apple, kpi.apple_target, elapsed, daysInMonth, Apple)}
          {kpiCard("Android Revenue", kpi.revenue_android, kpi.android_target, elapsed, daysInMonth, Smartphone)}
          {kpiCard("Accessories Revenue", kpi.revenue_accessories, kpi.accessories_target, elapsed, daysInMonth, Headphones)}
          {kpiCard("VAS Revenue", kpi.revenue_vas, kpi.vas_target, elapsed, daysInMonth, Sparkles)}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className={`${card} lg:col-span-3`} aria-label="Brand share by qty">
          <h2 className="text-sm font-semibold text-ink">Brand Share</h2>
          <p className="mb-3 text-xs text-muted">
            {scopeLabel} · total periode · unit
          </p>
          {brandShareTotal ? (
            <div
              role="img"
              aria-label={`Grafik brand share by qty, Apple vs Android`}
            >
              <BrandShareDonut
                data={brandShare}
                ariaLabel="Grafik brand share by qty: Apple vs Android"
              />
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">
                Tidak ada data pada periode ini.
              </p>
            </div>
          )}
        </section>

        <section className={`${card} lg:col-span-4`} aria-label={`Apple qty total ${appleTotalQty} unit`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">Apple Qty</h2>
              <p className="text-xs text-muted">{scopeLabel}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-muted">
                Total
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-ink tabular-nums">
                {num(appleTotalQty)}{" "}
                <span className="text-xs font-medium text-muted">unit</span>
              </p>
            </div>
          </div>
          {trend.length ? (
            <QtyBarChart
              data={appleQty}
              ariaLabel="Grafik total qty Apple: Mac, iPad, iPhone, Watch, urut terbesar"
            />
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">
                Tidak ada data pada periode ini.
              </p>
            </div>
          )}
        </section>

        <section className={`${card} lg:col-span-5`} aria-label={`Android qty total ${androidTotalQty} unit`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">Android Qty</h2>
              <p className="text-xs text-muted">{scopeLabel}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-muted">
                Total
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-ink tabular-nums">
                {num(androidTotalQty)}{" "}
                <span className="text-xs font-medium text-muted">unit</span>
              </p>
            </div>
          </div>
          {trend.length ? (
            <QtyBarChart
              data={androidQty}
              ariaLabel="Grafik total qty Android: Samsung, Oppo, Xiaomi, Huawei, Infinix, Motorola, urut terbesar"
            />
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">
                Tidak ada data pada periode ini.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className={`${card} mt-4`}>
        <h2 className="text-sm font-semibold text-ink">Leaderboard Store</h2>
        <p className="mb-2 text-xs text-muted">
          Peringkat berdasarkan achievement Total Sales vs Total Target ·
          snapshot periode berjalan · pace {pct(pacePct)}
        </p>
        <LeaderboardTable rows={lb} am={am} pacePct={pacePct} />
      </section>

      <footer className="mt-6 text-center text-xs text-muted">
        OneMapTech · refresh harian
      </footer>
    </main>
  );
}
