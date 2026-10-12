import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type SessionProfile = {
  userId: string;
  email: string;
  profile: Profile | null;
  lockedStore: string | null;
  isAdmin: boolean;
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const salesId = (user.user_metadata?.sales_id as string | undefined) ?? "";
  const { data } = salesId
    ? await supabase
        .from("profiles")
        .select("sales_id,sales_name,store_code,store_name,role")
        .eq("sales_id", salesId)
        .maybeSingle()
    : { data: null };
  const profile = (data ?? null) as Profile | null;
  const lockedStore =
    profile?.role === "Store Supervisor" ? (profile?.store_code ?? null) : null;
  return {
    userId: user.id,
    email: user.email ?? "",
    profile,
    lockedStore,
    isAdmin: profile?.role === "Admin",
  };
}
