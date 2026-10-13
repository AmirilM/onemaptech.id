"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon; admin?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily", label: "Daily Summary", icon: CalendarDays },
  { href: "/products", label: "Product Analytics", icon: Package },
  { href: "/report", label: "Report", icon: ClipboardList },
  { href: "/users", label: "User Management", icon: Users, admin: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.filter((i) => !i.admin || isAdmin).map((i) => {
        const active =
          i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
        const Icon = i.icon;
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
              active
                ? "bg-primary/15 font-semibold text-primary-bright"
                : "text-muted hover:bg-white/5 hover:text-ink"
            }`}
          >
            <Icon size={18} strokeWidth={2} aria-hidden className="shrink-0" />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
