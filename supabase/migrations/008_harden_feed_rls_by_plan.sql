create or replace function public.can_access_post(target_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    left join public.profiles current_profile on current_profile.id = auth.uid()
    where p.id = target_post_id
      and (
        p.visibility = 'public'
        or current_profile.plan_type in ('camisa', 'campeao')
      )
  );
$$;

create or replace function public.can_create_post_visibility(target_visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_visibility = 'public'
    or exists (
      select 1
      from public.profiles current_profile
      where current_profile.id = auth.uid()
        and current_profile.plan_type in ('camisa', 'campeao')
    );
$$;

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
on public.posts
for select
to authenticated
using (
  visibility = 'public'
  or exists (
    select 1
    from public.profiles current_profile
    where current_profile.id = auth.uid()
      and current_profile.plan_type in ('camisa', 'campeao')
  )
);

drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
on public.posts
for insert
to authenticated
with check (
  auth.uid() = author_id
  and public.can_create_post_visibility(visibility)
);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
on public.posts
for update
to authenticated
using (auth.uid() = author_id)
with check (
  auth.uid() = author_id
  and public.can_create_post_visibility(visibility)
);

drop policy if exists "Authenticated users can read post images" on public.post_images;
create policy "Authenticated users can read post images"
on public.post_images
for select
to authenticated
using (public.can_access_post(post_id));

drop policy if exists "Authenticated users can read post likes" on public.post_likes;
create policy "Authenticated users can read post likes"
on public.post_likes
for select
to authenticated
using (public.can_access_post(post_id));

drop policy if exists "Authenticated users can read post comments" on public.post_comments;
create policy "Authenticated users can read post comments"
on public.post_comments
for select
to authenticated
using (public.can_access_post(post_id));
