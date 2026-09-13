import React, { useEffect, useState } from 'react';
import { Bell, ChevronRight, Download, LogIn, LogOut, Send, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { disablePushNotifications, enablePushNotifications, getNotificationState, sendTestNotification } from '../../services/notificationService';
import { NotificationState } from '../../services/notificationStatus';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, signInWithGoogle, logout, addToast } = useApp();
  const [state, setState] = useState<NotificationState>('default');
  const [busy, setBusy] = useState(false);
  const refresh = async () => setState(await getNotificationState());
  useEffect(() => { if (isOpen) void refresh(); }, [isOpen]);
  if (!isOpen) return null;

  const enable = async () => { setBusy(true); try { await enablePushNotifications(); await refresh(); addToast('Thông báo đã hoạt động', 'success'); } catch (error) { await refresh(); addToast(error instanceof Error ? error.message : 'Không thể bật thông báo', 'error'); } finally { setBusy(false); } };
  const disable = async () => { setBusy(true); try { await disablePushNotifications(); await refresh(); addToast('Đã tắt thông báo', 'info'); } finally { setBusy(false); } };
  const test = async () => { setBusy(true); try { await sendTestNotification(); addToast('Đã gửi tới iPhone', 'success'); } catch (error) { await refresh(); addToast(error instanceof Error ? error.message : 'Không thể gửi', 'error'); } finally { setBusy(false); } };
  const exportData = () => { const keys = ['tasks','projects','events','habits','goals']; const data = Object.fromEntries(keys.map((key) => [key, JSON.parse(localStorage.getItem(`lich_song_${key}`) || '[]')])); const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'})); const a = document.createElement('a'); a.href=url; a.download=`lich-song-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); };

  const active = state === 'active';
  const stateText: Record<NotificationState, string> = { active:'Đang hoạt động', needs_registration:'Cần đăng ký lại', server_unavailable:'Server chưa cấu hình', needs_install:'Cần cài lên màn hình chính', denied:'Đã bị chặn', unsupported:'Không hỗ trợ', default:'Chưa bật', granted:'Cần kiểm tra lại' };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4"><section className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#f7f8fa] pt-[env(safe-area-inset-top)] shadow-2xl sm:max-h-[88vh] sm:rounded-3xl sm:pt-0">
    <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-5"><h2 className="flex-1 text-lg font-bold">Cài đặt</h2><button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="Đóng"><X className="h-4 w-4" /></button></header>
    <div className="space-y-6 overflow-y-auto p-4 pb-[max(24px,env(safe-area-inset-bottom))]">
      <section><p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tài khoản</p><div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"><div className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 font-bold text-white">{user?.displayName?.slice(0,1) || 'T'}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{user?.displayName || 'Khách'}</p><p className="truncate text-xs text-slate-400">{user?.email || 'Dữ liệu lưu trên máy'}</p></div><button onClick={() => void (user ? logout() : signInWithGoogle())} className="rounded-xl bg-slate-100 p-2 text-slate-500">{user ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}</button></div></div></section>

      <section><p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Thông báo</p><div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"><div className="flex items-center gap-3 p-4"><span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}><Bell className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold">Nhắc từng việc</p><p className={`text-xs font-medium ${state === 'server_unavailable' ? 'text-rose-500' : active ? 'text-emerald-600' : 'text-slate-400'}`}>{stateText[state]}</p></div></div><div className="flex gap-2 border-t border-slate-100 p-3">{active ? <><button onClick={test} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Gửi thử</button><button onClick={disable} disabled={busy} className="rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-500">Tắt</button></> : <button onClick={enable} disabled={busy || state === 'denied' || state === 'unsupported' || state === 'server_unavailable'} className="w-full rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400">{busy ? 'Đang xử lý…' : state === 'server_unavailable' ? 'Cần cấu hình VAPID trên server' : state === 'needs_install' ? 'Cài app rồi bật thông báo' : 'Bật thông báo'}</button>}</div></div></section>

      <section><p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Dữ liệu</p><button onClick={exportData} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200"><Download className="h-5 w-5 text-blue-600" /><span className="flex-1 font-semibold">Xuất bản sao lưu</span><ChevronRight className="h-4 w-4 text-slate-300" /></button></section>
    </div>
  </section></div>;
};
