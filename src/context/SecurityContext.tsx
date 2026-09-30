import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { authErrorMessage } from '../services/authFlow';
import {
  canRecoverPinWithAccount,
  checkPin,
  DEFAULT_SECURITY_SETTINGS,
  hashPin,
  loadSecuritySettings,
  saveSecuritySettings,
  SecuritySettings,
  wipeDeviceLocalStorage,
} from '../services/securityService';

interface SecurityContextType {
  isLocked: boolean;
  pinEnabled: boolean;
  privacyMode: boolean;
  autoLockSeconds: number;
  lockApp: () => void;
  unlockApp: (pin: string) => Promise<{
    success: boolean;
    error?: string;
    remainingAttempts?: number;
    remainingSeconds?: number;
    isLockedOut?: boolean;
  }>;
  setupPin: (newPin: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  disablePin: (currentPin: string) => Promise<{ success: boolean; error?: string }>;
  beginPinRecovery: () => Promise<{ success: boolean; error?: string; email?: string }>;
  completePinRecovery: (newPin: string) => Promise<{ success: boolean; error?: string }>;
  togglePrivacyMode: () => void;
  setPrivacyMode: (enabled: boolean) => void;
  setAutoLockSeconds: (seconds: number) => void;
  wipeLocalData: () => void;
}

const SecurityContext = createContext<SecurityContextType | null>(null);
const PIN_RECOVERY_WINDOW_MS = 2 * 60 * 1000;

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SecuritySettings>(() => loadSecuritySettings());
  const [isLocked, setIsLocked] = useState<boolean>(() => loadSecuritySettings().pinEnabled);

