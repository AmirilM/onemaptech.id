"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { initials } from "@/lib/names";
import BrandSignature from "@/components/brand-signature";
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

  // Close the drawer when the route changes (render-time sync, not an effect)
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
      <div className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur [padding-top:env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo-192.png"
            alt="Logo OneMaptech"
            className="h-8 w-8 shrink-0 object-contain"
          />
          <p className="text-sm font-bold tracking-[0.18em] text-ink">
            ONEMAPTECH
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-drawer"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-line px-3 py-1.5 leading-none text-soft active:bg-violet-100"
        >
          <Menu size={20} aria-hidden />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside
            id="mobile-drawer"
            className="absolute left-0 top-0 flex h-full max-h-dvh w-72 max-w-[85vw] flex-col overflow-hidden border-r border-line p-4 [padding-bottom:env(safe-area-inset-bottom)]"
            style={{
              backgroundColor: "#F7F6FD",
              backgroundImage:
                "radial-gradient(300px 200px at -20% -5%, rgba(167,139,250,0.20), transparent 60%), radial-gradient(420px 320px at 115% 108%, rgba(124,58,237,0.14), transparent 62%)",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="flex items-center justify-between px-2 py-3">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo/logo-192.png"
                  alt="Logo OneMaptech"
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <div>
                  <p className="text-sm font-bold tracking-[0.18em] text-ink">
                    ONEMAPTECH
                  </p>
                  <p className="text-[11px] text-muted">
                    Sales Performance Platform
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-line px-3 py-1.5 text-muted active:bg-violet-100"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="relative mt-2 flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
              <SidebarNav isAdmin={isAdmin} />
            </div>
            <div className="relative flex items-center gap-3 rounded-xl border border-line bg-white/80 p-3 backdrop-blur">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile photo"
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {initials(name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold leading-snug text-ink">
                  {name}
                </p>
                <p className="truncate text-xs text-muted">{role}</p>
              </div>
              <LogoutButton />
            </div>

            <BrandSignature />
          </aside>
        </div>
      )}
    </>
  );
}
