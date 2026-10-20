-- ============================================================================
-- RLS dashboard ber-scope (jalankan di Supabase SQL Editor).
-- Urutan: tabel + MV (sql/*.sql) dulu, lalu file ini.
--
-- Sumber kebenaran scope = public.profiles, diakses lewat auth.uid() ->
-- profiles.user_id. user_metadata TIDAK dipakai untuk otorisasi karena user
-- bisa mengubahnya sendiri lewat auth.updateUser().
--
--   Store Supervisor  : 1 store (profiles.store_code)
--   Area Manager      : semua store di area-nya (profiles.sales_name =
--                       master_stores.area_manager)
--   Regional Head     : semua
--   Admin             : semua
--   Tanpa profil / store_code kosong / role lain -> 0 baris (fail-closed)
--
-- Catatan: materialized view tidak mendukung RLS. Akses langsung ke mv_*
-- dicabut, lalu dibuka lewat view berfilter (public.can_see_store / is_global_scope).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Identitas: hubungkan profiles ke auth.users (dipakai policy)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists user_id uuid;
create unique index if not exists profiles_user_id_key
    on public.profiles (user_id);

-- Backfill dari konvensi email sales_id@onemaptech.id
update public.profiles p
set user_id = u.id
from auth.users u
where p.user_id is null
  and u.email is not null
  and lower(split_part(u.email, '@', 1)) = lower(p.sales_id);

-- ---------------------------------------------------------------------------
-- 1. Helper (security definer: baca profiles/master_stores tanpa RLS sendiri)
-- ---------------------------------------------------------------------------
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
    select p.role from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.my_store()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
    select p.store_code from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.my_am()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
    select p.sales_name from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.is_global_scope()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select coalesce(
        (select p.role from public.profiles p where p.user_id = auth.uid())
            in ('Admin', 'Regional Head'),
        false
    );
$$;

-- Inti semua policy: boleh lihat store ini atau tidak?
create or replace function public.can_see_store(p_store text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select case
        when p_store is null or p_store = '' then false
        when public.is_global_scope() then true
        when public.my_role() = 'Store Supervisor'
            then p_store = public.my_store()
        when public.my_role() = 'Area Manager'
            then exists (
                select 1
                from public.master_stores m
                where m.store_code = p_store
                  and m.area_manager = public.my_am()
            )
        else false
    end;
$$;

revoke execute on function public.my_role() from public, anon;
revoke execute on function public.my_store() from public, anon;
revoke execute on function public.my_am() from public, anon;
revoke execute on function public.is_global_scope() from public, anon;
revoke execute on function public.can_see_store(text) from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_store() to authenticated;
grant execute on function public.my_am() to authenticated;
grant execute on function public.is_global_scope() to authenticated;
grant execute on function public.can_see_store(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RLS tabel base
-- ---------------------------------------------------------------------------
alter table public.store_transactions enable row level security;
alter table public.master_target enable row level security;
alter table public.master_stores enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "authenticated read store_transactions" on public.store_transactions;
drop policy if exists "scoped read store_transactions" on public.store_transactions;
create policy "scoped read store_transactions"
    on public.store_transactions for select to authenticated
    using (public.can_see_store(store_code));

drop policy if exists "authenticated read master_target" on public.master_target;
drop policy if exists "scoped read master_target" on public.master_target;
create policy "scoped read master_target"
    on public.master_target for select to authenticated
    using (public.can_see_store(store_code));

drop policy if exists "authenticated read master_stores" on public.master_stores;
drop policy if exists "scoped read master_stores" on public.master_stores;
create policy "scoped read master_stores"
    on public.master_stores for select to authenticated
    using (
        public.is_global_scope()
        or store_code = public.my_store()
        or area_manager = public.my_am()
    );

-- profiles: baris sendiri (via user_id = auth.uid()) atau semua untuk role global
drop policy if exists "profiles self or admin read" on public.profiles;
drop policy if exists "profiles self or global read" on public.profiles;
create policy "profiles self or global read"
    on public.profiles for select to authenticated
    using (user_id = auth.uid() or public.is_global_scope());

-- ---------------------------------------------------------------------------
-- 3. Materialized view: cabut akses langsung, buka lewat view berfilter
-- ---------------------------------------------------------------------------
revoke select on public.mv_dashboard_store from authenticated;
revoke select on public.mv_dashboard_area_manager from authenticated;
revoke select on public.mv_dashboard_daily from authenticated;
revoke select on public.mv_dashboard_store_daily from authenticated;
revoke select on public.mv_leaderboard_store from authenticated;
revoke select on public.mv_top_product from authenticated;

-- View di bawah ini dimiliki pemilik MV (security definer) sehingga tetap bisa
-- membaca MV walau grant-nya dicabut; filternya eksplisit di WHERE.
create or replace view public.v_dashboard_store as
    select m.* from public.mv_dashboard_store m
    where public.can_see_store(m.store_code);

create or replace view public.v_dashboard_store_daily as
    select m.* from public.mv_dashboard_store_daily m
    where public.can_see_store(m.store_code);

create or replace view public.v_leaderboard_store as
    select m.* from public.mv_leaderboard_store m
    where public.can_see_store(m.store_code);

create or replace view public.v_dashboard_area_manager as
    select m.* from public.mv_dashboard_area_manager m
    where public.is_global_scope() or m.area_manager = public.my_am();

-- Agregat global (tanpa dimensi store) hanya untuk role global.
create or replace view public.v_dashboard_daily as
    select m.* from public.mv_dashboard_daily m
    where public.is_global_scope();

create or replace view public.v_top_product as
    select m.* from public.mv_top_product m
    where public.is_global_scope();

-- Freshness: tanggal data terakhir (bukan data sensitif) → boleh untuk semua.
create or replace view public.v_dashboard_latest_date as
    select max(m.date) as date from public.mv_dashboard_daily m;

grant select on public.v_dashboard_store to authenticated;
grant select on public.v_dashboard_store_daily to authenticated;
grant select on public.v_leaderboard_store to authenticated;
grant select on public.v_dashboard_area_manager to authenticated;
grant select on public.v_dashboard_daily to authenticated;
grant select on public.v_top_product to authenticated;
grant select on public.v_dashboard_latest_date to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Grant tabel base (dipakai bersama RLS di atas)
-- ---------------------------------------------------------------------------
grant select on public.store_transactions to authenticated;
grant select on public.master_target to authenticated;
grant select on public.master_stores to authenticated;
grant select on public.profiles to authenticated;