  const hiddenTimeRef = useRef<number | null>(null);
  const recoveryVerifiedAtRef = useRef<number | null>(null);
  const recoveryVerifiedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (settings.privacyMode) document.documentElement.classList.add('privacy-mode-active');
    else document.documentElement.classList.remove('privacy-mode-active');
  }, [settings.privacyMode]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!settings.pinEnabled) return;

      if (document.visibilityState === 'hidden') {
        hiddenTimeRef.current = Date.now();
        if (settings.autoLockSeconds === 0) setIsLocked(true);
      } else if (document.visibilityState === 'visible') {
        if (hiddenTimeRef.current && settings.autoLockSeconds > 0) {
          const elapsed = (Date.now() - hiddenTimeRef.current) / 1000;
          if (elapsed >= settings.autoLockSeconds) setIsLocked(true);
        }
        hiddenTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.pinEnabled, settings.autoLockSeconds]);

  const lockApp = useCallback(() => {
    if (settings.pinEnabled) setIsLocked(true);
  }, [settings.pinEnabled]);

  const unlockApp = useCallback(
    async (pin: string) => {
      if (!settings.pinEnabled) {
        setIsLocked(false);
        return { success: true };
      }

      const result = await checkPin(pin, settings);
      setSettings(result.nextSettings);

      if (result.valid) {
        setIsLocked(false);
        return { success: true };
      }

      if (result.isLockedOut) {
        return {
          success: false,
          isLockedOut: true,
          remainingSeconds: result.remainingSeconds,
          error: `Đã nhập sai quá nhiều lần. Vui lòng chờ ${result.remainingSeconds} giây.`,
        };
      }

      return {
        success: false,
        remainingAttempts: result.remainingAttempts,
        error: `Mã PIN không đúng. Còn ${result.remainingAttempts} lần thử.`,
      };
    },
    [settings],
  );

  const setupPin = useCallback(async (newPin: string) => {
    const pinHash = await hashPin(newPin);
    const currentUser = auth.currentUser;
    setSettings((prev) => {
      const next: SecuritySettings = {
        ...prev,
        pinEnabled: true,
        pinHash,
        pinOwnerUid: currentUser?.uid || null,
        pinOwnerEmail: currentUser?.email || null,
        failedAttempts: 0,
        lockedUntil: null,
      };
      saveSecuritySettings(next);
      return next;
    });
  }, []);

  const changePin = useCallback(
    async (oldPin: string, newPin: string) => {
      const oldHash = await hashPin(oldPin);
      if (oldHash !== settings.pinHash) {
        return { success: false, error: 'Mã PIN hiện tại không chính xác' };
      }

      const newHash = await hashPin(newPin);
      const currentUser = auth.currentUser;
      setSettings((prev) => {
        const next: SecuritySettings = {
          ...prev,
          pinHash: newHash,
          pinOwnerUid: prev.pinOwnerUid || currentUser?.uid || null,
          pinOwnerEmail: prev.pinOwnerEmail || currentUser?.email || null,
          failedAttempts: 0,
          lockedUntil: null,
        };
        saveSecuritySettings(next);
        return next;
      });
      return { success: true };
    },
    [settings.pinHash],
  );

  const disablePin = useCallback(
    async (currentPin: string) => {
      const currentHash = await hashPin(currentPin);
      if (currentHash !== settings.pinHash) {
        return { success: false, error: 'Mã PIN hiện tại không chính xác' };
      }

      setSettings((prev) => {
        const next: SecuritySettings = {
          ...prev,
          pinEnabled: false,
          pinHash: '',
          pinOwnerUid: null,
          pinOwnerEmail: null,
          failedAttempts: 0,
          lockedUntil: null,
        };
        saveSecuritySettings(next);
        return next;
      });
      setIsLocked(false);
      return { success: true };
    },
    [settings.pinHash],
  );

  const beginPinRecovery = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: 'Không có phiên đăng nhập để xác minh chủ sở hữu. Gnoud sẽ không tự bỏ mã PIN.',
      };
    }

    if (!canRecoverPinWithAccount(settings, currentUser.uid)) {
      return {
        success: false,
        error: 'Tài khoản hiện tại không phải tài khoản đã tạo mã PIN này.',
      };
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await reauthenticateWithPopup(currentUser, provider);

      if (
        credential.user.uid !== currentUser.uid ||
        !canRecoverPinWithAccount(settings, credential.user.uid)
      ) {
        return {
          success: false,
          error: 'Hãy xác minh đúng tài khoản Google đã bảo vệ Gnoud.',
        };
      }

      recoveryVerifiedAtRef.current = Date.now();
      recoveryVerifiedUidRef.current = credential.user.uid;
      return {
        success: true,
        email: credential.user.email || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: authErrorMessage(error),
      };
    }
  }, [settings]);

  const completePinRecovery = useCallback(
    async (newPin: string) => {
      if (!/^\d{4}$/.test(newPin)) {
        return { success: false, error: 'Mã PIN mới phải gồm đúng 4 chữ số.' };
      }

      const currentUser = auth.currentUser;
      const verifiedAt = recoveryVerifiedAtRef.current;
      const verifiedUid = recoveryVerifiedUidRef.current;
      const stillFresh = Boolean(verifiedAt && Date.now() - verifiedAt <= PIN_RECOVERY_WINDOW_MS);

      if (
        !currentUser ||
        !stillFresh ||
        verifiedUid !== currentUser.uid ||
        !canRecoverPinWithAccount(settings, currentUser.uid)
      ) {
        recoveryVerifiedAtRef.current = null;
        recoveryVerifiedUidRef.current = null;
        return {
          success: false,
          error: 'Phiên xác minh đã hết hạn. Hãy xác minh lại tài khoản Google.',
        };
      }

      const pinHash = await hashPin(newPin);
      const next: SecuritySettings = {
        ...settings,
        pinEnabled: true,
        pinHash,
        pinOwnerUid: currentUser.uid,
        pinOwnerEmail: currentUser.email || null,
        failedAttempts: 0,
        lockedUntil: null,
        lastActiveTime: Date.now(),
      };
      saveSecuritySettings(next);
      setSettings(next);
      recoveryVerifiedAtRef.current = null;
      recoveryVerifiedUidRef.current = null;
      setIsLocked(false);
      return { success: true };
    },
    [settings],
  );

  const togglePrivacyMode = useCallback(() => {
    setSettings((prev) => {
      const next: SecuritySettings = {
        ...prev,
        privacyMode: !prev.privacyMode,
      };
      saveSecuritySettings(next);
      return next;
    });
  }, []);

  const setPrivacyMode = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const next: SecuritySettings = {
        ...prev,
        privacyMode: enabled,
      };
      saveSecuritySettings(next);
      return next;
    });
  }, []);

  const setAutoLockSeconds = useCallback((seconds: number) => {
    setSettings((prev) => {
      const next: SecuritySettings = {
        ...prev,
        autoLockSeconds: seconds,
      };
      saveSecuritySettings(next);
      return next;
    });
  }, []);

  const wipeLocalData = useCallback(() => {
    wipeDeviceLocalStorage();
    const next: SecuritySettings = {
      ...DEFAULT_SECURITY_SETTINGS,
      lastActiveTime: Date.now(),
    };
    setSettings(next);
    setIsLocked(false);
    recoveryVerifiedAtRef.current = null;
    recoveryVerifiedUidRef.current = null;
    if (typeof window !== 'undefined') window.location.reload();
  }, []);

  return (
    <SecurityContext.Provider
      value={{
        isLocked,
        pinEnabled: settings.pinEnabled,
        privacyMode: settings.privacyMode,
        autoLockSeconds: settings.autoLockSeconds,
        lockApp,
        unlockApp,
        setupPin,
        changePin,
        disablePin,
        beginPinRecovery,
        completePinRecovery,
        togglePrivacyMode,
        setPrivacyMode,
        setAutoLockSeconds,
        wipeLocalData,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within a SecurityProvider');
  return ctx;
};
