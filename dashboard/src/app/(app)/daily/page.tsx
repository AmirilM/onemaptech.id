import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { pct, rupiah } from "@/lib/format";
import DailyFilter from "@/components/daily-filter";
import TrendChart from "@/components/trend-chart";
import { distinctAMs, effectiveAM, getStoreMap, storeInScope } from "@/lib/scope";

type Params = { store?: string; month?: string; am?: string };
type Row = {
  date: string;
  revenue_total: number;
  revenue_apple: number;
  revenue_android: number;
  revenue_accessories: number;
  revenue_vas: number;
};

const COLS =
  "date,revenue_total,revenue_apple,revenue_android,revenue_accessories,revenue_vas";

export default function DailyPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-muted">
          Memuat daily summary...
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const session = await getSessionProfile();
  const lockedStore = session?.lockedStore ?? null;
  const lockedAM = session?.lockedAM ?? null;
  const storeMap = await getStoreMap(supabase);
  const amList = distinctAMs(storeMap);
  const am = effectiveAM(lockedAM, params.am || "");
  const amStores = am
    ? storeMap.filter((r) => r.area_manager === am).map((r) => r.store_code)
    : [];
  const amScopeBroken = am !== "" && amStores.length === 0;
  const store = storeInScope(lockedStore ?? (params.store || ""), am, amStores);

  // Bulan default = bulan dari tanggal data terakhir
  const { data: latest } = await supabase
    .from("mv_dashboard_daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);
  const latestDate = (latest?.[0] as { date: string } | undefined)?.date ?? "";
  const month = params.month || latestDate.slice(0, 7);
  const start = month ? `${month}-01` : "";
  const end = month
    ? `${month}-${new Date(
        Number(month.slice(0, 4)),
        Number(month.slice(5, 7)),
        0,
      )
        .getDate()
        .toString()
        .padStart(2, "0")}`
    : "";

  let rows: Row[] = [];
  if (start) {
    if (store) {
      const { data } = await supabase
        .from("mv_dashboard_store_daily")
        .select(COLS)
        .eq("store_code", store)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      rows = (data ?? []) as Row[];
    } else if (am && amStores.length) {
      const { data } = await supabase
        .from("mv_dashboard_store_daily")
        .select(COLS)
        .in("store_code", amStores)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      // Agregasi per tanggal di server-side (MV berdimensi store x tanggal)
      const byDate = new Map<string, Row>();
      for (const r of (data ?? []) as (Row & { store_code: string })[]) {
        const cur = byDate.get(r.date) ?? {
          date: r.date,
          revenue_total: 0,
          revenue_apple: 0,
          revenue_android: 0,
          revenue_accessories: 0,
          revenue_vas: 0,
        };
        cur.revenue_total += r.revenue_total;
        cur.revenue_apple += r.revenue_apple;
        cur.revenue_android += r.revenue_android;
        cur.revenue_accessories += r.revenue_accessories;
        cur.revenue_vas += r.revenue_vas;
        byDate.set(r.date, cur);
      }
      rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    } else if (!am) {
      const { data } = await supabase
        .from("mv_dashboard_daily")
        .select(COLS)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      rows = (data ?? []) as Row[];
    }
  }

  const { data: storeListRaw } = await supabase
    .from("mv_leaderboard_store")
    .select("store_code,store_name")
    .order("store_code");
  const storeList = (
    (storeListRaw ?? []) as { store_code: string; store_name: string | null }[]
  ).filter((s) => !am || amStores.includes(s.store_code));

  const growth = (i: number): number | null => {
    if (i === 0) return null;
    const prev = rows[i - 1].revenue_total;
    if (!prev) return null;
    return Math.round((10000 * (rows[i].revenue_total - prev)) / prev) / 100;
  };

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "px-3 py-2.5 text-sm tabular-nums text-soft";
  const card = "rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5";

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
        DAILY SUMMARY
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Ringkasan Harian
      </h1>
      <p className="mt-1 text-xs text-muted">
        {store ? `Store ${store}` : am ? `Area ${am}` : "Semua store"} · {month || "-"}
      </p>

      <div className="mt-4">
        <DailyFilter
          stores={(storeList ?? []) as { store_code: string; store_name: string | null }[]}
          lockedStore={lockedStore}
          currentStore={store}
          currentMonth={month}
          areaManagers={lockedAM ? [] : amList}
          lockedAM={lockedAM}
          currentAM={am}
        />
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

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold text-ink">Daily Trend</h2>
        <div className="mt-3">
          {rows.length ? (
            <TrendChart data={rows} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              Tidak ada data pada bulan ini.
            </p>
          )}
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold text-ink">Tabel Harian (tgl 1 – akhir bulan)</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className={`${th} sticky left-0 bg-surface`}>Date</th>
                <th className={`${th} text-right`}>Total Revenue</th>
                <th className={`${th} text-right`}>Apple</th>
                <th className={`${th} text-right`}>Android</th>
                <th className={`${th} text-right`}>Accessories</th>
                <th className={`${th} text-right`}>VAS</th>
                <th className={`${th} text-right`}>vs Yesterday</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const g = growth(i);
                return (
                  <tr
                    key={r.date}
                    className="border-b border-line/60 last:border-0 hover:bg-violet-50"
                  >
                    <td className={`${td} sticky left-0 bg-surface font-medium text-ink`}>{r.date}</td>
                    <td className={`${td} text-right`}>
                      {rupiah(r.revenue_total)}
                    </td>
                    <td className={`${td} text-right`}>
                      {rupiah(r.revenue_apple)}
                    </td>
                    <td className={`${td} text-right`}>
                      {rupiah(r.revenue_android)}
                    </td>
                    <td className={`${td} text-right`}>
                      {rupiah(r.revenue_accessories)}
                    </td>
                    <td className={`${td} text-right`}>{rupiah(r.revenue_vas)}</td>
                    <td
                      className={`px-3 py-2.5 text-right text-sm font-semibold ${
                        g === null
                          ? "text-faint"
                          : g >= 0
                            ? "text-accent"
                            : "text-danger"
                      }`}
                    >
                      {g === null ? "-" : `${g >= 0 ? "▲" : "▼"} ${pct(Math.abs(g))}`}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted">
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
