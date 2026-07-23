-- Milestone 1, Phase A: Delegated Administration Foundation
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
--
-- ADDITIVE ONLY. Does not drop or alter `profiles.role`, and does not
-- touch `institutions.join_code`. Both are left fully intact so the
-- previous (Milestone 0) code path keeps working if anything here needs
-- to be rolled back - see 0002_rollback.sql.
--
-- Real profile rows already exist from Milestone 0 testing, so this is
-- treated as a production migration: backfill first, verify, only THEN
-- (in a separate, later migration - 0003_drop_legacy_role.sql, NOT this
-- file) remove the old column.

-- ============================================================
-- 1. profiles.base_role - identity, not authority.
--    "lecturer" kept as the value (not renamed to "staff") - the multi-
--    responsibility problem is solved by admin_roles below, independent
--    of what the base identity value is called, and "lecturer" is
--    already threaded through the entire existing codebase.
-- ============================================================

alter table profiles add column if not exists base_role text;

update profiles set base_role = role where base_role is null;

alter table profiles drop constraint if exists profiles_base_role_check;
alter table profiles add constraint profiles_base_role_check
  check (base_role in ('student', 'lecturer'));

-- ============================================================
-- 2. platform_admins - platform-wide authority. Zero client access of
--    any kind, by design - reachable only through is_platform_admin()
--    below, or directly by you via the Supabase dashboard (which
--    bypasses RLS). This is intentional, not an oversight.
-- ============================================================

create table if not exists platform_admins (
  user_id uuid primary key references profiles(id) on delete cascade,
  granted_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;
-- No policies created for any role, including `authenticated` - this
-- table has no client-facing access path at all.

create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- ============================================================
-- 3. admin_roles - institutional/scoped authority. A person's base_role
--    (identity) and their admin_roles rows (authority) are independent -
--    a lecturer can also hold a department_admin row, etc.
-- ============================================================

create table if not exists admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('institution_admin', 'faculty_admin', 'department_admin', 'programme_admin')),
  institution_id uuid references institutions(id),
  faculty_id uuid references faculties(id),
  department_id uuid references departments(id),
  programme_id uuid references programmes(id),
  granted_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  -- Each tier must carry the scope column that actually defines it -
  -- guards against a malformed row that claims a role with no real scope.
  constraint admin_roles_scope_matches_role check (
    (role = 'institution_admin' and institution_id is not null)
    or (role = 'faculty_admin' and faculty_id is not null)
    or (role = 'department_admin' and department_id is not null)
    or (role = 'programme_admin' and programme_id is not null)
  )
);

create index if not exists admin_roles_user_id_idx on admin_roles(user_id);
create index if not exists admin_roles_institution_id_idx on admin_roles(institution_id);

alter table admin_roles enable row level security;

-- Scope-check helpers. institution_admin's authority cascades down through
-- faculty/department/programme; the lower-tier checks are written in now
-- (per "schema should support them") even though no console/UI grants
-- faculty_admin/department_admin/programme_admin rows yet - only
-- institution_admin is actually reachable through this milestone's UI.

