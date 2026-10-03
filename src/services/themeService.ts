export type AppTheme = 'light' | 'dark';

export const APP_THEME_STORAGE_KEY = 'gnoud-theme-v1';
export const APP_THEME_CHANGE_EVENT = 'gnoud-theme-change';

const isAppTheme = (value: unknown): value is AppTheme => value === 'light' || value === 'dark';

export function getStoredAppTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
    return isAppTheme(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColor = theme === 'dark' ? '#0b0d12' : '#fafbfc';
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = themeColor;

  const statusBar = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusBar) statusBar.content = theme === 'dark' ? 'black-translucent' : 'default';
}

export function saveAppTheme(theme: AppTheme): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch {
      // Giao diện vẫn đổi trong phiên hiện tại nếu localStorage không khả dụng.
    }
  }
  applyAppTheme(theme);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APP_THEME_CHANGE_EVENT, { detail: { theme } }));
  }
}

export function initializeAppTheme(): AppTheme {
  const theme = getStoredAppTheme();
  applyAppTheme(theme);
  return theme;
}
