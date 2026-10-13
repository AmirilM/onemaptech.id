"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type UserRow = {
  sales_id: string;
  sales_name: string;
  store_code: string | null;
  store_name: string | null;
  role: string;
};

const ROLES = ["Store Supervisor", "Area Manager", "Regional Head", "Admin"];

export default function UserForm({
  initial,
  onClose,
}: {
  initial: Partial<UserRow> | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    sales_id: initial?.sales_id ?? "",
    sales_name: initial?.sales_name ?? "",
    store_code: initial?.store_code ?? "",
    store_name: initial?.store_name ?? "",
    role: initial?.role ?? "Store Supervisor",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEdit = !!initial?.sales_id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = isEdit ? `/api/users/${initial!.sales_id}` : "/api/users";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          password: f.password || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan.");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm(`Hapus user ${initial!.sales_id}? (profiles + Auth)`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${initial!.sales_id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menghapus.");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "min-h-[44px] w-full rounded-lg border border-line bg-canvas px-3 py-2 text-base text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30 md:text-sm";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4 [padding-bottom:env(safe-area-inset-bottom)]">
      <form
        onSubmit={submit}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-xl"
      >
        <h3 className="text-lg font-bold text-ink">
          {isEdit ? `Edit ${initial!.sales_id}` : "Tambah User"}
        </h3>
        <div className="mt-4 flex flex-col gap-3">
          {!isEdit && (
            <input
              value={f.sales_id}
              onChange={(e) => setF({ ...f, sales_id: e.target.value })}
              placeholder="Sales ID"
              className={input}
            />
          )}
          <input
            value={f.sales_name}
            onChange={(e) => setF({ ...f, sales_name: e.target.value })}
            placeholder="Nama lengkap"
            className={input}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={f.store_code}
              onChange={(e) => setF({ ...f, store_code: e.target.value })}
              placeholder="Store code"
              className={input}
            />
            <input
              value={f.store_name}
              onChange={(e) => setF({ ...f, store_name: e.target.value })}
              placeholder="Store name"
              className={input}
            />
          </div>
          <select
            value={f.role}
            onChange={(e) => setF({ ...f, role: e.target.value })}
            className={input}
          >
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <input
            type="password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            placeholder={isEdit ? "Password baru (kosongkan bila tetap)" : "Password"}
            className={input}
          />
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-[#FDA4AF]">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-between gap-2">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={remove}
                disabled={loading}
                className="min-h-[44px] rounded-lg border border-danger/40 px-4 py-2 text-sm text-[#FDA4AF] hover:bg-danger/10"
              >
                Hapus
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-lg border border-line px-4 py-2 text-sm text-soft hover:bg-white/5 active:bg-white/10"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "..." : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
