import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  checkPin,
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
  togglePrivacyMode: () => void;
  setPrivacyMode: (enabled: boolean) => void;
  setAutoLockSeconds: (seconds: number) => void;
  resetPinWithAuth: () => void;
  wipeLocalData: () => void;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SecuritySettings>(() => loadSecuritySettings());
  // If PIN is enabled, app starts locked
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const s = loadSecuritySettings();
    return s.pinEnabled;
  });

  const hiddenTimeRef = useRef<number | null>(null);

  // Sync privacy mode class to body
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (settings.privacyMode) {
        document.documentElement.classList.add('privacy-mode-active');
      } else {
        document.documentElement.classList.remove('privacy-mode-active');
      }
    }
  }, [settings.privacyMode]);

  // Handle visibility change (tab switch, minimize, lock screen of phone/PC)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!settings.pinEnabled) return;

      if (document.visibilityState === 'hidden') {
        hiddenTimeRef.current = Date.now();
        // If auto-lock is set to 0 (immediate on leave)
        if (settings.autoLockSeconds === 0) {
          setIsLocked(true);
        }
      } else if (document.visibilityState === 'visible') {
        if (hiddenTimeRef.current && settings.autoLockSeconds > 0) {
          const elapsed = (Date.now() - hiddenTimeRef.current) / 1000;
          if (elapsed >= settings.autoLockSeconds) {
            setIsLocked(true);
          }
        }
        hiddenTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.pinEnabled, settings.autoLockSeconds]);

  const lockApp = useCallback(() => {
    if (settings.pinEnabled) {
      setIsLocked(true);
    }
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
    setSettings((prev) => {
      const next: SecuritySettings = {
        ...prev,
        pinEnabled: true,
        pinHash,
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
      setSettings((prev) => {
        const next: SecuritySettings = {
          ...prev,
          pinHash: newHash,
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

  const resetPinWithAuth = useCallback(() => {
    setSettings((prev) => {
      const next: SecuritySettings = {
        ...prev,
        pinEnabled: false,
        pinHash: '',
        failedAttempts: 0,
        lockedUntil: null,
      };
      saveSecuritySettings(next);
      return next;
    });
    setIsLocked(false);
  }, []);

  const wipeLocalData = useCallback(() => {
    wipeDeviceLocalStorage();
    resetPinWithAuth();
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [resetPinWithAuth]);

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
        togglePrivacyMode,
        setPrivacyMode,
        setAutoLockSeconds,
        resetPinWithAuth,
        wipeLocalData,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const ctx = useContext(SecurityContext);
  if (!ctx) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return ctx;
};
