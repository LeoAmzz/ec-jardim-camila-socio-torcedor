alter table public.profiles
add column if not exists role text not null default 'user'
check (role in ('user', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can create bolao competitions" on public.bolao_competitions;
create policy "Admins can create bolao competitions"
on public.bolao_competitions
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update bolao competitions" on public.bolao_competitions;
create policy "Admins can update bolao competitions"
on public.bolao_competitions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete bolao competitions" on public.bolao_competitions;
create policy "Admins can delete bolao competitions"
on public.bolao_competitions
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create bolao teams" on public.bolao_teams;
create policy "Admins can create bolao teams"
on public.bolao_teams
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update bolao teams" on public.bolao_teams;
create policy "Admins can update bolao teams"
on public.bolao_teams
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete bolao teams" on public.bolao_teams;
create policy "Admins can delete bolao teams"
on public.bolao_teams
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create bolao matches" on public.bolao_matches;
create policy "Admins can create bolao matches"
on public.bolao_matches
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update bolao matches" on public.bolao_matches;
create policy "Admins can update bolao matches"
on public.bolao_matches
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete bolao matches" on public.bolao_matches;
create policy "Admins can delete bolao matches"
on public.bolao_matches
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create bolao prizes" on public.bolao_prizes;
create policy "Admins can create bolao prizes"
on public.bolao_prizes
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update bolao prizes" on public.bolao_prizes;
create policy "Admins can update bolao prizes"
on public.bolao_prizes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete bolao prizes" on public.bolao_prizes;
create policy "Admins can delete bolao prizes"
on public.bolao_prizes
for delete
to authenticated
using (public.is_admin());
