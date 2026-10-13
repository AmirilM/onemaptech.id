"use client";

import { useState } from "react";
import UserForm, { type UserRow } from "@/components/user-form";

export default function UsersClient({ rows }: { rows: UserRow[] }) {
  const [editing, setEditing] = useState<Partial<UserRow> | null | undefined>(
    undefined,
  );

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "px-3 py-2.5 text-sm text-soft";

  return (
    <>
      <div className="mt-5">
        <button
          onClick={() => setEditing(null)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          + Tambah User
        </button>
      </div>
      <section className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Sales ID</th>
                <th className={th}>Nama</th>
                <th className={th}>Store</th>
                <th className={th}>Role</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.sales_id}
                  className="border-b border-line last:border-0 hover:bg-violet-50"
                >
                  <td className={`${td} font-medium text-ink`}>{r.sales_id}</td>
                  <td className={td}>{r.sales_name}</td>
                  <td className={td}>
                    {r.store_code ?? "-"}
                    <span className="block max-w-48 truncate text-xs text-muted">
                      {r.store_name ?? ""}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs text-soft">
                      {r.role}
                    </span>
                  </td>
                  <td className={`${td} text-right`}>
                    <button
                      onClick={() => setEditing(r)}
                      className="flex min-h-[44px] items-center rounded-lg border border-line px-3 py-1 text-xs text-soft hover:bg-violet-50 active:bg-violet-100"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted">
                    Belum ada user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {editing !== undefined && (
        <UserForm initial={editing} onClose={() => setEditing(undefined)} />
      )}
    </>
  );
}
