-- Isolated test database only. Every fixture change rolls back.
begin;

do $boundary$
begin
  if has_schema_privilege('authenticated', 'plus_one', 'USAGE')
     or has_schema_privilege('anon', 'plus_one', 'USAGE')
     or has_schema_privilege('service_role', 'plus_one', 'USAGE')
     or has_schema_privilege('plus_one_runtime', 'auth', 'USAGE')
     or has_table_privilege('plus_one_runtime', 'public.profiles', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Unexpected effective grants at the Plus One boundary.';
  end if;
end;
$boundary$;

insert into auth.users (id) values
  ('00000003-0000-4000-8000-000000000001'),
  ('00000003-0000-4000-8000-000000000002');
insert into plus_one.staff_roles (user_id, role) values ('00000003-0000-4000-8000-000000000002', 'reviewer');
insert into plus_one.account_settings (user_id) values ('00000003-0000-4000-8000-000000000002');

set local role plus_one_runtime;
set local plus_one.actor_id = '00000003-0000-4000-8000-000000000001';

insert into plus_one.account_settings(user_id) values (plus_one.actor_id()) on conflict (user_id) do nothing;
insert into plus_one.account_settings(user_id) values (plus_one.actor_id()) on conflict (user_id) do nothing;

do $resident$
begin
  if (select count(*) from plus_one.account_settings) <> 1
     or exists (select 1 from plus_one.staff_roles) then
    raise exception 'The resident can see another account or a staff role.';
  end if;

  begin
    perform 1 from public.profiles;
    raise exception 'The Plus One runtime read Main profiles.';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set display_name = 'unauthorized';
    raise exception 'The Plus One runtime wrote Main profiles.';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into plus_one.staff_roles (user_id, role) values (plus_one.actor_id(), 'reviewer');
    raise exception 'The Plus One runtime granted a reviewer role.';
  exception when insufficient_privilege then null;
  end;
end;
$resident$;

set local role authenticated;
do $browser$
begin
  begin
    perform 1 from plus_one.account_settings;
    raise exception 'The browser database role read the private schema.';
  exception when insufficient_privilege then null;
  end;
end;
$browser$;

rollback;
