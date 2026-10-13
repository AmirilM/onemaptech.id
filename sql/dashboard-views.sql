-- Dashboard views: agregat siap saji untuk web dashboard (lebih cepat di-load).
-- Jalankan di Supabase Dashboard -> SQL Editor (sekali saja, dan tiap ada perubahan definisi).
-- Setelah itu view di-refresh otomatis oleh scripts/daily_push_supabase.py setiap push harian,
-- atau manual:  select public.refresh_dashboard_views();
--
-- Mapping revenue dari kpi_group: APPLE / ANDROID / ACCESSORIES / VAS.
-- CATATAN: lob 'WATCH' (aksesoris) TIDAK digabung ke 'APPLE WATCH' (disengaja).
--
-- Urutan DROP: dependant dulu (leaderboard/top_product) baru base view,
-- karena mv_leaderboard_store query dari mv_dashboard_store.
drop materialized view if exists public.mv_leaderboard_store;
drop materialized view if exists public.mv_top_product;
drop materialized view if exists public.mv_dashboard_area_manager;

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
-- 1b. Per AREA MANAGER: aktual + target + achievement %
-- Target dijumlah dari target tiap store (via join store_code),
-- bukan sum langsung dari baris transaksi (hindari double-count).
-- 1 store = 1 AM (validasi: 0 store multi-AM, 0 mismatch master-stores).
-- ============================================================
drop materialized view if exists public.mv_dashboard_area_manager;

create materialized view public.mv_dashboard_area_manager as
with store_agg as (
    select
        t.store_code,
        max(t.area_manager) as area_manager,
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
        coalesce(sum(t.qty_item) filter (where t.kpi_group = 'ANDROID' and t.brand_name = 'MOTOROLA'), 0) as qty_motorola,
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
        max(m.motorola_target) as motorola_target
    from public.store_transactions t
    left join public.master_target m on m.store_code = t.store_code
    group by t.store_code
)
select
    area_manager,
    count(*) as store_count,
    sum(trx_count) as trx_count,
    sum(total_qty) as total_qty,
    sum(revenue_total) as revenue_total,
    sum(revenue_apple) as revenue_apple,
    sum(revenue_android) as revenue_android,
    sum(revenue_accessories) as revenue_accessories,
    sum(revenue_vas) as revenue_vas,
    sum(revenue_samsung) as revenue_samsung,
    sum(revenue_oppo) as revenue_oppo,
    sum(revenue_xiaomi) as revenue_xiaomi,
    sum(revenue_huawei) as revenue_huawei,
    sum(revenue_infinix) as revenue_infinix,
    sum(revenue_motorola) as revenue_motorola,
    sum(qty_mac) as qty_mac,
    sum(qty_iphone) as qty_iphone,
    sum(qty_ipad) as qty_ipad,
    sum(qty_apple_watch) as qty_apple_watch,
    sum(qty_airpods) as qty_airpods,
    sum(qty_samsung) as qty_samsung,
    sum(qty_oppo) as qty_oppo,
    sum(qty_xiaomi) as qty_xiaomi,
    sum(qty_huawei) as qty_huawei,
    sum(qty_infinix) as qty_infinix,
    sum(qty_motorola) as qty_motorola,
    sum(total_target) as total_target,
    sum(apple_target) as apple_target,
    sum(android_target) as android_target,
    sum(accessories_target) as accessories_target,
    sum(vas_target) as vas_target,
    sum(samsung_target) as samsung_target,
    sum(oppo_target) as oppo_target,
    sum(xiaomi_target) as xiaomi_target,
    sum(huawei_target) as huawei_target,
    sum(infinix_target) as infinix_target,
    sum(motorola_target) as motorola_target,
    round(100.0 * sum(revenue_total) / nullif(sum(total_target), 0), 2) as ach_total_pct,
    round(100.0 * sum(revenue_apple) / nullif(sum(apple_target), 0), 2) as ach_apple_pct,
    round(100.0 * sum(revenue_android) / nullif(sum(android_target), 0), 2) as ach_android_pct,
    round(100.0 * sum(revenue_accessories) / nullif(sum(accessories_target), 0), 2) as ach_accessories_pct,
    round(100.0 * sum(revenue_vas) / nullif(sum(vas_target), 0), 2) as ach_vas_pct,
    round(100.0 * sum(revenue_samsung) / nullif(sum(samsung_target), 0), 2) as ach_samsung_pct,
    round(100.0 * sum(revenue_oppo) / nullif(sum(oppo_target), 0), 2) as ach_oppo_pct,
    round(100.0 * sum(revenue_xiaomi) / nullif(sum(xiaomi_target), 0), 2) as ach_xiaomi_pct,
    round(100.0 * sum(revenue_huawei) / nullif(sum(huawei_target), 0), 2) as ach_huawei_pct,
    round(100.0 * sum(revenue_infinix) / nullif(sum(infinix_target), 0), 2) as ach_infinix_pct,
    round(100.0 * sum(revenue_motorola) / nullif(sum(motorola_target), 0), 2) as ach_motorola_pct
