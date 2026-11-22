begin;

do $legacy$
begin
  if to_regclass('public.plus_one_account_settings') is not null
     or to_regclass('public.plus_one_staff_roles') is not null
     or to_regclass('public.plus_one_applications') is not null
     or to_regclass('public.plus_one_application_reviews') is not null then
    raise exception 'Existing Plus One records require a reviewed forward migration.';
  end if;
end;
$legacy$;

create role plus_one_runtime nologin noinherit nocreatedb nocreaterole noreplication nobypassrls;

-- Fail before exposing any data if shared grants already let the new role cross application boundaries.
do $boundary$
declare
  conflicts text;
begin
  select string_agg(object_name, ', ' order by object_name) into conflicts
  from (
    select format('%I.%I', n.nspname, c.relname) as object_name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname !~ '^pg_(toast|temp)'
      and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
      and has_schema_privilege('plus_one_runtime', n.oid, 'USAGE')
      and case when c.relkind = 'S'
        then has_sequence_privilege('plus_one_runtime', c.oid, 'USAGE,SELECT,UPDATE')
        else has_table_privilege('plus_one_runtime', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          or has_any_column_privilege('plus_one_runtime', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
      end
    union all
    select p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname !~ '^pg_(toast|temp)'
      and p.prosecdef
      and has_schema_privilege('plus_one_runtime', n.oid, 'USAGE')
      and has_function_privilege('plus_one_runtime', p.oid, 'EXECUTE')
    union all
    select format('CREATE on schema %I', n.nspname)
    from pg_namespace n
    where has_schema_privilege('plus_one_runtime', n.oid, 'CREATE')
  ) grants_to_review;

  if conflicts is not null then
    raise exception 'Existing grants cross the Plus One boundary: %', conflicts;
  end if;
end;
$boundary$;

create schema plus_one;
revoke all on schema plus_one from public, anon, authenticated, service_role;
grant usage on schema plus_one to plus_one_runtime;

create function plus_one.actor_id() returns uuid
  language sql stable set search_path = ''
  return nullif(pg_catalog.current_setting('plus_one.actor_id', true), '')::uuid;
revoke all on function plus_one.actor_id() from public, anon, authenticated, service_role;
grant execute on function plus_one.actor_id() to plus_one_runtime;

create table plus_one.account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  starter_completed_at timestamptz not null default now()
);

create table plus_one.staff_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('reviewer', 'operations')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table plus_one.account_settings enable row level security;
alter table plus_one.staff_roles enable row level security;

revoke all on table plus_one.account_settings, plus_one.staff_roles from public, anon, authenticated, service_role;
grant select, insert (user_id) on table plus_one.account_settings to plus_one_runtime;
grant select on table plus_one.staff_roles to plus_one_runtime;

create policy account_settings_read on plus_one.account_settings
  for select to plus_one_runtime using (user_id = (select plus_one.actor_id()));
create policy account_settings_create on plus_one.account_settings
  for insert to plus_one_runtime with check (user_id = (select plus_one.actor_id()));
create policy own_staff_roles on plus_one.staff_roles
  for select to plus_one_runtime using (user_id = (select plus_one.actor_id()));

commit;
