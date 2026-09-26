import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { useApp } from '../../context/AppContext';
import { PinModalMode, PinSetupModal } from './PinSetupModal';

export const SecuritySettingsSection: React.FC = () => {
  const {
    pinEnabled,
    privacyMode,
    togglePrivacyMode,
    autoLockSeconds,
    setAutoLockSeconds,
    lockApp,
    wipeLocalData,
  } = useSecurity();
  const { user, addToast } = useApp();

  const [pinModalMode, setPinModalMode] = useState<PinModalMode | null>(null);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  return (
    <section>
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Bảo mật & Quyền riêng tư
      </p>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        {/* PIN Passcode Lock */}
        <div className="flex items-center gap-3 p-4">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl transition ${
              pinEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Lock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Mã PIN bảo vệ ứng dụng</p>
            <p className="text-xs text-slate-400">
              {pinEnabled ? 'Đang bật · Yêu cầu mã PIN 4 số khi mở app' : 'Chưa bật · Ai mở máy cũng xem được'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPinModalMode(pinEnabled ? 'disable' : 'setup')}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              pinEnabled ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
            aria-label="Bật tắt mã PIN"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                pinEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* PIN Options (when enabled) */}
        {pinEnabled && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-semibold text-slate-700">Tự động khóa:</span>
              <select
                value={autoLockSeconds}
                onChange={(e) => setAutoLockSeconds(Number(e.target.value))}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none"
              >
                <option value={0}>Ngay khi ẩn app / đổi tab</option>
                <option value={60}>Sau 1 phút</option>
                <option value={300}>Sau 5 phút (khuyên dùng)</option>
                <option value={900}>Sau 15 phút</option>
                <option value={-1}>Chỉ khi mở lại web</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPinModalMode('change')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                <span>Đổi mã PIN</span>
              </button>
              <button
                type="button"
                onClick={lockApp}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Khóa màn hình ngay</span>
              </button>
            </div>
          </div>
        )}

        {/* Privacy Shield Mode */}
        <div className="flex items-center gap-3 border-t border-slate-100 p-4">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl transition ${
              privacyMode ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {privacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Chế độ riêng tư nơi công cộng</p>
            <p className="text-xs text-slate-400">
              {privacyMode
                ? 'Đang làm mờ số liệu cân nặng, calo và ghi chú'
                : 'Ẩn nhanh dữ liệu nhạy cảm tránh người bên cạnh nhìn trộm'}
            </p>
          </div>
          <button
            type="button"
            onClick={togglePrivacyMode}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              privacyMode ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
            aria-label="Bật tắt chế độ riêng tư"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                privacyMode ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Cloud & Security Status */}
        <div className="border-t border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-800">
              Bảo mật cơ sở dữ liệu (Firestore Security Rules)
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {user
              ? `Tài khoản (${user.email}) được bảo vệ bằng quy tắc phân quyền: chỉ có bạn mới có quyền đọc và ghi dữ liệu cá nhân của mình.`
              : 'Dữ liệu được lưu trữ nội bộ trên trình duyệt thiết bị. Hãy đăng nhập Google để đồng bộ bảo mật đa thiết bị.'}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-3">
            <span className="text-[11px] font-medium text-slate-500">Xóa dữ liệu tạm trên máy này</span>
            <button
              type="button"
              onClick={() => setShowWipeConfirm(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="h-3 w-3" />
              <span>Xóa bộ nhớ đệm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pin Setup/Change Modal */}
      {pinModalMode && (
        <PinSetupModal
          isOpen={Boolean(pinModalMode)}
          mode={pinModalMode}
          onClose={() => setPinModalMode(null)}
        />
      )}

      {/* Wipe Confirmation Modal */}
      {showWipeConfirm && (
        <div
          className="fixed inset-0 z-[130] grid place-items-center bg-black/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900">Xóa bộ nhớ đệm thiết bị?</h3>
                <p className="text-xs text-slate-400">Dọn dẹp an toàn khi rời khỏi máy</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              Thao tác này sẽ xóa sạch cache offline, mã PIN và lịch sử cục bộ trên trình duyệt này.
              {user && ' Dữ liệu đã đồng bộ trên tài khoản Google của bạn sẽ không bị mất.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowWipeConfirm(false)}
                className="h-10 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWipeConfirm(false);
                  wipeLocalData();
                }}
                className="h-10 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