create or replace function is_admin_of_institution(p_institution_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_platform_admin()
    or exists (
      select 1 from admin_roles
      where user_id = auth.uid()
        and role = 'institution_admin'
        and institution_id = p_institution_id
    );
$$;

create or replace function is_admin_of_faculty(p_faculty_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_platform_admin()
    or exists (
      select 1 from admin_roles ar
      join faculties f on f.id = p_faculty_id
      where ar.user_id = auth.uid()
        and (
          (ar.role = 'institution_admin' and ar.institution_id = f.institution_id)
          or (ar.role = 'faculty_admin' and ar.faculty_id = p_faculty_id)
        )
    );
$$;

create or replace function is_admin_of_department(p_department_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_platform_admin()
    or exists (
      select 1 from admin_roles ar
      join departments d on d.id = p_department_id
      join faculties f on f.id = d.faculty_id
      where ar.user_id = auth.uid()
        and (
          (ar.role = 'institution_admin' and ar.institution_id = f.institution_id)
          or (ar.role = 'faculty_admin' and ar.faculty_id = d.faculty_id)
          or (ar.role = 'department_admin' and ar.department_id = p_department_id)
        )
    );
$$;

create or replace function is_admin_of_programme(p_programme_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_platform_admin()
    or exists (
      select 1 from admin_roles ar
      join programmes pr on pr.id = p_programme_id
      join departments d on d.id = pr.department_id
      join faculties f on f.id = d.faculty_id
      where ar.user_id = auth.uid()
        and (
          (ar.role = 'institution_admin' and ar.institution_id = f.institution_id)
          or (ar.role = 'faculty_admin' and ar.faculty_id = d.faculty_id)
          or (ar.role = 'department_admin' and ar.department_id = d.id)
          or (ar.role = 'programme_admin' and ar.programme_id = p_programme_id)
        )
    );
$$;

-- Delegation-rule check for granting a NEW admin_roles row: "a user can
-- only grant authority equal to or below their own authority scope."
-- Only the institution_admin branch is enabled right now - matches this
-- milestone's scope (institution_admin appointing another
-- institution_admin within their own institution). The
-- faculty_admin/department_admin/programme_admin branches are
-- deliberately NOT added yet - there is no console for those tiers, and
-- enabling the grant path without it would be unused, untested surface
-- area. Add the mirrored branches (using is_admin_of_faculty(), etc.)
-- when each tier's console actually ships.
create or replace function can_grant_admin_role(
  p_role text,
  p_institution_id uuid,
  p_faculty_id uuid,
  p_department_id uuid,
  p_programme_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    is_platform_admin()
    or (
      p_role = 'institution_admin'
      and p_institution_id is not null
      and is_admin_of_institution(p_institution_id)
    );
$$;

drop policy if exists "admin_roles_select_own" on admin_roles;
create policy "admin_roles_select_own" on admin_roles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "admin_roles_select_institution_peers" on admin_roles;
create policy "admin_roles_select_institution_peers" on admin_roles for select to authenticated
  using (institution_id is not null and is_admin_of_institution(institution_id));

drop policy if exists "admin_roles_insert_scoped" on admin_roles;
create policy "admin_roles_insert_scoped" on admin_roles for insert to authenticated
  with check (can_grant_admin_role(role, institution_id, faculty_id, department_id, programme_id));

drop policy if exists "admin_roles_delete_scoped" on admin_roles;
create policy "admin_roles_delete_scoped" on admin_roles for delete to authenticated
  using (can_grant_admin_role(role, institution_id, faculty_id, department_id, programme_id));

-- ============================================================
-- 4. institution_join_codes - replaces the single mutable
--    institutions.join_code column. code_type / usage-limit columns
--    deliberately deferred until a real feature needs them (avoiding
--    unused schema, per the approved plan).
-- ============================================================

create table if not exists institution_join_codes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  code text not null unique,
  created_by uuid references profiles(id),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists institution_join_codes_institution_id_idx on institution_join_codes(institution_id);

alter table institution_join_codes enable row level security;

drop policy if exists "institution_join_codes_select_admin" on institution_join_codes;
create policy "institution_join_codes_select_admin" on institution_join_codes for select to authenticated
  using (is_admin_of_institution(institution_id));

drop policy if exists "institution_join_codes_write_admin" on institution_join_codes;
create policy "institution_join_codes_write_admin" on institution_join_codes for all to authenticated
  using (is_admin_of_institution(institution_id))
  with check (is_admin_of_institution(institution_id));

-- Seed one active row per existing institution from the legacy column.
-- The legacy column itself is left completely untouched.
insert into institution_join_codes (institution_id, code, is_active)
select id, join_code, true from institutions
on conflict (code) do nothing;

-- Join-code resolution now reads the new table. Old
-- institutions.join_code is no longer consulted by this function going
-- forward, but the column itself still exists (Phase B removes it later).
create or replace function resolve_institution_by_join_code(p_join_code text)
returns table (institution_id uuid, institution_name text)
language sql
security definer
set search_path = public
stable
as $$
  select i.id, i.name
  from institution_join_codes jc
  join institutions i on i.id = jc.institution_id
  where jc.code = p_join_code
    and jc.is_active
    and (jc.expires_at is null or jc.expires_at > now());
$$;

revoke all on function resolve_institution_by_join_code(text) from public;
grant execute on function resolve_institution_by_join_code(text) to authenticated;

-- ============================================================
-- 5. profiles insert/update policies now reference base_role.
--    Self-registration may still only ever create student/lecturer -
--    never platform_admin/admin_roles, which are never touched by the
--    signup path at all. The OLD (0001-era) policies and
--    current_profile_role() function are left completely intact and
--    simply superseded - Phase B removes them later, not here.
-- ============================================================

create or replace function current_profile_base_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select base_role from profiles where id = auth.uid();
$$;

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert to authenticated
  with check (id = auth.uid() and base_role in ('student', 'lecturer'));

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and base_role = current_profile_base_role());

-- profiles_select_admin_same_institution (from 0001) already calls
-- is_admin_of_institution(institution_id) - since that function was just
-- redefined above (now checking admin_roles + platform_admins instead of
-- profiles.role = 'admin'), this policy picks up the new behavior
-- automatically. No change needed to the policy itself.
