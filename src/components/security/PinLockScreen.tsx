import React, { useEffect, useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { useApp } from '../../context/AppContext';
import { PinSetupModal } from './PinSetupModal';

export const PinLockScreen: React.FC = () => {
  const {
    isLocked,
    unlockApp,
    beginPinRecovery,
    wipeLocalData,
  } = useSecurity();
  const { user } = useApp();

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRecoverySetup, setShowRecoverySetup] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    if (!isLocked) return;
    setEnteredPin('');
    setErrorMessage('');
    setRecoveryError('');
    setConfirmWipe(false);
  }, [isLocked]);

  const triggerShake = (message: string) => {
    setErrorMessage(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 380);
    setEnteredPin('');
  };

  const handleDigit = async (digit: string) => {
    if (enteredPin.length >= 4 || isSubmitting) return;
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setErrorMessage('');

    if (nextPin.length !== 4) return;

    setIsSubmitting(true);
    try {
      const result = await unlockApp(nextPin);
      if (!result.success) triggerShake(result.error || 'Mã PIN không đúng.');
      else {
        setEnteredPin('');
        setErrorMessage('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (isSubmitting) return;
    setEnteredPin((value) => value.slice(0, -1));
    setErrorMessage('');
  };

  const handleRecovery = async () => {
    setRecoveryBusy(true);
    setRecoveryError('');
    try {
      const result = await beginPinRecovery();
      if (!result.success) {
        setRecoveryError(result.error || 'Không xác minh được tài khoản.');
        return;
      }
      setShowForgotModal(false);
      setShowRecoverySetup(true);
    } finally {
      setRecoveryBusy(false);
    }
  };

  useEffect(() => {
    if (!isLocked) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= '0' && event.key <= '9') void handleDigit(event.key);
      else if (event.key === 'Backspace') handleDelete();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, enteredPin, isSubmitting]);

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#f4f1e8] text-slate-950 select-none">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-7 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))]">
        <header className="pt-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Gnoud</p>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Nhập mã PIN</h1>
          <p className="mt-1 text-xs text-slate-500">
            {user?.email || 'Mở khóa để tiếp tục'}
          </p>
        </header>

        <main className="flex flex-1 flex-col justify-center py-8">
          <div
            className={`flex items-center justify-center gap-4 transition-transform duration-150 ${
              shake ? 'translate-x-1' : ''
            }`}
            aria-label="Mã PIN đã nhập"
          >
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={`h-3 w-3 rounded-full transition ${
                  enteredPin.length > index ? 'bg-slate-950' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="mt-4 min-h-6 text-center">
            <p className={`text-xs font-medium ${errorMessage ? 'text-rose-600' : 'text-slate-400'}`}>
              {errorMessage || (isSubmitting ? 'Đang kiểm tra…' : '4 chữ số')}
            </p>
          </div>

          <div className="mx-auto mt-7 grid w-full max-w-[280px] grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => void handleDigit(digit)}
                disabled={isSubmitting}
                className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-full bg-white/85 text-2xl font-medium text-slate-950 ring-1 ring-black/[0.06] transition active:scale-95 active:bg-white disabled:opacity-50"
              >
                {digit}
              </button>
            ))}

            <span className="h-[68px] w-[68px]" aria-hidden="true" />

            <button
              type="button"
              onClick={() => void handleDigit('0')}
              disabled={isSubmitting}
              className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-full bg-white/85 text-2xl font-medium text-slate-950 ring-1 ring-black/[0.06] transition active:scale-95 active:bg-white disabled:opacity-50"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || enteredPin.length === 0}
              className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-full text-2xl font-medium text-slate-500 transition active:scale-95 active:bg-black/[0.04] disabled:opacity-25"
              aria-label="Xóa số cuối"
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setRecoveryError('');
              setConfirmWipe(false);
              setShowForgotModal(true);
            }}
            className="mx-auto mt-7 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition active:bg-black/[0.04]"
          >
            Quên mã PIN?
          </button>
        </main>
      </div>

      {showForgotModal ? (
        <div
          className="fixed inset-0 z-[110] flex items-end bg-slate-950/30 p-3 backdrop-blur-[2px] sm:grid sm:place-items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!recoveryBusy) setShowForgotModal(false);
          }}
        >
          <section
            className="w-full rounded-[28px] bg-[#fbfbfa] p-5 text-slate-950 shadow-2xl sm:max-w-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Quên mã PIN</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Gnoud không lưu mã PIN ở dạng có thể xem lại.
                </p>
              </div>
              <button
                type="button"
                disabled={recoveryBusy}
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 disabled:opacity-40"
              >
                Đóng
              </button>
            </div>

            {user ? (
              <>
                <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-900">Xác minh lại tài khoản</p>
                  <p className="mt-1 break-all text-[11px] leading-5 text-slate-500">{user.email}</p>
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    Google sẽ xác minh đúng chủ tài khoản. Sau đó bạn chỉ có thể tạo PIN mới, không thể xem PIN cũ.
                  </p>
                </div>

                {recoveryError ? (
                  <p className="mt-3 text-xs font-semibold leading-5 text-rose-600">{recoveryError}</p>
                ) : null}

                <button
                  type="button"
                  disabled={recoveryBusy}
                  onClick={() => void handleRecovery()}
                  className="mt-4 h-12 w-full rounded-2xl bg-slate-950 text-sm font-bold text-white transition active:scale-[0.99] disabled:bg-slate-300"
                >
                  {recoveryBusy ? 'Đang xác minh…' : 'Xác minh bằng Google'}
                </button>
              </>
            ) : confirmWipe ? (
              <>
                <p className="mt-5 text-xs leading-5 text-slate-600">
                  Thao tác này xóa dữ liệu cục bộ và mã PIN trên thiết bị này. Không có cách bỏ PIN mà vẫn giữ dữ liệu khi chưa xác minh được chủ tài khoản.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmWipe(false)}
                    className="h-11 rounded-xl bg-slate-100 text-xs font-bold text-slate-600"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={wipeLocalData}
                    className="h-11 rounded-xl bg-rose-600 text-xs font-bold text-white"
                  >
                    Xóa dữ liệu
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-5 text-xs leading-5 text-slate-600">
                  Thiết bị này hiện không có phiên đăng nhập để xác minh chủ sở hữu. Gnoud sẽ không tự mở khóa hoặc cho xem lại PIN.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="mt-4 h-11 w-full rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700"
                >
                  Xóa dữ liệu trên thiết bị
                </button>
              </>
            )}
          </section>
        </div>
      ) : null}

      <PinSetupModal
        isOpen={showRecoverySetup}
        mode="recover"
        onClose={() => setShowRecoverySetup(false)}
      />
    </div>
  );
};
