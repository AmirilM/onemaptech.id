import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreMapRow } from "@/lib/types";

// Area Manager scoping (strict): 1 AM = many stores (master_stores).
// - A user with the Area Manager role is locked to their sales_name (= area_manager).
// - Admin / Regional Head may pick an AM via ?am=, or view everything.
// - A Supervisor stays locked to 1 store (lockedStore, outside this helper).

export type AreaScope = {
  /** Effective AM: lockedAM ?? paramAM ("" when there is no AM filter). */
  am: string;
  /** List of store_codes for the effective AM (empty when there is no AM filter). */
  storeCodes: string[];
};

export function effectiveAM(lockedAM: string | null, paramAM: string): string {
  return lockedAM ?? paramAM ?? "";
}

export async function getStoresOfAM(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  am: string,
): Promise<string[]> {
  if (!am) return [];
  const { data } = await supabase
    .from("master_stores")
    .select("store_code")
    .eq("area_manager", am)
    .order("store_code");
  return ((data ?? []) as { store_code: string }[]).map((r) => r.store_code);
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

/** Force the store into the AM scope (strict): a store outside the area → ignored. */
export function storeInScope(
  store: string,
  am: string,
  storeCodes: string[],
): string {
  if (!store) return "";
  if (!am) return store;
  return storeCodes.includes(store) ? store : "";
}