from store_agg
where area_manager is not null
group by area_manager;

create index if not exists mv_dashboard_area_manager_am_idx
    on public.mv_dashboard_area_manager (area_manager);

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
-- 4. LEADERBOARD STORE: ranking toko (by achievement & revenue)
-- (DROP sudah di atas bersama dependant lain)
-- ============================================================

create materialized view public.mv_leaderboard_store as
select
    s.store_code,
    s.store_name,
    s.trx_count,
    s.revenue_total,
    s.total_target,
    s.ach_total_pct,
    rank() over (order by s.ach_total_pct desc nulls last) as rank_achievement,
    rank() over (order by s.revenue_total desc) as rank_revenue
from public.mv_dashboard_store s
order by s.ach_total_pct desc nulls last;

create index if not exists mv_leaderboard_store_code_idx
    on public.mv_leaderboard_store (store_code);

-- ============================================================
-- 5. TOP PRODUCT (by sublob): hanya data tersedia (tanpa NULL/'0')
-- (DROP sudah di atas bersama dependant lain)
-- ============================================================

create materialized view public.mv_top_product as
select
    t.sublob as product,
    count(*) as trx_count,
    coalesce(sum(t.qty_item), 0) as total_qty,
    coalesce(sum(t.localamount), 0) as revenue_total,
    rank() over (order by sum(t.localamount) desc) as rank_revenue,
    rank() over (order by sum(t.qty_item) desc) as rank_qty
from public.store_transactions t
where t.sublob is not null and t.sublob <> '0'
group by t.sublob
order by sum(t.localamount) desc;

create index if not exists mv_top_product_name_idx
    on public.mv_top_product (product);

-- ============================================================
-- 6. Fungsi refresh (dipanggil daily_push / manual)
-- ============================================================
create or replace function public.refresh_dashboard_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    refresh materialized view public.mv_dashboard_store;
    refresh materialized view public.mv_dashboard_area_manager;
    refresh materialized view public.mv_dashboard_daily;
    refresh materialized view public.mv_dashboard_store_daily;
    refresh materialized view public.mv_leaderboard_store;
    refresh materialized view public.mv_top_product;
end;
$$;

comment on materialized view public.mv_dashboard_store is 'Agregat dashboard per store: revenue KPI + target + achievement %.';
comment on materialized view public.mv_dashboard_area_manager is 'Agregat dashboard per area manager: revenue KPI + target (sum target store) + achievement %.';
comment on materialized view public.mv_dashboard_daily is 'Agregat dashboard per tanggal (aktual saja).';
comment on materialized view public.mv_dashboard_store_daily is 'Agregat dashboard per store x tanggal (aktual saja).';
comment on materialized view public.mv_leaderboard_store is 'Ranking toko by achievement % dan revenue.';
comment on materialized view public.mv_top_product is 'Top product by sublob (tanpa NULL/0): rank revenue + qty.';
