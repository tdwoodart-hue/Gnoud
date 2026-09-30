import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { PinModalMode, PinSetupModal } from './PinSetupModal';

export const SecuritySettingsSection: React.FC = () => {
  const {
    pinEnabled,
    privacyMode,
    togglePrivacyMode,
    autoLockSeconds,
    setAutoLockSeconds,
    lockApp,
  } = useSecurity();
  const [pinModalMode, setPinModalMode] = useState<PinModalMode | null>(null);

  return (
    <section>
      <p className="mb-2 px-1 text-xs font-semibold text-slate-500">Bảo mật</p>
      <div className="overflow-hidden rounded-[18px] bg-white">
        <div className="flex min-h-[62px] items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-slate-900">Mã PIN</p>
            <p className="mt-0.5 text-[12px] text-slate-400">{pinEnabled ? 'Đang bật' : 'Đang tắt'}</p>
          </div>
          <button
            type="button"
            onClick={() => setPinModalMode(pinEnabled ? 'disable' : 'setup')}
            className={'relative h-7 w-12 shrink-0 rounded-full transition-colors ' + (pinEnabled ? 'bg-indigo-600' : 'bg-slate-200')}
            aria-label="Bật tắt mã PIN"
            aria-pressed={pinEnabled}
          >
            <span className={'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ' + (pinEnabled ? 'left-6' : 'left-1')} />
          </button>
        </div>

        {pinEnabled ? (
          <>
            <div className="flex min-h-[56px] items-center gap-3 border-t border-slate-100 px-4">
              <span className="min-w-0 flex-1 text-[14px] font-medium text-slate-800">Tự động khóa</span>
              <select
                value={autoLockSeconds}
                onChange={(event) => setAutoLockSeconds(Number(event.target.value))}
                className="h-9 max-w-[178px] rounded-lg bg-slate-100 px-2 text-[13px] font-semibold text-slate-700 outline-none"
              >
                <option value={0}>Ngay khi ẩn app</option>
                <option value={60}>Sau 1 phút</option>
                <option value={300}>Sau 5 phút</option>
                <option value={900}>Sau 15 phút</option>
                <option value={-1}>Khi mở lại web</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setPinModalMode('change')}
              className="flex min-h-[54px] w-full items-center border-t border-slate-100 px-4 text-left text-[14px] font-medium text-slate-800 active:bg-slate-50"
            >
              Đổi mã PIN
            </button>

            <button
              type="button"
              onClick={lockApp}
              className="flex min-h-[54px] w-full items-center border-t border-slate-100 px-4 text-left text-[14px] font-medium text-slate-800 active:bg-slate-50"
            >
              Khóa màn hình ngay
            </button>
          </>
        ) : null}

        <div className="flex min-h-[62px] items-center gap-3 border-t border-slate-100 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-slate-900">Chế độ riêng tư</p>
            <p className="mt-0.5 text-[12px] text-slate-400">Làm mờ số liệu nhạy cảm</p>
          </div>
          <button
            type="button"
            onClick={togglePrivacyMode}
            className={'relative h-7 w-12 shrink-0 rounded-full transition-colors ' + (privacyMode ? 'bg-indigo-600' : 'bg-slate-200')}
            aria-label="Bật tắt chế độ riêng tư"
            aria-pressed={privacyMode}
          >
            <span className={'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ' + (privacyMode ? 'left-6' : 'left-1')} />
          </button>
        </div>
      </div>

      {pinModalMode ? (
        <PinSetupModal
          isOpen={Boolean(pinModalMode)}
          mode={pinModalMode}
          onClose={() => setPinModalMode(null)}
        />
      ) : null}
    </section>
  );
};
