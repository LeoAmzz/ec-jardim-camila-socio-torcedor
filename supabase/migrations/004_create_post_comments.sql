create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_post_comments_updated_at on public.post_comments;

create trigger set_post_comments_updated_at
before update on public.post_comments
for each row
execute function public.set_updated_at();

alter table public.post_comments enable row level security;

drop policy if exists "Authenticated users can read post comments" on public.post_comments;
create policy "Authenticated users can read post comments"
on public.post_comments
for select
to authenticated
using (true);

drop policy if exists "Users can create own comments" on public.post_comments;
create policy "Users can create own comments"
on public.post_comments
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can update own comments" on public.post_comments;
create policy "Users can update own comments"
on public.post_comments
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users can delete own comments" on public.post_comments;
create policy "Users can delete own comments"
on public.post_comments
for delete
to authenticated
using (auth.uid() = author_id);
