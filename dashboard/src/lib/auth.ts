import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type SessionProfile = {
  userId: string;
  email: string;
  profile: Profile | null;
  lockedStore: string | null;
  lockedAM: string | null;
  isAdmin: boolean;
};

async function fetchSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const salesId = (user.user_metadata?.sales_id as string | undefined) ?? "";
  const { data } = salesId
    ? await supabase
        .from("profiles")
        .select("sales_id,sales_name,store_code,store_name,role,avatar_url")
        .eq("sales_id", salesId)
        .maybeSingle()
    : { data: null };
  const profile = (data ?? null) as Profile | null;
  const lockedStore =
    profile?.role === "Store Supervisor" ? (profile?.store_code ?? null) : null;
  // Area Manager is locked to their area (sales_name = master_stores/store_transactions area_manager).
  const lockedAM =
    profile?.role === "Area Manager" ? (profile?.sales_name ?? null) : null;
  return {
    userId: user.id,
    email: user.email ?? "",
    profile,
    lockedStore,
    lockedAM,
    isAdmin: profile?.role === "Admin",
  };
}

// Cached per request: layout + page call this twice for the same request.
// No arguments, so the cache key is always the same within a request.
export const getSessionProfile = cache(fetchSessionProfile);
