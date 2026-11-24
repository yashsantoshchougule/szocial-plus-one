begin;

-- Keep prior decisions for audit, and give legacy approvals a fresh review.
create table plus_one.application_review_archive as
  select r.* from plus_one.application_reviews r
  join plus_one.team_member_applications a on a.id = r.application_id
  where a.status = 'approved';
alter table plus_one.application_review_archive enable row level security;
revoke all on plus_one.application_review_archive from public, anon, authenticated, service_role, plus_one_runtime;

delete from plus_one.application_reviews r using plus_one.team_member_applications a
  where a.id = r.application_id and a.status = 'approved';
update plus_one.team_profiles p set accepting_bookings = false
  from plus_one.team_member_applications a where a.applicant_id = p.user_id and a.status = 'approved';
update plus_one.team_member_applications set status = 'pending' where status = 'approved';

alter table plus_one.application_reviews
  add column background_verified boolean not null default false,
  add constraint approval_requires_background_check check (decision <> 'approved' or background_verified);

drop function plus_one.review_application(uuid, text, text, boolean);
create function plus_one.review_application(
  p_application_id uuid, p_decision text, p_reason text,
  p_eligibility_verified boolean, p_background_verified boolean
) returns boolean language plpgsql security definer set search_path = '' as $review$
declare
  actor uuid := plus_one.actor_id();
begin
  if actor is null or not exists (
    select 1 from plus_one.staff_roles where user_id = actor and role = 'reviewer'
  ) then
    raise exception 'Reviewer access required.' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved', 'declined')
     or p_reason is null or char_length(btrim(p_reason)) not between 1 and 1000
     or (p_decision = 'approved' and (
       p_eligibility_verified is distinct from true or p_background_verified is distinct from true
     )) then
    raise exception 'Invalid review decision.' using errcode = '22023';
  end if;

  update plus_one.team_member_applications
    set status = p_decision
    where id = p_application_id and status = 'pending' and applicant_id <> actor;
  if not found then return false; end if;

  insert into plus_one.application_reviews
    (application_id, reviewer_id, decision, reason, eligibility_verified, background_verified)
  values
    (p_application_id, actor, p_decision, btrim(p_reason),
      coalesce(p_eligibility_verified, false), coalesce(p_background_verified, false));
  return true;
end;
$review$;

create function plus_one.screened_for_team(candidate uuid) returns boolean
  language sql stable set search_path = ''
  return exists (
    select 1 from plus_one.team_member_applications a
    join plus_one.application_reviews r on r.application_id = a.id
    where a.applicant_id = candidate and a.status = 'approved'
      and r.decision = 'approved' and r.eligibility_verified and r.background_verified
  );

alter table plus_one.team_profiles alter column hourly_rate_paise drop not null;

create or replace view plus_one.published_profiles as
  select p.id, p.display_name, p.area, p.bio, p.languages, p.activities,
    p.hourly_rate_paise, p.cover_key, p.published_at, coalesce(p.busy_until > now(), false) as busy
  from plus_one.team_profiles p
  join plus_one.team_member_applications a on a.applicant_id = p.user_id and a.status = 'approved'
  join plus_one.application_reviews r on r.application_id = a.id
    and r.decision = 'approved' and r.eligibility_verified and r.background_verified
  where p.published_at <= now() and p.accepting_bookings and p.cover_key is not null
    and p.hourly_rate_paise is not null;

create function plus_one.own_team_profile() returns setof plus_one.team_profiles
  language sql stable security definer set search_path = '' as $own$
  select * from plus_one.team_profiles
    where user_id = (select plus_one.actor_id()) and (select plus_one.screened_for_team(plus_one.actor_id()));
$own$;

create function plus_one.save_own_team_profile(
  p_name text, p_area text, p_bio text, p_languages text[], p_activities text[]
) returns uuid language plpgsql security definer set search_path = '' as $save$
declare
  actor uuid := plus_one.actor_id();
  profile_id uuid;
begin
  if not plus_one.screened_for_team(actor)
    or coalesce(cardinality(p_languages), 0) not between 1 and 8
    or exists (select 1 from unnest(p_languages) l where l is null or char_length(btrim(l)) not between 1 and 40)
    or p_activities is null
    or not p_activities <@ array['coffee', 'city-outings', 'events', 'walks', 'food', 'arts-culture']
  then return null; end if;
  insert into plus_one.team_profiles (user_id, display_name, area, bio, languages, activities)
    values (actor, btrim(p_name), btrim(p_area), btrim(p_bio), p_languages, p_activities)
  on conflict (user_id) do update set
    display_name = excluded.display_name, area = excluded.area, bio = excluded.bio,
    languages = excluded.languages, activities = excluded.activities
  returning id into profile_id;
  return profile_id;
end;
$save$;

create function plus_one.set_own_team_cover(p_image_id uuid) returns uuid
  language plpgsql security definer set search_path = '' as $cover$
declare
  actor uuid := plus_one.actor_id();
  profile_id uuid;
begin
  if p_image_id is null or not plus_one.screened_for_team(actor) then return null; end if;
  update plus_one.team_profiles p set cover_key = p.id::text || '/' || p_image_id::text || '.webp'
    where p.user_id = actor and exists (
      select 1 from storage.objects o where o.bucket_id = 'plus-one-discover-covers'
        and o.name = p.id::text || '/' || p_image_id::text || '.webp'
    )
    returning id into profile_id;
  return profile_id;
end;
$cover$;

create function plus_one.change_own_team_publication(p_action text) returns uuid
  language plpgsql security definer set search_path = '' as $publication$
declare
  actor uuid := plus_one.actor_id();
  profile_id uuid;
begin
  if not plus_one.screened_for_team(actor) then return null; end if;
  if p_action = 'pause' then
    update plus_one.team_profiles set accepting_bookings = false
      where user_id = actor and published_at is not null returning id into profile_id;
  elsif p_action = 'publish' then
    update plus_one.team_profiles p set published_at = coalesce(p.published_at, now()), accepting_bookings = true
      where p.user_id = actor and p.hourly_rate_paise is not null and exists (
        select 1 from storage.objects o where o.bucket_id = 'plus-one-discover-covers' and o.name = p.cover_key
      )
      returning id into profile_id;
  end if;
  return profile_id;
end;
$publication$;

revoke all on function plus_one.review_application(uuid, text, text, boolean, boolean),
  plus_one.screened_for_team(uuid), plus_one.own_team_profile(),
  plus_one.save_own_team_profile(text, text, text, text[], text[]), plus_one.set_own_team_cover(uuid),
  plus_one.change_own_team_publication(text)
  from public, anon, authenticated, service_role, plus_one_runtime;

-- Runtime can only check screening for its verified actor.
create function plus_one.can_set_up_team_profile() returns boolean
  language sql stable security definer set search_path = ''
  return plus_one.screened_for_team(plus_one.actor_id());
revoke all on function plus_one.can_set_up_team_profile() from public, anon, authenticated, service_role, plus_one_runtime;

grant execute on function plus_one.review_application(uuid, text, text, boolean, boolean),
  plus_one.can_set_up_team_profile(), plus_one.own_team_profile(),
  plus_one.save_own_team_profile(text, text, text, text[], text[]), plus_one.set_own_team_cover(uuid),
  plus_one.change_own_team_publication(text)
  to plus_one_runtime;

commit;
