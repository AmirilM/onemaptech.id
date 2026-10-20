"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

type NavLeaf = { href: string; label: string };

type NavItem = {
  label: string;
  icon: LucideIcon;
  /** Set for items without children. */
  href?: string;
  admin?: boolean;
  children?: NavLeaf[];
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "Daily Sales",
    icon: CalendarDays,
    children: [
      { href: "/daily/store", label: "Daily Store" },
      { href: "/daily/summary", label: "Daily Summary" },
    ],
  },
  {
    label: "Product Analytics",
    icon: Package,
    children: [
      { href: "/products/devices", label: "Devices" },
      { href: "/products/accessories", label: "Accessories" },
      { href: "/products/vas", label: "VAS" },
    ],
  },
  {
    label: "Report",
    icon: ClipboardList,
    children: [
      { href: "/report/daily", label: "Daily Sales Report" },
      { href: "/report/custom", label: "Custom Report" },
      { href: "/report/raw", label: "RAW Data" },
    ],
  },
  { label: "User Management", href: "/users", icon: Users, admin: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function groupFor(pathname: string): string | null {
  return (
    NAV.find((item) =>
      item.children?.some((child) => isActive(pathname, child.href)),
    )?.label ?? null
  );
}

// These pages use the global scope filter (FilterBar). Keep ?store=&am= when
// switching between them; Report's ?from/?to stay local per page.
function carriesScope(href: string): boolean {
  return href === "/" || /^\/(daily|products|report)(\/|$)/.test(href);
}

function groupId(label: string): string {
  return `nav-group-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export default function SidebarNav({
  isAdmin,
  collapsed = false,
  onExpand,
  onNavigate,
}: {
  isAdmin: boolean;
  collapsed?: boolean;
  /** Desktop: called when a group is clicked while the sidebar is collapsed. */
  onExpand?: () => void;
  /** Mobile: called after a leaf link is clicked (closes the drawer). */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  // Accordion state — the active group is open on load and on route change.
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    groupFor(pathname),
  );
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpenGroup(groupFor(pathname));
  }

  // Clicking the active page link keeps the query as-is (no-op).
  function hrefFor(href: string): string {
    if (href === pathname) {
      const qs = params.toString();
      return qs ? `${href}?${qs}` : href;
    }
    if (!carriesScope(href)) return href;
    const q = new URLSearchParams();
    const store = params.get("store");
    const am = params.get("am");
    if (store) q.set("store", store);
    if (am) q.set("am", am);
    const qs = q.toString();
    return qs ? `${href}?${qs}` : href;
  }

  function toggleGroup(label: string) {
    if (collapsed) {
      onExpand?.();
      setOpenGroup(label);
      return;
    }
    setOpenGroup((current) => (current === label ? null : label));
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {NAV.filter((item) => !item.admin || isAdmin).map((item) => {
        const Icon = item.icon;

        if (item.children?.length) {
          const open = !collapsed && openGroup === item.label;
          const active = item.children.some((child) =>
            isActive(pathname, child.href),
          );
          const id = groupId(item.label);

          return (
            <div key={item.label} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                aria-expanded={open}
                aria-controls={open ? id : undefined}
                className={`flex w-full items-center rounded-xl py-2.5 text-sm transition ${
                  collapsed ? "justify-center px-0" : "gap-3 px-4"
                } ${
                  active
                    ? "font-semibold text-ink"
                    : "text-muted hover:bg-violet-50 hover:text-ink"
                }`}
              >
                <span className="relative shrink-0">
                  <Icon size={18} strokeWidth={2} aria-hidden />
                  {collapsed && (
                    <span
                      aria-hidden
                      className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-left">
                      {item.label}
                    </span>
                    <ChevronRight
                      size={16}
                      aria-hidden
                      className={`shrink-0 text-muted transition-transform ${
                        open ? "rotate-90" : ""
                      }`}
                    />
                  </>
                )}
              </button>

              {open && (
                <div
                  id={id}
                  className="ml-4 flex flex-col gap-0.5 border-l border-line pl-3"
                >
                  {item.children.map((child) => {
                    const childActive = isActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={hrefFor(child.href)}
                        onClick={onNavigate}
                        aria-current={childActive ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-lg py-2 pl-2 pr-2 text-[13px] transition ${
                          childActive
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted hover:bg-violet-50 hover:text-ink"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            childActive ? "bg-primary" : "bg-line"
                          }`}
                        />
                        <span className="min-w-0 truncate">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const href = item.href ?? "/";
        const active = isActive(pathname, href);

        return (
          <Link
            key={href}
            href={hrefFor(href)}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
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
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}
