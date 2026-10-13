-- RLS dashboard: baca untuk user login (role authenticated).
-- Jalankan di Supabase Dashboard -> SQL Editor SETELAH tabel + MV dibuat.
--
-- Catatan:
-- 1. Tabel base: SELECT untuk authenticated (scoping role ditegakkan di aplikasi
--    via tabel profiles: Supervisor terkunci ke store_code-nya, Area Manager
--    terkunci ke area_manager-nya via master_stores).
-- 2. Materialized view TIDAK di-RLS (tetap butuh GRANT SELECT): semua user login
--    bisa baca agregat; pembatasan store ditegakkan di aplikasi.
-- 3. profiles: user login boleh baca barisnya sendiri (by sales_id di JWT metadata);
--    admin (service key) bypass RLS.

-- Grant dasar
grant select on public.store_transactions to authenticated;
grant select on public.master_target to authenticated;
grant select on public.master_stores to authenticated;
grant select on public.profiles to authenticated;
grant select on public.mv_dashboard_store to authenticated;
grant select on public.mv_dashboard_area_manager to authenticated;
grant select on public.mv_dashboard_daily to authenticated;
grant select on public.mv_dashboard_store_daily to authenticated;
grant select on public.mv_leaderboard_store to authenticated;
grant select on public.mv_top_product to authenticated;

-- RLS tabel base
alter table public.store_transactions enable row level security;
alter table public.master_target enable row level security;
alter table public.master_stores enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "authenticated read store_transactions" on public.store_transactions;
create policy "authenticated read store_transactions"
    on public.store_transactions for select to authenticated using (true);

drop policy if exists "authenticated read master_target" on public.master_target;
create policy "authenticated read master_target"
    on public.master_target for select to authenticated using (true);

drop policy if exists "authenticated read master_stores" on public.master_stores;
create policy "authenticated read master_stores"
    on public.master_stores for select to authenticated using (true);

-- profiles: baca baris sendiri (sales_id dari user_metadata) ATAU semua bila metadata role Admin
drop policy if exists "profiles self or admin read" on public.profiles;
create policy "profiles self or admin read"
    on public.profiles for select to authenticated
    using (
        sales_id = coalesce((auth.jwt() -> 'user_metadata' ->> 'sales_id'), '')
        or coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'Admin'
    );
