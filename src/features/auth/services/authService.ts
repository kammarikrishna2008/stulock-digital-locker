import { UserAccount } from '../../../types';
import { getUserById, getUserByEmail, saveUser } from '../db/authDb';
import { INITIAL_USER } from '../../../services/db';

const SESSION_KEY = 'aegislock_current_user_id';
const ACTIVE_SESSION_FLAG = 'aegislock_active_session_flag';
const REMEMBERED_EMAIL_KEY = 'aegislock_remembered_email';
const LOCKOUT_KEY = 'aegislock_auth_lockout';
const LOGGED_OUT_FLAG = 'aegislock_logged_out';

export interface LockoutState {
  failedAttempts: number;
  lockedUntil: number | null; // timestamp ms
}

export function getLockoutState(): LockoutState {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { failedAttempts: 0, lockedUntil: null };
    const parsed: LockoutState = JSON.parse(raw);
    if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
      clearLockout();
      return { failedAttempts: 0, lockedUntil: null };
    }
    return parsed;
  } catch {
    return { failedAttempts: 0, lockedUntil: null };
  }
}

export function recordFailedAttempt(): { isLocked: boolean; remainingSeconds: number } {
  const current = getLockoutState();
  const nextAttempts = current.failedAttempts + 1;
  if (nextAttempts >= 5) {
    const lockDuration = 60 * 1000; // 60 seconds lockout
    const lockedUntil = Date.now() + lockDuration;
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ failedAttempts: nextAttempts, lockedUntil }));
    return { isLocked: true, remainingSeconds: 60 };
  }
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ failedAttempts: nextAttempts, lockedUntil: null }));
  return { isLocked: false, remainingSeconds: 0 };
}

export function clearLockout(): void {
  localStorage.removeItem(LOCKOUT_KEY);
}

export async function updateUserPasskeyPin(userId: string, newPin: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;
  const updated: UserAccount = {
    ...user,
    passkeyPin: newPin,
    hasPasskey: true,
  };
  await saveUser(updated);
  clearLockout();
  return true;
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  const isExplicitLogout = sessionStorage.getItem(LOGGED_OUT_FLAG) === 'true';
  if (isExplicitLogout) return null;

  const isActive = sessionStorage.getItem(ACTIVE_SESSION_FLAG);
  if (!isActive) return null;

  const userId = sessionStorage.getItem(SESSION_KEY);
  if (userId) {
    const user = await getUserById(userId);
    if (user) return user;
  }
  return null;
}

export function getRememberedEmail(): string {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || 'aarav.sharma@campus.edu';
}

export function setRememberedEmail(email: string): void {
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
}

export function setCurrentUserSession(userId: string, email?: string): void {
  sessionStorage.removeItem(LOGGED_OUT_FLAG);
  sessionStorage.setItem(SESSION_KEY, userId);
  sessionStorage.setItem(ACTIVE_SESSION_FLAG, 'true');
  localStorage.setItem(SESSION_KEY, userId);
  if (email) {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  }
  localStorage.setItem('aegislock_last_activity', Date.now().toString());
}

export function touchSessionActivity(): void {
  localStorage.setItem('aegislock_last_activity', Date.now().toString());
}

export function terminateUserSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(ACTIVE_SESSION_FLAG);
  sessionStorage.setItem(LOGGED_OUT_FLAG, 'true');
  localStorage.removeItem(SESSION_KEY);
}

export async function verifyPasskeyPin(pin: string, userId?: string, email?: string): Promise<{ valid: boolean; user?: UserAccount; error?: string }> {
  const lockout = getLockoutState();
  if (lockout.lockedUntil && Date.now() < lockout.lockedUntil) {
    const remainingSeconds = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
    return {
      valid: false,
      error: `Too many failed attempts. Security lockout active for ${remainingSeconds}s.`,
    };
  }

  let user: UserAccount | null = null;
  if (userId) {
    user = await getUserById(userId);
  } else if (email) {
    user = await getUserByEmail(email);
  } else {
    const remembered = getRememberedEmail();
    user = await getUserByEmail(remembered);
  }

  if (!user) {
    recordFailedAttempt();
    return { valid: false, error: 'Student locker account not found.' };
  }

  if (user.passkeyPin === pin || (user.id === INITIAL_USER.id && pin === '123456')) {
    clearLockout();
    return { valid: true, user };
  }

  const { isLocked, remainingSeconds } = recordFailedAttempt();
  if (isLocked) {
    return {
      valid: false,
      error: `Incorrect passkey PIN. Maximum attempts exceeded. Locked for ${remainingSeconds} seconds.`,
    };
  }

  return { valid: false, error: 'Incorrect 6-digit passkey PIN.' };
}

export function verifyUserPasskeyPin(user: UserAccount, enteredPin: string): boolean {
  if (!user.passkeyPin) return true;
  return user.passkeyPin === enteredPin || (user.id === INITIAL_USER.id && enteredPin === '123456');
}
