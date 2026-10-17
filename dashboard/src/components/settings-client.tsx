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
      if (!res.ok) throw new Error(j.error ?? "Failed to save.");
      setMsg("Profile saved.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save.");
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
      if (!res.ok) throw new Error(j.error ?? "Failed to save the photo.");
      setMsg("Profile photo updated.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (pw1 !== pw2) {
      setMsg("Passwords do not match.");
      return;
    }
    if (pw1.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      // Also sync to the profiles column (used by the seed/admin check)
      await fetch(`/api/users/${p.salesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
      setPw1("");
      setPw2("");
      setMsg("Password changed.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "min-h-[44px] w-full rounded-lg border border-line bg-canvas px-3 py-2 text-base text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30 md:text-sm";
  const card = "card-surface p-5";

  return (
    <div className="mt-5 flex max-w-2xl flex-col gap-4">
      <section className={card}>
        <div className="flex flex-wrap items-center gap-4">
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.avatarUrl}
              alt="Profile photo"
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {initials(p.salesName)}
            </div>
          )}
          <div className="min-w-0 flex-1 basis-40">
            <p className="break-words font-semibold leading-snug text-ink">
              {p.salesName}
            </p>
            <p className="text-xs text-muted">
              {p.role}
              {p.storeCode ? ` · ${p.storeCode}` : ""}
            </p>
            <label className="mt-2 inline-block cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs text-soft hover:bg-violet-50">
              Change photo
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
        <h2 className="text-sm font-semibold">Profile</h2>
        <form onSubmit={saveProfile} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={input}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-fit min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            Save profile
          </button>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="mt-3 flex flex-col gap-3">
          <input
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="New password"
            className={input}
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Repeat new password"
            className={input}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-fit min-h-[44px] rounded-lg border border-line px-4 py-2 text-sm text-soft hover:bg-violet-50 active:bg-violet-100 disabled:opacity-60"
          >
            Change password
          </button>
        </form>
      </section>

      {msg && (
        <p className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-soft">
          {msg}
        </p>
      )}
    </div>
  );
}
