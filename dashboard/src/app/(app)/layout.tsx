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
    <div className="flex min-h-dvh flex-col bg-canvas md:flex-row">
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
      <div className="min-w-0 w-full flex-1 bg-canvas md:w-auto">{children}</div>
    </>
  );
}
