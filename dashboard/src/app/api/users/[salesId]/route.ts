import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { guard } from "@/lib/admin";

const ROLES = ["Store Supervisor", "Area Manager", "Regional Head", "Admin"];

type ListUsersFn = (page: number) => Promise<{
  data: { users: { id: string; email?: string }[] };
  error: unknown;
}>;

async function findAuthId(listUsers: ListUsersFn, email: string): Promise<string | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await listUsers(page);
    if (error) throw new Error("Failed to find the Auth user.");
    const list = data.users;
    if (!list.length) return null;
    const hit = list.find((u) => u.email === email);
    if (hit) return hit.id;
    if (list.length < 100) return null;
    page += 1;
  }
}

// PATCH /api/users/[salesId] — edit (admin, or self for name/password/avatar)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ salesId: string }> },
) {
  const { salesId } = await params;
  const g = await guard(salesId);
  if (!g.ok) return g.response;
  const body = await req.json();
  const isAdmin = g.role === "Admin";
  const patch: Record<string, string | null> = {};
  if (body.sales_name) patch.sales_name = body.sales_name;
  if (body.avatar_url !== undefined) patch.avatar_url = body.avatar_url || null;
  if (isAdmin) {
    if (body.store_code !== undefined) patch.store_code = body.store_code || null;
    if (body.store_name !== undefined) patch.store_name = body.store_name || null;
    if (body.role) {
      if (!ROLES.includes(body.role))
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      patch.role = body.role;
    }
    if (body.password) patch.password = body.password;
  }
  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "No changes." }, { status: 400 });

  const { data: updated, error } = await g.service
    .from("profiles")
    .update(patch)
    .eq("sales_id", salesId)
    .select("sales_id,sales_name,store_code,role,password")
    .maybeSingle();
  if (error || !updated)
    return NextResponse.json(
      { error: error?.message ?? "User not found." },
      { status: 404 },
    );
  const row = updated as {
    sales_id: string;
    sales_name: string;
    store_code: string | null;
    role: string;
    password: string;
  };

  // Sync to the Auth user (look up by email)
  const email = `${salesId}@onemaptech.id`;
  const authId = await findAuthId(
    (pg: number) => g.service.auth.admin.listUsers({ page: pg, perPage: 100 }),
    email,
  );
  if (authId) {
    await g.service.auth.admin.updateUserById(authId, {
      ...(body.password && isAdmin ? { password: body.password } : {}),
      user_metadata: {
        sales_id: row.sales_id,
        sales_name: row.sales_name,
        role: row.role,
        store_code: row.store_code,
      },
    });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

// DELETE /api/users/[salesId] — delete (admin only): Auth user + profiles row
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ salesId: string }> },
) {
  const { salesId } = await params;
  const g = await guard();
  if (!g.ok) return g.response;
  const email = `${salesId}@onemaptech.id`;
  const authId = await findAuthId(
    (pg: number) => g.service.auth.admin.listUsers({ page: pg, perPage: 100 }),
    email,
  );
  if (authId) await g.service.auth.admin.deleteUser(authId);
  await g.service.from("profiles").delete().eq("sales_id", salesId);
  return NextResponse.json({ ok: true });
}
