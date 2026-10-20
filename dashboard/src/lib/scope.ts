import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionProfile } from "@/lib/auth";
import type { StoreMapRow } from "@/lib/types";

// Role scoping (single source of truth for every dashboard page):
// - Store Supervisor : locked to profiles.store_code (exactly 1 store).
// - Area Manager     : locked to profiles.sales_name (= master_stores.area_manager).
// - Regional Head    : all stores.
// - Admin            : all stores.
// A role without a usable profile/store/area is FAIL-CLOSED: no data is shown,
// never a fallback to "all stores".
// URL params (?store=, ?am=) are only honored for Regional Head / Admin.

export type ScopeMode = "store" | "area" | "all" | "blocked";

export type StoreOption = { store_code: string; store_name: string | null };

export type Scope = {
  mode: ScopeMode;
  /** Effective store filter ("" = no store filter). */
  store: string;
  /** Effective area filter ("" = no area filter). */
  am: string;
  /** Stores belonging to the effective area. */
  amStores: string[];
  storeOptions: StoreOption[];
  areaOptions: string[];
  canPickStore: boolean;
  canPickArea: boolean;
  /** Non-null = the scope is unusable (empty mapping, missing store, unknown role). */
  error: string | null;
};

export const GLOBAL_ROLES = ["Admin", "Regional Head"] as const;

function blocked(error: string): Scope {
  return {
    mode: "blocked",
    store: "",
    am: "",
    amStores: [],
    storeOptions: [],
    areaOptions: [],
    canPickStore: false,
    canPickArea: false,
    error,
  };
}

export function resolveScope(
  session: SessionProfile | null,
  params: { store?: string; am?: string },
  storeMap: StoreMapRow[],
  allStores: StoreOption[],
): Scope {
  const profile = session?.profile ?? null;
  if (!profile) {
    return blocked(
      "Profil akun tidak ditemukan. Hubungi Admin untuk melengkapi data user.",
    );
  }
  const role = profile.role;

  // --- Store Supervisor: exactly one store, no area filter at all -----------
  if (role === "Store Supervisor") {
    const store = (session?.lockedStore ?? "").trim();
    if (!store) {
      return blocked(
        "Akun Store Supervisor belum terhubung ke store (store_code kosong). Hubungi Admin.",
      );
    }
    const options = allStores.filter((s) => s.store_code === store);
    return {
      mode: "store",
      store,
      am: "",
      amStores: [],
      storeOptions: options.length
        ? options
        : [{ store_code: store, store_name: profile.store_name ?? null }],
      areaOptions: [],
      canPickStore: false,
      canPickArea: false,
      error: null,
    };
  }

  // --- Area Manager: every store of their own area --------------------------
  if (role === "Area Manager") {
    const am = (session?.lockedAM ?? "").trim();
    if (!am) {
      return blocked(
        "Akun Area Manager belum punya area (sales_name kosong). Hubungi Admin.",
      );
    }
    const amStores = storeMap
      .filter((r) => r.area_manager === am)
      .map((r) => r.store_code);
    const requested = (params.store ?? "").trim();
    return {
      mode: "area",
      store: amStores.includes(requested) ? requested : "",
      am,
      amStores,
      storeOptions: allStores.filter((s) => amStores.includes(s.store_code)),
      areaOptions: [am],
      canPickStore: true,
      canPickArea: false,
      error: amStores.length
        ? null
        : `Pemetaan area "${am}" ke store tidak ditemukan di master_stores. Hubungi Admin.`,
    };
  }

  // --- Global roles: free area + store filters ------------------------------
  if ((GLOBAL_ROLES as readonly string[]).includes(role)) {
    const am = (params.am ?? "").trim();
    const amStores = am
      ? storeMap
          .filter((r) => r.area_manager === am)
          .map((r) => r.store_code)
      : [];
    let store = (params.store ?? "").trim();
    if (am && store && !amStores.includes(store)) store = "";
    return {
      mode: store ? "store" : am ? "area" : "all",
      store,
      am,
      amStores,
      storeOptions: am
        ? allStores.filter((s) => amStores.includes(s.store_code))
        : allStores,
      areaOptions: distinctAMs(storeMap),
      canPickStore: true,
      canPickArea: true,
      error:
        am && !amStores.length
          ? `Pemetaan area "${am}" ke store tidak ditemukan di master_stores. Hubungi Admin.`
          : null,
    };
  }

  return blocked(
    `Role "${role || "-"}" tidak punya akses dashboard. Hubungi Admin.`,
  );
}

export async function getStoreMap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
): Promise<StoreMapRow[]> {
  const { data } = await supabase
    .from("master_stores")
    .select("store_code,store_name,area_manager")
    .order("store_code");
  return (data ?? []) as StoreMapRow[];
}

export function distinctAMs(storeMap: StoreMapRow[]): string[] {
  const set = new Set<string>();
  for (const r of storeMap) {
    if (r.area_manager && r.area_manager.trim() !== "") set.add(r.area_manager);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Scoped views (`v_*`) are created by sql/dashboard-rls.sql. Until that script
 * is applied the app falls back to the raw materialized views so the dashboard
 * keeps working (the app-side role scope still applies in both cases).
 */
export type ScopedSource = "view" | "mv";

export async function detectScopedSource(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
): Promise<ScopedSource> {
  const { error } = await supabase
    .from("v_leaderboard_store")
    .select("store_code")
    .limit(1);
  return error ? "mv" : "view";
}

export function scopedName(source: ScopedSource, base: string): string {
  return `${source === "view" ? "v" : "mv"}_${base}`;
}

/** Latest data date (freshness); not store-sensitive. */
export async function getLatestDataDate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  source: ScopedSource,
): Promise<string> {
  if (source === "view") {
    const { data } = await supabase
      .from("v_dashboard_latest_date")
      .select("date")
      .maybeSingle();
    return (data as { date: string } | null)?.date ?? "";
  }
  const { data } = await supabase
    .from("mv_dashboard_daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);
  return (data?.[0] as { date: string } | undefined)?.date ?? "";
}

/** Store options for the filter: prefer the store list, fall back to master_stores. */
export function storeOptionsFrom(
  allStores: StoreOption[] | null | undefined,
  storeMap: StoreMapRow[],
): StoreOption[] {
  if (allStores && allStores.length) return allStores;
  return storeMap.map((r) => ({
    store_code: r.store_code,
    store_name: r.store_name,
  }));
}
