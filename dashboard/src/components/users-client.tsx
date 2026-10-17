"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Layers,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import UserForm, { type UserRow } from "@/components/user-form";
import { initials } from "@/lib/names";

type StoreOpt = { code: string; name: string | null };

const AVATARS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-pink-100 text-pink-700",
  "bg-orange-100 text-orange-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-purple-100 text-purple-700",
];

function avatarColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

function UserAvatar({
  salesId,
  salesName,
  avatarUrl,
  onView,
}: {
  salesId: string;
  salesName: string;
  avatarUrl: string | null;
  onView?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  if (avatarUrl && !broken) {
    return (
      <button
        type="button"
        onClick={onView}
        title="View photo"
        aria-label={`View photo of ${salesName}`}
        className="shrink-0 cursor-zoom-in rounded-full outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={`Photo of ${salesName}`}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-9 w-9 rounded-full object-cover"
        />
      </button>
    );
  }
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(salesId)}`}
    >
      {initials(salesName)}
    </div>
  );
}

function roleBadge(role: string): string {
  switch (role) {
    case "Regional Head":
      return "bg-violet-100 text-violet-700";
    case "Area Manager":
      return "bg-blue-100 text-blue-700";
    case "Admin":
      return "bg-gray-100 text-gray-600";
    case "Store Supervisor":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-violet-50 text-soft";
  }
}

function formatLogin(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "-", time: "Never logged in" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "-", time: "Never logged in" };
  const date = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(d);
  return { date, time };
}

const PER_PAGE_OPTS = [8, 12, 16];

export default function UsersClient({
  rows,
  total,
  roles,
  stores,
}: {
  rows: UserRow[];
  total: number;
  roles: string[];
  stores: StoreOpt[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<UserRow> | null | undefined>(
    undefined,
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewing, setViewing] = useState<UserRow | null>(null);

  useEffect(() => {
    if (!viewing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewing(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (storeFilter !== "all" && (r.store_code ?? "") !== storeFilter)
        return false;
      if (
        q &&
        !`${r.sales_name} ${r.sales_id}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, search, roleFilter, storeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const visible = filtered.slice(start, start + perPage);

  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.has(r.sales_id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((r) => next.delete(r.sales_id));
      else visible.forEach((r) => next.add(r.sales_id));
      return next;
    });
  }

  async function handleDelete(salesId: string) {
    if (!confirm(`Delete user ${salesId}? (profiles + Auth)`)) return;
    setDeleting(salesId);
    try {
      const res = await fetch(`/api/users/${salesId}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Failed to delete.");
      setOpenId(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(salesId);
        return next;
      });
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeleting(null);
    }
  }

  // Mini bar for the Registered Roles card (distribution per role)
  const roleCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.role, (map.get(r.role) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const maxRole = Math.max(1, ...roleCounts.map(([, c]) => c));

  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const from = Math.max(1, Math.min(safePage - 1, totalPages - 3));
    for (let p = from; p <= Math.min(totalPages, from + 3); p++) nums.push(p);
    return nums;
  }, [safePage, totalPages]);

  const th =
    "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted";

  return (
    <>
      {/* Reference-style header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary">
            USER MANAGEMENT
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-[32px] md:leading-tight">
            Manage Users
          </h1>
          <p className="mt-1 text-xs text-muted">
            {total} users · writes to profiles + Auth at once
          </p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Plus size={16} aria-hidden /> Add User
        </button>
      </div>

      {/* Stat cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-surface flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-primary">
            <Users size={24} aria-hidden />
          </div>
          <div>
            <p className="text-[13px] text-muted">Total users</p>
            <p className="text-3xl font-bold text-ink">{total}</p>
            <p className="mt-0.5 text-xs text-muted">registered in profiles</p>
          </div>
        </div>
        <div className="card-surface flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-primary">
              <Layers size={24} aria-hidden />
            </div>
            <div>
              <p className="text-[13px] text-muted">Registered roles</p>
              <p className="text-3xl font-bold text-ink">{roles.length}</p>
              <p className="mt-0.5 text-xs text-muted">
                {roleCounts
                  .slice(0, 2)
                  .map(([r, c]) => `${c} ${r}`)
                  .join(" · ") || "-"}
              </p>
            </div>
          </div>
          <div className="flex h-12 items-end gap-1.5" aria-hidden>
            {roleCounts.map(([r, c], i) => (
              <div
                key={r}
                title={`${r}: ${c}`}
                className={`w-3 rounded-sm ${i === roleCounts.length - 1 ? "bg-primary" : "bg-primary/25"}`}
                style={{ height: `${Math.max(20, Math.round((c / maxRole) * 100))}%` }}
              />
            ))}
            {!roleCounts.length && (
              <div className="h-5 w-3 rounded-sm bg-primary/25" />
            )}
          </div>
        </div>
      </div>

      {/* Toolbar + table in a single card */}
      <section className="card-surface mt-4 p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or Sales ID..."
              className="min-h-[44px] w-full rounded-lg border border-line bg-surface pr-3 pl-10 text-sm text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by role"
              className="min-h-[44px] w-full appearance-none rounded-lg border border-line bg-surface pr-9 pl-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 lg:w-44"
            >
              <option value="all">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
            />
          </div>
          <div className="relative">
            <select
              value={storeFilter}
              onChange={(e) => {
                setStoreFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by store"
              className="min-h-[44px] w-full appearance-none rounded-lg border border-line bg-surface pr-9 pl-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 lg:w-44"
            >
              <option value="all">All stores</option>
              {stores.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
            />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-violet-50/50">
                <th className={`${th} w-10`}>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="h-4 w-4 accent-[#7c3aed]"
                  />
                </th>
                <th className={th}>User / Sales ID</th>
                <th className={th}>Store</th>
                <th className={th}>Role</th>
                <th className={th}>Last Login</th>
                <th className={`${th} text-center`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const login = formatLogin(r.last_login);
                const isSel = selected.has(r.sales_id);
                return (
                  <tr
                    key={r.sales_id}
                    className={`border-b border-line last:border-0 hover:bg-violet-50/60 ${isSel ? "bg-violet-50/60" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.sales_id}`}
                        checked={isSel}
                        onChange={() => toggleOne(r.sales_id)}
                        className="h-4 w-4 accent-[#7c3aed]"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          salesId={r.sales_id}
                          salesName={r.sales_name}
                          avatarUrl={r.avatar_url ?? null}
                          onView={
                            r.avatar_url
                              ? () => setViewing(r)
                              : undefined
                          }
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {r.sales_name}
                          </p>
                          <p className="text-xs text-muted">{r.sales_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-ink">{r.store_code ?? "-"}</p>
                      <p className="max-w-48 truncate text-xs text-muted">
                        {r.store_name ?? "No store"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${roleBadge(r.role)}`}
                      >
                        {r.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[13px] text-ink">{login.date}</p>
                      <p className="text-xs text-muted">{login.time}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenId(openId === r.sales_id ? null : r.sales_id)
                          }
                          aria-label={`Actions for ${r.sales_id}`}
                          aria-expanded={openId === r.sales_id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-soft hover:bg-violet-50 active:bg-violet-100"
                        >
                          <EllipsisVertical size={18} aria-hidden />
                        </button>
                        {openId === r.sales_id && (
                          <>
                            <button
                              aria-label="Close menu"
                              onClick={() => setOpenId(null)}
                              className="fixed inset-0 z-10 cursor-default"
                            />
                            <div className="card-surface-strong absolute right-0 z-20 w-36 rounded-xl p-1 text-left">
                              <button
                                onClick={() => {
                                  setOpenId(null);
                                  setEditing(r);
                                }}
                                className="flex min-h-[40px] w-full items-center rounded-lg px-3 text-sm text-soft hover:bg-violet-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(r.sales_id)}
                                disabled={deleting === r.sales_id}
                                className="flex min-h-[40px] w-full items-center rounded-lg px-3 text-sm text-danger hover:bg-danger/10 disabled:opacity-60"
                              >
                                {deleting === r.sales_id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted">
                    {rows.length
                      ? "No users match the filter."
                      : "No users yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            Showing {filtered.length ? `${start + 1}–${Math.min(start + perPage, filtered.length)}` : "0"} of{" "}
            {filtered.length} users
          </p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
                className="min-h-[36px] appearance-none rounded-lg border border-line bg-surface pr-8 pl-3 text-xs text-soft outline-none focus:border-primary"
              >
                {PER_PAGE_OPTS.map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted"
              />
            </div>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-soft hover:bg-violet-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                aria-current={p === safePage ? "page" : undefined}
                className={`h-8 w-8 rounded-lg text-sm ${p === safePage ? "bg-primary font-semibold text-white" : "border border-line text-soft hover:bg-violet-50"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-soft hover:bg-violet-50 disabled:opacity-40"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {editing !== undefined && (
        <UserForm initial={editing} onClose={() => setEditing(undefined)} />
      )}

      {viewing?.avatar_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo of ${viewing.sales_name}`}
          onClick={() => setViewing(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-surface-strong w-full max-w-sm p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {viewing.sales_name}
                </p>
                <p className="text-xs text-muted">
                  {viewing.sales_id} · {viewing.role}
                  {viewing.store_code ? ` · ${viewing.store_code}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close photo"
                autoFocus
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-soft hover:bg-violet-50 active:bg-violet-100"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewing.avatar_url}
              alt={`Photo of ${viewing.sales_name}`}
              className="mt-3 max-h-[70dvh] w-full rounded-xl object-cover"
            />
          </div>
        </div>
      )}
    </>
  );
}
