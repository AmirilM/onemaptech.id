# Dashboard (Next.js)

Sales performance dashboard — dark premium. Data comes from Supabase scoped
views (`v_dashboard_*`, `v_leaderboard_store`, `v_top_product`), which fall back
to the raw MVs (`mv_*`) until `sql/dashboard-rls.sql` is applied.

## Role scope

| Role | Area filter | Store filter | Data |
|---|---|---|---|
| Store Supervisor | hidden | locked to `profiles.store_code` | own store |
| Area Manager | locked to `profiles.sales_name` | stores of that area | own area |
| Regional Head | free | free | all stores |
| Admin | free | free | all stores |

Scope is resolved once per request in `src/lib/scope.ts` (`resolveScope`) and is
fail-closed: a missing profile, a supervisor without `store_code`, or an unknown
role gets no data (never "all stores").

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

1. `sql/dashboard-views.sql` — materialized views + refresh functions
2. `sql/profiles.sql` (only for a fresh database; adds `user_id`)
3. `python3 scripts/seed_auth.py` — creates/updates Auth users **and**
   `profiles.user_id` (required by the RLS scope)
4. `sql/dashboard-rls.sql` — scoped RLS + role-filtered views (`v_*`)
   * Store Supervisor → own store; Area Manager → own area;
     Regional Head / Admin → all stores.
   * Re-run it after changing policies. Re-run `seed_auth.py` whenever new
     profiles are inserted outside the User Management page.
5. `sql/dashboard-v2.sql` — `avatar_url` column + `avatars` Storage bucket
6. `sql/product-analytics.sql` — RPC `product_analytics_devices` for the Product Analytics page

> Until step 4 is applied the app falls back to the raw `mv_*` names, so the
> dashboard keeps working — but scoping is then enforced by the app only.

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
