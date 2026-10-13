import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { pct, rupiah } from "@/lib/format";
import DailyFilter from "@/components/daily-filter";
import TrendChart from "@/components/trend-chart";

type Params = { store?: string; month?: string };
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
        <main className="mx-auto max-w-7xl p-8 text-sm text-zinc-500">
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
  const store = lockedStore ?? (params.store || "");

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
    } else {
      const { data } = await supabase
        .from("mv_dashboard_daily")
        .select(COLS)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      rows = (data ?? []) as Row[];
    }
  }

  const { data: storeList } = await supabase
    .from("mv_leaderboard_store")
    .select("store_code,store_name")
    .order("store_code");

  const growth = (i: number): number | null => {
    if (i === 0) return null;
    const prev = rows[i - 1].revenue_total;
    if (!prev) return null;
    return Math.round((10000 * (rows[i].revenue_total - prev)) / prev) / 100;
  };

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500";
  const td = "px-3 py-2.5 text-sm tabular-nums";
  const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5";

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
        DAILY SUMMARY
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
        Ringkasan Harian
      </h1>
      <p className="mt-1 text-xs text-zinc-500">
        {store ? `Store ${store}` : "Semua store"} · {month || "-"}
      </p>

      <div className="mt-5">
        <DailyFilter
          stores={(storeList ?? []) as { store_code: string; store_name: string | null }[]}
          lockedStore={lockedStore}
          currentStore={store}
          currentMonth={month}
        />
      </div>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold">Daily Trend</h2>
        <div className="mt-3">
          {rows.length ? (
            <TrendChart data={rows} />
          ) : (
            <p className="py-10 text-center text-sm text-zinc-500">
              Tidak ada data pada bulan ini.
            </p>
          )}
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold">Tabel Harian (tgl 1 – akhir bulan)</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className={`${th} sticky left-0 bg-[#0b1220]`}>Date</th>
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
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className={`${td} sticky left-0 bg-[#0b1220] font-medium`}>{r.date}</td>
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
                          ? "text-zinc-600"
                          : g >= 0
                            ? "text-emerald-300"
                            : "text-red-300"
                      }`}
                    >
                      {g === null ? "-" : `${g >= 0 ? "▲" : "▼"} ${pct(Math.abs(g))}`}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-zinc-500">
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
