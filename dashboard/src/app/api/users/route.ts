import { NextResponse } from "next/server";
import { guard } from "@/lib/admin";

const ROLES = ["Store Supervisor", "Area Manager", "Regional Head", "Admin"];

// POST /api/users — add user (admin only): insert profiles + create Auth user
export async function POST(req: Request) {
  const g = await guard();
  if (!g.ok) return g.response;
  const body = await req.json();
  const { sales_id, sales_name, store_code, store_name, role, password } = body;
  if (!sales_id || !sales_name || !role || !password)
    return NextResponse.json(
      { error: "sales_id, sales_name, role, and password are required." },
      { status: 400 },
    );
  if (!ROLES.includes(role))
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  const { error: insErr } = await g.service.from("profiles").insert({
    sales_id,
    sales_name,
    store_code: store_code || null,
    store_name: store_name || null,
    role,
    password,
  });
  if (insErr)
    return NextResponse.json({ error: `profiles: ${insErr.message}` }, { status: 409 });

  const { data: authData, error: authErr } =
    await g.service.auth.admin.createUser({
      email: `${sales_id}@onemaptech.id`,
      password,
      email_confirm: true,
      // app_metadata is only writable with the service role → safe for authz.
      app_metadata: { sales_id, role },
      user_metadata: { sales_id, sales_name, role, store_code: store_code || null },
    });
  if (authErr)
    return NextResponse.json(
      { error: `auth: ${authErr.message} (the profiles row is still saved)` },
      { status: 500 },
    );
  if (authData?.user?.id) {
    // Link the profile to the Auth user (used by RLS + session lookup).
    await g.service
      .from("profiles")
      .update({ user_id: authData.user.id })
      .eq("sales_id", sales_id);
  }
  return NextResponse.json({ ok: true });
}
