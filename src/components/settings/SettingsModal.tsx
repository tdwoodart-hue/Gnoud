import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  FileJson2,
  GitBranch,
  History,
  LogIn,
  LogOut,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationSchedulerReady,
  getNotificationState,
  scheduleReminderTest,
  sendTestNotification,
  syncNotificationTasks,
  type ReminderScheduleTestKind,
} from '../../services/notificationService';
import { NotificationState } from '../../services/notificationStatus';
import { getNotificationPreferences, saveNotificationPreferences } from '../../services/notificationPolicy';
import { formatDisplayDate } from '../../data/mockData';
import { buildChatGPTSnapshot, downloadChatGPTSnapshot } from '../../services/dataSnapshot';
import { getTelemetrySnapshot, recordUsageEvent } from '../../services/usageTelemetry';
import { SecuritySettingsSection } from '../security/SecuritySettingsSection';
import { APP_RELEASES, APP_UPDATED_AT, APP_VERSION } from '../../config/appVersion';

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
    projects,
    calendarEvents,
    habits,
    goals,
  } = useApp();

  const [page, setPage] = useState<SettingsPage>('root');
  const [state, setState] = useState<NotificationState>('default');
  const [reminderPreferences, setReminderPreferences] = useState(() => getNotificationPreferences());
  const [busy, setBusy] = useState(false);
  const [testingReminder, setTestingReminder] = useState<ReminderScheduleTestKind | null>(null);
  const [schedulerReady, setSchedulerReady] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [pendingPermanentDeleteId, setPendingPermanentDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    const [nextState, ready] = await Promise.all([getNotificationState(), getNotificationSchedulerReady()]);
    setState(nextState);
    setSchedulerReady(ready);
  };

  useEffect(() => {
    if (!isOpen) return;
    setPage('root');
    setShowTrash(false);
    setShowVersions(false);
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

  const test = async () => {
    setBusy(true);
    try {
      await sendTestNotification();
      addToast('Đã gửi tới iPhone', 'success');
    } catch (error) {
      await refresh();
      addToast(error instanceof Error ? error.message : 'Không thể gửi', 'error');
    } finally {
      setBusy(false);
    }
  };

  const testScheduledReminder = async (kind: ReminderScheduleTestKind) => {
    setTestingReminder(kind);
    try {
      const result = await scheduleReminderTest(kind, tasks, reminderPreferences);
      await refresh();
      const expectedTime = new Date(result.firesAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      addToast(`Đã lên lịch test · chờ khoảng 1–2 phút (${expectedTime})`, 'success');
    } catch (error) {
      await refresh();
      addToast(error instanceof Error ? error.message : 'Không thể lên lịch test', 'error');
    } finally {
      setTestingReminder(null);
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

  const exportData = () => {
    const keys = ['tasks', 'projects', 'events', 'habits', 'goals'];
    const data = Object.fromEntries(
      keys.map((key) => [key, JSON.parse(localStorage.getItem(`lich_song_${key}`) || '[]')]),
    );
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `lich-song-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportChatGPTSnapshot = () => {
    try {
      recordUsageEvent('snapshot_exported');
      const snapshot = buildChatGPTSnapshot({
        tasks,
        projects,
        calendarEvents,
        habits,
        goals,
        telemetry: getTelemetrySnapshot(),
      });
      const filename = downloadChatGPTSnapshot(snapshot);
      addToast(`Đã tạo ${filename}`, 'success');
    } catch (error) {
      console.warn('Could not export ChatGPT snapshot:', error);
      addToast('Không thể tạo snapshot lúc này.', 'error');
    }
  };

  const active = state === 'active';
  const stateText: Record<NotificationState, string> = {
    active: schedulerReady ? 'Nhắc tự động đang hoạt động' : 'Gửi thử được · lịch tự động chưa kết nối',
    needs_registration: 'Cần đăng ký lại',
    server_unavailable: 'Server chưa cấu hình',
    needs_install: 'Cần cài lên màn hình chính',
    denied: 'Đã bị chặn',
    unsupported: 'Không hỗ trợ',
    default: 'Chưa bật',
    granted: 'Cần kiểm tra lại',
  };

  const menuRows = [
    {
      id: 'account' as const,
      title: 'Tài khoản & bảo mật',
      description: user?.email || 'Dữ liệu hiện lưu trên thiết bị',
      icon: UserRound,
    },
    {
      id: 'notifications' as const,
      title: 'Thông báo',
      description: stateText[state],
      icon: Bell,
    },
    {
      id: 'app' as const,
      title: 'Ứng dụng',
      description: `Phiên bản ${APP_VERSION}`,
      icon: GitBranch,
    },
    {
      id: 'data' as const,
      title: 'Dữ liệu',
      description: `${trashTasks.length} mục trong thùng rác · sao lưu & xuất dữ liệu`,
      icon: Database,
    },
  ];

  const rootPage = (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
            {(user?.displayName || user?.email || 'G').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{user?.displayName || 'Gnoud'}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{user?.email || 'Chưa đăng nhập Google'}</p>
          </div>
          <button
            type="button"
            onClick={() => void (user ? logout() : signInWithGoogle())}
            className="h-9 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600 transition active:bg-slate-200"
          >
            {user ? 'Đăng xuất' : 'Đăng nhập'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-xs">
        {menuRows.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={`flex min-h-[68px] w-full items-center gap-3 px-4 text-left transition active:bg-slate-50 ${
                index ? 'border-t border-slate-100' : ''
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-800">{item.title}</span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">{item.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          );
        })}
      </div>

      <p className="px-1 text-center text-[11px] font-medium text-slate-400">
        Cài đặt được chia theo nhóm để dễ tìm hơn.
      </p>
    </div>
  );

  const accountPage = (
    <div className="space-y-4">
      <section>
        <p className="mb-2 px-1 text-xs font-bold text-slate-500">Tài khoản</p>
        <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {(user?.displayName || user?.email || 'G').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{user?.displayName || 'Khách'}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{user?.email || 'Dữ liệu lưu trên máy'}</p>
            </div>
            <button
              type="button"
              onClick={() => void (user ? logout() : signInWithGoogle())}
              className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 transition active:bg-slate-200"
              aria-label={user ? 'Đăng xuất' : 'Đăng nhập'}
            >
              {user ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>

      <SecuritySettingsSection />
    </div>
  );

  const notificationsPage = (
    <section>
      <div className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-xs">
        <div className="flex items-center gap-3 p-4">
          <span className={`grid h-10 w-10 place-items-center rounded-2xl ${
            active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <Bell className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Nhắc từng việc</p>
            <p className={`mt-0.5 text-xs font-medium ${
              state === 'server_unavailable' ? 'text-rose-500' : active ? 'text-emerald-600' : 'text-slate-400'
            }`}>
              {stateText[state]}
            </p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-3">
          {active ? (
            <>
              <button
                onClick={test}
                disabled={busy}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Gửi thử
              </button>
              <button
                onClick={disable}
                disabled={busy}
                className="h-10 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-500"
              >
                Tắt
              </button>
            </>
          ) : (
            <button
              onClick={enable}
              disabled={busy || state === 'denied' || state === 'unsupported' || state === 'server_unavailable'}
              className="h-10 w-full rounded-xl bg-slate-900 px-3 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
            >
              {busy
                ? 'Đang xử lý…'
                : state === 'server_unavailable'
                  ? 'Cần cấu hình server'
                  : state === 'needs_install'
                    ? 'Cài app rồi bật thông báo'
                    : 'Bật thông báo'}
            </button>
          )}
        </div>

        <div className="border-t border-slate-100">
          <div className="flex min-h-16 items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">Nhắc hôm trước</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Báo việc của ngày mai vào giờ đã chọn</p>
            </div>
            <input
              type="time"
              value={reminderPreferences.previousDayTime}
              disabled={!reminderPreferences.previousDayEnabled}
              onChange={(event) => updateReminderPreferences({ previousDayTime: event.target.value })}
              className="h-9 w-[90px] rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none disabled:opacity-40"
              aria-label="Giờ nhắc hôm trước"
            />
            <button
              type="button"
              onClick={() => updateReminderPreferences({ previousDayEnabled: !reminderPreferences.previousDayEnabled })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                reminderPreferences.previousDayEnabled ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
              aria-label="Bật tắt nhắc hôm trước"
              aria-pressed={reminderPreferences.previousDayEnabled}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                reminderPreferences.previousDayEnabled ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>

          <div className="flex min-h-16 items-center gap-3 border-t border-slate-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">Nhắc trước khi bắt đầu</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Cho việc có giờ bắt đầu</p>
            </div>
            <select
              value={reminderPreferences.beforeStartMinutes}
              onChange={(event) =>
                updateReminderPreferences({
                  beforeStartMinutes: Number(event.target.value) as 0 | 15 | 30 | 60 | 120,
                })
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none"
              aria-label="Thời gian nhắc trước"
            >
              <option value={0}>Tắt</option>
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>1 giờ</option>
              <option value={120}>2 giờ</option>
            </select>
          </div>

          <div className="flex min-h-16 items-center gap-3 border-t border-slate-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">Nhắc đúng giờ</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Gửi khi việc bắt đầu</p>
            </div>
            <button
              type="button"
              onClick={() => updateReminderPreferences({ atStartEnabled: !reminderPreferences.atStartEnabled })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                reminderPreferences.atStartEnabled ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
              aria-label="Bật tắt nhắc đúng giờ"
              aria-pressed={reminderPreferences.atStartEnabled}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                reminderPreferences.atStartEnabled ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>

          <div className="border-t border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-800">Kiểm tra lịch nhắc</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {active && schedulerReady
                ? 'Dùng lịch thật · chờ khoảng 1–2 phút'
                : 'Bấm test để kiểm tra kết nối thông báo'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void testScheduledReminder('previous-day')}
                disabled={busy || Boolean(testingReminder)}
                className="h-10 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 disabled:text-slate-400"
              >
                {testingReminder === 'previous-day' ? 'Đang lên lịch…' : 'Test hôm trước'}
              </button>
              <button
                type="button"
                onClick={() => void testScheduledReminder('before-start')}
                disabled={busy || Boolean(testingReminder)}
                className="h-10 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 disabled:text-slate-400"
              >
                {testingReminder === 'before-start' ? 'Đang lên lịch…' : 'Test trước 1 giờ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const appPage = (
    <section className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-xs">
      <div className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <GitBranch className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">Phiên bản {APP_VERSION}</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Hiện tại</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Cập nhật {new Date(APP_UPDATED_AT).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowVersions((value) => !value)}
        className="flex min-h-14 w-full items-center gap-3 border-t border-slate-100 px-4 text-left"
      >
        <History className="h-[18px] w-[18px] shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Lịch sử cập nhật</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{APP_RELEASES.length} phiên bản gần nhất</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${showVersions ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {showVersions ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-slate-100 bg-slate-50"
          >
            <div className="space-y-2 p-3">
              {APP_RELEASES.map((release, index) => (
                <div key={release.version} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">v{release.version}</span>
                        {index === 0 ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">Hiện tại</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{release.title}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                      {new Date(release.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {release.changes.map((change) => (
                      <p key={change} className="text-xs leading-5 text-slate-500">• {change}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );

  const dataPage = (
    <section className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-xs">
      <button onClick={exportChatGPTSnapshot} className="flex min-h-[64px] w-full items-center gap-3 px-4 text-left active:bg-slate-50">
        <FileJson2 className="h-[18px] w-[18px] shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Xuất dữ liệu cho ChatGPT</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">Snapshot đã lọc dữ liệu nhạy cảm</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </button>

      <button onClick={exportData} className="flex min-h-[60px] w-full items-center gap-3 border-t border-slate-100 px-4 text-left active:bg-slate-50">
        <Download className="h-[18px] w-[18px] text-slate-400" />
        <span className="flex-1 text-sm font-semibold text-slate-800">Xuất bản sao lưu</span>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </button>

      <button
        onClick={() => setShowTrash((value) => !value)}
        className="flex min-h-[64px] w-full items-center gap-3 border-t border-slate-100 px-4 text-left active:bg-slate-50"
      >
        <Trash2 className="h-[18px] w-[18px] text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Thùng rác</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{trashTasks.length} nhiệm vụ · giữ 30 ngày</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${showTrash ? 'rotate-180' : ''}`} />
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
                    <div key={task.id} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
                      <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                      <p className="mt-1 text-[11px] text-slate-400">Đã xóa {formatDisplayDate(task.deletedAt)}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => restoreTask(task.id)}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Khôi phục
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingPermanentDeleteId(task.id)}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-xs font-bold text-rose-600"
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
              className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.section
              initial={{ y: 110, scale: 0.985 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 110, scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 410, damping: 36, mass: 0.86 }}
              className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-slate-200/70 bg-[#fafbfc] shadow-[0_30px_90px_rgba(15,23,42,0.25)] sm:max-h-[88vh] sm:rounded-[28px]"
              role="dialog"
              aria-modal="true"
              aria-label="Cài đặt"
            >
              <div className="flex h-7 shrink-0 items-center justify-center sm:hidden">
                <span className="h-1 w-10 rounded-full bg-slate-300" />
              </div>

              <header className="flex min-h-[58px] shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/95 px-3 backdrop-blur-xl sm:px-4">
                {page !== 'root' ? (
                  <button
                    type="button"
                    onClick={() => setPage('root')}
                    className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition active:bg-slate-100"
                    aria-label="Quay lại"
                  >
                    <ArrowLeft className="h-[18px] w-[18px]" />
                  </button>
                ) : (
                  <span className="h-9 w-1" aria-hidden="true" />
                )}

                <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-tight text-slate-900">
                  {pageTitles[page]}
                </h2>

                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 transition active:bg-slate-200"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={page}
                    initial={{ opacity: 0, x: page === 'root' ? -12 : 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: page === 'root' ? 12 : -18 }}
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
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.98 }}
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
