"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [salesId, setSalesId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const email = `${salesId.trim()}@onemaptech.id`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "min-h-[44px] w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-base text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30 md:text-sm";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6 [padding-bottom:env(safe-area-inset-bottom)]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-lg sm:p-8"
      >
        <p className="text-xs font-semibold tracking-[0.2em] text-primary-bright">
          ONEMAPTECH
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Sales Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Masuk dengan Sales ID dan password.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <input
            value={salesId}
            onChange={(e) => setSalesId(e.target.value)}
            placeholder="Sales ID (mis. 23001128)"
            autoComplete="username"
            className={input}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className={input}
          />
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-[#FDA4AF]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 min-h-[44px] w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? "Masuk..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}
