-- Dashboard views: agregat siap saji untuk web dashboard (lebih cepat di-load).
-- Jalankan di Supabase Dashboard -> SQL Editor (sekali saja, dan tiap ada perubahan definisi).
-- Setelah itu view di-refresh otomatis oleh scripts/daily_push_supabase.py setiap push harian,
-- atau manual:  select public.refresh_dashboard_views();
--
-- Mapping revenue dari kpi_group: APPLE / ANDROID / ACCESSORIES / VAS.
-- CATATAN: lob 'WATCH' (aksesoris) TIDAK digabung ke 'APPLE WATCH' (disengaja).

-- ============================================================
-- 1. Per STORE: aktual + target + achievement %
-- ============================================================
drop materialized view if exists public.mv_dashboard_store;

create materialized view public.mv_dashboard_store as
select
    t.store_code,
    max(t.store_name) as store_name,

    count(*) as trx_count,
    coalesce(sum(t.qty_item), 0) as total_qty,

    -- 5 KPI utama (revenue)
    coalesce(sum(t.localamount), 0) as revenue_total,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'APPLE'), 0) as revenue_apple,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID'), 0) as revenue_android,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ACCESSORIES'), 0) as revenue_accessories,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'VAS'), 0) as revenue_vas,

    -- Android sales (revenue per brand)
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'SAMSUNG'), 0) as revenue_samsung,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'OPPO'), 0) as revenue_oppo,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'XIAOMI'), 0) as revenue_xiaomi,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'HUAWEI'), 0) as revenue_huawei,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'INFINIX'), 0) as revenue_infinix,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'MOTOROLA'), 0) as revenue_motorola,

    -- Apple qty (per lob)
    coalesce(sum(t.qty_item) filter (where t.lob = 'MAC'), 0) as qty_mac,
    coalesce(sum(t.qty_item) filter (where t.lob = 'IPHONE'), 0) as qty_iphone,
    coalesce(sum(t.qty_item) filter (where t.lob = 'IPAD'), 0) as qty_ipad,
    coalesce(sum(t.qty_item) filter (where t.lob = 'APPLE WATCH'), 0) as qty_apple_watch,
    coalesce(sum(t.qty_item) filter (where t.lob = 'AIRPODS'), 0) as qty_airpods,

    -- Android qty (per brand)
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'SAMSUNG'), 0) as qty_samsung,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'OPPO'), 0) as qty_oppo,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'XIAOMI'), 0) as qty_xiaomi,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'HUAWEI'), 0) as qty_huawei,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'INFINIX'), 0) as qty_infinix,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'MOTOROLA'), 0) as qty_motorola,

    -- Target (dari master_target)
    max(m.total_target) as total_target,
    max(m.apple_target) as apple_target,
    max(m.android_target) as android_target,
    max(m.accessories_target) as accessories_target,
    max(m.vas_target) as vas_target,
    max(m.samsung_target) as samsung_target,
    max(m.oppo_target) as oppo_target,
    max(m.xiaomi_target) as xiaomi_target,
    max(m.huawei_target) as huawei_target,
    max(m.infinix_target) as infinix_target,
    max(m.motorola_target) as motorola_target,

    -- Achievement % (null bila target 0 / tidak ada)
    round(100.0 * sum(t.localamount) / nullif(max(m.total_target), 0), 2) as ach_total_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'APPLE') / nullif(max(m.apple_target), 0), 2) as ach_apple_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'ANDROID') / nullif(max(m.android_target), 0), 2) as ach_android_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'ACCESSORIES') / nullif(max(m.accessories_target), 0), 2) as ach_accessories_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'VAS') / nullif(max(m.vas_target), 0), 2) as ach_vas_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'SAMSUNG') / nullif(max(m.samsung_target), 0), 2) as ach_samsung_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'OPPO') / nullif(max(m.oppo_target), 0), 2) as ach_oppo_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'XIAOMI') / nullif(max(m.xiaomi_target), 0), 2) as ach_xiaomi_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'HUAWEI') / nullif(max(m.huawei_target), 0), 2) as ach_huawei_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'INFINIX') / nullif(max(m.infinix_target), 0), 2) as ach_infinix_pct,
    round(100.0 * sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'MOTOROLA') / nullif(max(m.motorola_target), 0), 2) as ach_motorola_pct
from public.store_transactions t
left join public.master_target m on m.store_code = t.store_code
group by t.store_code;

create index if not exists mv_dashboard_store_code_idx
    on public.mv_dashboard_store (store_code);

-- ============================================================
-- 2. Per HARIAN: aktual saja (target tidak punya dimensi harian)
-- ============================================================
drop materialized view if exists public.mv_dashboard_daily;

