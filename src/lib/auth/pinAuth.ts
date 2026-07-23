import { addItem, getItems, getItem, updateItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import type { User } from '@/lib/db/schema';
import {
  resolveInstitutionByJoinCode,
  signUpWithEmail,
  signInWithEmail,
  signOutSupabase,
  getSupabaseSession,
  getSupabaseUser,
  createProfileRow,
  fetchMyProfile,
  fetchMyAdminAuthority,
} from '@/lib/supabase/auth';
import type { AdminAuthority } from '@/lib/supabase/auth';

// ============================================================
// Milestone 0/1 notes on how this file's job has changed:
//
// Supabase Auth (email/password) is the real identity system - see
// createUser()/loginWithEmail() below. The local IndexedDB `User` row and
// localStorage session pointers still exist and still work exactly as
// before for every OTHER part of the app (tasks, routines, streaks,
// mascot, course hooks, etc.) - they only ever call getCurrentUserId()/
// getCurrentUserRole(), both unchanged, both still synchronous, both
// still backed by localStorage.
//
// Milestone 1 fixes a real offline-first regression from Milestone 0:
// verifyLocalPin() used to require a LIVE Supabase session check, which
// can fail offline once the access token needs a refresh (default 1hr
// expiry) - see verifyLocalPin() below for the grace-period fix. PIN
// correctness and account validity are now fully decoupled.
// ============================================================

export const PIN_UNLOCK_GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// Simple hash for PIN (not cryptographic, just obfuscation) - unchanged.
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

// Validate PIN format (4-6 digits) - unchanged.
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

function persistLocalSession(user: User) {
  localStorage.setItem('mochi_user_id', user.id);
  localStorage.setItem('mochi_user_role', user.role);
  localStorage.setItem('mochi_user_name', user.name);
}

/** Best-effort background check - refreshes lastVerifiedAt if a live session is reachable, but NEVER blocks or denies unlock if it isn't (that's the whole point of the grace period fix). Errors are swallowed deliberately. */
async function tryRefreshVerification(userId: string): Promise<void> {
  try {
    const session = await getSupabaseSession();
    if (session) {
      await updateItem<User>(STORES.users, userId, { lastVerifiedAt: new Date().toISOString() });
    }
  } catch {
    // Offline or unreachable - fine, grace period covers this.
  }
}

// ============================================================
// Registration - creates a real Supabase Auth account + institution
// profile, then mirrors a local IndexedDB User row (keyed by the same
// id) so every existing local-only feature keeps working unchanged.
// ============================================================
export async function createUser(
  name: string,
  pin: string,
  role: 'student' | 'lecturer',
  email: string,
  password: string,
  joinCode: string
): Promise<User> {
  if (!isValidPin(pin)) {
    throw new Error('PIN must be 4-6 digits');
  }
  if (!name.trim()) {
    throw new Error('Name is required');
  }

  const institution = await resolveInstitutionByJoinCode(joinCode);
  if (!institution) {
    throw new Error('Invalid or expired institution join code. Check with your school and try again.');
  }

  const supaUser = await signUpWithEmail(email, password);
  await createProfileRow({ userId: supaUser.id, institutionId: institution.id, baseRole: role, name: name.trim() });

  const now = new Date().toISOString();
  const user: User = {
    id: supaUser.id,
    name: name.trim(),
    pin: hashPin(pin),
    role,
    createdAt: new Date(),
    institutionId: institution.id,
    lastVerifiedAt: now, // just had a live Supabase auth - fully verified right now
  };

  await addItem(STORES.users, user);
  persistLocalSession(user);

  return user;
}

// ============================================================
// Full login (email/password) - required on any device the first time,
// and any time the local PIN unlock isn't available/hasn't been set.
// ============================================================
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const supaUser = await signInWithEmail(email, password);

  const profile = await fetchMyProfile();
  if (!profile) {
    // Orphaned account - auth exists but the profile insert never
    // completed (e.g. network drop mid-registration). Signal this
    // distinctly so the UI can route to /complete-profile instead of a
    // dead-end error - see completeProfile() below.
    const err = new Error('PROFILE_MISSING');
    err.name = 'ProfileMissingError';
    throw err;
  }

  const now = new Date().toISOString();
  let localUser = await getItem<User>(STORES.users, supaUser.id);
  if (!localUser) {
    localUser = {
      id: supaUser.id,
      name: profile.name,
      pin: '', // no local PIN set on this device yet
      role: profile.baseRole,
      createdAt: new Date(),
      institutionId: profile.institutionId,
      lastVerifiedAt: now,
    };
    await addItem(STORES.users, localUser);
  } else {
    await updateItem<User>(STORES.users, localUser.id, {
      name: profile.name,
      institutionId: profile.institutionId,
      lastVerifiedAt: now,
    });
    localUser = { ...localUser, name: profile.name, institutionId: profile.institutionId, lastVerifiedAt: now };
  }

  persistLocalSession(localUser);
  return localUser;
}

/**
 * Recovery path for an orphaned Supabase Auth account (see
 * loginWithEmail's ProfileMissingError above) - completes profile
 * creation using the ALREADY-authenticated session, no new signUp call.
 */
