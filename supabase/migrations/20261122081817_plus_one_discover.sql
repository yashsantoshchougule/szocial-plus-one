begin;

create table plus_one.team_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  area text not null check (char_length(btrim(area)) between 1 and 100),
  bio text not null check (char_length(btrim(bio)) between 1 and 1500),
  languages text[] not null check (cardinality(languages) between 1 and 8 and array_position(languages, null) is null and array_position(languages, '') is null),
  activities text[] not null check (cardinality(activities) between 1 and 8 and array_position(activities, null) is null and array_position(activities, '') is null),
  hourly_rate_paise integer not null check (hourly_rate_paise > 0),
  cover_key text check (
    cover_key ~ ('^' || id::text || '/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}[.]webp$')
  ),
  published_at timestamptz,
  accepting_bookings boolean not null default false,
  busy_until timestamptz
);

alter table plus_one.team_profiles enable row level security;
revoke all on table plus_one.team_profiles from public, anon, authenticated, service_role, plus_one_runtime;

create index team_profiles_directory on plus_one.team_profiles (published_at desc, id desc)
  where published_at is not null and accepting_bookings and cover_key is not null;
create index team_profiles_directory_area on plus_one.team_profiles (lower(area), published_at desc, id desc)
  where published_at is not null and accepting_bookings and cover_key is not null;
create index team_profiles_directory_activities on plus_one.team_profiles using gin (activities)
  where published_at is not null and accepting_bookings and cover_key is not null;
create unique index team_profiles_cover on plus_one.team_profiles (cover_key) where cover_key is not null;

-- Only these fields leave the profile table. The approval join runs as the view owner.
create view plus_one.published_profiles as
  select p.id, p.display_name, p.area, p.bio, p.languages, p.activities,
    p.hourly_rate_paise, p.cover_key, p.published_at, coalesce(p.busy_until > now(), false) as busy
  from plus_one.team_profiles p
  join plus_one.team_member_applications a on a.applicant_id = p.user_id and a.status = 'approved'
  where p.published_at is not null and p.published_at <= now()
    and p.accepting_bookings and p.cover_key is not null;

create view plus_one.discover_members with (security_barrier = true) as
  select * from plus_one.published_profiles
  where (select plus_one.actor_id()) is not null;

revoke all on table plus_one.published_profiles, plus_one.discover_members
  from public, anon, authenticated, service_role, plus_one_runtime;
grant select on plus_one.discover_members to plus_one_runtime;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('plus-one-discover-covers', 'plus-one-discover-covers', false, 300000, array['image/webp']);

create function plus_one.can_read_discover_cover(object_key text) returns boolean
  language sql stable security definer set search_path = ''
  return auth.uid() is not null
    and (auth.jwt() ->> 'is_anonymous') is distinct from 'true'
    and exists (select 1 from plus_one.published_profiles where cover_key = object_key);
revoke all on function plus_one.can_read_discover_cover(text) from public, anon, authenticated, service_role;
grant execute on function plus_one.can_read_discover_cover(text) to authenticated;

create policy plus_one_discover_cover_select on storage.objects
  for select to authenticated
  using (bucket_id = 'plus-one-discover-covers' and plus_one.can_read_discover_cover(name));

-- Keep unrelated policies from opening this bucket to guests, drafts, or untrusted writes.
create policy plus_one_discover_cover_select_boundary on storage.objects as restrictive
  for select to authenticated
  using (bucket_id is distinct from 'plus-one-discover-covers' or plus_one.can_read_discover_cover(name));
create policy plus_one_discover_cover_guest_boundary on storage.objects as restrictive
  for all to anon using (bucket_id is distinct from 'plus-one-discover-covers') with check (bucket_id is distinct from 'plus-one-discover-covers');
create policy plus_one_discover_cover_insert_boundary on storage.objects as restrictive
  for insert to authenticated with check (bucket_id is distinct from 'plus-one-discover-covers');
create policy plus_one_discover_cover_update_boundary on storage.objects as restrictive
  for update to authenticated using (bucket_id is distinct from 'plus-one-discover-covers') with check (bucket_id is distinct from 'plus-one-discover-covers');
create policy plus_one_discover_cover_delete_boundary on storage.objects as restrictive
  for delete to authenticated using (bucket_id is distinct from 'plus-one-discover-covers');

commit;
