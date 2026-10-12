-- Tabel profiles untuk login/info sales
-- Jalankan di Supabase Dashboard -> SQL Editor
-- sales_id: kode seperti QF09/QF05 (text, bukan integer)
-- password: plaintext sementara, nantinya migrasi ke Supabase Auth

create table if not exists public.profiles (
    sales_id   text primary key,
    sales_name text not null,
    store_code text,
    store_name text,
    role       text not null
               check (role in ('Store Supervisor', 'Area Manager', 'Regional Head', 'Admin')),
    password   text not null,
    created_at timestamptz not null default now()
);

create index if not exists profiles_store_code_idx
    on public.profiles (store_code);

comment on table public.profiles is 'Profil sales/user; password plaintext sementara, migrasi ke Supabase Auth.';
