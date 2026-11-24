-- Isolated PostgreSQL only. Requires the seeded Discover fixtures.
begin;

set local role plus_one_runtime;
do $runtime$
begin
  if exists (select 1 from plus_one.discover_members) then
    raise exception 'The runtime can see members without a verified actor.';
  end if;
  begin
    perform user_id from plus_one.team_profiles;
    raise exception 'The runtime can see private profile ownership.';
  exception when insufficient_privilege then null;
  end;
end;
$runtime$;

set local plus_one.actor_id = '00000005-0000-4000-8000-000000000003';
do $directory$
begin
  if (select count(*) from plus_one.discover_members) <> 13 then
    raise exception 'The runtime should see 13 approved, published, accepting profiles with covers.';
  end if;
  if (select count(*) from plus_one.discover_members where busy) <> 1 then
    raise exception 'The currently busy member must remain visible.';
  end if;
end;
$directory$;

set local role authenticated;
set local request.jwt.claim.sub = '00000005-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"is_anonymous":false}';
do $viewer$
begin
  if has_schema_privilege('authenticated', 'plus_one', 'USAGE') then
    raise exception 'Browser users can directly access the Plus One business schema.';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'plus-one-discover-covers')
    or (select count(*) from storage.objects where bucket_id = 'unrelated-fixture-bucket') <> 1
    or (select count(*) from storage.objects where bucket_id is null) <> 1 then
    raise exception 'Browser Storage access should deny covers and preserve unrelated buckets.';
  end if;
  begin
    insert into storage.objects(bucket_id, name) values ('plus-one-discover-covers', 'untrusted.webp');
    raise exception 'A signed-in user wrote to the directory cover bucket.';
  exception when insufficient_privilege then null;
  end;
end;
$viewer$;

set local request.jwt.claims = '{"is_anonymous":true}';
do $anonymous_user$
begin
  if exists (select 1 from storage.objects where bucket_id = 'plus-one-discover-covers') then
    raise exception 'An anonymous Auth account can read directory covers.';
  end if;
end;
$anonymous_user$;

set local role anon;
do $guest$
begin
  if exists (select 1 from storage.objects where bucket_id = 'plus-one-discover-covers') then
    raise exception 'The guest role can read a private directory cover.';
  end if;
end;
$guest$;

rollback;
