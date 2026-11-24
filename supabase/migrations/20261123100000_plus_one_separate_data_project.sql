begin;

-- These UUIDs are external account references from verified Main Szocial sessions.
-- Preserve existing values and keep the local foreign keys between business records.
alter table plus_one.account_settings drop constraint account_settings_user_id_fkey;
alter table plus_one.staff_roles drop constraint staff_roles_user_id_fkey;
alter table plus_one.team_member_applications drop constraint team_member_applications_applicant_id_fkey;
alter table plus_one.application_reviews drop constraint application_reviews_reviewer_id_fkey;
alter table plus_one.team_profiles drop constraint team_profiles_user_id_fkey;

comment on column plus_one.account_settings.user_id is 'Verified Main Szocial Auth UUID, external to this database';
comment on column plus_one.staff_roles.user_id is 'Main Szocial Auth UUID assigned to a Plus One staff role by an operator';
comment on column plus_one.team_member_applications.applicant_id is 'Verified Main Szocial Auth UUID, external to this database';
comment on column plus_one.application_reviews.reviewer_id is 'Verified Main Szocial Auth UUID, external to this database';
comment on column plus_one.team_profiles.user_id is 'Verified Main Szocial Auth UUID, external to this database';

drop policy plus_one_discover_cover_select on storage.objects;
drop policy plus_one_discover_cover_select_boundary on storage.objects;
drop policy plus_one_discover_cover_guest_boundary on storage.objects;
drop policy plus_one_discover_cover_insert_boundary on storage.objects;
drop policy plus_one_discover_cover_update_boundary on storage.objects;
drop policy plus_one_discover_cover_delete_boundary on storage.objects;
drop function plus_one.can_read_discover_cover(text);

drop policy plus_one_profile_posts_download on storage.objects;
drop policy plus_one_profile_posts_download_boundary on storage.objects;
drop policy plus_one_profile_posts_guest_boundary on storage.objects;
drop policy plus_one_profile_posts_insert_boundary on storage.objects;
drop policy plus_one_profile_posts_update_boundary on storage.objects;
drop policy plus_one_profile_posts_delete_boundary on storage.objects;
drop function plus_one.can_download_profile_post_photo(text);

-- Only the Plus One server can request these private objects after its business checks.
-- Restrictive policy keeps other Storage policies from exposing these buckets.
create policy plus_one_private_media_boundary on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id is distinct from 'plus-one-discover-covers' and bucket_id is distinct from 'plus-one-profile-posts')
  with check (bucket_id is distinct from 'plus-one-discover-covers' and bucket_id is distinct from 'plus-one-profile-posts');

commit;
