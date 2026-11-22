begin;

create table plus_one.team_member_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  area text not null check (char_length(btrim(area)) between 1 and 120),
  languages text not null check (char_length(btrim(languages)) between 1 and 150),
  introduction text not null check (char_length(btrim(introduction)) between 1 and 600),
  activities text not null check (char_length(btrim(activities)) between 1 and 200),
  adult_attested boolean not null check (adult_attested),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  submitted_at timestamptz not null default now()
);

create index plus_one_applications_review_queue
  on plus_one.team_member_applications (status, submitted_at, id);

create table plus_one.application_reviews (
  application_id uuid primary key references plus_one.team_member_applications(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  decision text not null check (decision in ('approved', 'declined')),
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  eligibility_verified boolean not null,
  reviewed_at timestamptz not null default now(),
  check (decision <> 'approved' or eligibility_verified)
);

alter table plus_one.team_member_applications enable row level security;
alter table plus_one.application_reviews enable row level security;

revoke all on table plus_one.team_member_applications, plus_one.application_reviews
  from public, anon, authenticated, service_role;
grant select on table plus_one.team_member_applications, plus_one.application_reviews to plus_one_runtime;
grant insert (applicant_id, display_name, area, languages, introduction, activities, adult_attested)
  on table plus_one.team_member_applications to plus_one_runtime;

create policy read_applications on plus_one.team_member_applications
  for select to plus_one_runtime using (
    applicant_id = (select plus_one.actor_id())
    or (select exists (
      select 1 from plus_one.staff_roles where user_id = plus_one.actor_id() and role = 'reviewer'
    ))
  );

create policy submit_application on plus_one.team_member_applications
  for insert to plus_one_runtime with check (applicant_id = (select plus_one.actor_id()));

create policy read_private_reviews on plus_one.application_reviews
  for select to plus_one_runtime using (
    (select exists (
      select 1 from plus_one.staff_roles where user_id = plus_one.actor_id() and role = 'reviewer'
    ))
  );

create function plus_one.review_application(
  p_application_id uuid, p_decision text, p_reason text, p_eligibility_verified boolean
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
     or (p_decision = 'approved' and p_eligibility_verified is distinct from true) then
    raise exception 'Invalid review decision.' using errcode = '22023';
  end if;

  update plus_one.team_member_applications
    set status = p_decision
    where id = p_application_id and status = 'pending' and applicant_id <> actor;

  if not found then
    return false;
  end if;

  insert into plus_one.application_reviews
    (application_id, reviewer_id, decision, reason, eligibility_verified)
  values (p_application_id, actor, p_decision, btrim(p_reason), coalesce(p_eligibility_verified, false));

  return true;
end;
$review$;

revoke all on function plus_one.review_application(uuid, text, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function plus_one.review_application(uuid, text, text, boolean) to plus_one_runtime;

commit;