create materialized view public.mv_dashboard_daily as
select
    t.date,
    count(*) as trx_count,
    coalesce(sum(t.qty_item), 0) as total_qty,
    coalesce(sum(t.localamount), 0) as revenue_total,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'APPLE'), 0) as revenue_apple,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID'), 0) as revenue_android,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ACCESSORIES'), 0) as revenue_accessories,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'VAS'), 0) as revenue_vas,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'SAMSUNG'), 0) as revenue_samsung,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'OPPO'), 0) as revenue_oppo,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'XIAOMI'), 0) as revenue_xiaomi,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'HUAWEI'), 0) as revenue_huawei,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'INFINIX'), 0) as revenue_infinix,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'MOTOROLA'), 0) as revenue_motorola,
    coalesce(sum(t.qty_item) filter (where t.lob = 'MAC'), 0) as qty_mac,
    coalesce(sum(t.qty_item) filter (where t.lob = 'IPHONE'), 0) as qty_iphone,
    coalesce(sum(t.qty_item) filter (where t.lob = 'IPAD'), 0) as qty_ipad,
    coalesce(sum(t.qty_item) filter (where t.lob = 'APPLE WATCH'), 0) as qty_apple_watch,
    coalesce(sum(t.qty_item) filter (where t.lob = 'AIRPODS'), 0) as qty_airpods,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'SAMSUNG'), 0) as qty_samsung,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'OPPO'), 0) as qty_oppo,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'XIAOMI'), 0) as qty_xiaomi,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'HUAWEI'), 0) as qty_huawei,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'INFINIX'), 0) as qty_infinix,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'MOTOROLA'), 0) as qty_motorola
from public.store_transactions t
group by t.date;

create index if not exists mv_dashboard_daily_date_idx
    on public.mv_dashboard_daily (date);

-- ============================================================
-- 3. KOMBINASI store x tanggal: aktual saja
-- ============================================================
drop materialized view if exists public.mv_dashboard_store_daily;

create materialized view public.mv_dashboard_store_daily as
select
    t.store_code,
    max(t.store_name) as store_name,
    t.date,
    count(*) as trx_count,
    coalesce(sum(t.qty_item), 0) as total_qty,
    coalesce(sum(t.localamount), 0) as revenue_total,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'APPLE'), 0) as revenue_apple,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID'), 0) as revenue_android,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ACCESSORIES'), 0) as revenue_accessories,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'VAS'), 0) as revenue_vas,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'SAMSUNG'), 0) as revenue_samsung,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'OPPO'), 0) as revenue_oppo,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'XIAOMI'), 0) as revenue_xiaomi,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'HUAWEI'), 0) as revenue_huawei,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'INFINIX'), 0) as revenue_infinix,
    coalesce(sum(t.localamount) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'MOTOROLA'), 0) as revenue_motorola,
    coalesce(sum(t.qty_item) filter (where t.lob = 'MAC'), 0) as qty_mac,
    coalesce(sum(t.qty_item) filter (where t.lob = 'IPHONE'), 0) as qty_iphone,
    coalesce(sum(t.qty_item) filter (where t.lob = 'IPAD'), 0) as qty_ipad,
    coalesce(sum(t.qty_item) filter (where t.lob = 'APPLE WATCH'), 0) as qty_apple_watch,
    coalesce(sum(t.qty_item) filter (where t.lob = 'AIRPODS'), 0) as qty_airpods,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'SAMSUNG'), 0) as qty_samsung,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'OPPO'), 0) as qty_oppo,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'XIAOMI'), 0) as qty_xiaomi,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'HUAWEI'), 0) as qty_huawei,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'INFINIX'), 0) as qty_infinix,
    coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'MOTOROLA'), 0) as qty_motorola
from public.store_transactions t
group by t.store_code, t.date;

create index if not exists mv_dashboard_store_daily_idx
    on public.mv_dashboard_store_daily (store_code, date);

-- ============================================================
-- 4. Fungsi refresh (dipanggil daily_push / manual)
-- ============================================================
create or replace function public.refresh_dashboard_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    refresh materialized view public.mv_dashboard_store;
    refresh materialized view public.mv_dashboard_daily;
    refresh materialized view public.mv_dashboard_store_daily;
end;
$$;

comment on materialized view public.mv_dashboard_store is 'Agregat dashboard per store: revenue KPI + target + achievement %.';
comment on materialized view public.mv_dashboard_daily is 'Agregat dashboard per tanggal (aktual saja).';
comment on materialized view public.mv_dashboard_store_daily is 'Agregat dashboard per store x tanggal (aktual saja).';
