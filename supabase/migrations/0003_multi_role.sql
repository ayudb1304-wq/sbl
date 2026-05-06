-- Multi-role: allowed_users + profiles get a roles[] column so a single user
-- can hold both 'admin' and 'scorer' simultaneously.

-- allowed_users
alter table allowed_users add column if not exists roles user_role[];
update allowed_users set roles = ARRAY[role]::user_role[] where roles is null;
alter table allowed_users alter column roles set not null;
alter table allowed_users alter column roles set default ARRAY['scorer']::user_role[];

-- profiles
alter table profiles add column if not exists roles user_role[];
update profiles set roles = ARRAY[role]::user_role[] where roles is null;
alter table profiles alter column roles set not null;
alter table profiles alter column roles set default ARRAY['none']::user_role[];

-- Trigger: copy roles array from allowed_users on first sign-in.
-- Also keeps the legacy `role` column populated with the user's "primary" role
-- (admin > scorer > none) so older code paths still work during migration.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_roles user_role[];
  v_primary user_role;
begin
  select roles into v_roles from allowed_users where lower(email) = lower(new.email);
  if v_roles is null then v_roles := ARRAY['none']::user_role[]; end if;

  v_primary := case
    when 'admin'::user_role  = any(v_roles) then 'admin'::user_role
    when 'scorer'::user_role = any(v_roles) then 'scorer'::user_role
    else 'none'::user_role
  end;

  insert into profiles (id, email, roles, role)
  values (new.id, new.email, v_roles, v_primary)
  on conflict (id) do update set
    roles = excluded.roles,
    role  = excluded.role,
    email = excluded.email;
  return new;
end;
$$;
