import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import FilterBar from "@/components/filter-bar";
import ReportExport from "@/components/report-export";
import {
  getStoreMap,
  resolveScope,
  storeOptionsFrom,
  type StoreOption,
} from "@/lib/scope";

type Params = { store?: string; from?: string; to?: string; am?: string };

const COLS =
  "brand_name,product_division,product_group,product_category,date,item,qty_item,localamount,store_code,month,year,sap_article,sap_description,brand_code,lob,sublob,kpi_group,store_name,concept,week_apple,quarter_apple,week_sf,area_manager";

export default function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-muted">
          Loading report...
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
  const [supabase, session] = await Promise.all([
    createClient(),
    getSessionProfile(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // storeMap + storeList are independent → one batch.
  const [storeMap, storeListRes] = await Promise.all([
    getStoreMap(supabase),
    supabase
      .from("v_leaderboard_store")
      .select("store_code,store_name")
      .order("store_code"),
  ]);
  const allStores = storeOptionsFrom(
    storeListRes.data as StoreOption[] | null,
    storeMap,
  );
  const scope = resolveScope(session, params, storeMap, allStores);
  const { store, amStores } = scope;
  const from = params.from || "";
  const to = params.to || "";

  // Capped at 2000 rows to avoid crashing mobile browsers (RAM + client-side XLSX).
  // Narrow the store/date filter for the full dataset.
  const ROW_LIMIT = 2000;
  let q = supabase.from("store_transactions").select(COLS).order("date").limit(ROW_LIMIT);
  if (scope.mode === "store") q = q.eq("store_code", store);
  else if (scope.mode === "area")
    q = amStores.length
      ? q.in("store_code", amStores)
      : q.eq("store_code", "__no_match__");
  else if (scope.mode === "blocked") q = q.eq("store_code", "__no_match__");
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  const { data } = await q;
  const rows =
    scope.error || scope.mode === "blocked"
      ? []
      : ((data ?? []) as Record<string, string | number | null>[]);
  const preview = rows.slice(0, 100);
  const cols = rows.length ? Object.keys(rows[0]) : [];

  const scopeLabel =
    scope.mode === "store"
      ? ` · store ${store}`
      : scope.mode === "area"
        ? ` · area ${scope.am}`
        : "";

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "px-3 py-2 text-xs tabular-nums whitespace-nowrap text-soft";

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
        REPORT
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Transaction Export
      </h1>
      <p className="mt-1 text-xs text-muted">
        {rows.length} rows match the filter{scopeLabel} · first 100 previewed
        {rows.length >= ROW_LIMIT ? ` · limited to ${ROW_LIMIT} rows (narrow the filter)` : ""}
      </p>

      {scope.mode !== "blocked" && (
        <div className="mt-4">
          <FilterBar
            stores={scope.storeOptions}
            lockedStore={scope.canPickStore ? null : scope.store || null}
            currentStore={store}
            currentFrom={from}
            currentTo={to}
            dateMode="range"
            areaManagers={scope.areaOptions}
            lockedAM={scope.canPickArea ? null : scope.am || null}
            currentAM={scope.am}
          />
        </div>
      )}

      {scope.error && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-warning">
            {scope.mode === "blocked" ? "Access restricted" : "Unable to read scope data"}
          </p>
          <p className="mt-1 text-muted">{scope.error}</p>
        </div>
      )}

      <div className="mt-4">
        <ReportExport
          rows={rows}
          filename={`store-transactions${scope.mode === "area" ? `-${scope.am.replace(/\s+/g, "")}` : ""}${scope.mode === "store" ? `-${store}` : ""}${from || to ? `-${from || "all"}_${to || "all"}` : ""}`}
        />
      </div>

      <section className="card-surface mt-4 p-4 md:p-5">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                {cols.map((c, ci) => (
                  <th key={c} className={`${th}${ci === 0 ? " sticky left-0 bg-surface" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-line/60 last:border-0 hover:bg-violet-50"
                >
                  {cols.map((c, ci) => (
                    <td key={c} className={`${td}${ci === 0 ? " sticky left-0 bg-surface" : ""}`}>
                      {r[c] ?? <span className="text-faint">NULL</span>}
                    </td>
                  ))}
                </tr>
              ))}
              {!preview.length && (
                <tr>
                  <td className="py-8 text-center text-sm text-muted">
                    No data.
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
