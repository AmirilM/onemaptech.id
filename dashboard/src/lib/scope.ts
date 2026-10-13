import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreMapRow } from "@/lib/types";

// Scoping Area Manager (ketat): 1 AM = banyak store (master_stores).
// - User role Area Manager terkunci ke sales_name-nya (= area_manager).
// - Admin / Regional Head boleh pilih AM via ?am=, atau lihat semua.
// - Supervisor tetap terkunci 1 store (lockedStore, di luar helper ini).

export type AreaScope = {
  /** AM efektif: lockedAM ?? paramAM ("" bila tidak ada filter AM). */
  am: string;
  /** Daftar store_code milik AM efektif (kosong bila tanpa filter AM). */
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

/** Paksa store ke dalam scope AM (ketat): store di luar area → diabaikan. */
export function storeInScope(
  store: string,
  am: string,
  storeCodes: string[],
): string {
  if (!store) return "";
  if (!am) return store;
  return storeCodes.includes(store) ? store : "";
}
