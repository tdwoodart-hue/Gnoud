import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  BookOpen,
  Command,
  ListTodo,
  Lock,
  MoreHorizontal,
  Settings,
  Sun,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSecurity } from '../../context/SecurityContext';
import { NavTab } from '../../types';
import { PRIMARY_NAV_ITEMS } from '../../config/navigation';
import { SettingsModal } from '../settings/SettingsModal';

const icons: Record<NavTab, React.FC<{ className?: string }>> = {
  today: Sun,
  tasks: ListTodo,
  nutrition: UtensilsCrossed,
  personal: UserRound,
  reader: BookOpen,
  reports: BarChart3,
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    setIsCommandMenuOpen,
    setIsAssistantOpen,
  } = useApp();
  const { pinEnabled, lockApp } = useSecurity();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener('lich-song-open-settings', open);
    return () => window.removeEventListener('lich-song-open-settings', open);
  }, []);

  useEffect(() => {
    const handleAssistantShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLocaleLowerCase() !== 'a') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setIsAssistantOpen(true);
    };
    window.addEventListener('keydown', handleAssistantShortcut);
    return () => window.removeEventListener('keydown', handleAssistantShortcut);
  }, [setIsAssistantOpen]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#fafbfc] font-sans text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl overflow-x-hidden">
        <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-200/70 bg-white/90 px-4 py-7 backdrop-blur-xs md:flex">
          <div>
            <div className="mb-8 flex items-center gap-3 px-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50/80 text-indigo-600 shadow-xs">
                <Sun className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold tracking-tight text-slate-900">Lịch Sống</div>
                <div className="text-[11px] font-medium text-slate-400">Quản lý cuộc sống cá nhân</div>
              </div>
            </div>

            <nav className="space-y-1.5" aria-label="Điều hướng chính">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = icons[item.id];
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                      active
                        ? 'border border-indigo-100 bg-indigo-50/70 text-indigo-700 shadow-xs'
                        : 'border border-transparent text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2 border-t border-slate-100/90 pt-5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCommandMenuOpen(true)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-slate-200/60 bg-slate-50/70 text-slate-500 transition hover:bg-slate-100"
                title="Mở menu lệnh (⌘K)"
                aria-label="Tìm kiếm"
              >
                <Command className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {pinEnabled && (
                <button
                  type="button"
                  onClick={lockApp}
                  className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200/60 bg-slate-50/70 text-slate-500 transition hover:bg-slate-900 hover:text-white"
                  title="Khóa ứng dụng ngay"
                  aria-label="Khóa ứng dụng"
                >
                  <Lock className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200/60 bg-slate-50/70 text-slate-500 transition hover:bg-slate-100"
                title="Cài đặt"
                aria-label="Cài đặt"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] sm:px-6 md:px-10 md:pb-12 md:pt-10">
          {children}
        </main>
      </div>

      <AnimatePresence initial={false}>
        {moreMenuOpen ? (
          <motion.div
            key="mobile-more-sheet"
            className="fixed inset-0 z-[45] flex items-end px-3 pb-[calc(78px+env(safe-area-inset-bottom))] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setMoreMenuOpen(false)}
            role="presentation"
          >
            <motion.div
              className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px]"
              aria-hidden="true"
            />
            <motion.section
              initial={{ y: 90, scale: 0.985 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 90, scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.82 }}
              className="relative w-full overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
              onClick={(event) => event.stopPropagation()}
              aria-label="Điều hướng thêm"
            >
              <div className="flex h-7 items-center justify-center">
                <span className="h-1 w-10 rounded-full bg-slate-300" />
              </div>

              <div className="px-2 pb-2">
                {[
                  { id: 'personal' as NavTab, label: 'Cá nhân', description: 'Hồ sơ và mục tiêu của bạn', icon: UserRound },
                  { id: 'reports' as NavTab, label: 'Báo cáo', description: 'Xem tiến độ và số liệu đã đo', icon: BarChart3 },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMoreMenuOpen(false);
                      }}
                      className={`flex min-h-[62px] w-full items-center gap-3 rounded-2xl px-3.5 text-left transition ${
                        active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 active:bg-slate-100'
                      }`}
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                        active ? 'bg-white text-indigo-600 shadow-xs' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">{item.description}</span>
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(true);
                    setMoreMenuOpen(false);
                  }}
                  className="flex min-h-[62px] w-full items-center gap-3 rounded-2xl px-3.5 text-left text-slate-700 transition active:bg-slate-100"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                    <Settings className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">Cài đặt</span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">Tài khoản, bảo mật, thông báo và dữ liệu</span>
                  </span>
                </button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 px-1.5 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-4px_20px_rgba(15,23,42,0.04)] backdrop-blur-xl md:hidden">
        {[
          { id: 'today' as NavTab, label: 'Hôm nay', icon: Sun },
          { id: 'tasks' as NavTab, label: 'Công việc', icon: ListTodo },
          { id: 'nutrition' as NavTab, label: 'Dinh dưỡng', icon: UtensilsCrossed },
          { id: 'reader' as NavTab, label: 'Đọc sách', icon: BookOpen },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMoreMenuOpen(false);
              }}
              className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10.5px] font-semibold transition-all duration-150 ${
                active ? 'text-indigo-700' : 'text-slate-400 active:text-slate-700'
              }`}
            >
              <span className={`grid h-8 w-11 place-items-center rounded-xl transition-colors ${
                active ? 'bg-indigo-50 text-indigo-600' : ''
              }`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreMenuOpen((open) => !open)}
          className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10.5px] font-semibold transition-all duration-150 ${
            moreMenuOpen || activeTab === 'personal' || activeTab === 'reports'
              ? 'text-indigo-700'
              : 'text-slate-400 active:text-slate-700'
          }`}
          aria-expanded={moreMenuOpen}
          aria-label="Mở điều hướng thêm"
        >
          <span className={`grid h-8 w-11 place-items-center rounded-xl transition-colors ${
            moreMenuOpen || activeTab === 'personal' || activeTab === 'reports'
              ? 'bg-indigo-50 text-indigo-600'
              : ''
          }`}>
            <MoreHorizontal className="h-[19px] w-[19px]" />
          </span>
          <span className="leading-none">Thêm</span>
        </button>
      </nav>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setMoreMenuOpen(false);
        }}
      />
    </div>
  );
};
