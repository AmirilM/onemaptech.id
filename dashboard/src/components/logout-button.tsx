"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  if (iconOnly) {
    return (
      <button
        onClick={logout}
        aria-label="Keluar"
        title="Keluar"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-line text-muted hover:bg-violet-50 active:bg-violet-100"
      >
        <LogOut size={18} aria-hidden />
      </button>
    );
  }
  return (
    <button
      onClick={logout}
      className="flex min-h-[44px] items-center rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:bg-violet-50 active:bg-violet-100"
    >
      Keluar
    </button>
  );
}
