create or replace function public.bolao_score_outcome(home_score integer, away_score integer)
returns integer
language sql
immutable
as $$
  select case
    when home_score > away_score then 1
    when home_score < away_score then -1
    else 0
  end;
$$;

create or replace function public.recalculate_bolao_match_points(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  match_record record;
begin
  select
    m.id,
    m.home_score,
    m.away_score,
    c.points_winner,
    c.points_exact_score
  into match_record
  from public.bolao_matches m
  join public.bolao_competitions c on c.id = m.competition_id
  where m.id = p_match_id
    and m.status = 'finished'
    and m.home_score is not null
    and m.away_score is not null;

  if not found then
    return;
  end if;

  update public.bolao_predictions p
  set
    points_winner = case
      when public.bolao_score_outcome(p.home_score, p.away_score) = public.bolao_score_outcome(match_record.home_score, match_record.away_score)
      then match_record.points_winner
      else 0
    end,
    points_exact_score = case
      when p.home_score = match_record.home_score and p.away_score = match_record.away_score
      then match_record.points_exact_score
      else 0
    end,
    points_total = (
      case
        when public.bolao_score_outcome(p.home_score, p.away_score) = public.bolao_score_outcome(match_record.home_score, match_record.away_score)
        then match_record.points_winner
        else 0
      end
      +
      case
        when p.home_score = match_record.home_score and p.away_score = match_record.away_score
        then match_record.points_exact_score
        else 0
      end
    ),
    calculated_at = now()
  where p.match_id = p_match_id;
end;
$$;

create or replace function public.recalculate_bolao_match_points_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished'
    and new.home_score is not null
    and new.away_score is not null
    and (
      old.status is distinct from new.status
      or old.home_score is distinct from new.home_score
      or old.away_score is distinct from new.away_score
    )
  then
    perform public.recalculate_bolao_match_points(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists recalculate_bolao_predictions_after_match_finish on public.bolao_matches;
drop trigger if exists recalculate_bolao_match_points_after_update on public.bolao_matches;

create trigger recalculate_bolao_match_points_after_update
after update of status, home_score, away_score on public.bolao_matches
for each row
execute function public.recalculate_bolao_match_points_trigger();

drop function if exists public.get_bolao_ranking(uuid);
drop function if exists public.get_bolao_ranking(uuid, boolean);

create or replace function public.get_bolao_ranking(
  p_competition_id uuid,
  p_subscribers_only boolean default false
)
returns table (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  plan_type text,
  points_total bigint,
  winner_hits bigint,
  exact_score_hits bigint,
  predictions_count bigint,
  first_prediction_at timestamptz,
  "position" bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ranking_base as (
    select
      p.user_id,
      pr.full_name,
      pr.username,
      pr.avatar_url,
      pr.plan_type,
      coalesce(sum(p.points_total), 0)::bigint as points_total,
      count(*) filter (where p.points_winner > 0)::bigint as winner_hits,
      count(*) filter (where p.points_exact_score > 0)::bigint as exact_score_hits,
      count(*)::bigint as predictions_count,
      min(p.created_at) as first_prediction_at
    from public.bolao_predictions p
    join public.profiles pr on pr.id = p.user_id
    where p.competition_id = p_competition_id
      and (
        p_subscribers_only = false
        or pr.plan_type in ('camisa', 'campeao')
      )
    group by p.user_id, pr.full_name, pr.username, pr.avatar_url, pr.plan_type
  )
  select
    rb.user_id,
    rb.full_name,
    rb.username,
    rb.avatar_url,
    rb.plan_type,
    rb.points_total,
    rb.winner_hits,
    rb.exact_score_hits,
    rb.predictions_count,
    rb.first_prediction_at,
    rank() over (
      order by rb.points_total desc, rb.exact_score_hits desc, rb.first_prediction_at asc
    )::bigint as "position"
  from ranking_base rb
  order by rb.points_total desc, rb.exact_score_hits desc, rb.first_prediction_at asc;
$$;

grant execute on function public.recalculate_bolao_match_points(uuid) to authenticated;
grant execute on function public.get_bolao_ranking(uuid, boolean) to authenticated;
