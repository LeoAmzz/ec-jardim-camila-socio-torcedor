create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_likes_post_id_user_id_key unique (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Authenticated users can read post likes" on public.post_likes;
create policy "Authenticated users can read post likes"
on public.post_likes
for select
to authenticated
using (true);

drop policy if exists "Users can like as themselves" on public.post_likes;
create policy "Users can like as themselves"
on public.post_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove own likes" on public.post_likes;
create policy "Users can remove own likes"
on public.post_likes
for delete
to authenticated
using (auth.uid() = user_id);
