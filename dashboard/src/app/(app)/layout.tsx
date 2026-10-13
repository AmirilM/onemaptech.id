import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import MobileNav from "@/components/mobile-nav";
import AppSidebar from "@/components/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas md:flex-row">
      {/* Sentuhan canvas — lavender waves, di belakang konten */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[280px] overflow-hidden md:h-[320px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/canvas-waves.webp"
          alt=""
          className="h-full w-full object-cover object-top [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]"
        />
      </div>
      <Suspense
        fallback={
          <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-line bg-surface p-4 text-sm text-muted md:block">
            Memuat...
          </aside>
        }
      >
        <AppShell>{children}</AppShell>
      </Suspense>
    </div>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const name = session.profile?.sales_name ?? session.email;
  const role = session.profile?.role ?? "-";

  return (
    <>
      <MobileNav
        name={name}
        role={role}
        avatarUrl={session.profile?.avatar_url ?? null}
        isAdmin={session.isAdmin}
      />
      <AppSidebar
        name={name}
        role={role}
        avatarUrl={session.profile?.avatar_url ?? null}
        isAdmin={session.isAdmin}
      />
      <div className="relative z-10 min-w-0 w-full flex-1 bg-transparent md:w-auto">{children}</div>
    </>
  );
}
