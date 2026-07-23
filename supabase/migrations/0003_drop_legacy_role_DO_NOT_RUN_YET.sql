-- ⚠️ DO NOT RUN THIS YET. ⚠️
--
-- This is Phase B - the destructive half of the Milestone 1 migration.
-- Only run it after:
--   1. 0002_admin_authority_foundation.sql has been running in production
--      for a real soak period (proposed: several days of normal use).
--   2. The verification checklist in the Milestone 1 plan has fully passed.
--   3. You're confident 0002_rollback.sql is no longer needed.
--
-- Before running, double-check the actual constraint name on your
-- project - Postgres auto-names inline CHECK constraints, and
-- `profiles_role_check` is the expected default name from migration
-- 0001, but confirm via `\d profiles` in the SQL Editor (or the Table
-- Editor's constraints view) before running the DROP CONSTRAINT line.

alter table profiles alter column base_role set not null;

drop function if exists current_profile_role();

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles drop column if exists role;

alter table institutions drop column if exists join_code;

-- profiles_select_admin_same_institution (from 0001) only ever referenced
-- is_admin_of_institution(), never the `role` column directly, so it
-- needs no change here.
