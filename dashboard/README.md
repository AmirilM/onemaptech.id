# Dashboard (Next.js)

Sales performance dashboard — dark premium. Data comes from Supabase MVs
(`mv_dashboard_*`, `mv_leaderboard_store`, `mv_top_product`).

## Setup

```bash
cd dashboard
cp .env.example .env.local   # fill in URL + ANON key (do not commit)
npm install --ignore-scripts
npm run dev                  # http://localhost:3000
```

> A plain `npm install` can fail because of this machine's `allow-scripts`
> policy; `--ignore-scripts` is safe (Next/SWC do not need lifecycle scripts).

## Accounts

Log in with **Sales ID** + password (internal email: `{sales_id}@onemaptech.id`).
Seed/update Auth users from `profiles`:

```bash
python3 scripts/seed_auth.py --dry-run   # check first
python3 scripts/seed_auth.py
```

## SQL to run (SQL Editor, once)

1. `sql/dashboard-views.sql` — 5 materialized views + refresh functions
2. `sql/dashboard-rls.sql` — GRANT + RLS for the `authenticated` role
3. `sql/dashboard-v2.sql` — `avatar_url` column + `avatars` Storage bucket
4. `sql/product-analytics.sql` — RPC `product_analytics_devices` for the Product Analytics page

## Deploy (Vercel)

Root directory: `dashboard/`. Env vars: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (+ `SUPABASE_SERVICE_ROLE_KEY` for the user
CRUD API — without the `NEXT_PUBLIC_` prefix). Never expose the secret key to
the frontend.

## Pages

Sidebar: Dashboard (greeting + KPI + trend + leaderboard + top product),
Daily Summary (trend + table for the 1st–end of month + growth vs yesterday),
Product Analytics (device products only: sublob ranking by Qty/Revenue with
share + cumulative, lob→sublob treemap, and product metrics; Accessories & VAS
are out of scope), Report (preview + export the
active filter to CSV/Excel), User Management (CRUD, Admin-only),
Settings (profile + photo + password).
