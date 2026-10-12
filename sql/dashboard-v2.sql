-- Dashboard v2: kolom avatar + bucket Storage avatars.
-- Jalankan di Supabase Dashboard -> SQL Editor.

-- 1. Kolom foto profil
alter table public.profiles
    add column if not exists avatar_url text;

-- 2. Bucket avatars (public read, tulis terbatas)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Policy storage: baca publik, tulis hanya folder milik sendiri ({uid}/...)
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
    on storage.objects for select to anon, authenticated
    using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update"
    on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
    on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
