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
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#f5f6f8] font-sans text-slate-900">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.10),transparent_58%)]" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] overflow-x-hidden">
        <aside className="sticky top-0 hidden h-screen w-[224px] shrink-0 flex-col justify-between border-r border-slate-200/60 bg-white/70 px-3 py-5 backdrop-blur-xl md:flex">
          <div>
            <div className="mb-7 flex items-center gap-3 px-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
                <Sun className="h-[17px] w-[17px]" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold tracking-[-0.02em] text-slate-950">Gnoud</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-400">Một ngày rõ ràng hơn</div>
              </div>
            </div>

            <nav className="space-y-1" aria-label="Điều hướng chính">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = icons[item.id];
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/70'
                        : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                    }`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2 border-t border-slate-200/60 pt-4">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCommandMenuOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-800 hover:shadow-sm"
                title="Mở menu lệnh (⌘K)"
                aria-label="Tìm kiếm"
              >
                <Command className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {pinEnabled && (
                <button
                  type="button"
                  onClick={lockApp}
                  className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-950 hover:text-white hover:shadow-sm"
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

        <main className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden px-3.5 pb-[calc(102px+env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] sm:px-5 md:px-8 md:pb-10 md:pt-8 lg:px-10">
          {children}
        </main>
      </div>

      <AnimatePresence initial={false}>
        {moreMenuOpen ? (
          <motion.div
            key="mobile-more-sheet"
            className="fixed inset-0 z-[45] flex items-end px-3 pb-[calc(96px+env(safe-area-inset-bottom))] md:hidden"
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
              initial={{ y: 78 }}
              animate={{ y: 0 }}
              exit={{ y: 78 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full overflow-hidden rounded-[28px] border border-white/80 bg-[#fbfbfc]/95 shadow-[0_24px_70px_rgba(15,23,42,0.20)] backdrop-blur-xl"
              onClick={(event) => event.stopPropagation()}
              aria-label="Điều hướng thêm"
            >
              <div className="flex h-7 items-center justify-center">
                <span className="h-1 w-10 rounded-full bg-slate-300" />
              </div>

              <div className="px-2 pb-2">
                {[
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

      <nav className="fixed inset-x-3 bottom-[max(8px,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[24px] border border-white/80 bg-white/92 p-1.5 shadow-[0_12px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl md:hidden">
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
              className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition-all duration-150 ${
                active ? 'text-slate-950' : 'text-slate-400 active:text-slate-700'
              }`}
            >
              <span className={`grid h-8 w-11 place-items-center rounded-xl transition-colors ${
                active ? 'bg-slate-950 text-white shadow-sm' : ''
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
          className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition-all duration-150 ${
            moreMenuOpen || activeTab === 'reports'
              ? 'text-slate-950'
              : 'text-slate-400 active:text-slate-700'
          }`}
          aria-expanded={moreMenuOpen}
          aria-label="Mở điều hướng thêm"
        >
          <span className={`grid h-8 w-11 place-items-center rounded-xl transition-colors ${
            moreMenuOpen || activeTab === 'reports'
              ? 'bg-slate-950 text-white shadow-sm'
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
