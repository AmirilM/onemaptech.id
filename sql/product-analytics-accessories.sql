-- Product Analytics (accessories): agregasi siap pakai untuk halaman /products/accessories.
-- Jalankan di Supabase Dashboard -> SQL Editor (sekali saja, dan tiap ada perubahan definisi).
--
-- Sumber: public.store_transactions, baris dengan kpi_group = 'ACCESSORIES'.
-- Satu baris hasil = satu sap_article (satu artikel selalu punya satu brand/lob/deskripsi),
-- sehingga tabel detail tidak pernah menggabungkan dua SKU yang berbeda.
--
-- Keamanan: security invoker -> RLS store_transactions milik pemanggil tetap berlaku
-- (GRANT SELECT untuk authenticated sudah ada di sql/dashboard-rls.sql).

create or replace function public.product_analytics_accessories(
    p_store text default null,
    p_am text default null
)
returns table (
    brand text,
    lob text,
    article text,
    description text,
    qty bigint,
    revenue bigint
)
language sql
stable
security invoker
set search_path = public
as $$
    select
        t.brand_name as brand,
        t.lob as lob,
        t.sap_article as article,
        max(t.sap_description) as description,
        coalesce(sum(t.qty_item), 0)::bigint as qty,
        coalesce(sum(t.localamount), 0)::bigint as revenue
    from public.store_transactions t
    where t.kpi_group = 'ACCESSORIES'
      and coalesce(t.brand_name, '') <> ''
      and coalesce(t.sap_article, '') <> ''
      and (p_store is null or t.store_code = p_store)
      and (p_am is null or t.area_manager = p_am)
    group by t.brand_name, t.lob, t.sap_article
    order by revenue desc;
$$;

comment on function public.product_analytics_accessories(text, text) is
    'Product Analytics: agregat per brand x lob x sap_article untuk produk accessories, scope store/area opsional.';

grant execute on function public.product_analytics_accessories(text, text) to authenticated;
