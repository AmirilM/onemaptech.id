import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import FilterBar from "@/components/filter-bar";
import TrendChart from "@/components/trend-chart";
import { formatMonthYear } from "@/lib/format";
import DailySummaryTables, {
  type DailySummaryRow,
} from "@/components/daily-summary-tables";
import DailySummaryCards from "@/components/daily-summary-cards";
import { distinctAMs, effectiveAM, getStoreMap, storeInScope } from "@/lib/scope";

type Params = { store?: string; am?: string };

const COLS =
  "date,revenue_total,revenue_apple,revenue_android,revenue_accessories,revenue_vas,qty_mac,qty_ipad,qty_iphone,qty_apple_watch,qty_airpods,qty_samsung,qty_oppo,qty_xiaomi,qty_huawei,qty_infinix,qty_motorola";

function zeroRow(date: string): DailySummaryRow {
  return {
    date,
    revenue_total: 0,
    revenue_apple: 0,
    revenue_android: 0,
    revenue_accessories: 0,
    revenue_vas: 0,
    qty_mac: 0,
    qty_ipad: 0,
    qty_iphone: 0,
    qty_apple_watch: 0,
    qty_airpods: 0,
    qty_samsung: 0,
    qty_oppo: 0,
    qty_xiaomi: 0,
    qty_huawei: 0,
    qty_infinix: 0,
    qty_motorola: 0,
  };
}

function toFullRow(r: Partial<DailySummaryRow> & { date: string }): DailySummaryRow {
  const z = zeroRow(r.date);
  return { ...z, ...r, date: r.date };
}

export default function DailyPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-muted">
          Loading daily summary...
        </main>
      }
    >
      <DailyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DailyContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  // Independent queries run in parallel (one batch), not serially.
  const [supabase, session] = await Promise.all([
    createClient(),
    getSessionProfile(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const lockedStore = session?.lockedStore ?? null;
  const lockedAM = session?.lockedAM ?? null;
  const [storeMap, latest, storeListRes] = await Promise.all([
    getStoreMap(supabase),
    supabase
      .from("mv_dashboard_daily")
      .select("date")
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("mv_leaderboard_store")
      .select("store_code,store_name")
      .order("store_code"),
  ]);
  const latestData = latest.data;
  const storeListRaw = storeListRes.data;
  const amList = distinctAMs(storeMap);
  const am = effectiveAM(lockedAM, params.am || "");
  const amStores = am
    ? storeMap.filter((r) => r.area_manager === am).map((r) => r.store_code)
    : [];
  const amScopeBroken = am !== "" && amStores.length === 0;
  const store = storeInScope(lockedStore ?? (params.store || ""), am, amStores);

  // Current month derived automatically from the latest data date (month-to-date).
  const latestDate =
    (latestData?.[0] as { date: string } | undefined)?.date ?? "";
  const month = latestDate.slice(0, 7);
  const daysInMonth = month
    ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
    : 0;
  const start = month ? `${month}-01` : "";
  const end = month
    ? `${month}-${String(daysInMonth).padStart(2, "0")}`
    : "";

  let raw: DailySummaryRow[] = [];
  if (start && !amScopeBroken) {
    if (store) {
      const { data } = await supabase
        .from("mv_dashboard_store_daily")
        .select(COLS)
        .eq("store_code", store)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      raw = ((data ?? []) as DailySummaryRow[]).map(toFullRow);
    } else if (am && amStores.length) {
      const { data } = await supabase
        .from("mv_dashboard_store_daily")
        .select(`store_code,${COLS}`)
        .in("store_code", amStores)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      // Aggregate per date server-side (MV is dimensioned store x date)
      const byDate = new Map<string, DailySummaryRow>();
      for (const r of (data ?? []) as (DailySummaryRow & {
        store_code: string;
      })[]) {
        const cur = byDate.get(r.date) ?? zeroRow(r.date);
        cur.revenue_total += r.revenue_total;
        cur.revenue_apple += r.revenue_apple;
        cur.revenue_android += r.revenue_android;
        cur.revenue_accessories += r.revenue_accessories;
        cur.revenue_vas += r.revenue_vas;
        cur.qty_mac += r.qty_mac;
        cur.qty_ipad += r.qty_ipad;
        cur.qty_iphone += r.qty_iphone;
        cur.qty_apple_watch += r.qty_apple_watch;
        cur.qty_airpods += r.qty_airpods;
        cur.qty_samsung += r.qty_samsung;
        cur.qty_oppo += r.qty_oppo;
        cur.qty_xiaomi += r.qty_xiaomi;
        cur.qty_huawei += r.qty_huawei;
        cur.qty_infinix += r.qty_infinix;
        cur.qty_motorola += r.qty_motorola;
        byDate.set(r.date, cur);
      }
      raw = [...byDate.values()].sort((a, b) =>
        a.date < b.date ? -1 : 1,
      );
    } else if (!am) {
      const { data } = await supabase
        .from("mv_dashboard_daily")
        .select(COLS)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      raw = ((data ?? []) as DailySummaryRow[]).map(toFullRow);
    }
  }

  // Zero-fill: show every date from the 1st to end of month (0 when no transactions).
  const byDateRaw = new Map(raw.map((r) => [r.date, r]));
  const rows: DailySummaryRow[] = [];
  if (month && daysInMonth > 0) {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      rows.push(byDateRaw.get(date) ?? zeroRow(date));
    }
  }

  const storeList = (
    (storeListRaw ?? []) as { store_code: string; store_name: string | null }[]
  ).filter((s) => !am || amStores.includes(s.store_code));

  const card = "rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5";
  const scopeKey = `${store}|${am}|${month}`;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
        DAILY SUMMARY
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Daily Summary
      </h1>
      <p className="mt-1 text-xs text-muted">
        {store ? `Store ${store}` : am ? `Area ${am}` : "All stores"} · {month ? formatMonthYear(month) : "-"}
      </p>

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

      {amScopeBroken && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-warning">Unable to read area data</p>
          <p className="mt-1 text-muted">
            Area-to-store mapping ({am}) could not be loaded. Ask an admin to run
            the latest <code>sql/dashboard-rls.sql</code> in the SQL Editor, then reload.
          </p>
        </div>
      )}

      {!amScopeBroken && rows.length > 0 && <DailySummaryCards rows={rows} />}

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold text-ink">Daily Trend</h2>
        <p className="mt-0.5 text-xs text-muted">Total revenue per day</p>
        <div className="mt-3">
          {rows.length ? (
            <TrendChart data={rows} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              No data for this month.
            </p>
          )}
        </div>
      </section>

      <DailySummaryTables key={scopeKey} rows={rows} />
    </main>
  );
}
