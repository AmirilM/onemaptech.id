import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import FilterBar from "@/components/filter-bar";
import AccessoryAnalytics from "@/components/accessory-analytics";
import {
  getStoreMap,
  resolveScope,
  storeOptionsFrom,
  type StoreOption,
} from "@/lib/scope";
import { normalizeAccessoryRows } from "@/lib/accessories";

type Params = { store?: string; am?: string };

export default function AccessoriesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-muted">
          Loading accessories...
        </main>
      }
    >
      <AccessoriesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AccessoriesContent({
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

  // storeMap + store list are independent → one batch.
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
  const { store } = scope;
  const scopeLabel =
    scope.mode === "store"
      ? `Store ${store}`
      : scope.mode === "area"
        ? `Area ${scope.am}`
        : scope.mode === "all"
          ? "All stores"
          : "No access";

  // Server-side aggregation via RPC (avoids the PostgREST row cap and keeps the
  // payload to ~1 row per sap_article). Scope args follow the strict role rules.
  const cannotReadScope = scope.mode === "blocked" || !!scope.error;
  const p_store =
    scope.mode === "store" ? store : cannotReadScope ? "__no_match__" : null;
  const p_am =
    scope.mode === "area"
      ? scope.amStores.length
        ? scope.am
        : "__no_match__"
      : null;
  const { data: rpcData, error: rpcError } = cannotReadScope
    ? { data: null, error: null }
    : await supabase.rpc("product_analytics_accessories", { p_store, p_am });
  const rows = rpcError ? [] : normalizeAccessoryRows(rpcData as unknown[] | null);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
        PRODUCT ANALYTICS
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Accessories
      </h1>
      <p className="mt-1 text-xs text-muted">
        {scopeLabel} · accessories only (kpi_group = ACCESSORIES)
      </p>

      {scope.mode !== "blocked" && (
        <div className="mt-4">
          <FilterBar
            stores={scope.storeOptions}
            lockedStore={scope.canPickStore ? null : scope.store || null}
            currentStore={store}
            dateMode="none"
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

      {rpcError && (
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-semibold text-warning">
            Accessories analytics unavailable
          </p>
          <p className="mt-1 text-muted">
            The <code>product_analytics_accessories</code> function could not be
            read. Ask an admin to run{" "}
            <code>sql/product-analytics-accessories.sql</code> in the SQL Editor,
            then reload.
          </p>
        </div>
      )}

      {!cannotReadScope && !rpcError && <AccessoryAnalytics rows={rows} />}
    </main>
  );
}
