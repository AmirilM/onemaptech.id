"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
  const pathname = usePathname();

  // Tutup drawer saat pindah route (render-time sync, bukan effect)
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  // Lock body scroll + Escape to close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <>
      <div className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-white/10 bg-abyss/90 px-4 py-3 backdrop-blur [padding-top:env(safe-area-inset-top)] md:hidden">
        <p className="text-sm font-bold tracking-[0.18em] text-cyan-300">
          ONEMAPTECH
        </p>
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          aria-expanded={open}
          aria-controls="mobile-drawer"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 leading-none text-zinc-200 active:bg-white/10"
        >
          <Menu size={20} aria-hidden />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />
          <aside
            id="mobile-drawer"
            className="absolute left-0 top-0 flex h-full max-h-dvh w-72 max-w-[85vw] flex-col border-r border-white/10 bg-panel p-4 [padding-bottom:env(safe-area-inset-bottom)]"
          >
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
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 active:bg-white/10"
              >
                <X size={20} aria-hidden />
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
