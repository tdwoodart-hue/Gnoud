import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  LogIn,
  LogOut,
  RotateCcw,
  Sun,
  Moon,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationState,
  syncNotificationTasks,
} from '../../services/notificationService';
import { NotificationState } from '../../services/notificationStatus';
import { getNotificationPreferences, saveNotificationPreferences } from '../../services/notificationPolicy';
import { formatDisplayDate } from '../../data/mockData';
import { SecuritySettingsSection } from '../security/SecuritySettingsSection';
import { APP_UPDATED_AT, APP_VERSION } from '../../config/appVersion';
import { getStoredAppTheme, saveAppTheme, type AppTheme } from '../../services/themeService';

type SettingsPage = 'root' | 'account' | 'notifications' | 'app' | 'data';

const pageTitles: Record<SettingsPage, string> = {
  root: 'Cài đặt',
  account: 'Tài khoản & bảo mật',
  notifications: 'Thông báo',
  app: 'Ứng dụng',
  data: 'Dữ liệu',
};

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const {
    user,
    signInWithGoogle,
    logout,
    addToast,
    trashTasks,
    restoreTask,
    permanentlyDeleteTask,
    tasks,
  } = useApp();

  const [page, setPage] = useState<SettingsPage>('root');
  const [state, setState] = useState<NotificationState>('default');
  const [reminderPreferences, setReminderPreferences] = useState(() => getNotificationPreferences());
  const [busy, setBusy] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [pendingPermanentDeleteId, setPendingPermanentDeleteId] = useState<string | null>(null);
  const [theme, setTheme] = useState<AppTheme>(() => getStoredAppTheme());

  const refresh = async () => {
    setState(await getNotificationState());
  };

  useEffect(() => {
    if (!isOpen) return;
    setPage('root');
    setShowTrash(false);
    setTheme(getStoredAppTheme());
    setReminderPreferences(getNotificationPreferences());
    void refresh();
  }, [isOpen]);

  const enable = async () => {
    setBusy(true);
    try {
      await enablePushNotifications();
      await refresh();
      addToast('Thông báo đã hoạt động', 'success');
    } catch (error) {
      await refresh();
      addToast(error instanceof Error ? error.message : 'Không thể bật thông báo', 'error');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await disablePushNotifications();
      await refresh();
      addToast('Đã tắt thông báo', 'info');
    } finally {
      setBusy(false);
    }
  };

  const updateReminderPreferences = (updates: Partial<typeof reminderPreferences>) => {
    const next = saveNotificationPreferences({ ...reminderPreferences, ...updates });
    setReminderPreferences(next);
    void syncNotificationTasks(tasks, next).catch((error) => {
      console.warn('Could not sync reminder preferences:', error);
      addToast('Đã lưu trên máy nhưng chưa đồng bộ lịch nhắc.', 'warning');
    });
  };

  const exportPlanningData = () => {
    const keys = ['tasks', 'projects', 'events', 'habits', 'goals'];
    const data = Object.fromEntries(
      keys.map((key) => [key, JSON.parse(localStorage.getItem('lich_song_' + key) || '[]')]),
    );
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'gnoud-planning-' + new Date().toISOString().slice(0, 10) + '.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateTheme = (nextTheme: AppTheme) => {
    setTheme(nextTheme);
    saveAppTheme(nextTheme);
  };

  const active = state === 'active';
  const toggleBlocked =
    busy || state === 'denied' || state === 'unsupported' || state === 'server_unavailable';

  const stateText: Record<NotificationState, string> = {
    active: 'Đang bật',
    needs_registration: 'Cần kết nối lại',
    server_unavailable: 'Server thông báo chưa sẵn sàng',
    needs_install: 'Cần cài app lên màn hình chính',
    denied: 'Đã bị chặn trong hệ thống',
    unsupported: 'Thiết bị không hỗ trợ',
    default: 'Đang tắt',
    granted: 'Cần bật lại',
  };

  const rootPage = (
    <div className="space-y-5">
      <section>
        <p className="mb-2 px-1 text-xs font-semibold text-slate-500">Tài khoản</p>
        <button
          type="button"
          onClick={() => setPage('account')}
          className="flex min-h-[66px] w-full items-center gap-3 rounded-[18px] bg-white px-4 text-left active:bg-slate-50"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-slate-900">{user?.displayName || 'Gnoud'}</p>
            <p className="mt-0.5 truncate text-[13px] text-slate-400">{user?.email || 'Chưa đăng nhập Google'}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
        </button>
      </section>

      <section>
        <p className="mb-2 px-1 text-xs font-semibold text-slate-500">Chung</p>
        <div className="overflow-hidden rounded-[18px] bg-white">
          <button
            type="button"
            onClick={() => setPage('notifications')}
            className="flex min-h-[58px] w-full items-center gap-3 px-4 text-left active:bg-slate-50"
          >
            <span className="flex-1 text-[14px] font-medium text-slate-800">Thông báo</span>
            <span className="text-[13px] text-slate-400">{stateText[state]}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </button>

          <div className="flex min-h-[58px] items-center gap-3 border-t border-slate-100 px-4">
            <span className="flex-1 text-[14px] font-medium text-slate-800">Giao diện</span>
            <div className="flex rounded-xl bg-slate-100 p-0.5" role="group" aria-label="Chọn giao diện">
              <button
                type="button"
                onClick={() => updateTheme('light')}
                aria-pressed={theme === 'light'}
                className={'flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[12px] font-semibold transition ' + (
                  theme === 'light'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-400'
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                Sáng
              </button>
              <button
                type="button"
                onClick={() => updateTheme('dark')}
                aria-pressed={theme === 'dark'}
                className={'flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[12px] font-semibold transition ' + (
                  theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-400'
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                Tối
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPage('data')}
            className="flex min-h-[58px] w-full items-center gap-3 border-t border-slate-100 px-4 text-left active:bg-slate-50"
          >
            <span className="flex-1 text-[14px] font-medium text-slate-800">Dữ liệu</span>
            {trashTasks.length > 0 ? <span className="text-[13px] text-slate-400">{trashTasks.length} đã xóa</span> : null}
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </button>
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-[18px] bg-white">
          <button
            type="button"
            onClick={() => setPage('app')}
            className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left active:bg-slate-50"
          >
            <span className="flex-1 text-[14px] font-medium text-slate-800">Phiên bản</span>
            <span className="text-[13px] font-medium text-slate-400">{APP_VERSION}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </button>
        </div>
      </section>
    </div>
  );

  const accountPage = (
    <div className="space-y-5">
      <section>
        <p className="mb-2 px-1 text-xs font-semibold text-slate-500">Tài khoản</p>
        <div className="flex min-h-[70px] items-center gap-3 rounded-[18px] bg-white px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
            {(user?.displayName || user?.email || 'G').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-slate-900">{user?.displayName || 'Khách'}</p>
            <p className="mt-0.5 truncate text-[13px] text-slate-400">{user?.email || 'Dữ liệu lưu trên thiết bị'}</p>
          </div>
          <button
            type="button"
            onClick={() => void (user ? logout() : signInWithGoogle())}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-[13px] font-semibold text-slate-600 active:bg-slate-200"
          >
            {user ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {user ? 'Đăng xuất' : 'Đăng nhập'}
          </button>
        </div>
      </section>
      <SecuritySettingsSection />
    </div>
  );

  const notificationsPage = (
    <section>
      <div className="overflow-hidden rounded-[18px] bg-white">
        <div className="flex min-h-[66px] items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-slate-900">Thông báo công việc</p>
            <p className={'mt-0.5 text-[13px] ' + (state === 'denied' || state === 'server_unavailable' ? 'text-rose-500' : 'text-slate-400')}>{stateText[state]}</p>
            {state === 'needs_registration' ? (
              <p className="mt-1 text-[11px] leading-4 text-slate-400">Máy đã cấp quyền nhưng server chưa lưu thiết bị. Bật lại để Gnoud tự nối lại.</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={toggleBlocked}
            onClick={() => void (active ? disable() : enable())}
            className={'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ' + (active ? 'bg-indigo-600' : 'bg-slate-200')}
            aria-label={active ? 'Tắt thông báo' : 'Bật thông báo'}
            aria-pressed={active}
          >
            <span className={'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ' + (active ? 'left-6' : 'left-1')} />
          </button>
        </div>

        <div className="flex min-h-[58px] items-center gap-3 border-t border-slate-100 px-4 py-2.5">
          <span className="min-w-0 flex-1 text-[14px] font-medium text-slate-800">Nhắc hôm trước</span>
          <input
            type="time"
            value={reminderPreferences.previousDayTime}
            disabled={!reminderPreferences.previousDayEnabled}
            onChange={(event) => updateReminderPreferences({ previousDayTime: event.target.value })}
            className="h-9 w-[92px] rounded-lg bg-slate-100 px-2 text-[13px] font-semibold text-slate-700 outline-none disabled:opacity-40"
            aria-label="Giờ nhắc hôm trước"
          />
          <button
            type="button"
            onClick={() => updateReminderPreferences({ previousDayEnabled: !reminderPreferences.previousDayEnabled })}
            className={'relative h-7 w-12 shrink-0 rounded-full transition-colors ' + (reminderPreferences.previousDayEnabled ? 'bg-indigo-600' : 'bg-slate-200')}
            aria-label="Bật tắt nhắc hôm trước"
            aria-pressed={reminderPreferences.previousDayEnabled}
          >
            <span className={'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ' + (reminderPreferences.previousDayEnabled ? 'left-6' : 'left-1')} />
          </button>
        </div>

        <div className="flex min-h-[58px] items-center gap-3 border-t border-slate-100 px-4 py-2.5">
          <span className="min-w-0 flex-1 text-[14px] font-medium text-slate-800">Nhắc trước</span>
          <select
            value={reminderPreferences.beforeStartMinutes}
            onChange={(event) =>
              updateReminderPreferences({
                beforeStartMinutes: Number(event.target.value) as 0 | 15 | 30 | 60 | 120,
              })
            }
            className="h-9 rounded-lg bg-slate-100 px-2 text-[13px] font-semibold text-slate-700 outline-none"
            aria-label="Thời gian nhắc trước"
          >
            <option value={0}>Tắt</option>
            <option value={15}>15 phút</option>
            <option value={30}>30 phút</option>
            <option value={60}>1 giờ</option>
            <option value={120}>2 giờ</option>
          </select>
        </div>

        <div className="flex min-h-[58px] items-center gap-3 border-t border-slate-100 px-4 py-2.5">
          <span className="min-w-0 flex-1 text-[14px] font-medium text-slate-800">Nhắc đúng giờ</span>
          <button
            type="button"
            onClick={() => updateReminderPreferences({ atStartEnabled: !reminderPreferences.atStartEnabled })}
            className={'relative h-7 w-12 shrink-0 rounded-full transition-colors ' + (reminderPreferences.atStartEnabled ? 'bg-indigo-600' : 'bg-slate-200')}
            aria-label="Bật tắt nhắc đúng giờ"
            aria-pressed={reminderPreferences.atStartEnabled}
          >
            <span className={'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ' + (reminderPreferences.atStartEnabled ? 'left-6' : 'left-1')} />
          </button>
        </div>
      </div>
    </section>
  );

  const appPage = (
    <section>
      <div className="overflow-hidden rounded-[18px] bg-white">
        <div className="flex min-h-[62px] items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-slate-800">Giao diện</p>
            <p className="mt-0.5 text-[12px] text-slate-400">Được lưu lại trên thiết bị này</p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-0.5" role="group" aria-label="Chọn giao diện ứng dụng">
            <button
              type="button"
              onClick={() => updateTheme('light')}
              aria-pressed={theme === 'light'}
              className={'flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[12px] font-semibold transition ' + (
                theme === 'light' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400'
              )}
            >
              <Sun className="h-3.5 w-3.5" /> Sáng
            </button>
            <button
              type="button"
              onClick={() => updateTheme('dark')}
              aria-pressed={theme === 'dark'}
              className={'flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[12px] font-semibold transition ' + (
                theme === 'dark' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400'
              )}
            >
              <Moon className="h-3.5 w-3.5" /> Tối
            </button>
          </div>
        </div>
        <div className="flex min-h-[58px] items-center border-t border-slate-100 px-4">
          <span className="flex-1 text-[14px] font-medium text-slate-800">Phiên bản hiện tại</span>
          <span className="text-[14px] font-semibold text-slate-500">{APP_VERSION}</span>
        </div>
        <div className="flex min-h-[52px] items-center border-t border-slate-100 px-4">
          <span className="flex-1 text-[13px] text-slate-500">Cập nhật gần nhất</span>
          <span className="text-[13px] text-slate-400">
            {new Date(APP_UPDATED_AT).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </section>
  );

  const dataPage = (
    <section>
      <div className="overflow-hidden rounded-[18px] bg-white">
        <button
          type="button"
          onClick={exportPlanningData}
          className="flex min-h-[62px] w-full items-center gap-3 px-4 text-left active:bg-slate-50"
        >
          <Download className="h-[18px] w-[18px] shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-slate-800">Xuất công việc & kế hoạch</p>
            <p className="mt-0.5 text-[12px] text-slate-400">Công việc, dự án, lịch, thói quen và mục tiêu</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowTrash((value) => !value)}
          className="flex min-h-[60px] w-full items-center gap-3 border-t border-slate-100 px-4 text-left active:bg-slate-50"
        >
          <Trash2 className="h-[18px] w-[18px] shrink-0 text-slate-400" />
          <span className="flex-1 text-[14px] font-medium text-slate-800">Thùng rác</span>
          <span className="text-[13px] text-slate-400">{trashTasks.length}</span>
          <ChevronDown className={'h-4 w-4 text-slate-300 transition-transform ' + (showTrash ? 'rotate-180' : '')} />
        </button>

        <AnimatePresence initial={false}>
          {showTrash ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-slate-100 bg-slate-50"
            >
              <div className="max-h-72 space-y-2 overflow-y-auto p-3">
                {trashTasks.length === 0 ? (
                  <p className="py-6 text-center text-sm font-medium text-slate-400">Thùng rác đang trống</p>
                ) : (
                  [...trashTasks]
                    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
                    .map((task) => (
                      <div key={task.id} className="rounded-xl bg-white p-3">
                        <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-400">Đã xóa {formatDisplayDate(task.deletedAt)}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => restoreTask(task.id)}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Khôi phục
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingPermanentDeleteId(task.id)}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-xs font-bold text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa hẳn
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );

  const pageContent: Record<SettingsPage, React.ReactNode> = {
    root: rootPage,
    account: accountPage,
    notifications: notificationsPage,
    app: appPage,
    data: dataPage,
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="settings-overlay"
            className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.button
              type="button"
              aria-label="Đóng cài đặt"
              className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px]"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.section
              initial={{ y: 90 }}
              animate={{ y: 0 }}
              exit={{ y: 90 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-[#f4f5f7] pt-[env(safe-area-inset-top)] sm:h-auto sm:max-h-[88vh] sm:rounded-[28px] sm:pt-0"
              role="dialog"
              aria-modal="true"
              aria-label="Cài đặt"
            >
              <header className="flex min-h-[56px] shrink-0 items-center gap-2 bg-white/95 px-3 backdrop-blur-xl sm:px-4">
                {page !== 'root' ? (
                  <button
                    type="button"
                    onClick={() => setPage('root')}
                    className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 active:bg-slate-100"
                    aria-label="Quay lại"
                  >
                    <ArrowLeft className="h-[18px] w-[18px]" />
                  </button>
                ) : (
                  <span className="h-9 w-9" aria-hidden="true" />
                )}

                <h2 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold tracking-tight text-slate-900">
                  {pageTitles[page]}
                </h2>

                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 active:bg-slate-200"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-4">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={page}
                    initial={{ opacity: 0, x: page === 'root' ? -10 : 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: page === 'root' ? 10 : -14 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {pageContent[page]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {pendingPermanentDeleteId ? (
          <motion.div
            className="fixed inset-0 z-[90] grid place-items-center bg-black/35 px-5"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 18, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 18, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl"
            >
              <h2 className="text-lg font-bold text-slate-950">Xóa vĩnh viễn nhiệm vụ?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Sau bước này nhiệm vụ sẽ không thể khôi phục lại.</p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPendingPermanentDeleteId(null)}
                  className="h-12 rounded-xl bg-slate-100 text-sm font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    permanentlyDeleteTask(pendingPermanentDeleteId);
                    setPendingPermanentDeleteId(null);
                  }}
                  className="h-12 rounded-xl bg-rose-600 text-sm font-bold text-white active:bg-rose-700"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
