"use client";

import { useState } from "react";
import { initials } from "@/lib/names";
import LogoutButton from "@/components/logout-button";
import SidebarNav from "@/components/sidebar";

type Props = {
  name: string;
  role: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export default function MobileNav({ name, role, avatarUrl, isAdmin }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#070b14]/90 px-4 py-3 backdrop-blur md:hidden">
        <p className="text-sm font-bold tracking-[0.18em] text-cyan-300">
          ONEMAPTECH
        </p>
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="rounded-lg border border-white/10 px-3 py-1.5 text-lg leading-none text-zinc-200"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#0b1220] p-4">
            <div className="flex items-center justify-between px-2 py-3">
              <div>
                <p className="text-sm font-bold tracking-[0.18em] text-cyan-300">
                  ONEMAPTECH
                </p>
                <p className="text-[11px] text-zinc-500">
                  Sales Performance Platform
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
              <SidebarNav isAdmin={isAdmin} />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Foto profil"
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-slate-950">
                  {initials(name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-zinc-500">{role}</p>
              </div>
              <LogoutButton />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
