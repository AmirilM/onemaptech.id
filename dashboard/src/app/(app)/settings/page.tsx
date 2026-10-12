import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import SettingsClient from "@/components/settings-client";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-zinc-500">
          Memuat settings...
        </main>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const session = await getSessionProfile();
  if (!session?.profile) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("sales_id,sales_name,role,store_code,avatar_url")
    .eq("sales_id", session.profile.sales_id)
    .maybeSingle();
  const row = (data ?? session.profile) as {
    sales_id: string;
    sales_name: string;
    role: string;
    store_code: string | null;
    avatar_url?: string | null;
  };

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
        SETTINGS
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
        Pengaturan
      </h1>
      <SettingsClient
        salesId={row.sales_id}
        userId={session.userId}
        salesName={row.sales_name}
        role={row.role}
        storeCode={row.store_code}
        avatarUrl={row.avatar_url ?? null}
      />
    </main>
  );
}
