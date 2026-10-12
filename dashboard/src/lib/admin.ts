import { NextResponse } from "next/server";
import { createClient as createAnon } from "@/lib/supabase/server";
import { createClient as createService } from "@supabase/supabase-js";

// Service client (bypass RLS). HANYA di server, tidak pernah ke browser.
function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createService(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type Guard =
  | { ok: true; service: NonNullable<ReturnType<typeof service>>; salesId: string; role: string }
  | { ok: false; response: NextResponse };

export async function guard(
  allowSelf: string | null = null,
): Promise<Guard> {
  const anon = await createAnon();
  const {
    data: { user },
  } = await anon.auth.getUser();
  if (!user)
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const svc = service();
  if (!svc)
    return {
      ok: false,
      response: NextResponse.json({ error: "Server belum dikonfigurasi." }, { status: 500 }),
    };
  const salesId = (user.user_metadata?.sales_id as string | undefined) ?? "";
  const { data: prof } = salesId
    ? await svc
        .from("profiles")
        .select("sales_id,role")
        .eq("sales_id", salesId)
        .maybeSingle()
    : { data: null };
  const role = (prof as { role?: string } | null)?.role ?? "";
  if (role === "Admin" || (allowSelf && salesId === allowSelf))
    return { ok: true, service: svc, salesId, role };
  return {
    ok: false,
    response: NextResponse.json({ error: "Forbidden (khusus Admin)." }, { status: 403 }),
  };
}
