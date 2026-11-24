begin;

create table plus_one.profile_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references plus_one.team_profiles(id) on delete cascade,
  published_at timestamptz
);

create table plus_one.profile_post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references plus_one.profile_posts(id) on delete cascade,
  position integer not null check (position > 0),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 250),
  object_key text not null unique check (
    object_key ~ ('^' || post_id::text || '/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}[.]webp$')
  ),
  unique (post_id, position) deferrable initially immediate
);

create index profile_posts_profile_order on plus_one.profile_posts (profile_id, published_at desc, id desc);

alter table plus_one.profile_posts enable row level security;
alter table plus_one.profile_post_photos enable row level security;
revoke all on plus_one.profile_posts, plus_one.profile_post_photos
  from public, anon, authenticated, service_role, plus_one_runtime;

create view plus_one.published_profile_post_photos as
  select p.profile_id, p.id as post_id, p.published_at, f.id as photo_id, f.position, f.alt_text, f.object_key
  from plus_one.profile_posts p
  join plus_one.published_profiles eligible on eligible.id = p.profile_id
  join plus_one.profile_post_photos f on f.post_id = p.id
  where p.published_at <= now();

create view plus_one.visible_profile_post_photos with (security_barrier = true) as
  select * from plus_one.published_profile_post_photos
  where (select plus_one.actor_id()) is not null;

revoke all on plus_one.published_profile_post_photos, plus_one.visible_profile_post_photos
  from public, anon, authenticated, service_role, plus_one_runtime;
grant select on plus_one.visible_profile_post_photos to plus_one_runtime;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('plus-one-profile-posts', 'plus-one-profile-posts', false, 1000000, array['image/webp']);

-- This policy lookup needs the private eligibility view and current Auth account status.
create function plus_one.can_download_profile_post_photo(candidate_key text) returns boolean
  language sql stable security definer set search_path = ''
  return (select auth.uid()) is not null
    and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true'
    and exists (
      select 1 from auth.users
      where id = (select auth.uid()) and (banned_until is null or banned_until <= now())
    )
    and exists (select 1 from plus_one.published_profile_post_photos where object_key = candidate_key);
revoke all on function plus_one.can_download_profile_post_photo(text) from public, anon, authenticated, service_role, plus_one_runtime;
grant execute on function plus_one.can_download_profile_post_photo(text) to authenticated;

create policy plus_one_profile_posts_download on storage.objects
  for select to authenticated using (
    bucket_id = 'plus-one-profile-posts'
    and (select storage.allow_only_operation('storage.object.get_authenticated'))
    and plus_one.can_download_profile_post_photo(name)
  );
create policy plus_one_profile_posts_download_boundary on storage.objects as restrictive
  for select to authenticated using (
    bucket_id is distinct from 'plus-one-profile-posts'
    or ((select storage.allow_only_operation('storage.object.get_authenticated'))
      and plus_one.can_download_profile_post_photo(name))
  );
create policy plus_one_profile_posts_guest_boundary on storage.objects as restrictive
  for all to anon using (bucket_id is distinct from 'plus-one-profile-posts')
  with check (bucket_id is distinct from 'plus-one-profile-posts');
create policy plus_one_profile_posts_insert_boundary on storage.objects as restrictive
  for insert to authenticated with check (bucket_id is distinct from 'plus-one-profile-posts');
create policy plus_one_profile_posts_update_boundary on storage.objects as restrictive
  for update to authenticated using (bucket_id is distinct from 'plus-one-profile-posts')
  with check (bucket_id is distinct from 'plus-one-profile-posts');
create policy plus_one_profile_posts_delete_boundary on storage.objects as restrictive
  for delete to authenticated using (bucket_id is distinct from 'plus-one-profile-posts');

commit;
