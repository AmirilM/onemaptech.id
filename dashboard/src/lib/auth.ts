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

/**
 * sales_id is provided by `app_metadata` (only writable with the service role)
 * or, as a fallback, derived from the e-mail convention `sales_id@onemaptech.id`.
 * `user_metadata` is intentionally NOT trusted: an authenticated user can edit
 * their own `user_metadata` (and could impersonate another account).
 */
function resolveSalesId(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
}): string {
  const fromAppMeta = user.app_metadata?.sales_id;
  if (typeof fromAppMeta === "string" && fromAppMeta.trim() !== "") {
    return fromAppMeta.trim();
  }
  const email = user.email ?? "";
  return email.includes("@") ? email.split("@")[0] : "";
}

async function fetchSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const salesId = resolveSalesId(user);
  const { data } = salesId
    ? await supabase
        .from("profiles")
        .select("sales_id,sales_name,store_code,store_name,role,avatar_url")
        .eq("sales_id", salesId)
        .maybeSingle()
    : { data: null };
  const profile = (data ?? null) as Profile | null;
  const lockedStore =
    profile?.role === "Store Supervisor"
      ? profile.store_code?.trim() || null
      : null;
  // Area Manager is locked to their area (sales_name = master_stores.area_manager).
  const lockedAM =
    profile?.role === "Area Manager"
      ? profile.sales_name?.trim() || null
      : null;
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
