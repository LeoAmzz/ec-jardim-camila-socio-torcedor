create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  username text unique,
  avatar_url text,
  plan_type text not null default 'torcedor' check (plan_type in ('torcedor', 'camisa', 'campeao')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.normalize_profile_username(raw_username text, fallback_id uuid)
returns text
language plpgsql
as $$
declare
  normalized text;
begin
  normalized := lower(regexp_replace(coalesce(raw_username, ''), '[^a-zA-Z0-9_]', '', 'g'));

  if normalized = '' then
    normalized := 'usuario_' || left(replace(fallback_id::text, '-', ''), 8);
  end if;

  if exists (select 1 from public.profiles where username = normalized and id <> fallback_id) then
    normalized := normalized || '_' || left(replace(fallback_id::text, '-', ''), 6);
  end if;

  return normalized;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_full_name text;
  profile_username text;
  profile_avatar_url text;
begin
  profile_full_name := nullif(new.raw_user_meta_data ->> 'full_name', '');
  profile_username := public.normalize_profile_username(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.id
  );
  profile_avatar_url := nullif(new.raw_user_meta_data ->> 'avatar_url', '');

  insert into public.profiles (
    id,
    email,
    full_name,
    username,
    avatar_url,
    plan_type
  )
  values (
    new.id,
    new.email,
    profile_full_name,
    profile_username,
    profile_avatar_url,
    'torcedor'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_after_auth_user_insert on auth.users;

create trigger create_profile_after_auth_user_insert
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);
