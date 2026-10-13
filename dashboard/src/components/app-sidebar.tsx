"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { initials } from "@/lib/names";
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
        /* abaikan */
      }
      return !c;
    });
  }

  return (
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface p-4 transition-[width] duration-200 md:flex ${
        collapsed ? "w-[76px]" : "w-60"
      }`}
    >
      <div className={`flex items-center py-3 ${collapsed ? "flex-col gap-2 px-0" : "justify-between px-2"}`}>
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
          aria-label={collapsed ? "Bentangkan sidebar" : "Ciutkan sidebar"}
          title={collapsed ? "Bentangkan sidebar" : "Ciutkan sidebar"}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-line text-muted hover:bg-white/5 hover:text-ink active:bg-white/10"
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden />
          ) : (
            <PanelLeftClose size={18} aria-hidden />
          )}
        </button>
      </div>
      <div className="mt-2 flex-1">
        <SidebarNav isAdmin={isAdmin} collapsed={collapsed} />
      </div>
      {collapsed ? (
        <div className="flex flex-col items-center gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Foto profil"
              title={`${name} · ${role}`}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              title={`${name} · ${role}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-bright"
            >
              {initials(name)}
            </div>
          )}
          <LogoutButton iconOnly />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Foto profil"
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-bright">
              {initials(name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-xs text-muted">{role}</p>
          </div>
          <LogoutButton />
        </div>
      )}
    </aside>
  );
}
