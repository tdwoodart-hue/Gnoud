/**
 * Security service for Lịch Sống:
 * - App PIN passcode protection with SHA-256 salted hashing
 * - Brute-force protection (lockout after consecutive failed attempts)
 * - Auto-lock timing (on tab switch, after timeout, etc.)
 * - Privacy mode (masking sensitive numbers/notes in public)
 * - Safe local cache wipe
 */

export interface SecuritySettings {
  pinEnabled: boolean;
  pinHash: string; // SHA-256 hash with salt
  autoLockSeconds: number; // 0 = immediately on tab switch, 60 = 1m, 300 = 5m, 900 = 15m, -1 = only restart
  privacyMode: boolean;
  failedAttempts: number;
  lockedUntil: number | null; // Timestamp in ms
  lastActiveTime: number; // Timestamp in ms
}

const STORAGE_KEY = 'lich_song_security_config_v1';
const PIN_SALT = '_salt_lichsong_sec_v1_';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  pinEnabled: false,
  pinHash: '',
  autoLockSeconds: 300, // 5 minutes default
  privacyMode: false,
  failedAttempts: 0,
  lockedUntil: null,
  lastActiveTime: Date.now(),
};

/**
 * SHA-256 hash using browser native Web Crypto API
 */
export async function hashPin(pin: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Basic fallback for environments without subtle crypto
    let hash = 0;
    const str = pin + PIN_SALT;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `fallback_${hash}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function loadSecuritySettings(): SecuritySettings {
  if (typeof window === 'undefined') return DEFAULT_SECURITY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SECURITY_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SECURITY_SETTINGS,
      ...parsed,
      lastActiveTime: Date.now(),
    };
  } catch {
    return DEFAULT_SECURITY_SETTINGS;
  }
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Could not save security settings:', error);
  }
}

/**
 * Verify a PIN against the stored hash
 */
export async function checkPin(
  pin: string,
  settings: SecuritySettings,
): Promise<{
  valid: boolean;
  isLockedOut: boolean;
  remainingSeconds: number;
  remainingAttempts: number;
  nextSettings: SecuritySettings;
}> {
  const now = Date.now();

  // Check if currently locked out
  if (settings.lockedUntil && settings.lockedUntil > now) {
    const remainingSeconds = Math.ceil((settings.lockedUntil - now) / 1000);
    return {
      valid: false,
      isLockedOut: true,
      remainingSeconds,
      remainingAttempts: 0,
      nextSettings: settings,
    };
  }

  const computedHash = await hashPin(pin);
  const valid = computedHash === settings.pinHash;

  if (valid) {
    // Reset failed attempts on success
    const nextSettings: SecuritySettings = {
      ...settings,
      failedAttempts: 0,
      lockedUntil: null,
      lastActiveTime: now,
    };
    saveSecuritySettings(nextSettings);
    return {
      valid: true,
      isLockedOut: false,
      remainingSeconds: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      nextSettings,
    };
  }

  // Failed attempt
  const newFailedAttempts = settings.failedAttempts + 1;
  const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock ? now + LOCKOUT_DURATION_MS : null;

  const nextSettings: SecuritySettings = {
    ...settings,
    failedAttempts: newFailedAttempts,
    lockedUntil,
    lastActiveTime: now,
  };
  saveSecuritySettings(nextSettings);

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - newFailedAttempts);
  const remainingSeconds = shouldLock ? Math.ceil(LOCKOUT_DURATION_MS / 1000) : 0;

  return {
    valid: false,
    isLockedOut: shouldLock,
    remainingSeconds,
    remainingAttempts,
    nextSettings,
  };
}

/**
 * Cleanly wipe local data on this device without deleting remote cloud Firestore data
 */
export function wipeDeviceLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (
        key &&
        (key.startsWith('lich_song_') ||
          key.startsWith('gnoud-') ||
          key.includes('nutrition') ||
          key.includes('daily_notes'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (error) {
    console.warn('Could not wipe local storage:', error);
  }
}
