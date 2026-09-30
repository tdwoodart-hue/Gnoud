import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { useApp } from '../../context/AppContext';

export type PinModalMode = 'setup' | 'change' | 'disable' | 'recover';

interface PinSetupModalProps {
  isOpen: boolean;
  mode: PinModalMode;
  onClose: () => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({ isOpen, mode, onClose }) => {
  const { setupPin, changePin, disablePin, completePinRecovery } = useSecurity();
  const { addToast } = useApp();

  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setStep(mode === 'change' || mode === 'disable' ? 'current' : 'new');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setIsSubmitting(false);
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const activePin = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;

  const handleDigit = (digit: string) => {
    if (isSubmitting) return;
    setError('');
    if (step === 'current' && currentPin.length < 4) setCurrentPin((value) => value + digit);
    if (step === 'new' && newPin.length < 4) setNewPin((value) => value + digit);
    if (step === 'confirm' && confirmPin.length < 4) setConfirmPin((value) => value + digit);
  };

  const handleDelete = () => {
    if (isSubmitting) return;
    setError('');
    if (step === 'current') setCurrentPin((value) => value.slice(0, -1));
    if (step === 'new') setNewPin((value) => value.slice(0, -1));
    if (step === 'confirm') setConfirmPin((value) => value.slice(0, -1));
  };

  const handleNext = async () => {
    setError('');
    if (activePin.length !== 4) {
      setError('Nhập đủ 4 chữ số để tiếp tục.');
      return;
    }

    if (step === 'current') {
      if (mode === 'disable') {
        setIsSubmitting(true);
        try {
          const result = await disablePin(currentPin);
          if (!result.success) {
            setError(result.error || 'Mã PIN hiện tại không đúng.');
            setCurrentPin('');
            return;
          }
          addToast('Đã tắt khóa mã PIN', 'info');
          onClose();
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      setStep('new');
      return;
    }

    if (step === 'new') {
      setStep('confirm');
      return;
    }

    if (newPin !== confirmPin) {
      setError('Hai mã PIN không khớp. Nhập lại mã xác nhận.');
      setConfirmPin('');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'setup') {
        await setupPin(newPin);
        addToast('Đã bật khóa mã PIN', 'success');
        onClose();
        return;
      }

      if (mode === 'change') {
        const result = await changePin(currentPin, newPin);
        if (!result.success) {
          setError(result.error || 'Không đổi được mã PIN.');
          setStep('current');
          setCurrentPin('');
          return;
        }
        addToast('Đã đổi mã PIN', 'success');
        onClose();
        return;
      }

      if (mode === 'recover') {
        const result = await completePinRecovery(newPin);
        if (!result.success) {
          setError(result.error || 'Không đặt lại được mã PIN.');
          return;
        }
        addToast('Đã tạo mã PIN mới', 'success');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    step === 'current'
      ? 'Nhập mã PIN hiện tại'
      : step === 'confirm'
        ? 'Nhập lại mã PIN'
        : mode === 'recover'
          ? 'Tạo mã PIN mới'
          : mode === 'change'
            ? 'Mã PIN mới'
            : 'Tạo mã PIN';

  const subtitle =
    step === 'current'
      ? 'Xác nhận mã hiện tại để tiếp tục.'
      : step === 'confirm'
        ? 'Nhập lại đúng 4 số vừa chọn.'
        : mode === 'recover'
          ? 'PIN cũ không thể xem lại. Hãy chọn 4 số mới.'
          : 'Chọn 4 chữ số dễ nhớ với bạn.';

  const actionLabel =
    mode === 'disable' && step === 'current'
      ? 'Tắt khóa'
      : step === 'confirm'
        ? 'Lưu'
        : 'Tiếp';

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[360px] rounded-[28px] bg-[#fbfbfa] p-5 text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-100"
          >
            Đóng
          </button>
        </div>

        <div className="my-7 flex justify-center gap-4" aria-label="Mã PIN đã nhập">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-3 w-3 rounded-full transition ${
                activePin.length > index ? 'bg-slate-900' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="min-h-5 text-center">
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>

        <div className="mx-auto mt-3 grid max-w-[270px] grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-xl font-semibold text-slate-900 ring-1 ring-slate-200 transition active:scale-95 active:bg-slate-100"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleDelete}
            className="mx-auto grid h-16 w-16 place-items-center rounded-full text-xl font-medium text-slate-400 transition active:scale-95 active:bg-slate-100"
            aria-label="Xóa số cuối"
          >
            ⌫
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-xl font-semibold text-slate-900 ring-1 ring-slate-200 transition active:scale-95 active:bg-slate-100"
          >
            0
          </button>

          <button
            type="button"
            disabled={activePin.length !== 4 || isSubmitting}
            onClick={() => void handleNext()}
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-900 px-2 text-[11px] font-bold text-white transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isSubmitting ? '...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
