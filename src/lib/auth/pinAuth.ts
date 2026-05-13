import { addItem, getItems, getItem, updateItem } from '@/lib/db/indexedDB';
import { STORES } from '@/lib/db/schema';
import type { User } from '@/lib/db/schema';

// Simple hash for PIN (not cryptographic, just obfuscation)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

// Validate PIN format (4-6 digits)
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// Create new user
export async function createUser(
  name: string, 
  pin: string, 
  role: 'student' | 'lecturer'
): Promise<User> {
  if (!isValidPin(pin)) {
    throw new Error('PIN must be 4-6 digits');
  }
  
  if (!name.trim()) {
    throw new Error('Name is required');
  }
  
  // Check if user already exists
  const existingUsers = await getItems<User>(STORES.users);
  const userExists = existingUsers.some(u => u.name.toLowerCase() === name.toLowerCase());
  
  if (userExists) {
    throw new Error('User with this name already exists');
  }
  
  const user: User = {
    id: crypto.randomUUID(),
    name: name.trim(),
    pin: hashPin(pin),
    role,
    createdAt: new Date()
  };
  
  await addItem(STORES.users, user);
  
  // Store session
  localStorage.setItem('mochi_user_id', user.id);
  localStorage.setItem('mochi_user_role', user.role);
  localStorage.setItem('mochi_user_name', user.name);
  
  return user;
}

// Verify PIN and login - SIMPLE VERSION
export async function verifyPin(pin: string): Promise<User | null> {
  if (!isValidPin(pin)) {
    return null;
  }
  
  const users = await getItems<User>(STORES.users);
  const hashedInput = hashPin(pin);
  const user = users.find(u => u.pin === hashedInput);
  
  if (user) {
    localStorage.setItem('mochi_user_id', user.id);
    localStorage.setItem('mochi_user_role', user.role);
    localStorage.setItem('mochi_user_name', user.name);
    return user;
  }
  
  return null;
}

// Get current logged-in user (async)
export async function getCurrentUser(): Promise<User | null> {
  const userId = localStorage.getItem('mochi_user_id');
  if (!userId) return null;
  
  const user = await getItem<User>(STORES.users, userId);
  return user || null;
}

// Get current user ID synchronously (for hooks)
export function getCurrentUserId(): string | null {
  return localStorage.getItem('mochi_user_id');
}

// Get current user role synchronously
export function getCurrentUserRole(): 'student' | 'lecturer' | null {
  return localStorage.getItem('mochi_user_role') as 'student' | 'lecturer' | null;
}

// Get current user name
export function getCurrentUserName(): string | null {
  return localStorage.getItem('mochi_user_name');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('mochi_user_id');
}

// Update lecturer title
export async function updateLecturerTitle(userId: string, title: 'Mr.' | 'Ms.' | 'Mrs.' | 'Dr.' | 'Prof.'): Promise<void> {
  await updateItem<User>(STORES.users, userId, { title });
}

// Get user with title formatted
export function getFormattedName(user: User): string {
  if (user.role === 'lecturer' && user.title) {
    return `${user.title} ${user.name.split(' ')[0]}`;
  }
  return user.name.split(' ')[0];
}

// Logout - simple
export async function logout(): Promise<void> {
  localStorage.removeItem('mochi_user_id');
  localStorage.removeItem('mochi_user_role');
  localStorage.removeItem('mochi_user_name');
}

// Update user name
export async function updateUserName(userId: string, name: string): Promise<void> {
  await updateItem<User>(STORES.users, userId, { name });
  localStorage.setItem('mochi_user_name', name);
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  return getItems<User>(STORES.users);
}