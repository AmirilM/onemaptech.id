"use client";

import Link from "next/link";

type Crumb = { label: string; href?: string };

export default function Breadcrumb({
  items,
}: {
  items: Crumb[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted mb-2"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1">
            {!last && item.href ? (
              <Link href={item.href} className="text-primary hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink">{item.label}</span>
            )}
            {!last && <span className="text-faint">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
