-- Milestone 2a: Courses, Sessions, Enrollments, Assignments (schema only)
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
--
-- SCHEMA ONLY. No React/hooks/services/IndexedDB/sync/service-worker/auth
-- changes are part of this migration - those are Milestone 2b onward.
--
-- Delete-behaviour policy used throughout this file: FKs to `courses`
-- CASCADE (the course is the aggregate root - deleting it should remove
-- its own sessions/enrollments/assignments). FKs to `profiles`,
-- `departments`, `programmes`, `academic_sessions`, and `levels` all use
-- RESTRICT - none of those should be silently able to delete real
-- academic data as a side effect of an unrelated action (e.g. deleting a
-- lecturer's account should never silently wipe their course history).

-- ============================================================
-- Shared updated_at trigger - used by all four tables below. Milestone 3's
-- sync engine will need `updated_at` for cursor-based pulls; adding it now
-- is cheap and avoids a future migration purely for this.
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1. courses
-- ============================================================

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete restrict,
  department_id uuid not null references departments(id) on delete restrict,
  programme_id uuid references programmes(id) on delete restrict,       -- null = cross-programme/elective
  level_id uuid not null references levels(id) on delete restrict,
  academic_session_id uuid references academic_sessions(id) on delete restrict, -- nullable: an institution may not have set one up yet
  code text not null,
  title text not null,
  description text,
  units int,
  semester text check (semester in ('first', 'second', 'summer')),
  created_by uuid not null references profiles(id) on delete restrict,   -- the lecturer who owns this course
  is_verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code) -- course codes unique WITHIN an institution, not globally
);

create index if not exists courses_institution_id_idx on courses(institution_id);
create index if not exists courses_department_id_idx on courses(department_id);
create index if not exists courses_academic_session_id_idx on courses(academic_session_id);
create index if not exists courses_created_by_idx on courses(created_by);

drop trigger if exists courses_set_updated_at on courses;
create trigger courses_set_updated_at before update on courses
  for each row execute function set_updated_at();

alter table courses enable row level security;

-- Institution-wide SELECT (not enrollment-gated) - students need to browse
-- the catalog to decide what to enroll in; they can't enroll in something
-- they can't see first. Materials/assignments are gated more tightly
-- below - this is deliberately just the catalog listing.
drop policy if exists "courses_select_institution" on courses;
create policy "courses_select_institution" on courses for select to authenticated
  using (institution_id = my_institution_id());

-- Only lecturers create courses, only within their own institution, and
-- only ever attributing authorship to themselves.
drop policy if exists "courses_insert_lecturer" on courses;
create policy "courses_insert_lecturer" on courses for insert to authenticated
  with check (
    created_by = auth.uid()
    and institution_id = my_institution_id()
    and current_profile_base_role() = 'lecturer'
  );

-- The owning lecturer, or an institution admin (oversight/moderation),
-- may edit or delete a course.
drop policy if exists "courses_update_owner_or_admin" on courses;
create policy "courses_update_owner_or_admin" on courses for update to authenticated
  using (created_by = auth.uid() or is_admin_of_institution(institution_id))
  with check (created_by = auth.uid() or is_admin_of_institution(institution_id));

drop policy if exists "courses_delete_owner_or_admin" on courses;
create policy "courses_delete_owner_or_admin" on courses for delete to authenticated
  using (created_by = auth.uid() or is_admin_of_institution(institution_id));

-- ============================================================
-- Helper: is the caller the owning lecturer of this course, or an
-- institution admin over it? Used by course_sessions/assignments below to
-- keep their policies short - this is a cross-table check (querying
-- `courses` from a policy on a DIFFERENT table), not the self-referencing
-- pattern that required SECURITY DEFINER indirection on `profiles` - but
-- wrapping it here keeps things DRY and consistent with the existing
-- helper-function style from migrations 0001/0002.
-- ============================================================

create or replace function is_course_owner_or_admin(p_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from courses c
    where c.id = p_course_id
      and (c.created_by = auth.uid() or is_admin_of_institution(c.institution_id))
  );
$$;

-- ============================================================
-- 2. course_sessions - one row per single weekly occurrence (e.g. a
--    Monday lecture and a Thursday lab are two rows sharing course_id),
--    matching what the XML/CSV/XLSX importer's groupSchedules() already
--    produces conceptually - only the write destination changes in 2b.
-- ============================================================

create table if not exists course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  lecturer_id uuid not null references profiles(id) on delete restrict,
  day_of_week text not null check (day_of_week in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  start_time time not null,
  end_time time not null,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_sessions_time_order check (end_time > start_time)
);

