create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  position integer not null default 0 check (position between 0 and 4),
  created_at timestamptz not null default now()
);

create unique index if not exists post_images_post_id_position_key
on public.post_images (post_id, position);

alter table public.post_images enable row level security;

drop policy if exists "Authenticated users can read post images" on public.post_images;
create policy "Authenticated users can read post images"
on public.post_images
for select
to authenticated
using (true);

drop policy if exists "Users can create own post images" on public.post_images;
create policy "Users can create own post images"
on public.post_images
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can delete own post images" on public.post_images;
create policy "Users can delete own post images"
on public.post_images
for delete
to authenticated
using (auth.uid() = author_id);

create or replace function public.enforce_max_post_images()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.post_images
    where post_id = new.post_id
  ) >= 5 then
    raise exception 'A post can have at most 5 images.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_max_post_images_before_insert on public.post_images;

create trigger enforce_max_post_images_before_insert
before insert on public.post_images
for each row
execute function public.enforce_max_post_images();
