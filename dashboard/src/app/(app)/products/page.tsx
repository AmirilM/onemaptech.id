import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import FilterBar from "@/components/filter-bar";
import ProductAnalyticsView from "@/components/product-analytics";
import { distinctAMs, effectiveAM, getStoreMap, storeInScope } from "@/lib/scope";
import {
  DEVICE_METRIC_DEFAULT,
  normalizeDeviceRows,
  type DeviceMetric,
} from "@/lib/product-analytics";

type Params = { store?: string; am?: string; metric?: string };

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-muted">
          Loading product analytics...
        </main>
      }
    >
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({
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

  const lockedStore = session?.lockedStore ?? null;
  const lockedAM = session?.lockedAM ?? null;

  // storeMap + store list are independent → one batch.
  const [storeMap, storeListRes] = await Promise.all([
    getStoreMap(supabase),
    supabase
      .from("mv_leaderboard_store")
      .select("store_code,store_name")
      .order("store_code"),
  ]);
  const storeListRaw = storeListRes.data;

  const amList = distinctAMs(storeMap);
  const am = effectiveAM(lockedAM, params.am || "");
  const amStores = am
    ? storeMap.filter((r) => r.area_manager === am).map((r) => r.store_code)
    : [];
  const amScopeBroken = am !== "" && amStores.length === 0;
  const store = storeInScope(lockedStore ?? (params.store || ""), am, amStores);
  const scopeLabel = store ? `Store ${store}` : am ? `Area ${am}` : "All stores";

  // Store list for the filter (strict: an AM only sees their own stores)
  const storeList = (
    (storeListRaw ?? []) as { store_code: string; store_name: string | null }[]
  ).filter((s) => !am || amStores.includes(s.store_code));

  const metric: DeviceMetric =
    params.metric === "revenue" ? "revenue" : DEVICE_METRIC_DEFAULT;

  // Server-side aggregation via RPC (avoids the PostgREST row cap and keeps the
  // payload to ~1 row per sublob). Scope args follow the strict store/AM rules.
  const p_store = store ? store : amScopeBroken ? "__no_match__" : null;
  const p_am = !store && am && amStores.length ? am : null;
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "product_analytics_devices",
    { p_store, p_am },
  );
  const rows = rpcError ? [] : normalizeDeviceRows(rpcData as unknown[] | null);

  const exportName = `product-analytics${
    store ? `-${store}` : am ? `-${am.replace(/\s+/g, "")}` : ""
  }-${metric}`;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
        PRODUCT ANALYTICS
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Product Analytics
      </h1>
      <p className="mt-1 text-xs text-muted">
        {scopeLabel} · device products only (Apple + Android)
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

      {rpcError && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-warning">Product analytics unavailable</p>
          <p className="mt-1 text-muted">
            The <code>product_analytics_devices</code> function could not be read.
            Ask an admin to run <code>sql/product-analytics.sql</code> in the SQL
            Editor, then reload.
          </p>
        </div>
      )}

      {!amScopeBroken && !rpcError && (
        <ProductAnalyticsView
          rows={rows}
          initialMetric={metric}
          scopeLabel={scopeLabel}
          exportName={exportName}
        />
      )}
    </main>
  );
}
