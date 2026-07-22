-- Milestone 0: Authentication + Institution Foundation
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
--
-- This is purely additive to the existing project - it does not touch
-- Supabase Storage (course-materials bucket) or anything else already
-- configured. Nothing here overlaps with the local IndexedDB data model;
-- these tables are the new server-side source of truth for institutional
-- structure and identity only.

create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text not null unique,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists faculties (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculties(id) on delete cascade,
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (faculty_id, code)
);

-- Optional layer - a department may have zero, one, or several programmes.
create table if not exists programmes (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name text not null,
  code text not null,
  degree_type text,          -- e.g. "B.Sc", "B.Eng", "HND"
  duration_years int,
  created_at timestamptz not null default now(),
  unique (department_id, code)
);

-- Global reference data, NOT institution-scoped - "300 Level" means the
-- same thing at every institution. Seeded once below, never written to
-- by the app.
create table if not exists levels (
  id uuid primary key default gen_random_uuid(),
  numeric_value int not null unique,
  label text not null
);

insert into levels (numeric_value, label) values
  (100, '100 Level'), (200, '200 Level'), (300, '300 Level'), (400, '400 Level'),
  (500, '500 Level'), (600, '600 Level'), (700, '700 Level'), (800, '800 Level')
on conflict (numeric_value) do nothing;

create table if not exists academic_sessions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  label text not null,             -- e.g. "2025/2026"
  start_date date,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (institution_id, label)
);

-- 1:1 with auth.users. This is the real identity/role anchor going forward;
-- the local PIN system becomes a device-level unlock layered on top of it.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid not null references institutions(id),
  role text not null check (role in ('student', 'lecturer', 'admin')),
  department_id uuid references departments(id),
  programme_id uuid references programmes(id),
  current_level_id uuid references levels(id),
  name text not null,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_institution_id_idx on profiles(institution_id);
create index if not exists faculties_institution_id_idx on faculties(institution_id);
create index if not exists departments_faculty_id_idx on departments(faculty_id);
create index if not exists programmes_department_id_idx on programmes(department_id);
create index if not exists academic_sessions_institution_id_idx on academic_sessions(institution_id);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
--
-- These exist specifically to avoid a classic RLS pitfall: a policy on
-- `profiles` that queries `profiles` again triggers recursive policy
-- evaluation. Wrapping the lookup in a SECURITY DEFINER function runs it
-- with elevated privilege internally (bypassing RLS for just this narrow,
-- read-only check), which breaks the recursion cleanly.
-- ============================================================

create or replace function my_institution_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select institution_id from profiles where id = auth.uid();
$$;

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

create or replace function current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- Lets a freshly-signed-up (but not-yet-profiled) user resolve a join code
-- to an institution, without granting broad SELECT on the institutions
-- table to every authenticated user. Only ever exposes id+name for a
-- code that actually matches - not the whole table.
create or replace function resolve_institution_by_join_code(p_join_code text)
returns table (institution_id uuid, institution_name text)
language sql
security definer
set search_path = public
stable
as $$
  select id, name from institutions where join_code = p_join_code;
$$;

revoke all on function resolve_institution_by_join_code(text) from public;
grant execute on function resolve_institution_by_join_code(text) to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table institutions enable row level security;
alter table faculties enable row level security;
alter table departments enable row level security;
alter table programmes enable row level security;
alter table levels enable row level security;
alter table academic_sessions enable row level security;
alter table profiles enable row level security;

-- --- profiles ---
-- Users can only ever read/write their OWN row - no cross-user profile
-- access at all yet (nothing in this milestone needs it). Admins get an
-- additional, explicit same-institution read grant below.
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_select_admin_same_institution" on profiles;
create policy "profiles_select_admin_same_institution" on profiles for select to authenticated
  using (is_admin_of_institution(institution_id));

-- Self-registration may only ever create a student or lecturer profile -
-- admin accounts are provisioned out-of-band (dashboard/service-role),
-- never through this insert path.
drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert to authenticated
  with check (id = auth.uid() and role in ('student', 'lecturer'));

-- Users may update their own profile, but the role column itself can never
-- change value through this policy (blocks self-escalation to admin, and
-- blocks an admin from being silently demoted by their own client either).
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = current_profile_role());

-- --- institutions ---
-- No self-serve insert policy on purpose - creating a new institution is a
-- manual/service-role action until the Milestone 1 admin console exists.
drop policy if exists "institutions_select_own" on institutions;
create policy "institutions_select_own" on institutions for select to authenticated
  using (id = my_institution_id());

-- --- faculties ---
drop policy if exists "faculties_select_same_institution" on faculties;
create policy "faculties_select_same_institution" on faculties for select to authenticated
  using (institution_id = my_institution_id());

drop policy if exists "faculties_admin_write" on faculties;
create policy "faculties_admin_write" on faculties for all to authenticated
  using (is_admin_of_institution(institution_id))
  with check (is_admin_of_institution(institution_id));

-- --- departments ---
drop policy if exists "departments_select_same_institution" on departments;
create policy "departments_select_same_institution" on departments for select to authenticated
  using (
    exists (
      select 1 from faculties f
      where f.id = departments.faculty_id and f.institution_id = my_institution_id()
    )
  );

drop policy if exists "departments_admin_write" on departments;
create policy "departments_admin_write" on departments for all to authenticated
  using (
    exists (
      select 1 from faculties f
      where f.id = departments.faculty_id and is_admin_of_institution(f.institution_id)
    )
  )
  with check (
    exists (
      select 1 from faculties f
      where f.id = departments.faculty_id and is_admin_of_institution(f.institution_id)
    )
  );

-- --- programmes ---
drop policy if exists "programmes_select_same_institution" on programmes;
create policy "programmes_select_same_institution" on programmes for select to authenticated
  using (
    exists (
      select 1 from departments d join faculties f on f.id = d.faculty_id
      where d.id = programmes.department_id and f.institution_id = my_institution_id()
    )
  );

drop policy if exists "programmes_admin_write" on programmes;
create policy "programmes_admin_write" on programmes for all to authenticated
  using (
    exists (
      select 1 from departments d join faculties f on f.id = d.faculty_id
      where d.id = programmes.department_id and is_admin_of_institution(f.institution_id)
    )
  )
  with check (
    exists (
      select 1 from departments d join faculties f on f.id = d.faculty_id
      where d.id = programmes.department_id and is_admin_of_institution(f.institution_id)
    )
  );

-- --- levels (global reference data - read-only to every signed-in user) ---
drop policy if exists "levels_select_all_authenticated" on levels;
create policy "levels_select_all_authenticated" on levels for select to authenticated
  using (true);

-- --- academic_sessions ---
drop policy if exists "academic_sessions_select_same_institution" on academic_sessions;
create policy "academic_sessions_select_same_institution" on academic_sessions for select to authenticated
  using (institution_id = my_institution_id());

drop policy if exists "academic_sessions_admin_write" on academic_sessions;
create policy "academic_sessions_admin_write" on academic_sessions for all to authenticated
  using (is_admin_of_institution(institution_id))
  with check (is_admin_of_institution(institution_id));

-- ============================================================
-- MANUAL SETUP - run once per institution you onboard, for now
-- (Milestone 1 will replace this with an admin console)
-- ============================================================
-- insert into institutions (name, short_code, join_code)
-- values ('University of Delta', 'UNIDEL', 'UNIDEL-2026');
