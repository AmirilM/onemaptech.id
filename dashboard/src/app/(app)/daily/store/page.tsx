import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import {
  detectScopedSource,
  getLatestDataDate,
  getStoreMap,
  resolveScope,
  scopedName,
} from "@/lib/scope";
import {
  aggregateByDate,
  buildAreaRows,
  buildDailyRows,
  datesInRange,
  formatIsoLong,
  formatPeriod,
  isIsoDate,
  slugify,
  METRIC_COLS,
  STORE_METRIC_COLS,
  type AreaSaleRow,
  type DailySaleRow,
  type MetricsRow,
} from "@/lib/daily-store";
import DailyStoreTables from "@/components/daily-store-tables";

type Params = { store?: string; am?: string; date?: string };

export default function DailyStorePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-[1600px] p-4 text-sm text-muted md:p-8">
          Loading daily store...
        </main>
      }
    >
      <DailyStoreContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DailyStoreContent({
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

  const [storeMap, source] = await Promise.all([
    getStoreMap(supabase),
    detectScopedSource(supabase),
  ]);

  // master_stores is the canonical store list (RLS-scoped per role). Using it
  // instead of the leaderboard view keeps stores with zero transactions in the
  // area ranking, as required.
  const allStores = storeMap.map((row) => ({
    store_code: row.store_code,
    store_name: row.store_name,
  }));
  const scope = resolveScope(session, params, storeMap, allStores);
  const { store, amStores } = scope;
  const storeDailyTable = scopedName(source, "dashboard_store_daily");
  const dailyTable = scopedName(source, "dashboard_daily");
  const role = session?.profile?.role ?? "";

  const latestDate = await getLatestDataDate(supabase, source);

  // Earliest date powers the date input's min (and prevents empty calendars).
  const { data: firstDateRows } = await supabase
    .from(storeDailyTable)
    .select("date")
    .order("date", { ascending: true })
    .limit(1);
  const earliestDate =
    (firstDateRows?.[0] as { date: string } | undefined)?.date || latestDate;

  const requestedDate = (params.date ?? "").trim();
  let selectedDate = isIsoDate(requestedDate) ? requestedDate : latestDate;
  if (latestDate && selectedDate > latestDate) selectedDate = latestDate;
  if (earliestDate && selectedDate && selectedDate < earliestDate) {
    selectedDate = earliestDate;
  }

  const month = latestDate ? latestDate.slice(0, 7) : "";
  const start = month ? `${month}-01` : "";
  const end = latestDate;
  const dates = start && end ? datesInRange(start, end) : [];

  let dailyRows: DailySaleRow[] = [];
  let areaRows: AreaSaleRow[] = [];
  let loadError: string | null = null;

  if (!scope.error && start && end) {
    if (scope.store) {
      const { data, error } = await supabase
        .from(storeDailyTable)
        .select(METRIC_COLS)
        .eq("store_code", store)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      if (error) {
        console.error("daily-store table 1 (store)", error);
        loadError = "Data penjualan harian gagal dimuat. Coba refresh halaman.";
      }
      dailyRows = buildDailyRows(
        (data ?? []) as unknown as MetricsRow[],
        dates,
      );
    } else if (scope.mode === "area" && amStores.length) {
      const { data, error } = await supabase
        .from(storeDailyTable)
        .select(STORE_METRIC_COLS)
        .in("store_code", amStores)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      if (error) {
        console.error("daily-store table 1 (area)", error);
        loadError = "Data penjualan harian gagal dimuat. Coba refresh halaman.";
      }
      dailyRows = buildDailyRows(
        aggregateByDate(
          (data ?? []) as unknown as (MetricsRow & {
            store_code: string;
          })[],
        ),
        dates,
      );
    } else if (scope.mode === "all") {
      const { data, error } = await supabase
        .from(dailyTable)
        .select(METRIC_COLS)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      if (error) {
        console.error("daily-store table 1 (all)", error);
        loadError = "Data penjualan harian gagal dimuat. Coba refresh halaman.";
      }
      dailyRows = buildDailyRows(
        (data ?? []) as unknown as MetricsRow[],
        dates,
      );
    }
  }

  // Area table is for AM / RH / Admin only. It always follows the role's
  // area scope, independent from Tabel 1's ?store= selection.
  const showAreaTable =
    role !== "Store Supervisor" &&
    !scope.error &&
    scope.mode !== "blocked" &&
    scope.storeOptions.length > 0;

  if (showAreaTable && selectedDate) {
    const { data, error } = await supabase
      .from(storeDailyTable)
      .select(STORE_METRIC_COLS)
      .eq("date", selectedDate)
      .in(
        "store_code",
        scope.storeOptions.map((option) => option.store_code),
      );
    if (error) {
      console.error("daily-store table 2", error);
      loadError = "Data peringkat area gagal dimuat. Coba refresh halaman.";
    }
    areaRows = buildAreaRows(
      (data ?? []) as unknown as (MetricsRow & {
        store_code: string;
        store_name: string | null;
      })[],
      scope.storeOptions,
      selectedDate,
    );
  }

  const currentStoreName =
    allStores.find((option) => option.store_code === store)?.store_name ||
    session?.profile?.store_name ||
    "";
  const scopeLabel = scope.store
    ? `Store ${scope.store}${currentStoreName ? ` · ${currentStoreName}` : ""}`
    : scope.mode === "area"
      ? `Area ${scope.am}`
      : scope.mode === "all"
        ? "All stores"
        : "No access";
  const areaLabel = scope.am ? `Area ${scope.am}` : "All stores";
  const periodLabel = start && end ? formatPeriod(start, end) : "-";

  const dailyFilenameBase = `daily-sales-store_${slugify(scopeLabel)}_${start}_${end}`;
  const areaFilenameBase = `daily-sales-store-area_${slugify(areaLabel)}_${selectedDate}`;

  return (
    <main className="mx-auto max-w-[1600px] p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
        DAILY SALES
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Daily Store
      </h1>
      <p className="mt-1 text-xs text-muted">
        {scopeLabel} · data updated{" "}
        {latestDate ? formatIsoLong(latestDate) : "-"}
      </p>

      {scope.error && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-warning">
            {scope.mode === "blocked"
              ? "Access restricted"
              : "Unable to read scope data"}
          </p>
          <p className="mt-1 text-muted">{scope.error}</p>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning"
        >
          {loadError}
        </div>
      )}

      {!scope.error && !latestDate && (
        <div className="card-surface mt-4 p-8 text-center text-sm text-muted">
          No data available yet.
        </div>
      )}

      {!scope.error && latestDate && (
        <DailyStoreTables
          dailyRows={dailyRows}
          areaRows={areaRows}
          showAreaTable={showAreaTable}
          stores={scope.storeOptions}
          canFilterStore={scope.canPickStore}
          currentStore={store}
          scopeLabel={scopeLabel}
          areaLabel={areaLabel}
          periodLabel={periodLabel}
          selectedDate={selectedDate}
          minDate={earliestDate || start}
          maxDate={latestDate}
          dataThrough={formatIsoLong(latestDate)}
          dailyFilenameBase={dailyFilenameBase}
          areaFilenameBase={areaFilenameBase}
        />
      )}

      <footer className="mt-6 text-center text-xs text-muted">
        OneMapTech · daily refresh
      </footer>
    </main>
  );
}
