"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/daily", label: "Daily Summary", icon: "◔" },
  { href: "/products", label: "Product Analytics", icon: "⬣" },
  { href: "/report", label: "Report", icon: "▤" },
  { href: "/users", label: "User Management", icon: "⛉", admin: true },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.filter((i) => !i.admin || isAdmin).map((i) => {
        const active =
          i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
              active
                ? "bg-cyan-400/15 font-semibold text-cyan-200"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <span className="w-5 text-center">{i.icon}</span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
