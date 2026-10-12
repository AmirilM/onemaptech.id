"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/names";

type Props = {
  salesId: string;
  userId: string;
  salesName: string;
  role: string;
  storeCode: string | null;
  avatarUrl: string | null;
};

export default function SettingsClient(p: Props) {
  const router = useRouter();
  const [name, setName] = useState(p.salesName);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${p.salesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales_name: name }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan.");
      setMsg("Profil tersimpan.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    setLoading(true);
    try {
      const supabase = createClient();
      const path = `${p.userId}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const res = await fetch(`/api/users/${p.salesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan foto.");
      setMsg("Foto profil diperbarui.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal upload.");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (pw1 !== pw2) {
      setMsg("Konfirmasi password tidak sama.");
      return;
    }
    if (pw1.length < 6) {
      setMsg("Password minimal 6 karakter.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      // Sinkron juga ke kolom profiles (dipakai seed/cek admin)
      await fetch(`/api/users/${p.salesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
      setPw1("");
      setPw2("");
      setMsg("Password diganti.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal ganti password.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400/60";
  const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-5";

  return (
    <div className="mt-5 flex max-w-2xl flex-col gap-4">
      <section className={card}>
        <div className="flex items-center gap-4">
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.avatarUrl}
              alt="Foto profil"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-slate-950">
              {initials(p.salesName)}
            </div>
          )}
          <div>
            <p className="font-semibold">{p.salesName}</p>
            <p className="text-xs text-zinc-500">
              {p.role}
              {p.storeCode ? ` · ${p.storeCode}` : ""}
            </p>
            <label className="mt-2 inline-block cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
              Ganti foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadAvatar}
              />
            </label>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Profil</h2>
        <form onSubmit={saveProfile} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Nama lengkap
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={input}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-fit rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            Simpan profil
          </button>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Ganti password</h2>
        <form onSubmit={changePassword} className="mt-3 flex flex-col gap-3">
          <input
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="Password baru"
            className={input}
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Ulangi password baru"
            className={input}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-fit rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-60"
          >
            Ganti password
          </button>
        </form>
      </section>

      {msg && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
          {msg}
        </p>
      )}
    </div>
  );
}
