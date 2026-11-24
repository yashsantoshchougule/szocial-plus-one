-- Isolated PostgreSQL only. Uses the seeded profile posts and an intentionally broad Storage policy.
begin;

set local role plus_one_runtime;
do $no_actor$
begin
  if exists (select 1 from plus_one.visible_profile_post_photos) then
    raise exception 'The runtime needs a verified actor.';
  end if;
  if plus_one.postable_profile_id() is not null then
    raise exception 'The runtime cannot publish without an actor.';
  end if;
end;
$no_actor$;

set local plus_one.actor_id = '00000005-0000-4000-8000-000000000003';
do $runtime$
begin
  if plus_one.postable_profile_id() is not null then
    raise exception 'A customer without a team profile can publish.';
  end if;
  if (select count(*) from plus_one.visible_profile_post_photos) <> 4 then
    raise exception 'Only the single and multi-photo published posts should appear.';
  end if;
  if has_table_privilege(current_user, 'plus_one.profile_posts', 'select,insert,update,delete')
    or has_table_privilege(current_user, 'plus_one.profile_post_photos', 'select,insert,update,delete')
    or has_table_privilege(current_user, 'plus_one.visible_profile_post_photos', 'insert,update,delete') then
    raise exception 'The runtime can access private base records or write.';
  end if;
end;
$runtime$;

set local plus_one.actor_id = '00000007-0000-4000-8000-000000000012';
do $owner$
begin
  if plus_one.postable_profile_id() is distinct from '00000008-0000-4000-8000-000000000012'::uuid then
    raise exception 'The owner cannot publish to their own profile.';
  end if;
  if plus_one.publish_own_profile_post('00000009-0000-4000-8000-000000000099',
    array['00000010-0000-4000-8000-000000000099'::uuid], array['Missing file']) is not null then
    raise exception 'The owner was able to publish an unuploaded photo.';
  end if;
end;
$owner$;

set local plus_one.actor_id = '00000007-0000-4000-8000-000000000015';
do $paused_owner$
begin
  if plus_one.postable_profile_id() is not null then
    raise exception 'The owner of a paused listing can publish.';
  end if;
end;
$paused_owner$;

set local role authenticated;
set local request.jwt.claims = '{"is_anonymous":false}';
set local storage.operation = 'storage.object.get_authenticated';
do $viewers$
declare
  viewer uuid;
begin
  foreach viewer in array array[
    '00000007-0000-4000-8000-000000000001'::uuid, -- another member
    '00000007-0000-4000-8000-000000000012'::uuid  -- profile owner
  ] loop
    perform set_config('request.jwt.claim.sub', viewer::text, true);
    if has_schema_privilege(current_user, 'plus_one', 'usage') then
      raise exception 'Browser role has direct access to posts.';
    end if;
    begin
      update plus_one.profile_posts set published_at = null;
      raise exception 'Authenticated user changed a post.';
    exception when insufficient_privilege then null;
    end;
    begin
      delete from plus_one.profile_post_photos;
      raise exception 'Authenticated user deleted a post photo record.';
    exception when insufficient_privilege then null;
    end;
    if exists (select 1 from storage.objects where bucket_id = 'plus-one-profile-posts') then
      raise exception 'An authenticated Storage caller can read private post photos directly.';
    end if;
    begin
      insert into storage.objects values ('plus-one-profile-posts', 'untrusted.webp');
      raise exception 'Authenticated user uploaded a post photo.';
    exception when insufficient_privilege then null;
    end;
    update storage.objects set name = 'untrusted.webp' where bucket_id = 'plus-one-profile-posts';
    if found then raise exception 'Authenticated user replaced a post photo.'; end if;
    delete from storage.objects where bucket_id = 'plus-one-profile-posts';
    if found then raise exception 'Authenticated user deleted a post photo.'; end if;
  end loop;
end;
$viewers$;

do $operations$
declare
  operation text;
begin
  foreach operation in array array['storage.object.list', 'storage.object.sign', 'storage.object.sign_many'] loop
    perform set_config('storage.operation', operation, true);
    if exists (select 1 from storage.objects where bucket_id = 'plus-one-profile-posts') then
      raise exception 'Post photos available to operation %.', operation;
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'unrelated-fixture-bucket') then
      raise exception 'An unrelated bucket was affected.';
    end if;
  end loop;
end;
$operations$;

set local storage.operation = 'storage.object.get_authenticated';
set local request.jwt.claims = '{"is_anonymous":true}';
do $anonymous$
begin
  if exists (select 1 from storage.objects where bucket_id = 'plus-one-profile-posts') then
    raise exception 'An anonymous Auth session can read the posts bucket.';
  end if;
end;
$anonymous$;

set local role anon;
do $guest$
begin
  if exists (select 1 from storage.objects where bucket_id = 'plus-one-profile-posts') then
    raise exception 'A guest can read the posts bucket.';
  end if;
end;
$guest$;

reset role;
update plus_one.profile_posts set published_at = null where id = '00000009-0000-4000-8000-000000000002';
set local role plus_one_runtime;
do $unpublished$
begin
  if (select count(*) from plus_one.visible_profile_post_photos) <> 1 then
    raise exception 'Unpublished photos are still visible to the runtime.';
  end if;
end;
$unpublished$;

rollback;
