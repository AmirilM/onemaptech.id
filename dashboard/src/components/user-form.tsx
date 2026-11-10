"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import ConfirmDialog from "@/components/confirm-dialog";

export type UserRow = {
  sales_id: string;
  sales_name: string;
  store_code: string | null;
  store_name: string | null;
  role: string;
  last_login: string | null;
  avatar_url: string | null;
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPw, setShowPw] = useState(false);
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
      if (!res.ok) throw new Error(j.error ?? "Failed to save.");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setConfirmDelete(true);
  }

  async function handleDelete() {
    setConfirmDelete(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${initial!.sales_id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed to delete.");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "min-h-[44px] w-full rounded-lg border border-line bg-canvas px-3 py-2 text-base text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30 md:text-sm";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/40 p-4 [padding-bottom:env(safe-area-inset-bottom)]">
      <form
        onSubmit={submit}
        className="card-surface-strong max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-6"
      >
        <p className="text-[11px] font-semibold tracking-[0.2em] text-primary">
          USER MANAGEMENT
        </p>
        <h3 className="mt-1 text-lg font-bold text-ink">
          {isEdit ? `Edit ${initial!.sales_id}` : "Add User"}
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          {isEdit
            ? "Updates profiles + Auth at once."
            : "Writes to profiles + Auth at once."}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {!isEdit && (
            <label className="flex flex-col gap-1 text-xs text-muted">
              <span>Sales ID</span>
              <input
                id="sales-id"
                value={f.sales_id}
                onChange={(e) => setF({ ...f, sales_id: e.target.value })}
                placeholder="Sales ID"
                className={input}
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span>Full name</span>
            <input
              id="sales-name"
              value={f.sales_name}
              onChange={(e) => setF({ ...f, sales_name: e.target.value })}
              placeholder="Full name"
              className={input}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              <span>Store code</span>
              <input
                id="store-code"
                value={f.store_code}
                onChange={(e) => setF({ ...f, store_code: e.target.value })}
                placeholder="Store code"
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              <span>Store name</span>
              <input
                id="store-name"
                value={f.store_name}
                onChange={(e) => setF({ ...f, store_name: e.target.value })}
                placeholder="Store name"
                className={input}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span>Role</span>
            <select
              id="role"
              value={f.role}
              onChange={(e) => setF({ ...f, role: e.target.value })}
              className={input}
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span>
              {isEdit ? "New password (leave blank to keep)" : "Password"}
            </span>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
                className={`${input} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-pressed={showPw}
                aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-violet-50 hover:text-ink"
              >
                {showPw ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
              </button>
            </div>
          </label>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
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
                className="min-h-[44px] rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger hover:bg-danger/10"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-lg border border-line px-4 py-2 text-sm text-soft hover:bg-violet-50 active:bg-violet-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "..." : "Save"}
            </button>
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={confirmDelete}
        title="Hapus user"
        description={`Menghapus ${initial!.sales_id} dari profiles dan Auth. Tindakan tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
