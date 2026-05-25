alter table public.memberships
add column if not exists access_until timestamptz null;
