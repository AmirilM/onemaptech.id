import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { initials } from "@/lib/names";
import LogoutButton from "@/components/logout-button";
import SidebarNav from "@/components/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Suspense
        fallback={
          <aside className="sticky top-0 h-screen w-60 shrink-0 border-r border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
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
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-black/30 p-4">
        <div className="px-2 py-3">
          <p className="text-sm font-bold tracking-[0.18em] text-cyan-300">
            ONEMAPTECH
          </p>
          <p className="text-[11px] text-zinc-500">Sales Performance Platform</p>
        </div>
        <div className="mt-2 flex-1">
          <SidebarNav isAdmin={session.isAdmin} />
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          {session.profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.profile.avatar_url}
              alt="Foto profil"
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-slate-950">
              {initials(name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-zinc-500">{role}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </>
  );
}
