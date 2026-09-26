import React, { useEffect, useState } from 'react';
import { Delete, Lock, ShieldAlert, ShieldCheck, Sun } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { useApp } from '../../context/AppContext';

export const PinLockScreen: React.FC = () => {
  const { isLocked, unlockApp, resetPinWithAuth } = useSecurity();
  const { user, logout } = useApp();

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Clear PIN & error when modal lock state changes
  useEffect(() => {
    if (isLocked) {
      setEnteredPin('');
      setErrorMessage('');
    }
  }, [isLocked]);

  const triggerShake = (msg: string) => {
    setErrorMessage(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setEnteredPin('');
  };

  const handleDigit = async (digit: string) => {
    if (enteredPin.length >= 4 || isSubmitting) return;
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setErrorMessage('');

    if (nextPin.length === 4) {
      setIsSubmitting(true);
      try {
        const result = await unlockApp(nextPin);
        if (!result.success) {
          triggerShake(result.error || 'Mã PIN không đúng');
        } else {
          setEnteredPin('');
          setErrorMessage('');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0 && !isSubmitting) {
      setEnteredPin((prev) => prev.slice(0, -1));
      setErrorMessage('');
    }
  };

  // Physical keyboard support
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        void handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, enteredPin, isSubmitting]);

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 px-6 py-10 text-white select-none backdrop-blur-xl">
      {/* Top Header */}
      <div className="flex flex-col items-center pt-6 text-center sm:pt-10">
        <div className="relative mb-4 grid h-16 w-16 place-items-center rounded-3xl border border-indigo-500/30 bg-indigo-600/20 shadow-lg shadow-indigo-500/20 backdrop-blur-md">
          <Sun className="h-8 w-8 text-indigo-400" />
          <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-white shadow-xs">
            <Lock className="h-3 w-3" />
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Lịch Sống</h1>
        <p className="mt-1 text-xs font-medium text-slate-400">Ứng dụng đã được khóa an toàn</p>
      </div>

      {/* Pin Dots Display */}
      <div className="flex flex-col items-center my-auto">
        <div
          className={`flex items-center gap-4 transition-transform duration-150 ${
            shake ? 'translate-x-1 animate-bounce text-rose-400' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = enteredPin.length > index;
            return (
              <div
                key={index}
                className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'border-indigo-500 bg-indigo-500 shadow-md shadow-indigo-500/50 scale-110'
                    : 'border-slate-600 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="mt-4 min-h-6 text-center">
          {errorMessage ? (
            <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-400 animate-fadeIn">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-500">Nhập mã PIN gồm 4 chữ số</p>
          )}
        </div>
      </div>

      {/* Keypad */}
      <div className="w-full max-w-xs pb-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => void handleDigit(digit)}
              className="flex h-16 w-full items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/60 text-2xl font-semibold text-white shadow-xs transition active:scale-95 active:bg-indigo-600 hover:border-slate-700 hover:bg-slate-800/80"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Blank / Forgot, 0, Backspace */}
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="flex h-16 w-full items-center justify-center rounded-2xl text-xs font-semibold text-slate-400 transition hover:text-white"
          >
            Quên PIN?
          </button>

          <button
            type="button"
            onClick={() => void handleDigit('0')}
            className="flex h-16 w-full items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/60 text-2xl font-semibold text-white shadow-xs transition active:scale-95 active:bg-indigo-600 hover:border-slate-700 hover:bg-slate-800/80"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            aria-label="Xóa"
            className="flex h-16 w-full items-center justify-center rounded-2xl text-slate-400 transition active:scale-95 hover:text-white"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Forgot PIN Modal */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-[110] grid place-items-center bg-black/60 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500/20 text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-white">Khôi phục quyền truy cập</h3>
                <p className="text-xs text-slate-400">Xác thực bằng tài khoản của bạn</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-5 text-slate-300">
              {user ? (
                <>
                  <p>
                    Bạn đang đăng nhập với tài khoản: <strong className="text-white">{user.email}</strong>.
                  </p>
                  <p>
                    Do đã đăng nhập chính chủ, bạn có thể thiết lập lại mã PIN mà không mất dữ liệu đám mây.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetPinWithAuth();
                      setShowForgotModal(false);
                    }}
                    className="mt-2 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Mở khóa & Đặt lại mã PIN
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Ứng dụng đang chạy ở chế độ khách (chưa đăng nhập Google).
                  </p>
                  <p>
                    Nếu quên mã PIN, bạn có thể xóa bộ nhớ tạm để đặt lại mã mới.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetPinWithAuth();
                      setShowForgotModal(false);
                    }}
                    className="mt-2 w-full rounded-xl bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-700"
                  >
                    Xác nhận đặt lại mã PIN
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="mt-3 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
            >
              Quay lại màn hình khóa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
