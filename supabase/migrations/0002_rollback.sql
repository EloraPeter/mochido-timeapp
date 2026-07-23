-- Rollback for 0002_admin_authority_foundation.sql
--
-- Restores the exact state after 0001, before 0002 was applied. Safe to
-- run any time before 0003 (Phase B) ever executes, since 0002 never
-- touched profiles.role, institutions.join_code, or any 0001-era object -
-- it only added new things alongside them. Run this in the SQL Editor if
-- Phase A needs to be undone.

drop policy if exists "institution_join_codes_select_admin" on institution_join_codes;
drop policy if exists "institution_join_codes_write_admin" on institution_join_codes;
drop table if exists institution_join_codes;

drop policy if exists "admin_roles_select_own" on admin_roles;
drop policy if exists "admin_roles_select_institution_peers" on admin_roles;
drop policy if exists "admin_roles_insert_scoped" on admin_roles;
drop policy if exists "admin_roles_delete_scoped" on admin_roles;
drop table if exists admin_roles;

drop table if exists platform_admins;

drop function if exists is_platform_admin();
drop function if exists is_admin_of_faculty(uuid);
drop function if exists is_admin_of_department(uuid);
drop function if exists is_admin_of_programme(uuid);
drop function if exists can_grant_admin_role(text, uuid, uuid, uuid, uuid);
drop function if exists current_profile_base_role();

-- Restore the original 0001 definition of is_admin_of_institution
-- (role = 'admin' based) rather than leaving the 0002 (admin_roles based)
-- version in place.
create or replace function is_admin_of_institution(p_institution_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and institution_id = p_institution_id
  );
$$;

-- Restore the original 0001 join-code resolution (reads the legacy
-- institutions.join_code column again).
create or replace function resolve_institution_by_join_code(p_join_code text)
returns table (institution_id uuid, institution_name text)
language sql
security definer
set search_path = public
stable
as $$
  select id, name from institutions where join_code = p_join_code;
$$;

-- Restore the original 0001 profiles insert/update policies (role-based).
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert to authenticated
  with check (id = auth.uid() and role in ('student', 'lecturer'));

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = current_profile_role());

alter table profiles drop constraint if exists profiles_base_role_check;
alter table profiles drop column if exists base_role;

-- institution_join_codes' seeded data goes with the table drop above;
-- institutions.join_code was never touched by 0002, so the original
-- (0001-era) join-code flow is fully restored by this point.
