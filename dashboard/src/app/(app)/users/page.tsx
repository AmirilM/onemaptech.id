import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createService } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/auth";
import UsersClient from "@/components/users-client";
import type { UserRow } from "@/components/user-form";

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-muted">
          Loading users...
        </main>
      }
    >
      <UsersContent />
    </Suspense>
  );
}

async function UsersContent() {
  const [supabase, session] = await Promise.all([
    createClient(),
    getSessionProfile(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!session?.isAdmin) {
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary">
          USER MANAGEMENT
        </p>
        <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm text-warning">
          This page is for the Admin role only. Your account ({session?.profile?.role ?? "-"})
          does not have access.
        </div>
      </main>
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const svc =
    url && serviceKey
      ? createService(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

  // Profiles: use the service client for consistency + to bypass RLS, fall back to anon.
  const reader = svc ?? supabase;
  const { data } = await reader
    .from("profiles")
    .select("sales_id,sales_name,store_code,store_name,role,avatar_url")
    .order("sales_id");
  const profiles = (data ?? []) as Omit<UserRow, "last_login">[];

  // Last login from Auth (server-only). Map sales_id -> last_sign_in_at.
  const lastLogin = new Map<string, string | null>();
  if (svc) {
    try {
      let page = 1;
      for (;;) {
        const { data: listed, error } = await svc.auth.admin.listUsers({
          page,
          perPage: 100,
        });
        if (error) break;
        const users = listed.users;
        if (!users.length) break;
        for (const u of users) {
          const sid =
            (u.app_metadata?.sales_id as string | undefined) ??
            (u.email?.endsWith("@onemaptech.id")
              ? u.email.split("@")[0]
              : undefined);
          if (sid) lastLogin.set(sid, u.last_sign_in_at ?? null);
        }
        if (users.length < 100) break;
        page += 1;
      }
    } catch {
      /* ignore — last login becomes null */
    }
  }

  const rows: UserRow[] = profiles.map((p) => ({
    ...p,
    last_login: lastLogin.get(p.sales_id) ?? null,
  }));

  const roles = [...new Set(rows.map((r) => r.role))].sort();
  const storeMap = new Map<string, string | null>();
  for (const r of rows) {
    if (r.store_code && !storeMap.has(r.store_code))
      storeMap.set(r.store_code, r.store_name);
  }
  const stores = [...storeMap.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <UsersClient
        rows={rows}
        total={rows.length}
        roles={roles}
        stores={stores}
      />
    </main>
  );
}
