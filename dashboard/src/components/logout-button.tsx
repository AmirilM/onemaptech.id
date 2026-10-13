"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="flex min-h-[44px] items-center rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:bg-white/5 active:bg-white/10"
    >
      Keluar
    </button>
  );
}
