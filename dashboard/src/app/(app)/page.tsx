import { Suspense } from "react";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { num, pct, pctExact, rupiah } from "@/lib/format";
import type {
  DailyRow,
  LeaderboardRow,
  StoreDailyRow,
  StoreRow,
} from "@/lib/types";
import FilterBar from "@/components/filter-bar";
import {
  detectScopedSource,
  getLatestDataDate,
  getStoreMap,
  resolveScope,
  scopedName,
  storeOptionsFrom,
  type StoreOption,
} from "@/lib/scope";
import GreetHead from "@/components/greet-head";
import PaceCard from "@/components/pace-card";
import type { QtyBarItem } from "@/components/qty-bar-chart";
import type { BrandShareItem } from "@/components/brand-share-donut";
import KpiIllustration, { type KpiVariant } from "@/components/kpi-illustration";

// Recharts + heavy tables are code-split (dynamic in a Server Component:
// without ssr:false so they can still SSR + stream per section).
const QtyBarChart = dynamic(() => import("@/components/qty-bar-chart"), {
  loading: () => <div className="h-40 sm:h-44 animate-pulse rounded-xl bg-canvas" />,
});
const BrandShareDonut = dynamic(
  () => import("@/components/brand-share-donut"),
  {
    loading: () => (
      <div className="h-40 sm:h-44 animate-pulse rounded-xl bg-canvas" />
    ),
  },
);
const LeaderboardTable = dynamic(
  () => import("@/components/leaderboard-table"),
  {
    loading: () => (
      <div className="h-48 animate-pulse rounded-xl bg-canvas" />
    ),
  },
);

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
  variant: KpiVariant | null,
  wide = false,
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
      ? "text-[22px]"
      : actualStr.length <= 16
        ? "text-[17px]"
        : "text-[15px]";
  // Ukuran detail memakai font-size eksplisit (bukan text-xs) supaya
  // line-height `leading-[15px]` dari barisnya tetap berlaku, tidak ditimpa.
  const detailSize = (s: string) =>
    s.length > 14 ? "text-[11px]" : "text-[12px]";
  const row =
    "flex min-w-0 items-center justify-between gap-2 overflow-hidden text-xs leading-[15px] tabular-nums";
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate pr-20 text-xs font-medium leading-4 tracking-wide text-muted">
          {label}
        </p>
      </div>
      {variant && <KpiIllustration variant={variant} />}
      <p className="mt-2.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-muted">
        Actual Sales
      </p>
      <div className="mt-2 flex h-7 min-w-0 items-center overflow-hidden">
        <p className={`whitespace-nowrap font-bold leading-[1.15] tracking-tight text-ink tabular-nums ${actualSize}`} title={actualStr}>
          {actualStr}
        </p>
      </div>
      <dl className="mt-4 space-y-1">
        <div className={row}>
          <dt className="shrink-0 text-muted">Target</dt>
          <dd className={`min-w-0 max-w-full overflow-hidden text-right font-medium whitespace-nowrap text-ink tabular-nums ${detailSize(targetStr)}`} title={targetStr}>{targetStr}</dd>
        </div>
        <div className={row}>
          <dt className="shrink-0 text-muted">Variance</dt>
          <dd
            title={varianceStr}
            className={`min-w-0 max-w-full overflow-hidden whitespace-nowrap text-right font-semibold tabular-nums rounded-full px-2 py-px ${detailSize(varianceStr)} ${
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
      <div className="my-2.5 border-t border-line" />
      <div className="space-y-0.5">
        <div className={row}>
          <span className="text-muted">Achievement</span>
          <span
            className={`text-[14px] leading-[18px] font-bold tabular-nums ${reached ? "text-accent" : "text-ink"}`}
          >
            {pct(ach)}
          </span>
        </div>
        <div className={row}>
          <span className="text-muted">Estimated</span>
          <span className="text-[12px] font-medium text-soft tabular-nums">
            {pct(estPct)}
          </span>
        </div>
      </div>
      <div
        className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-track"
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
            Over target
          </p>
        )}
      </div>
    </>
  );

  // Varian "wide" (Total Revenue): 3 zona info + ilustrasi 3D "Sales Growth"
  // yang overlap keluar tepi kanan kartu, ditutup legend + progress bar penuh.
  if (wide) {
    return (
      <div
        key={label}
        className="card-surface relative flex flex-col overflow-visible p-5 sm:col-span-2 lg:col-span-4 lg:p-6"
      >
        {/* Ilustrasi 3D "Sales Growth" — glass tile, overlap keluar tepi kartu */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-6 -right-4 z-10 hidden h-52 w-64 xl:block"
        >
          {/* Blobs kaca di belakang */}
          <div className="absolute top-16 right-14 h-32 w-32 rotate-6 rounded-[42px] bg-gradient-to-br from-[#C4B5FD]/45 to-[#818CF8]/25 ring-1 ring-white/60 backdrop-blur-md" />
          <div className="absolute top-2 right-2 h-14 w-14 -rotate-12 rounded-[18px] bg-gradient-to-br from-white/70 to-[#A5B4FC]/30 ring-1 ring-white/70 backdrop-blur-md" />
          {/* Tile utama */}
          <div className="animate-float absolute top-8 right-20 flex h-36 w-36 -rotate-12 items-center justify-center rounded-[34px] bg-gradient-to-br from-white/85 via-white/45 to-[#A5B4FC]/40 shadow-[0_28px_54px_-22px_rgba(79,70,229,0.55)] ring-1 ring-white/70 backdrop-blur-xl">
            {/* Icon Sales Growth: bars naik + panah biru */}
            <svg viewBox="0 0 96 96" className="h-20 w-20" fill="none" aria-hidden>
              <defs>
                <linearGradient id="sgBar" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#A5B4FC" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="sgArrow" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
              <rect x="12" y="58" width="14" height="24" rx="5" fill="url(#sgBar)" />
              <rect x="34" y="48" width="14" height="34" rx="5" fill="url(#sgBar)" />
              <rect x="56" y="36" width="14" height="46" rx="5" fill="url(#sgBar)" />
              <path
                d="M14 66 L57 23"
                stroke="url(#sgArrow)"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M46 20 L60 20 L60 34"
                stroke="url(#sgArrow)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-muted">
          {label}
        </p>

        <div className="mt-4 grid items-center gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-11 xl:pr-[150px]">
          {/* Zona A — actual sales */}
          <div className="min-w-0 sm:col-span-1 lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-muted">
              Actual Sales
            </p>
            <p
              className={`mt-1.5 whitespace-nowrap font-bold leading-[1.1] tracking-tight text-ink tabular-nums ${
                actualStr.length <= 12
                  ? "text-[32px] sm:text-[40px]"
                  : actualStr.length <= 16
                    ? "text-[26px] sm:text-[32px]"
                    : "text-[22px] sm:text-[26px]"
              }`}
              title={actualStr}
            >
              {actualStr}
            </p>
            <p className="mt-1.5 text-xs text-muted">
              Month to date · day {elapsed} of {daysInMonth}
            </p>
          </div>

          {/* Zona B — target, variance, estimasi */}
          <dl className="space-y-2.5 sm:col-span-1 lg:col-span-4 lg:border-l lg:border-line lg:pl-5">
            <div className="flex min-w-0 items-center justify-between gap-3 text-sm leading-5 tabular-nums">
              <dt className="shrink-0 text-muted">Target</dt>
              <dd
                className="min-w-0 truncate text-right font-semibold text-ink"
                title={targetStr}
              >
                {targetStr}
              </dd>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 text-sm leading-5 tabular-nums">
              <dt className="shrink-0 text-muted">Variance</dt>
              <dd
                title={varianceStr}
                className={`min-w-0 truncate rounded-full px-2.5 py-[3px] text-right font-semibold ${
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
            <div className="flex min-w-0 items-center justify-between gap-3 text-sm leading-5 tabular-nums">
              <dt className="shrink-0 text-muted">Estimated</dt>
              <dd
                className="min-w-0 truncate text-right font-semibold text-ink"
                title={estimatedStr}
              >
                {estimatedStr}
              </dd>
            </div>
          </dl>

          {/* Zona C — achievement */}
          <div className="sm:col-span-2 sm:border-t sm:border-line sm:pt-4 lg:col-span-3 lg:border-t-0 lg:border-l lg:border-line lg:pt-0 lg:pl-5">
            <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.16em] text-muted">
              Achievement
            </p>
            <p
              className={`mt-1.5 text-[28px] font-bold leading-[1.1] tracking-tight tabular-nums sm:text-[34px] ${
                reached ? "text-accent" : "text-ink"
              }`}
            >
              {pct(ach)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Estimated{" "}
              <span className="font-medium text-soft tabular-nums">
                {pct(estPct)}
              </span>
            </p>
          </div>
        </div>

        {/* Footer — legend + progress full width */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-xs leading-4">
            <div className="flex items-center gap-3 text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-primary/25"
                  aria-hidden
                />
                Estimated
              </span>
            </div>
            {over && <span className="font-medium text-accent">Over target</span>}
          </div>
          <div
            className="relative mt-2.5 h-2.5 overflow-hidden rounded-full bg-track"
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
        </div>
      </div>
    );
  }

  return (
    <div
      key={label}
      className="card-surface group relative flex flex-col overflow-hidden px-4 pb-4 pt-5"
    >
      {body}
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
  const pulse = "card-surface animate-pulse";
  return (
    <main aria-busy="true" aria-label="Loading dashboard" className="mx-auto max-w-[1600px] bg-transparent p-4 md:p-8">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-2 h-8 w-64 max-w-full rounded bg-slate-200" />
      <div className={`mt-4 h-[76px] ${pulse}`} />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${pulse} h-[232px] sm:col-span-2 lg:col-span-4`} />
        {["Apple", "Android", "Accessories", "VAS"].map((l) => (
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
          <p className="font-semibold text-warning">Supabase not configured</p>
          <p className="mt-2 text-muted">
            Copy <code>dashboard/.env.example</code> to{" "}
            <code>dashboard/.env.local</code>, fill in{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart the dev
            server.
          </p>
        </div>
      </main>
    );
  }
  const params = await searchParams;
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const supabase = await createClient();
  // Batch 1: mapping + filter list + freshness (independent of the session).
  // Auth/profile are not re-queried here (already via getSessionProfile,
  // which is cached per request and also used by the layout).
  const [storeMap, storeListRes, source] = await Promise.all([
    getStoreMap(supabase),
    supabase
      .from("v_leaderboard_store")
      .select("store_code,store_name")
      .order("store_code"),
    detectScopedSource(supabase),
  ]);
  const prof = session.profile;
  const userEmail = session.email;

  // Single source of truth for store/area scoping (role-based, fail-closed).
  const allStores = storeOptionsFrom(
    storeListRes.data as StoreOption[] | null,
    storeMap,
  );
  const scope = resolveScope(session, params, storeMap, allStores);
  const { store, am, amStores } = scope;
  const scopeError = scope.error;

  const leaderboardTable = scopedName(source, "leaderboard_store");
  const storeTable = scopedName(source, "dashboard_store");
  const storeDailyTable = scopedName(source, "dashboard_store_daily");
  const dailyTable = scopedName(source, "dashboard_daily");

  // Data freshness — independent of the date filter
  const latestDate = (await getLatestDataDate(supabase, source)) || "-";

  // Leaderboard: only the columns the table renders (less payload than select *).
  const LB_SELECT =
    "store_code,store_name,total_target,revenue_total,ach_total_pct,apple_target,revenue_apple,ach_apple_pct,android_target,revenue_android,ach_android_pct,rank_achievement";
  let lbQuery = supabase
    .from(leaderboardTable)
    .select(LB_SELECT)
    .order("ach_total_pct", { ascending: false, nullsFirst: false });
  if (scope.mode === "store") lbQuery = lbQuery.eq("store_code", store);
  else if (scope.mode === "area")
    lbQuery = amStores.length
      ? lbQuery.in("store_code", amStores)
      : lbQuery.eq("store_code", "__no_match__");
  else if (scope.mode === "blocked")
    lbQuery = lbQuery.eq("store_code", "__no_match__");
  const lbPromise = lbQuery.then(
    (r) => (r.data ?? []) as LeaderboardRow[],
  );

  // Month-to-date trend: cap to the last data month so the rows
  // transferred = days × stores within 1 month (not the whole history).
  // KPI/target are monthly snapshots, so the semantics stay the same.
  const monthStart =
    latestDate && latestDate !== "-"
      ? `${latestDate.slice(0, 7)}-01`
      : null;

  // Trend: per store when filtered by store, global daily otherwise —
  // full current period (no date filter)
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
  // Function declaration (hoisted) so it can be called in parallel below.
  // Every branch follows the role-derived scope (never falls back to global).
  async function fetchTrend(): Promise<TrendPoint[]> {
    if (scope.mode === "store") {
      let q = supabase
        .from(storeDailyTable)
        .select(QTY_SELECT)
        .eq("store_code", store)
        .order("date");
      if (monthStart) q = q.gte("date", monthStart);
      const { data } = await q;
      return ((data ?? []) as StoreDailyRow[]).map(toTrendPoint);
    } else if (scope.mode === "area") {
      if (!amStores.length) return [];
      let q = supabase
        .from(storeDailyTable)
        .select(QTY_SELECT)
        .in("store_code", amStores)
        .order("date");
      if (monthStart) q = q.gte("date", monthStart);
      const { data } = await q;
      return ((data ?? []) as StoreDailyRow[]).map(toTrendPoint);
    } else if (scope.mode === "all") {
      let q = supabase
        .from(dailyTable)
        .select(QTY_SELECT)
        .order("date");
      if (monthStart) q = q.gte("date", monthStart);
      const { data } = await q;
      return ((data ?? []) as DailyRow[]).map(toTrendPoint);
    }
    return [];
  }
  // Leaderboard + trend + targets are independent of each other → one batch.
  // fetchTargets is declared below (hoisted, safe to call here).
  const [lb, trend, kpiTargets] = await Promise.all([
    lbPromise,
    fetchTrend(),
    fetchTargets(),
  ]);
  // Single-pass aggregation: 15x trend.reduce → 1x loop (KPI revenue + qty).
  const totals = {
    revenue_total: 0,
    revenue_apple: 0,
    revenue_android: 0,
    revenue_accessories: 0,
    revenue_vas: 0,
    qty_mac: 0,
    qty_iphone: 0,
    qty_ipad: 0,
    qty_apple_watch: 0,
    qty_samsung: 0,
    qty_oppo: 0,
    qty_xiaomi: 0,
    qty_huawei: 0,
    qty_infinix: 0,
    qty_motorola: 0,
  };
  for (const p of trend) {
    totals.revenue_total += p.revenue_total;
    totals.revenue_apple += p.revenue_apple;
    totals.revenue_android += p.revenue_android;
    totals.revenue_accessories += p.revenue_accessories;
    totals.revenue_vas += p.revenue_vas;
    totals.qty_mac += p.qty_mac;
    totals.qty_iphone += p.qty_iphone;
    totals.qty_ipad += p.qty_ipad;
    totals.qty_apple_watch += p.qty_apple_watch;
    totals.qty_samsung += p.qty_samsung;
    totals.qty_oppo += p.qty_oppo;
    totals.qty_xiaomi += p.qty_xiaomi;
    totals.qty_huawei += p.qty_huawei;
    totals.qty_infinix += p.qty_infinix;
    totals.qty_motorola += p.qty_motorola;
  }
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
      { label: "iPhone", qty: totals.qty_iphone },
      { label: "Mac", qty: totals.qty_mac },
      { label: "iPad", qty: totals.qty_ipad },
      { label: "Watch", qty: totals.qty_apple_watch },
    ],
    APPLE_FILLS,
  );
  const androidQty = withRankFills(
    [
      { label: "Samsung", qty: totals.qty_samsung },
      { label: "Oppo", qty: totals.qty_oppo },
      { label: "Xiaomi", qty: totals.qty_xiaomi },
      { label: "Huawei", qty: totals.qty_huawei },
      { label: "Infinix", qty: totals.qty_infinix },
      { label: "Motorola", qty: totals.qty_motorola },
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

  // KPI: month-to-date revenue from the trend (respects the store filter).
  // Target = monthly snapshot (no daily dimension).
  const kpiRevenue = {
    revenue_total: totals.revenue_total,
    revenue_apple: totals.revenue_apple,
    revenue_android: totals.revenue_android,
    revenue_accessories: totals.revenue_accessories,
    revenue_vas: totals.revenue_vas,
  };
  type KpiTargets = {
    total_target: number | null;
    apple_target: number | null;
    android_target: number | null;
    accessories_target: number | null;
    vas_target: number | null;
  };
  async function fetchTargets(): Promise<KpiTargets> {
  if (scope.mode === "store") {
    const { data } = await supabase
      .from(storeTable)
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
  } else if (scope.mode === "area" && amStores.length) {
    const { data: targets } = await supabase
      .from(storeTable)
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
  } else if (scope.mode === "all") {
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
  // Area mapping unreadable / access blocked: never show global targets.
  return {
    total_target: null,
    apple_target: null,
    android_target: null,
    accessories_target: null,
    vas_target: null,
  };
  }
  const kpi = { ...kpiRevenue, ...kpiTargets };
  const { elapsed, daysInMonth } = getWibPeriod();
  const pacePct =
    daysInMonth > 0 ? Math.round((10000 * elapsed) / daysInMonth) / 100 : 0;

  const card = "card-surface p-4 md:p-5";

  const scopeLabel =
    scope.mode === "store"
      ? `Store ${store}`
      : scope.mode === "area"
        ? `Area ${am}`
        : scope.mode === "all"
          ? "All stores"
          : "No access";

  return (
    <main className="mx-auto max-w-[1600px] p-4 md:p-8">
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <header>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary">
              DASHBOARD
            </p>
            <GreetHead
              name={prof?.sales_name?.trim() || userEmail?.trim() || "?"}
            />
            <p className="mt-1 text-xs text-muted">
              {prof
                ? `${prof.role}${scope.mode === "area" ? ` · ${am}` : scope.mode === "all" ? " · all stores" : prof.store_code ? ` · ${prof.store_code} — ${prof.store_name ?? ""}` : " · no store"}`
                : userEmail}{" "}
              · data updated {latestDate}
            </p>
          </header>

          {scope.mode !== "blocked" && (
            <div className="mt-4">
              <FilterBar
                stores={scope.storeOptions}
                lockedStore={scope.canPickStore ? null : scope.store || null}
                currentStore={store}
                dateMode="none"
                areaManagers={scope.areaOptions}
                lockedAM={scope.canPickArea ? null : scope.am || null}
                currentAM={am}
              />
            </div>
          )}
        </div>
        {/* Pace card: rata atas (sejajar baris "DASHBOARD") + rata kanan kolom.
            Tetap `hidden` di bawah xl, sama seperti blok gambar yang dulu
            menempati kolom ini. Pembungkus `min-w-0` supaya kalau kolomnya
            menyempit, teks kartunya terpotong rapi, bukan meluber. */}
        <div className="hidden min-w-0 items-start justify-end xl:col-span-5 xl:flex">
          <div className="min-w-0">
            <PaceCard
              elapsed={elapsed}
              daysInMonth={daysInMonth}
              pacePct={pacePct}
              latestDate={latestDate}
            />
          </div>
        </div>
      </div>

      {scopeError && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-warning">
            {scope.mode === "blocked" ? "Access restricted" : "Unable to read scope data"}
          </p>
          <p className="mt-1 text-muted">{scopeError}</p>
        </div>
      )}

      <section aria-label="Revenue summary" className="mt-4">
        <h2 className="sr-only">Revenue summary</h2>
        <p className="mb-3 text-xs text-muted">
          Current-period revenue · vs target
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCard("Total Revenue", kpi.revenue_total, kpi.total_target, elapsed, daysInMonth, null, true)}
          {kpiCard("Apple Revenue", kpi.revenue_apple, kpi.apple_target, elapsed, daysInMonth, "apple")}
          {kpiCard("Android Revenue", kpi.revenue_android, kpi.android_target, elapsed, daysInMonth, "android")}
          {kpiCard("Accessories Revenue", kpi.revenue_accessories, kpi.accessories_target, elapsed, daysInMonth, "accessories")}
          {kpiCard("VAS Revenue", kpi.revenue_vas, kpi.vas_target, elapsed, daysInMonth, "vas")}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Suspense fallback={<div className="card-surface h-64 animate-pulse lg:col-span-3" />}>
        <section className={`${card} lg:col-span-3`} aria-label="Brand share by qty">
          <h2 className="text-sm font-semibold text-ink">Brand Share</h2>
          <p className="mb-3 text-xs text-muted">
            {scopeLabel} · total this period · units
          </p>
          {brandShareTotal ? (
            <div
              role="img"
              aria-label={`Brand share by qty chart, Apple vs Android`}
            >
              <BrandShareDonut
                data={brandShare}
                ariaLabel="Brand share by qty chart: Apple vs Android"
              />
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">
                No data for this period.
              </p>
            </div>
          )}
        </section>
        </Suspense>

        <Suspense fallback={<div className="card-surface h-64 animate-pulse lg:col-span-4" />}>
        <section className={`${card} lg:col-span-4`} aria-label={`Apple qty total ${appleTotalQty} units`}>
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
                <span className="text-xs font-medium text-muted">units</span>
              </p>
            </div>
          </div>
          {trend.length ? (
            <QtyBarChart
              data={appleQty}
              ariaLabel="Total Apple qty chart: Mac, iPad, iPhone, Watch, sorted descending"
            />
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">
                No data for this period.
              </p>
            </div>
          )}
        </section>
        </Suspense>

        <Suspense fallback={<div className="card-surface h-64 animate-pulse lg:col-span-5" />}>
        <section className={`${card} lg:col-span-5`} aria-label={`Android qty total ${androidTotalQty} units`}>
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
                <span className="text-xs font-medium text-muted">units</span>
              </p>
            </div>
          </div>
          {trend.length ? (
            <QtyBarChart
              data={androidQty}
              ariaLabel="Total Android qty chart: Samsung, Oppo, Xiaomi, Huawei, Infinix, Motorola, sorted descending"
            />
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">
                No data for this period.
              </p>
            </div>
          )}
        </section>
        </Suspense>
      </div>

      <Suspense fallback={<div className="card-surface mt-4 h-64 animate-pulse" />}>
      <section className={`${card} mt-4`}>
        <h2 className="text-sm font-semibold text-ink">Leaderboard Store</h2>
        <p className="mb-2 text-xs text-muted">
          Store ranking by Total Sales vs Total Target achievement ·
          current-period snapshot · pace {pct(pacePct)}
        </p>
        <LeaderboardTable rows={lb} am={am} pacePct={pacePct} />
      </section>
      </Suspense>

      <footer className="mt-6 text-center text-xs text-muted">
        OneMapTech · daily refresh
      </footer>
    </main>
  );
}
