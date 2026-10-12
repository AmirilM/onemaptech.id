import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import UsersClient from "@/components/users-client";
import type { UserRow } from "@/components/user-form";

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-8 text-sm text-zinc-500">
          Memuat users...
        </main>
      }
    >
      <UsersContent />
    </Suspense>
  );
}

async function UsersContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const session = await getSessionProfile();
  if (!session?.isAdmin) {
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
          USER MANAGEMENT
        </p>
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6 text-sm text-amber-100">
          Halaman ini khusus role Admin. Akun kamu ({session?.profile?.role ?? "-"})
          tidak punya akses.
        </div>
      </main>
    );
  }
  const { data } = await supabase
    .from("profiles")
    .select("sales_id,sales_name,store_code,store_name,role")
    .order("sales_id");
  const rows = (data ?? []) as UserRow[];

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
        USER MANAGEMENT
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
        Kelola User
      </h1>
      <p className="mt-1 text-xs text-zinc-500">
        {rows.length} user · menulis ke profiles + Auth sekaligus
      </p>
      <UsersClient rows={rows} />
    </main>
  );
}
