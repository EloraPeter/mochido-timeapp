import { supabase } from './client';

// Thin wrapper around Supabase Auth + the `profiles`/`institutions` tables.
// This is the real identity system going forward - see
// src/lib/auth/pinAuth.ts for how it's bridged into the existing local
// (IndexedDB) user model so every current local-only feature keeps
// working unchanged.

export interface InstitutionMatch {
  id: string;
  name: string;
}

export interface RemoteProfile {
  id: string;
  institutionId: string;
  institutionName?: string;
  baseRole: 'student' | 'lecturer';
  name: string;
  title?: string;
}

/** A person's administrative authority - separate from identity (RemoteProfile). See Milestone 1 plan. */
export interface AdminAuthority {
  isPlatformAdmin: boolean;
  institutionAdminOf: string[]; // institution_id[] this person holds institution_admin over
}

/**
 * Resolves a join code to an institution via a SECURITY DEFINER function,
 * rather than a broad SELECT grant on `institutions` - so an unconfirmed
 * code can't be used to enumerate every institution in the system.
 */
export async function resolveInstitutionByJoinCode(joinCode: string): Promise<InstitutionMatch | null> {
  const { data, error } = await supabase.rpc('resolve_institution_by_join_code', {
    p_join_code: joinCode.trim(),
  });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return { id: data[0].institution_id, name: data[0].institution_name };
}

/**
 * Creates the Supabase Auth account. NOTE: this project must have
 * "Confirm email" disabled (Supabase Dashboard -> Authentication ->
 * Providers -> Email) for this milestone - otherwise `signUp` returns no
 * active session until the person clicks an email link, and there's no
 * callback route built yet to catch that redirect. Fails loudly below
 * rather than silently leaving a half-created account.
 */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign up did not return a user.');
  if (!data.session) {
    throw new Error(
      'Your account was created but is not signed in yet - this project still requires email ' +
      'confirmation. Disable "Confirm email" under Supabase Dashboard -> Authentication -> ' +
      'Providers -> Email, then try registering again.'
    );
  }
  return data.user;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOutSupabase(): Promise<void> {
  await supabase.auth.signOut();
}

/** Returns the current Supabase session, or null if signed out/expired. Local read - see pinAuth.ts for how this is used without gating offline PIN unlock on it. */
export async function getSupabaseSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Returns the current Supabase auth user (id/email), or null if signed out. */
export async function getSupabaseUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function createProfileRow(params: {
  userId: string;
  institutionId: string;
  baseRole: 'student' | 'lecturer';
  name: string;
}): Promise<void> {
  // STABILIZATION FIX (post-Milestone-1): use `insert`, not `upsert`.
  // `profiles` is an identity table with `id` as its primary key - an
  // upsert would silently overwrite an existing profile's institution/
  // role/name on a conflict instead of erroring. Duplicate profile
  // creation should fail loudly, not corrupt data quietly. If
  // PROFILE_MISSING is ever wrongly signaled for an account that already
  // has a real profile, `insert` surfaces that as a clear, loud error
  // instead of silently rewriting the real row.
  //
  // `role` is still written alongside `base_role` - migration 0002
  // deliberately left `profiles.role` NOT NULL (dual-write is intentional,
  // temporary compatibility per the approved two-phase migration plan,
  // not a permanent design). Remove this once the planned later migration
  // phase actually relaxes/drops the legacy column - not before.
  const { error } = await supabase.from('profiles').insert({
    id: params.userId,
    institution_id: params.institutionId,
    base_role: params.baseRole,
    role: params.baseRole,
    name: params.name,
  });

  if (error) throw new Error(error.message);
}

/** Fetches the signed-in user's own profile (RLS restricts this to exactly one row: their own). Returns null if no profile exists yet (orphaned auth account - see /complete-profile). The explicit `.eq('id', user.id)` filter is kept even though RLS already scopes this identically - explicit intent alongside RLS is reasonable defense in depth, negligible downside. */
export async function fetchMyProfile(): Promise<RemoteProfile | null> {
  const user = await getSupabaseUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, institution_id, base_role, name, title, institutions ( name )')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('fetchMyProfile error:', error);
    return null;
  }
  if (!data) return null;

  const institutionName = Array.isArray(data.institutions)
    ? (data.institutions[0] as any)?.name
    : (data.institutions as any)?.name;

  return {
    id: data.id,
    institutionId: data.institution_id,
    institutionName,
    baseRole: data.base_role,
    name: data.name,
    title: data.title ?? undefined,
  };
}

/**
 * Fetches the signed-in user's administrative authority (separate from
 * identity - see Milestone 1 plan). A person can be, e.g., base_role
 * 'lecturer' AND hold institution_admin authority at the same time.
 */
export async function fetchMyAdminAuthority(): Promise<AdminAuthority> {
  // platform_admins has NO client SELECT policy at all, for any role -
  // by design (see migration 0002). That's correct: nothing this
  // milestone needs to show a platform-admin-specific UI, so there's no
  // reason to expose even a truthy/falsy read of it to the client. If a
  // platform-admin console is ever built, this should become a check the
  // *server* makes (e.g. inside a service-role-backed API route), not a
  // client-side read - so `isPlatformAdmin` is deliberately always false
  // from here, not a broken attempt at a query that can never succeed.
  const { data } = await supabase
    .from('admin_roles')
    .select('institution_id, role')
    .eq('role', 'institution_admin');

  const institutionAdminOf = (data ?? [])
    .map((row) => row.institution_id)
    .filter((id): id is string => !!id);

  return { isPlatformAdmin: false, institutionAdminOf };
}
