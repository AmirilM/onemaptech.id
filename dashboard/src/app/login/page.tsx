"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  TriangleAlert,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message))
    return "Sales ID atau password salah. Periksa kembali.";
  if (/email not confirmed/i.test(message))
    return "Akun belum aktif. Hubungi admin.";
  return message || "Login gagal.";
}

export default function LoginPage() {
  const router = useRouter();
  const [salesId, setSalesId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
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
      setError(
        friendlyError(err instanceof Error ? err.message : "Login gagal."),
      );
      setErrorKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  const field =
    "h-[52px] w-full rounded-xl border border-slate-200 bg-white text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition";

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#F4F4F6]">
      <style>{`@keyframes login-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}50%{transform:translateX(5px)}75%{transform:translateX(-3px)}}`}</style>

      {/* Background — kolase One Data, Many Possibilities */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-bg.webp"
          alt=""
          fetchPriority="high"
          className="h-full w-full object-cover object-center"
        />
        {/* Overlay agar card kanan terbaca, kiri tetap vivid */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/0 to-white/80" />
        <div className="absolute inset-0 bg-white/20 lg:hidden" />
      </div>

      <div className="relative grid flex-1 lg:grid-cols-[1fr_520px]">
        {/* Kiri — kosong, headline sudah ada di gambar background */}
        <div className="hidden lg:block" aria-hidden />

        {/* Kanan — form card */}
        <section
          aria-label="Login"
          className="flex items-center justify-center p-6 [padding-bottom:env(safe-area-inset-bottom)] lg:bg-white/40 lg:p-10 lg:backdrop-blur-[2px]"
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_24px_60px_-24px_rgba_76,29,149,0.25)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo-192.png"
              alt="Logo OneMaptech"
              className="mx-auto size-24 object-contain"
            />
            <h1 className="mt-4 text-center text-[26px] font-extrabold tracking-tight text-slate-900">
              ONE<span className="text-violet-600">MAP</span>TECH
            </h1>
            <p className="mt-2 text-center text-[15px] leading-relaxed text-slate-400">
              Retail Intelligence for
              <br />
              A Stronger Tomorrow
            </p>

            <form onSubmit={onSubmit} className="mt-7">
              <div className="flex flex-col gap-3.5">
                <div>
                  <label htmlFor="sales-id" className="sr-only">
                    Sales ID
                  </label>
                  <div className="relative">
                    <User
                      size={20}
                      aria-hidden
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="sales-id"
                      value={salesId}
                      onChange={(e) => setSalesId(e.target.value)}
                      placeholder="Sales ID"
                      autoComplete="username"
                      inputMode="numeric"
                      aria-invalid={error ? true : undefined}
                      className={`${field} pl-11 pr-4`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={20}
                      aria-hidden
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) =>
                        setCapsOn(
                          typeof e.getModifierState === "function" &&
                            e.getModifierState("CapsLock"),
                        )
                      }
                      placeholder="Password"
                      autoComplete="current-password"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={capsOn ? "caps-hint" : undefined}
                      className={`${field} pl-11 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-pressed={showPw}
                      aria-label={
                        showPw ? "Sembunyikan password" : "Tampilkan password"
                      }
                      className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      {showPw ? (
                        <EyeOff size={20} aria-hidden />
                      ) : (
                        <Eye size={20} aria-hidden />
                      )}
                    </button>
                  </div>
                  {capsOn && (
                    <p id="caps-hint" className="mt-1.5 text-xs text-amber-600">
                      Caps Lock aktif.
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div
                  key={errorKey}
                  role="alert"
                  aria-live="assertive"
                  style={{ animation: "login-shake 0.3s ease" }}
                  className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-rose-600"
                >
                  <TriangleAlert
                    size={15}
                    aria-hidden
                    className="mt-0.5 shrink-0"
                  />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !salesId.trim() || !password}
                className="relative mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-violet-600 to-violet-800 text-[15px] font-medium text-white shadow-[0_12px_24px_-8px_rgba_124,58,237,0.5)] transition hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2
                      size={18}
                      aria-hidden
                      className="animate-spin"
                    />
                    Masuk...
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight
                      size={20}
                      aria-hidden
                      className="absolute right-6"
                    />
                  </>
                )}
              </button>

              <p className="mt-5 text-center text-sm text-slate-400">
                Lupa password? Hubungi admin.
              </p>
            </form>

            <div className="mt-8 text-center">
              <p className="text-[13px] text-slate-400">
                Powered by{" "}
                <span className="font-semibold text-slate-500">
                  Amiril Mu&apos;minin
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                © 2026 OneMaptech. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
