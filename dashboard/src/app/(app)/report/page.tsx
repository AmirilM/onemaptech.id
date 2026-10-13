import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import FilterBar from "@/components/filter-bar";
import ReportExport from "@/components/report-export";

type Params = { store?: string; from?: string; to?: string };

const COLS =
  "brand_name,product_division,product_group,product_category,date,item,qty_item,localamount,store_code,month,year,sap_article,sap_description,brand_code,lob,sublob,kpi_group,store_name,concept,week_apple,quarter_apple,week_sf";

export default function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-zinc-500">
          Memuat report...
        </main>
      }
    >
      <ReportContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportContent({
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
  const from = params.from || "";
  const to = params.to || "";

  const { data: storeList } = await supabase
    .from("mv_leaderboard_store")
    .select("store_code,store_name")
    .order("store_code");

  // Dibatasi 2000 baris agar tidak crash di browser HP (RAM + XLSX di client).
  // Persempit filter store/tanggal untuk data penuh.
  const ROW_LIMIT = 2000;
  let q = supabase.from("store_transactions").select(COLS).order("date").limit(ROW_LIMIT);
  if (store) q = q.eq("store_code", store);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  const { data } = await q;
  const rows = (data ?? []) as Record<string, string | number | null>[];
  const preview = rows.slice(0, 100);
  const cols = rows.length ? Object.keys(rows[0]) : [];

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500";
  const td = "px-3 py-2 text-xs tabular-nums whitespace-nowrap";

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
        REPORT
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
        Export Transaksi
      </h1>
      <p className="mt-1 text-xs text-zinc-500">
        {rows.length} baris sesuai filter · preview 100 pertama
        {rows.length >= ROW_LIMIT ? ` · dibatasi ${ROW_LIMIT} baris (persempit filter)` : ""}
      </p>

      <div className="mt-4">
        <FilterBar
          stores={(storeList ?? []) as { store_code: string; store_name: string | null }[]}
          lockedStore={lockedStore}
          currentStore={store}
          currentFrom={from}
          currentTo={to}
        />
      </div>

      <div className="mt-4">
        <ReportExport
          rows={rows}
          filename={`store-transactions${store ? `-${store}` : ""}${from || to ? `-${from || "all"}_${to || "all"}` : ""}`}
        />
      </div>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                {cols.map((c, ci) => (
                  <th key={c} className={`${th}${ci === 0 ? " sticky left-0 bg-panel" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                >
                  {cols.map((c, ci) => (
                    <td key={c} className={`${td}${ci === 0 ? " sticky left-0 bg-panel" : ""}`}>
                      {r[c] ?? <span className="text-zinc-600">NULL</span>}
                    </td>
                  ))}
                </tr>
              ))}
              {!preview.length && (
                <tr>
                  <td className="py-8 text-center text-sm text-zinc-500">
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
