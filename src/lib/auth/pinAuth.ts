import { addItem, getItems, getItem, updateItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import type { User } from '@/lib/db/schema';
import {
  resolveInstitutionByJoinCode,
  signUpWithEmail,
  signInWithEmail,
  signOutSupabase,
  getSupabaseSession,
  createProfileRow,
  fetchMyProfile,
} from '@/lib/supabase/auth';

// ============================================================
// Milestone 0 note on how this file's job has changed:
//
// Supabase Auth (email/password) is now the real identity system - see
// createUser()/loginWithEmail() below. The local IndexedDB `User` row and
// localStorage session pointers still exist and still work exactly as
// before for every OTHER part of the app (tasks, routines, streaks, mascot,
// course hooks, etc.) - they only ever call getCurrentUserId()/
// getCurrentUserRole(), both unchanged, both still synchronous, both still
// backed by localStorage. The local User.id is now always set to the
// Supabase auth.uid(), so nothing downstream needed to change.
//
// The PIN itself changes job: it's no longer how a user is identified
// (verifyPin used to search every locally-stored user by hash - fragile,
// and meaningless once real remote accounts exist). It's now an optional,
// per-device quick-unlock layered on top of an already-valid Supabase
// session. See verifyLocalPin()/setLocalUnlockPin()/hasLocalUnlockPin().
// ============================================================

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

// ============================================================
// Registration - now creates a real Supabase Auth account + institution
// profile, then mirrors a local IndexedDB User row (keyed by the same id)
// so every existing local-only feature keeps working unchanged.
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
    throw new Error('Invalid institution join code. Check with your school and try again.');
  }

  const supaUser = await signUpWithEmail(email, password);
  await createProfileRow({ userId: supaUser.id, institutionId: institution.id, role, name: name.trim() });

  const user: User = {
    id: supaUser.id,
    name: name.trim(),
    pin: hashPin(pin),
    role,
    createdAt: new Date(),
    institutionId: institution.id,
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
    throw new Error('No profile found for this account yet. Contact your institution admin.');
  }
  if (profile.role !== 'student' && profile.role !== 'lecturer') {
    throw new Error('This account type is not yet supported in the app.');
  }

  // Mirror (or create, on a new device) the local User row so every
  // existing local-only hook keeps working exactly as before.
  let localUser = await getItem<User>(STORES.users, supaUser.id);
  if (!localUser) {
    localUser = {
      id: supaUser.id,
      name: profile.name,
      pin: '', // no local PIN set on this device yet
      role: profile.role,
      createdAt: new Date(),
      institutionId: profile.institutionId,
    };
    await addItem(STORES.users, localUser);
  } else if (localUser.institutionId !== profile.institutionId || localUser.name !== profile.name) {
    // Keep the local mirror in step with the server profile if either changed.
    await updateItem<User>(STORES.users, localUser.id, {
      name: profile.name,
      institutionId: profile.institutionId,
    });
    localUser = { ...localUser, name: profile.name, institutionId: profile.institutionId };
  }

  persistLocalSession(localUser);
  return localUser;
}

// ============================================================
// Local PIN quick-unlock (per device) - checks the PIN against THIS
// device's already-logged-in local user AND confirms the underlying
// Supabase session is still valid. Does not search across users at all -
// that was the old, no-longer-safe behavior.
// ============================================================
export async function verifyLocalPin(pin: string): Promise<User | null> {
  if (!isValidPin(pin)) return null;

  const userId = localStorage.getItem('mochi_user_id');
  if (!userId) return null;

  const user = await getItem<User>(STORES.users, userId);
  if (!user || !user.pin || user.pin !== hashPin(pin)) return null;

  const session = await getSupabaseSession();
  if (!session) return null; // stale/expired remote session - force full login instead

  persistLocalSession(user);
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

// Logout - now also signs out of the real Supabase session, in addition
// to clearing the local session pointers exactly as before. Does NOT
// delete any local IndexedDB data (personal tasks/routines/etc. remain
// available offline, same as before).
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
