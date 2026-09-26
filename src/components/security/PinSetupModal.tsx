import React, { useState } from 'react';
import { Check, KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { useApp } from '../../context/AppContext';

export type PinModalMode = 'setup' | 'change' | 'disable';

interface PinSetupModalProps {
  isOpen: boolean;
  mode: PinModalMode;
  onClose: () => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({ isOpen, mode, onClose }) => {
  const { setupPin, changePin, disablePin } = useSecurity();
  const { addToast } = useApp();

  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      if (mode === 'setup') setStep('new');
      if (mode === 'change' || mode === 'disable') setStep('current');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError('');
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    setError('');
    if (step === 'current') {
      if (currentPin.length < 4) setCurrentPin((p) => p + digit);
    } else if (step === 'new') {
      if (newPin.length < 4) setNewPin((p) => p + digit);
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) setConfirmPin((p) => p + digit);
    }
  };

  const handleDelete = () => {
    setError('');
    if (step === 'current') setCurrentPin((p) => p.slice(0, -1));
    else if (step === 'new') setNewPin((p) => p.slice(0, -1));
    else if (step === 'confirm') setConfirmPin((p) => p.slice(0, -1));
  };

  const handleNext = async () => {
    setError('');
    if (step === 'current') {
      if (currentPin.length !== 4) {
        setError('Vui lòng nhập đủ 4 chữ số');
        return;
      }
      if (mode === 'disable') {
        setIsSubmitting(true);
        try {
          const res = await disablePin(currentPin);
          if (res.success) {
            addToast('Đã tắt khóa mã PIN', 'info');
            onClose();
          } else {
            setError(res.error || 'Mã PIN hiện tại không đúng');
            setCurrentPin('');
          }
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      // If changing, advance to 'new'
      setStep('new');
      return;
    }

    if (step === 'new') {
      if (newPin.length !== 4) {
        setError('Vui lòng nhập đủ 4 chữ số');
        return;
      }
      setStep('confirm');
      return;
    }

    if (step === 'confirm') {
      if (confirmPin.length !== 4) {
        setError('Vui lòng nhập đủ 4 chữ số');
        return;
      }
      if (newPin !== confirmPin) {
        setError('Mã PIN xác nhận không khớp. Vui lòng thử lại.');
        setConfirmPin('');
        return;
      }

      setIsSubmitting(true);
      try {
        if (mode === 'setup') {
          await setupPin(newPin);
          addToast('Đã thiết lập mã PIN bảo vệ ứng dụng', 'success');
          onClose();
        } else if (mode === 'change') {
          const res = await changePin(currentPin, newPin);
          if (res.success) {
            addToast('Đã đổi mã PIN thành công', 'success');
            onClose();
          } else {
            setError(res.error || 'Có lỗi xảy ra');
            setStep('current');
            setCurrentPin('');
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getActivePin = () => {
    if (step === 'current') return currentPin;
    if (step === 'new') return newPin;
    return confirmPin;
  };

  const getStepTitle = () => {
    if (step === 'current') return 'Nhập mã PIN hiện tại';
    if (step === 'new') return mode === 'change' ? 'Nhập mã PIN mới' : 'Tạo mã PIN 4 số';
    return 'Xác nhận lại mã PIN';
  };

  const getStepSubtitle = () => {
    if (step === 'current') return 'Xác thực để tiếp tục thay đổi';
    if (step === 'new') return 'Ghi nhớ mã này để mở khóa ứng dụng';
    return 'Nhập lại đúng 4 số bạn vừa tạo';
  };

  const activePin = getActivePin();

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <KeyRound className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">{getStepTitle()}</h3>
              <p className="text-xs text-slate-400">{getStepSubtitle()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pin Dots */}
        <div className="my-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => {
            const filled = activePin.length > idx;
            return (
              <div
                key={idx}
                className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${
                  filled ? 'border-indigo-600 bg-indigo-600 scale-110' : 'border-slate-300 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="min-h-5 text-center">
          {error && <p className="text-xs font-semibold text-rose-500 animate-fadeIn">{error}</p>}
        </div>

        {/* Numeric keypad */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-12 items-center justify-center rounded-xl bg-slate-50 text-lg font-semibold text-slate-800 transition active:scale-95 active:bg-slate-200 hover:bg-slate-100"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleDelete}
            className="flex h-12 items-center justify-center rounded-xl text-xs font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            Xóa
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex h-12 items-center justify-center rounded-xl bg-slate-50 text-lg font-semibold text-slate-800 transition active:scale-95 active:bg-slate-200 hover:bg-slate-100"
          >
            0
          </button>

          <button
            type="button"
            disabled={activePin.length !== 4 || isSubmitting}
            onClick={() => void handleNext()}
            className="flex h-12 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white transition active:scale-95 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
