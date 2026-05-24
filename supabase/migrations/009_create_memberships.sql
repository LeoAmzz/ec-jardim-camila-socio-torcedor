create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_type text not null check (plan_type in ('camisa', 'campeao')),
  provider text not null default 'mercado_pago',
  provider_subscription_id text unique,
  status text not null,
  raw_status text,
  started_at timestamptz null,
  ended_at timestamptz null,
  last_event_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_memberships_updated_at on public.memberships;

create trigger set_memberships_updated_at
before update on public.memberships
for each row
execute function public.set_updated_at();

alter table public.memberships enable row level security;

drop policy if exists "Users can read own memberships" on public.memberships;
create policy "Users can read own memberships"
on public.memberships
for select
to authenticated
using (auth.uid() = user_id);
