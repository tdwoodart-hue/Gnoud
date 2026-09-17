import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Download,
  FileJson2,
  LogIn,
  LogOut,
  RotateCcw,
  Send,
  Trash2,
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
  const [state, setState] = useState<NotificationState>('default');
  const [reminderPreferences, setReminderPreferences] = useState(() => getNotificationPreferences());
  const [busy, setBusy] = useState(false);
  const [testingReminder, setTestingReminder] = useState<ReminderScheduleTestKind | null>(null);
  const [schedulerReady, setSchedulerReady] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [pendingPermanentDeleteId, setPendingPermanentDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    const [nextState, ready] = await Promise.all([getNotificationState(), getNotificationSchedulerReady()]);
    setState(nextState);
    setSchedulerReady(ready);
  };

  useEffect(() => {
    if (isOpen) {
      setReminderPreferences(getNotificationPreferences());
      void refresh();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      const expectedTime = new Date(result.firesAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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
    active: schedulerReady ? 'Nhắc tự động đang hoạt động' : 'Gửi thử được · Lịch tự động chưa kết nối',
    needs_registration: 'Cần đăng ký lại',
    server_unavailable: 'Server chưa cấu hình',
    needs_install: 'Cần cài lên màn hình chính',
    denied: 'Đã bị chặn',
    unsupported: 'Không hỗ trợ',
    default: 'Chưa bật',
    granted: 'Cần kiểm tra lại',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4">
      <section className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#f7f8fa] pt-[env(safe-area-inset-top)] shadow-2xl sm:max-h-[88vh] sm:rounded-3xl sm:pt-0">
        <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-5">
          <h2 className="flex-1 text-lg font-bold">Cài đặt</h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto p-4 pb-[max(24px,env(safe-area-inset-bottom))]">
          <section>
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tài khoản</p>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              <div className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 font-bold text-white">{user?.displayName?.slice(0, 1) || 'T'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{user?.displayName || 'Khách'}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email || 'Dữ liệu lưu trên máy'}</p>
                </div>
                <button onClick={() => void (user ? logout() : signInWithGoogle())} className="rounded-xl bg-slate-100 p-2 text-slate-500">
                  {user ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Thông báo</p>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              <div className="flex items-center gap-3 p-4">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                  <Bell className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Nhắc từng việc</p>
                  <p className={`text-xs font-medium ${state === 'server_unavailable' ? 'text-rose-500' : active ? 'text-emerald-600' : 'text-slate-400'}`}>{stateText[state]}</p>
                </div>
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-3">
                {active ? (
                  <>
                    <button onClick={test} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Gửi thử</button>
                    <button onClick={disable} disabled={busy} className="rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-500">Tắt</button>
                  </>
                ) : (
                  <button onClick={enable} disabled={busy || state === 'denied' || state === 'unsupported' || state === 'server_unavailable'} className="w-full rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400">
                    {busy ? 'Đang xử lý…' : state === 'server_unavailable' ? 'Cần cấu hình VAPID trên server' : state === 'needs_install' ? 'Cài app rồi bật thông báo' : 'Bật thông báo'}
                  </button>
                )}
              </div>
              <div className="border-t border-slate-100">
                <div className="flex min-h-14 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">Nhắc hôm trước</p>
                    <p className="text-xs text-slate-400">Báo các việc của ngày mai vào giờ mày chọn</p>
                  </div>
                  <input
                    type="time"
                    value={reminderPreferences.previousDayTime}
                    disabled={!reminderPreferences.previousDayEnabled}
                    onChange={(event) => updateReminderPreferences({ previousDayTime: event.target.value })}
                    className="h-9 w-[92px] rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none disabled:opacity-40"
                    aria-label="Giờ nhắc hôm trước"
                  />
                  <button
                    type="button"
                    onClick={() => updateReminderPreferences({ previousDayEnabled: !reminderPreferences.previousDayEnabled })}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${reminderPreferences.previousDayEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    aria-label="Bật tắt nhắc hôm trước"
                    aria-pressed={reminderPreferences.previousDayEnabled}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${reminderPreferences.previousDayEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex min-h-14 items-center gap-3 border-t border-slate-100 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">Nhắc trước khi bắt đầu</p>
                    <p className="text-xs text-slate-400">Chỉ áp dụng cho việc có giờ bắt đầu</p>
                  </div>
                  <select
                    value={reminderPreferences.beforeStartMinutes}
                    onChange={(event) => updateReminderPreferences({ beforeStartMinutes: Number(event.target.value) as 0 | 15 | 30 | 60 | 120 })}
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

                <div className="flex min-h-14 items-center gap-3 border-t border-slate-100 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">Nhắc đúng giờ</p>
                    <p className="text-xs text-slate-400">Gửi thêm một thông báo khi việc bắt đầu</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateReminderPreferences({ atStartEnabled: !reminderPreferences.atStartEnabled })}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${reminderPreferences.atStartEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    aria-label="Bật tắt nhắc đúng giờ"
                    aria-pressed={reminderPreferences.atStartEnabled}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${reminderPreferences.atStartEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-800">Kiểm tra lịch nhắc</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {active && schedulerReady
                        ? 'Dùng cron thật · chờ khoảng 1–2 phút'
                        : 'Bấm test để app tự bật và kiểm tra thông báo'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void testScheduledReminder('previous-day')}
                      disabled={busy || Boolean(testingReminder)}
                      className="h-10 rounded-xl bg-indigo-50 px-3 text-xs font-bold text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {testingReminder === 'previous-day' ? 'Đang lên lịch…' : 'Test hôm trước'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void testScheduledReminder('before-start')}
                      disabled={busy || Boolean(testingReminder)}
                      className="h-10 rounded-xl bg-indigo-50 px-3 text-xs font-bold text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {testingReminder === 'before-start' ? 'Đang lên lịch…' : 'Test trước 1 giờ'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Dữ liệu</p>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              <button onClick={exportChatGPTSnapshot} className="flex w-full items-center gap-3 p-4 text-left">
                <FileJson2 className="h-5 w-5 shrink-0 text-violet-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Xuất dữ liệu cho ChatGPT</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400">Snapshot đã lọc · không gồm email, UID, token, mô tả, ghi chú hay vị trí</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
              <button onClick={exportData} className="flex w-full items-center gap-3 border-t border-slate-100 p-4 text-left">
                <Download className="h-5 w-5 text-blue-600" />
                <span className="flex-1 font-semibold">Xuất bản sao lưu</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
              <button onClick={() => setShowTrash((value) => !value)} className="flex w-full items-center gap-3 border-t border-slate-100 p-4 text-left">
                <Trash2 className="h-5 w-5 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Thùng rác</p>
                  <p className="text-xs text-slate-400">{trashTasks.length} nhiệm vụ · giữ 30 ngày</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${showTrash ? 'rotate-180' : ''}`} />
              </button>

              {showTrash ? (
                <div className="max-h-72 space-y-2 overflow-y-auto border-t border-slate-100 bg-slate-50 p-3">
                  {trashTasks.length === 0 ? (
                    <p className="py-6 text-center text-sm font-medium text-slate-400">Thùng rác đang trống</p>
                  ) : (
                    [...trashTasks]
                      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
                      .map((task) => (
                        <div key={task.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                          <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Đã xóa {formatDisplayDate(task.deletedAt)}
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => restoreTask(task.id)} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                              <RotateCcw className="h-3.5 w-3.5" /> Khôi phục
                            </button>
                            <button type="button" onClick={() => setPendingPermanentDeleteId(task.id)} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-50 text-xs font-bold text-rose-600">
                              <Trash2 className="h-3.5 w-3.5" /> Xóa hẳn
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      {pendingPermanentDeleteId ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/35 px-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-950">Xóa vĩnh viễn nhiệm vụ?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Sau bước này nhiệm vụ sẽ không thể khôi phục lại.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setPendingPermanentDeleteId(null)} className="h-12 rounded-xl bg-slate-100 text-sm font-bold text-slate-600">Hủy</button>
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
          </div>
        </div>
      ) : null}
    </div>
  );
};
