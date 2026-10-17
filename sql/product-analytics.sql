-- Product Analytics (perangkat): agregasi siap pakai untuk halaman /products.
-- Jalankan di Supabase Dashboard -> SQL Editor (sekali saja, dan tiap ada perubahan definisi).
--
-- Konteks klasifikasi (kesepakatan produk):
--   - Perangkat APPLE  : brand_name = 'APPLE' AND lob IN (MAC, IPHONE, IPAD, APPLE WATCH)
--   - Perangkat ANDROID: brand_name <> 'APPLE' AND lob IN (PHONE, WATCH, TABLETS)
--   - lbl lainnya (CHARGER, CASE, PROTEKSI, PROVIDER, ...) = Accessories/VAS -> TIDAK di sini.
-- Catatan: baris 'APPLE' dengan lob 'WATCH' (bukan 'APPLE WATCH') adalah anomali data
-- dan SENGAJA dikecualikan. LOB perangkat Apple hanya 4: MAC, IPAD, IPHONE, APPLE WATCH.
--
-- Keamanan: security invoker -> RLS store_transactions milik pemanggil tetap berlaku
-- (GRANT SELECT untuk authenticated sudah ada di sql/dashboard-rls.sql).

create or replace function public.product_analytics_devices(
    p_store text default null,
    p_am text default null
)
returns table (
    brand text,
    lob text,
    sublob text,
    qty bigint,
    revenue bigint,
    skus text[]
)
language sql
stable
security invoker
set search_path = public
as $$
    select
        t.brand_name as brand,
        t.lob as lob,
        coalesce(nullif(btrim(t.sublob), ''), '(no sublob)') as sublob,
        coalesce(sum(t.qty_item), 0)::bigint as qty,
        coalesce(sum(t.localamount), 0)::bigint as revenue,
        coalesce(
            array_agg(distinct t.sap_article) filter (where t.sap_article is not null),
            '{}'
        ) as skus
    from public.store_transactions t
    where t.lob in ('MAC', 'IPHONE', 'IPAD', 'APPLE WATCH', 'WATCH', 'PHONE', 'TABLETS')
      and coalesce(t.brand_name, '') not in ('', '0')
      and not (t.brand_name = 'APPLE' and t.lob = 'WATCH')
      and (t.brand_name = 'APPLE' or t.lob in ('PHONE', 'WATCH', 'TABLETS'))
      and (p_store is null or t.store_code = p_store)
      and (p_am is null or t.area_manager = p_am)
    group by 1, 2, 3
    order by qty desc;
$$;

comment on function public.product_analytics_devices(text, text) is
    'Product Analytics: agregat per brand x lob x sublob untuk produk perangkat (Apple + Android), scope store/area opsional.';

grant execute on function public.product_analytics_devices(text, text) to authenticated;
