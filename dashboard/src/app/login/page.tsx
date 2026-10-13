"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Target,
  TriangleAlert,
  User,
  X,
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
    "min-h-[44px] w-full rounded-lg border border-line bg-canvas py-2.5 text-base text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30 md:text-sm transition";

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <style>{`@keyframes login-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}50%{transform:translateX(5px)}75%{transform:translateX(-3px)}}`}</style>

      {/* Background full-bleed — satu gradasi mengalir, tanpa tepi di tengah */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 size-[36rem] rounded-full bg-primary/[0.13] blur-3xl" />
        <div className="absolute left-1/2 top-1/3 size-[30rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-48 left-1/4 size-[28rem] rounded-full bg-primary/[0.07] blur-3xl" />
      </div>

      <div className="relative grid flex-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Panel kiri — brand */}
      <section
        aria-label="Tentang OneMaptech"
        className="relative hidden bg-transparent lg:flex lg:flex-col lg:justify-start lg:p-12 lg:pl-16 lg:pr-16"
      >
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo-192.png"
            alt="Logo OneMaptech"
            className="size-10 shrink-0 object-contain"
          />
          <span className="text-xl font-bold tracking-tight text-ink">
            OneMaptech
          </span>
        </div>

        <div className="relative flex flex-1 items-center">
          <div className="max-w-xl">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink xl:text-5xl">
            One Platform.{" "}
            <span className="text-primary-bright">Total Visibility.</span>
          </h1>
          <p className="mt-4 text-xl text-soft">
            Your retail performance, unified.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted md:text-base">
            Monitor sales, track achievement, and uncover opportunities across
            every store — all in one place.
          </p>
          </div>
        </div>
      </section>

      {/* Panel kanan — form */}
      <section
        aria-label="Login"
        className="relative flex items-center justify-center bg-transparent p-6 [padding-bottom:env(safe-area-inset-bottom)] lg:pl-16"
      >
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo-192.png"
              alt="Logo OneMaptech"
              className="size-9 shrink-0 object-contain"
            />
            <span className="text-lg font-bold tracking-tight text-ink">
              OneMaptech
            </span>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-line bg-surface p-6 shadow-lg sm:p-8"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-primary-bright">
              SALES LOGIN
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">
              Sales Dashboard
            </h2>
            <p className="mt-1 text-sm text-muted">
              Masuk dengan Sales ID dan password.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="sales-id"
                  className="mb-1.5 block text-xs font-semibold text-soft"
                >
                  Sales ID
                </label>
                <div className="relative">
                  <User
                    size={16}
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                  />
                  <input
                    id="sales-id"
                    value={salesId}
                    onChange={(e) => setSalesId(e.target.value)}
                    placeholder="mis. 23001128"
                    autoComplete="username"
                    inputMode="numeric"
                    aria-invalid={error ? true : undefined}
                    className={`${field} pl-9 ${salesId ? "pr-9" : "pr-3"}`}
                  />
                  {salesId && (
                    <button
                      type="button"
                      onClick={() => setSalesId("")}
                      aria-label="Hapus Sales ID"
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-faint hover:bg-white/5 hover:text-ink"
                    >
                      <X size={15} aria-hidden />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold text-soft"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
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
                    className={`${field} pl-9 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-pressed={showPw}
                    aria-label={
                      showPw ? "Sembunyikan password" : "Tampilkan password"
                    }
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-faint hover:bg-white/5 hover:text-ink"
                  >
                    {showPw ? (
                      <EyeOff size={16} aria-hidden />
                    ) : (
                      <Eye size={16} aria-hidden />
                    )}
                  </button>
                </div>
                {capsOn && (
                  <p id="caps-hint" className="mt-1.5 text-xs text-warning">
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
                className="mt-4 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-[#FDA4AF]"
              >
                <TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !salesId.trim() || !password}
              className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
            >
              {loading && (
                <Loader2 size={16} aria-hidden className="animate-spin" />
              )}
              {loading ? "Masuk..." : "Masuk"}
            </button>

            <p className="mt-4 text-center text-xs text-faint">
              Lupa password? Hubungi admin.
            </p>
          </form>
        </div>
      </section>
      </div>

      {/* Footer full-width */}
      <footer className="relative hidden border-t border-white/5 px-6 py-5 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:px-16">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-muted">
          <BarChart3 size={16} className="text-primary-bright" aria-hidden />
          SALES INTELLIGENCE
        </p>
        <p className="text-xs text-muted">
          © 2026 OneMaptech · Created by{" "}
          <span className="font-semibold text-primary-bright">
            Amiril Mu&apos;minin
          </span>
        </p>
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-muted">
          <Target size={16} className="text-primary-bright" aria-hidden />
          PERFORMANCE TRACKING
        </p>
      </footer>
    </main>
  );
}
