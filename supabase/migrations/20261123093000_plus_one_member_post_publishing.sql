begin;

create function plus_one.postable_profile_id() returns uuid
  language sql stable security definer set search_path = ''
  return (
    select p.id from plus_one.team_profiles p
    join plus_one.published_profiles eligible on eligible.id = p.id
    where p.user_id = (select plus_one.actor_id())
  );

create function plus_one.publish_own_profile_post(post_uuid uuid, photo_uuids uuid[], descriptions text[])
  returns uuid language plpgsql security definer set search_path = '' as $$
declare
  profile_uuid uuid := plus_one.postable_profile_id();
begin
  if profile_uuid is null or post_uuid is null
    or coalesce(cardinality(photo_uuids), 0) not between 1 and 6
    or cardinality(descriptions) is distinct from cardinality(photo_uuids)
    or array_position(photo_uuids, null) is not null
    or exists (select 1 from unnest(descriptions) d where d is null or char_length(btrim(d)) not between 1 and 250)
  then
    return null;
  end if;

  if exists (
    select 1 from unnest(photo_uuids) as photo(id)
    where not exists (
      select 1 from storage.objects o where o.bucket_id = 'plus-one-profile-posts'
        and o.name = post_uuid::text || '/' || photo.id::text || '.webp'
    )
  ) then
    return null;
  end if;

  insert into plus_one.profile_posts (id, profile_id, published_at)
    values (post_uuid, profile_uuid, now());
  insert into plus_one.profile_post_photos (id, post_id, position, alt_text, object_key)
    select slide.id, post_uuid, slide.position::int, btrim(slide.description),
      post_uuid::text || '/' || slide.id::text || '.webp'
    from unnest(photo_uuids, descriptions) with ordinality as slide(id, description, position);
  return profile_uuid;
end;
$$;

revoke all on function plus_one.postable_profile_id(), plus_one.publish_own_profile_post(uuid, uuid[], text[])
  from public, anon, authenticated, service_role, plus_one_runtime;
grant execute on function plus_one.postable_profile_id(), plus_one.publish_own_profile_post(uuid, uuid[], text[])
  to plus_one_runtime;

commit;
