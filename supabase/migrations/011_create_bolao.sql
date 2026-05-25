create table if not exists public.bolao_competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'finished', 'archived')),
  starts_at timestamptz null,
  ends_at timestamptz null,
  points_winner integer not null default 3,
  points_exact_score integer not null default 2,
  subscribers_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bolao_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text null,
  logo_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bolao_matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.bolao_competitions(id) on delete cascade,
  home_team_id uuid not null references public.bolao_teams(id),
  away_team_id uuid not null references public.bolao_teams(id),
  phase text null,
  round_label text null,
  match_datetime timestamptz not null,
  prediction_deadline timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'locked', 'finished', 'cancelled')),
  home_score integer null,
  away_score integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bolao_predictions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.bolao_competitions(id) on delete cascade,
  match_id uuid not null references public.bolao_matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  points_winner integer not null default 0,
  points_exact_score integer not null default 0,
  points_total integer not null default 0,
  calculated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bolao_predictions_match_user_key unique (match_id, user_id)
);

create table if not exists public.bolao_prizes (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.bolao_competitions(id) on delete cascade,
  ranking_type text not null default 'general' check (ranking_type in ('general', 'subscribers')),
  position integer not null,
  title text not null,
  description text null,
  image_url text null,
  created_at timestamptz not null default now()
);

drop trigger if exists set_bolao_competitions_updated_at on public.bolao_competitions;
create trigger set_bolao_competitions_updated_at
before update on public.bolao_competitions
for each row
execute function public.set_updated_at();

drop trigger if exists set_bolao_teams_updated_at on public.bolao_teams;
create trigger set_bolao_teams_updated_at
before update on public.bolao_teams
for each row
execute function public.set_updated_at();

drop trigger if exists set_bolao_matches_updated_at on public.bolao_matches;
create trigger set_bolao_matches_updated_at
before update on public.bolao_matches
for each row
execute function public.set_updated_at();

drop trigger if exists set_bolao_predictions_updated_at on public.bolao_predictions;
create trigger set_bolao_predictions_updated_at
before update on public.bolao_predictions
for each row
execute function public.set_updated_at();

alter table public.bolao_competitions enable row level security;
alter table public.bolao_teams enable row level security;
alter table public.bolao_matches enable row level security;
alter table public.bolao_predictions enable row level security;
alter table public.bolao_prizes enable row level security;

drop policy if exists "Authenticated users can read active bolao competitions" on public.bolao_competitions;
create policy "Authenticated users can read active bolao competitions"
on public.bolao_competitions
for select
to authenticated
using (status <> 'archived');

drop policy if exists "Authenticated users can read bolao teams" on public.bolao_teams;
create policy "Authenticated users can read bolao teams"
on public.bolao_teams
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read bolao matches" on public.bolao_matches;
create policy "Authenticated users can read bolao matches"
on public.bolao_matches
for select
to authenticated
using (true);

drop policy if exists "Users can read own bolao predictions" on public.bolao_predictions;
create policy "Users can read own bolao predictions"
on public.bolao_predictions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own bolao predictions" on public.bolao_predictions;
create policy "Users can create own bolao predictions"
on public.bolao_predictions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own bolao predictions" on public.bolao_predictions;
create policy "Users can update own bolao predictions"
on public.bolao_predictions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can read bolao prizes" on public.bolao_prizes;
create policy "Authenticated users can read bolao prizes"
on public.bolao_prizes
for select
to authenticated
using (true);
