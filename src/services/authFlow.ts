export function shouldUseRedirect(_userAgent: string, _standalone: boolean): boolean {
  // The app is hosted outside Firebase Hosting. Cross-domain redirect auth can
  // lose its session on Safari/mobile browsers, so keep Google auth on popup.
  return false;
}

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'auth/unauthorized-domain') return 'Tên miền hiện tại chưa được cho phép trong Firebase.';
  if (code === 'auth/popup-blocked') return 'Trình duyệt đã chặn cửa sổ đăng nhập.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Đăng nhập đã bị đóng trước khi hoàn tất.';
  if (code === 'auth/network-request-failed') return 'Không thể kết nối Google. Hãy kiểm tra mạng rồi thử lại.';
  if (code === 'auth/operation-not-allowed') return 'Google Sign-In chưa được bật trong Firebase.';
  return 'Không thể hoàn tất đăng nhập Google.';
}
