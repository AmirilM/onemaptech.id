# Dashboard (Next.js)

Sales performance dashboard — dark premium. Data dari Supabase MV
(`mv_dashboard_*`, `mv_leaderboard_store`, `mv_top_product`).

## Setup

```bash
cd dashboard
cp .env.example .env.local   # isi URL + ANON key (jangan commit)
npm install --ignore-scripts
npm run dev                  # http://localhost:3000
```

> `npm install` polos bisa gagal karena policy `allow-scripts` di mesin ini;
> `--ignore-scripts` aman (Next/SWC tidak butuh lifecycle scripts).

## Akun

Login pakai **Sales ID** + password (email internal: `{sales_id}@onemaptech.id`).
Seed/update user Auth dari `profiles`:

```bash
python3 scripts/seed_auth.py --dry-run   # cek dulu
python3 scripts/seed_auth.py
```

## SQL yang harus dijalankan (SQL Editor, sekali saja)

1. `sql/dashboard-views.sql` — 5 materialized view + fungsi refresh
2. `sql/dashboard-rls.sql` — GRANT + RLS untuk role `authenticated`

## Deploy (Vercel)

Root directory: `dashboard/`. Env vars: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (+ `SUPABASE_SERVICE_ROLE_KEY` untuk API
CRUD user — tanpa prefix `NEXT_PUBLIC_`). Jangan pernah expose secret key ke frontend.

## SQL yang harus dijalankan (SQL Editor, sekali saja)

1. `sql/dashboard-views.sql` — 5 materialized view + fungsi refresh
2. `sql/dashboard-rls.sql` — GRANT + RLS untuk role `authenticated`
3. `sql/dashboard-v2.sql` — kolom `avatar_url` + bucket Storage `avatars`

## Halaman

Sidebar: Dashboard (greeting + KPI + tren + leaderboard + top product),
Daily Summary (tren + tabel tgl 1–akhir bulan + growth vs kemarin),
Product Analytics (share kategori + top 50), Report (preview + export
CSV/Excel filter aktif), User Management (CRUD, Admin-only),
Settings (profil + foto + password).