create index if not exists course_sessions_course_id_idx on course_sessions(course_id);
create index if not exists course_sessions_lecturer_id_idx on course_sessions(lecturer_id);

drop trigger if exists course_sessions_set_updated_at on course_sessions;
create trigger course_sessions_set_updated_at before update on course_sessions
  for each row execute function set_updated_at();

alter table course_sessions enable row level security;

-- Institution-wide SELECT, same reasoning as courses - schedule is part
-- of the catalog listing a prospective student needs to see before
-- enrolling.
drop policy if exists "course_sessions_select_institution" on course_sessions;
create policy "course_sessions_select_institution" on course_sessions for select to authenticated
  using (
    exists (select 1 from courses c where c.id = course_sessions.course_id and c.institution_id = my_institution_id())
  );

drop policy if exists "course_sessions_write_owner_or_admin" on course_sessions;
create policy "course_sessions_write_owner_or_admin" on course_sessions for all to authenticated
  using (is_course_owner_or_admin(course_id))
  with check (is_course_owner_or_admin(course_id));

-- ============================================================
-- 3. enrollments
-- ============================================================

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete restrict,
  level_id uuid not null references levels(id) on delete restrict,               -- snapshot at enrollment time
  academic_session_id uuid references academic_sessions(id) on delete restrict, -- snapshot at enrollment time, nullable to match courses.academic_session_id
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, student_id) -- one enrollment record per student per course
);

create index if not exists enrollments_course_id_idx on enrollments(course_id);
create index if not exists enrollments_student_id_idx on enrollments(student_id);

alter table enrollments enable row level security;

-- A student sees their own enrollments; the owning lecturer sees their
-- course's roster; an institution admin sees everything in their
-- institution (oversight).
drop policy if exists "enrollments_select_relevant" on enrollments;
create policy "enrollments_select_relevant" on enrollments for select to authenticated
  using (
    student_id = auth.uid()
    or is_course_owner_or_admin(course_id)
  );

-- A student enrolls themselves only, and only in a course within their
-- own institution - never on someone else's behalf, never cross-institution.
drop policy if exists "enrollments_insert_self" on enrollments;
create policy "enrollments_insert_self" on enrollments for insert to authenticated
  with check (
    student_id = auth.uid()
    and current_profile_base_role() = 'student'
    and exists (select 1 from courses c where c.id = enrollments.course_id and c.institution_id = my_institution_id())
  );

-- A student may update their own enrollment (e.g. marking it dropped);
-- the course's lecturer/admin may also update it (e.g. marking completed).
drop policy if exists "enrollments_update_relevant" on enrollments;
create policy "enrollments_update_relevant" on enrollments for update to authenticated
  using (student_id = auth.uid() or is_course_owner_or_admin(course_id))
  with check (student_id = auth.uid() or is_course_owner_or_admin(course_id));

drop policy if exists "enrollments_delete_relevant" on enrollments;
create policy "enrollments_delete_relevant" on enrollments for delete to authenticated
  using (student_id = auth.uid() or is_course_owner_or_admin(course_id));

-- ============================================================
-- 4. assignments - genuinely new; splits cleanly out of the local-only,
--    overloaded `Task` store (personal to-dos untouched, unaffected by
--    this table at all).
-- ============================================================

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz not null,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assignments_course_id_idx on assignments(course_id);

drop trigger if exists assignments_set_updated_at on assignments;
create trigger assignments_set_updated_at before update on assignments
  for each row execute function set_updated_at();

alter table assignments enable row level security;

-- Assignment content is enrolled-students-only (unlike the course/session
-- catalog listing above, which is institution-wide) - this is real
-- coursework, not a browse-to-decide listing.
drop policy if exists "assignments_select_enrolled_or_owner" on assignments;
create policy "assignments_select_enrolled_or_owner" on assignments for select to authenticated
  using (
    is_course_owner_or_admin(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = assignments.course_id and e.student_id = auth.uid() and e.status = 'active'
    )
  );

-- Ownership rule: only the course's own creator (or an institution admin)
-- may create/edit/delete its assignments - deliberately tied to
-- courses.created_by, not per-session lecturer_id, since a course could
-- in principle have more than one session lecturer. If co-taught courses
-- with multiple lecturer-editors ever become a real requirement, this is
-- the policy to revisit (flagged, not silently assumed away).
drop policy if exists "assignments_write_owner_or_admin" on assignments;
create policy "assignments_write_owner_or_admin" on assignments for all to authenticated
  using (is_course_owner_or_admin(course_id))
  with check (is_course_owner_or_admin(course_id));
