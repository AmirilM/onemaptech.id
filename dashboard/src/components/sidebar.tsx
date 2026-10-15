"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

// Halaman yang memakai filter scope global (FilterBar).
const FILTER_PAGES = new Set(["/", "/daily", "/products", "/report"]);

const ITEMS: { href: string; label: string; icon: LucideIcon; admin?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily", label: "Daily Summary", icon: CalendarDays },
  { href: "/products", label: "Product Analytics", icon: Package },
  { href: "/report", label: "Report", icon: ClipboardList },
  { href: "/users", label: "User Management", icon: Users, admin: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function SidebarNav({
  isAdmin,
  collapsed = false,
}: {
  isAdmin: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  // Scope global (?store=&am=) ikut saat pindah halaman filter.
  // Klik link halaman aktif: pertahankan query apa adanya (no-op).
  // ?from/?to milik Report tidak ikut — sifatnya lokal per halaman.
  function hrefFor(href: string): string {
    if (href === pathname) {
      const qs = params.toString();
      return qs ? `${href}?${qs}` : href;
    }
    if (!FILTER_PAGES.has(href)) return href;
    const q = new URLSearchParams();
    const store = params.get("store");
    const am = params.get("am");
    if (store) q.set("store", store);
    if (am) q.set("am", am);
    const qs = q.toString();
    return qs ? `${href}?${qs}` : href;
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
      {ITEMS.filter((i) => !i.admin || isAdmin).map((i) => {
        const active =
          i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
        const Icon = i.icon;
        return (
          <Link
            key={i.href}
            href={hrefFor(i.href)}
            title={collapsed ? i.label : undefined}
            aria-label={collapsed ? i.label : undefined}
            aria-current={active ? "page" : undefined}
            className={`flex items-center rounded-xl py-2.5 text-sm transition ${
              collapsed ? "justify-center px-0" : "gap-3 px-4"
            } ${
              active
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted hover:bg-violet-50 hover:text-ink"
            }`}
          >
            <Icon size={18} strokeWidth={2} aria-hidden className="shrink-0" />
            {!collapsed && i.label}
          </Link>
        );
      })}
    </nav>
  );
}
