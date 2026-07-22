import { supabase } from './client';

// Thin wrapper around Supabase Auth + the `profiles`/`institutions` tables
// from supabase/migrations/0001_institution_foundation.sql. This is the
// real identity system going forward - see src/lib/auth/pinAuth.ts for how
// it's bridged into the existing local (IndexedDB) user model so every
// current local-only feature keeps working unchanged.

export interface InstitutionMatch {
  id: string;
  name: string;
}

export interface RemoteProfile {
  id: string;
  institutionId: string;
  institutionName?: string;
  role: 'student' | 'lecturer' | 'admin';
  name: string;
  title?: string;
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

/** Returns the current Supabase session, or null if signed out/expired. */
export async function getSupabaseSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function createProfileRow(params: {
  userId: string;
  institutionId: string;
  role: 'student' | 'lecturer';
  name: string;
}): Promise<void> {
  const { error } = await supabase.from('profiles').insert({
    id: params.userId,
    institution_id: params.institutionId,
    role: params.role,
    name: params.name,
  });
  if (error) throw new Error(error.message);
}

/** Fetches the signed-in user's own profile (RLS restricts this to exactly one row: their own). */
export async function fetchMyProfile(): Promise<RemoteProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, institution_id, role, name, title, institutions ( name )')
    .maybeSingle();

  if (error || !data) return null;

  const institutionName = Array.isArray(data.institutions)
    ? (data.institutions[0] as any)?.name
    : (data.institutions as any)?.name;

  return {
    id: data.id,
    institutionId: data.institution_id,
    institutionName,
    role: data.role,
    name: data.name,
    title: data.title ?? undefined,
  };
}