export async function completeProfile(name: string, role: 'student' | 'lecturer', joinCode: string): Promise<User> {
  const supaUser = await getSupabaseUser();
  if (!supaUser) throw new Error('Not signed in - please log in again first.');
  if (!name.trim()) throw new Error('Name is required');

  const institution = await resolveInstitutionByJoinCode(joinCode);
  if (!institution) throw new Error('Invalid or expired institution join code.');

  await createProfileRow({ userId: supaUser.id, institutionId: institution.id, baseRole: role, name: name.trim() });

  const now = new Date().toISOString();
  const user: User = {
    id: supaUser.id,
    name: name.trim(),
    pin: '',
    role,
    createdAt: new Date(),
    institutionId: institution.id,
    lastVerifiedAt: now,
  };
  await addItem(STORES.users, user);
  persistLocalSession(user);
  return user;
}

/** Whether the currently signed-in Supabase account has no profile row yet (orphaned - needs /complete-profile). */
export async function needsProfileCompletion(): Promise<boolean> {
  const supaUser = await getSupabaseUser();
  if (!supaUser) return false;
  const profile = await fetchMyProfile();
  return !profile;
}

// ============================================================
// Local PIN quick-unlock (per device) - checks the PIN against THIS
// device's local user AND a local grace period, NOT a live Supabase
// session check. This is the Milestone 1 offline-first fix: PIN
// correctness and account validity are fully decoupled, so the default
// app-opening path works with no network at all.
// ============================================================
export async function verifyLocalPin(pin: string): Promise<User | null> {
  if (!isValidPin(pin)) return null;

  const userId = localStorage.getItem('mochi_user_id');
  if (!userId) return null;

  const user = await getItem<User>(STORES.users, userId);
  if (!user || !user.pin || user.pin !== hashPin(pin)) return null;

  const lastVerified = user.lastVerifiedAt ? new Date(user.lastVerifiedAt).getTime() : 0;
  const withinGracePeriod = Date.now() - lastVerified < PIN_UNLOCK_GRACE_PERIOD_MS;
  if (!withinGracePeriod) return null; // needs a full online login to re-verify

  persistLocalSession(user);
  // Best-effort, non-blocking - refreshes the grace period window if a
  // live session happens to be reachable, but never gates unlock on it.
  void tryRefreshVerification(userId);

  return user;
}

/** Whether this device has a local user + PIN set up, so the quick-unlock screen can be shown. */
export async function hasLocalUnlockPin(): Promise<boolean> {
  const userId = localStorage.getItem('mochi_user_id');
  if (!userId) return false;
  const user = await getItem<User>(STORES.users, userId);
  return !!(user && user.pin);
}

/** Lets the signed-in user set/change their local per-device unlock PIN. */
export async function setLocalUnlockPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('PIN must be 4-6 digits');
  const userId = localStorage.getItem('mochi_user_id');
  if (!userId) throw new Error('Not logged in');
  await updateItem<User>(STORES.users, userId, { pin: hashPin(pin) });
}

/** Fetches the signed-in user's administrative authority (institution_admin, etc.) - separate from identity. Best-effort: returns no authority if offline/unreachable, never throws. */
export async function getMyAdminAuthority(): Promise<AdminAuthority> {
  try {
    return await fetchMyAdminAuthority();
  } catch {
    return { isPlatformAdmin: false, institutionAdminOf: [] };
  }
}

// Get current logged-in user (async) - unchanged.
export async function getCurrentUser(): Promise<User | null> {
  const userId = localStorage.getItem('mochi_user_id');
  if (!userId) return null;

  const user = await getItem<User>(STORES.users, userId);
  return user || null;
}

// Get current user ID synchronously (for hooks) - unchanged.
export function getCurrentUserId(): string | null {
  return localStorage.getItem('mochi_user_id');
}

// Get current user role synchronously - unchanged.
export function getCurrentUserRole(): 'student' | 'lecturer' | 'admin' | null {
  return localStorage.getItem('mochi_user_role') as 'student' | 'lecturer' | 'admin' | null;
}

// Get current user name - unchanged.
export function getCurrentUserName(): string | null {
  return localStorage.getItem('mochi_user_name');
}

// Check if user is authenticated - unchanged.
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('mochi_user_id');
}

// Update lecturer title - unchanged.
export async function updateLecturerTitle(userId: string, title: 'Mr.' | 'Ms.' | 'Mrs.' | 'Dr.' | 'Prof.'): Promise<void> {
  await updateItem<User>(STORES.users, userId, { title });
}

// Get user with title formatted - unchanged.
export function getFormattedName(user: User): string {
  if (user.role === 'lecturer' && user.title) {
    return `${user.title} ${user.name.split(' ')[0]}`;
  }
  return user.name.split(' ')[0];
}

// Logout - signs out of the real Supabase session, in addition to
// clearing the local session pointers. Does NOT delete any local
// IndexedDB data (personal tasks/routines/etc. remain available offline).
export async function logout(): Promise<void> {
  localStorage.removeItem('mochi_user_id');
  localStorage.removeItem('mochi_user_role');
  localStorage.removeItem('mochi_user_name');
  await signOutSupabase();
}

// Update user name - unchanged.
export async function updateUserName(userId: string, name: string): Promise<void> {
  await updateItem<User>(STORES.users, userId, { name });
  localStorage.setItem('mochi_user_name', name);
}

// Get all users - unchanged (local-device users only, as before).
export async function getAllUsers(): Promise<User[]> {
  return getItems<User>(STORES.users);
}
