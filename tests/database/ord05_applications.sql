-- Run only against an isolated database with the screening and setup migration applied.
begin;

insert into plus_one.staff_roles (user_id, role) values
  ('00000005-0000-4000-8000-000000000002', 'reviewer'),
  ('00000005-0000-4000-8000-000000000003', 'operations');
set local plus_one.actor_id = '00000005-0000-4000-8000-000000000001';
set local role plus_one_runtime;

insert into plus_one.team_member_applications
  (applicant_id, display_name, area, languages, introduction, activities, adult_attested)
values (plus_one.actor_id(), 'Applicant', 'Mumbai', 'Marathi', 'Local walks', 'Walks', true);

insert into plus_one.team_member_applications
  (applicant_id, display_name, area, languages, introduction, activities, adult_attested)
values (plus_one.actor_id(), 'Duplicate', 'Mumbai', 'Marathi', 'Local walks', 'Walks', true)
on conflict (applicant_id) do nothing;

do $applicant$
begin
  if (select count(*) from plus_one.team_member_applications) <> 1
     or not exists (
       select 1 from plus_one.team_member_applications
       where applicant_id = plus_one.actor_id() and status = 'pending' and display_name = 'Applicant'
     ) then
    raise exception 'Expected exactly one pending application with the original details.';
  end if;
  if plus_one.can_set_up_team_profile()
    or plus_one.save_own_team_profile('Pending', 'Mumbai', 'Pending', array['English'], array['coffee']) is not null
    or plus_one.change_own_team_publication('publish') is not null then
    raise exception 'A pending applicant could set up or publish a profile.';
  end if;

  begin
    update plus_one.team_member_applications set status = 'approved' where applicant_id = plus_one.actor_id();
    raise exception 'The applicant directly changed application status.';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into plus_one.team_member_applications
      (applicant_id, display_name, area, languages, introduction, activities, adult_attested)
    values ('00000005-0000-4000-8000-000000000003', 'Other', 'Mumbai', 'Marathi', 'Walks', 'Walks', true);
    raise exception 'The applicant submitted for another account.';
  exception when insufficient_privilege then null;
  end;

  begin
    perform plus_one.review_application(id, 'approved', 'Unauthorized', true, true)
      from plus_one.team_member_applications;
    raise exception 'An ordinary applicant recorded a decision.';
  exception when insufficient_privilege then null;
  end;
end;
$applicant$;

set local plus_one.actor_id = '00000005-0000-4000-8000-000000000004';
insert into plus_one.team_member_applications
  (applicant_id, display_name, area, languages, introduction, activities, adult_attested)
values (plus_one.actor_id(), 'Declined fixture', 'Mumbai', 'Marathi', 'Local walks', 'Walks', true);

set local plus_one.actor_id = '00000005-0000-4000-8000-000000000003';
do $operations$
begin
  if exists (select 1 from plus_one.team_member_applications) then
    raise exception 'Operations can view applications without a reviewer assignment.';
  end if;
end;
$operations$;

set local plus_one.actor_id = '00000005-0000-4000-8000-000000000002';
insert into plus_one.team_member_applications
  (applicant_id, display_name, area, languages, introduction, activities, adult_attested)
values (plus_one.actor_id(), 'A reviewer application', 'Mumbai', 'English', 'Local walks', 'Walks', true);

do $reviewer$
declare
  applicant_id_to_review uuid := (select id from plus_one.team_member_applications where display_name = 'Applicant');
  own_id uuid := (select id from plus_one.team_member_applications where applicant_id = plus_one.actor_id());
  decline_id uuid := (select id from plus_one.team_member_applications where display_name = 'Declined fixture');
begin
  if applicant_id_to_review is null or own_id is null or decline_id is null then
    raise exception 'The assigned reviewer cannot see the queue.';
  end if;

  if plus_one.review_application(own_id, 'approved', 'Own application', true, true) is distinct from false then
    raise exception 'A reviewer decided their own application.';
  end if;

  begin
    perform plus_one.review_application(applicant_id_to_review, 'approved', 'Missing check', false, true);
    raise exception 'A reviewer approved without verifying eligibility.';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform plus_one.review_application(applicant_id_to_review, 'approved', 'Missing background', true, false);
    raise exception 'A reviewer approved without confirming the manual background check.';
  exception when invalid_parameter_value then null;
  end;

  if plus_one.review_application(applicant_id_to_review, 'approved', 'Private synthetic reason', true, true)
     is distinct from true then
    raise exception 'A reviewer could not approve an eligible application.';
  end if;

  if plus_one.review_application(applicant_id_to_review, 'declined', 'Retry', false, false)
     is distinct from false then
    raise exception 'A repeat decision changed an approved application.';
  end if;

  if plus_one.review_application(decline_id, 'declined', 'Decline fixture reason', false, false)
     is distinct from true then
    raise exception 'A reviewer could not decline a pending application.';
  end if;

  if not exists (
    select 1 from plus_one.team_member_applications a
    join plus_one.application_reviews r on r.application_id = a.id
    where a.id = applicant_id_to_review and a.status = 'approved'
      and r.decision = a.status and r.reason = 'Private synthetic reason'
      and r.reviewer_id = plus_one.actor_id() and r.eligibility_verified and r.background_verified
  ) then
    raise exception 'The applicant status and private review do not match the approval.';
  end if;
end;
$reviewer$;

set local plus_one.actor_id = '00000005-0000-4000-8000-000000000004';
do $declined$
begin
  if plus_one.can_set_up_team_profile()
    or plus_one.save_own_team_profile('Declined', 'Mumbai', 'Declined', array['English'], array['coffee']) is not null
    or plus_one.set_own_team_cover(gen_random_uuid()) is not null
    or plus_one.change_own_team_publication('publish') is not null then
    raise exception 'A declined applicant could modify or publish a profile.';
  end if;
end;
$declined$;

set local plus_one.actor_id = '00000005-0000-4000-8000-000000000001';
do $privacy$
begin
  if (select count(*) from plus_one.team_member_applications) <> 1
     or not exists (
       select 1 from plus_one.team_member_applications where applicant_id = plus_one.actor_id() and status = 'approved'
     ) then
    raise exception 'The applicant must see only their own updated status.';
  end if;

  if exists (select 1 from plus_one.application_reviews) then
    raise exception 'The applicant can read private review notes.';
  end if;
  if not plus_one.can_set_up_team_profile()
    or plus_one.save_own_team_profile('Approved', 'Mumbai', 'Approved', array['English'], array['coffee']) is null then
    raise exception 'A screened applicant could not save a draft.';
  end if;
  if plus_one.change_own_team_publication('publish') is not null
     or exists (select 1 from plus_one.discover_members where display_name = 'Approved') then
    raise exception 'A draft became visible without a cover or rate.';
  end if;
end;
$privacy$;

reset role;
rollback;
