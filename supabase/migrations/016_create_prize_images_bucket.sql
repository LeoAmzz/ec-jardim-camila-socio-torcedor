insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prize-images',
  'prize-images',
  true,
  3145728,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read prize images" on storage.objects;
create policy "Public can read prize images"
on storage.objects
for select
to public
using (bucket_id = 'prize-images');

drop policy if exists "Admins can upload prize images" on storage.objects;
create policy "Admins can upload prize images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'prize-images'
  and public.is_admin()
);

drop policy if exists "Admins can update prize images" on storage.objects;
create policy "Admins can update prize images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'prize-images'
  and public.is_admin()
)
with check (
  bucket_id = 'prize-images'
  and public.is_admin()
);

drop policy if exists "Admins can delete prize images" on storage.objects;
create policy "Admins can delete prize images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'prize-images'
  and public.is_admin()
);
