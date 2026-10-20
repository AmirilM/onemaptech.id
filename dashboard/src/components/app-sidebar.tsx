"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { initials } from "@/lib/names";
import BrandSignature from "@/components/brand-signature";
import LogoutButton from "@/components/logout-button";
import SidebarNav from "@/components/sidebar";

const STORAGE_KEY = "omt-sidebar-collapsed";

type Props = {
  name: string;
  role: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export default function AppSidebar({ name, role, avatarUrl, isAdmin }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return (
        typeof window !== "undefined" &&
        window.localStorage.getItem(STORAGE_KEY) === "1"
      );
    } catch {
      return false;
    }
  });

  function toggle() {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  // Submenu clicks while collapsed expand the sidebar so labels stay readable.
  function expand() {
    setCollapsed(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "0");
    } catch {
      /* ignore */
    }
  }

  return (
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-line p-4 transition-[width] duration-200 md:flex ${
        collapsed ? "w-[76px]" : "w-60"
      }`}
      style={{
        backgroundColor: "#F7F6FD",
        backgroundImage:
          "radial-gradient(300px 200px at -20% -5%, rgba(167,139,250,0.20), transparent 60%), radial-gradient(420px 320px at 115% 108%, rgba(124,58,237,0.14), transparent 62%), radial-gradient(circle, rgba(124,58,237,0.14) 1.2px, transparent 1.3px)",
        backgroundSize: "auto, auto, 22px 22px",
        backgroundPosition: "0 0, 0 0, -120px 42%",
        backgroundRepeat: "no-repeat, no-repeat, no-repeat",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-20 h-64 w-64 rotate-45 rounded-[36px] bg-violet-300/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-24 h-56 w-56 rotate-45 rounded-[36px] bg-violet-200/25"
      />
      <div className={`relative flex items-center py-3 ${collapsed ? "flex-col gap-2 px-0" : "justify-between px-2"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo-192.png"
              alt="Logo OneMaptech"
              className="h-9 w-9 shrink-0 object-contain"
            />
            <div>
              <p className="text-sm font-bold tracking-[0.18em] text-ink">
                ONEMAPTECH
              </p>
              <p className="text-[11px] text-muted">Sales Performance Platform</p>
            </div>
          </div>
        )}
        {collapsed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo/logo-192.png"
            alt="Logo OneMaptech"
            title="OneMaptech"
            className="h-10 w-10 shrink-0 object-contain"
          />
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-line text-muted hover:bg-violet-50 hover:text-ink active:bg-violet-100"
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden />
          ) : (
            <PanelLeftClose size={18} aria-hidden />
          )}
        </button>
      </div>
      <div className="relative mt-2 flex-1 overflow-y-auto">
        <SidebarNav
          isAdmin={isAdmin}
          collapsed={collapsed}
          onExpand={expand}
        />
      </div>
      {collapsed ? (
        <div className="relative flex flex-col items-center gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Profile photo"
              title={`${name} · ${role}`}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              title={`${name} · ${role}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
            >
              {initials(name)}
            </div>
          )}
          <LogoutButton iconOnly />
        </div>
      ) : (
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
            <p
              className="truncate text-sm font-semibold leading-tight text-ink"
              title={name}
            >
              {name}
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs leading-tight text-muted">
                {role}
              </p>
              <LogoutButton compact />
            </div>
          </div>
        </div>
      )}

      {/* Brand signature */}
      {!collapsed && <BrandSignature />}
    </aside>
  );
}
