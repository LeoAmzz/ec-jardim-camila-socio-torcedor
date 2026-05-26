insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-logos',
  'team-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read team logos" on storage.objects;
create policy "Public can read team logos"
on storage.objects
for select
to public
using (bucket_id = 'team-logos');

drop policy if exists "Admins can upload team logos" on storage.objects;
create policy "Admins can upload team logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'team-logos'
  and public.is_admin()
);

drop policy if exists "Admins can update team logos" on storage.objects;
create policy "Admins can update team logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'team-logos'
  and public.is_admin()
)
with check (
  bucket_id = 'team-logos'
  and public.is_admin()
);

drop policy if exists "Admins can delete team logos" on storage.objects;
create policy "Admins can delete team logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'team-logos'
  and public.is_admin()
);
