import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Command,
  ListTodo,
  Settings,
  Sun,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavTab } from '../../types';
import { PRIMARY_NAV_ITEMS } from '../../config/navigation';
import { SettingsModal } from '../settings/SettingsModal';

const icons: Record<NavTab, React.FC<{ className?: string }>> = {
  today: Sun,
  tasks: ListTodo,
  nutrition: UtensilsCrossed,
  personal: UserRound,
  reports: BarChart3,
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTab, setActiveTab, setIsCommandMenuOpen } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener('lich-song-open-settings', open);
    return () => window.removeEventListener('lich-song-open-settings', open);
  }, []);

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
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setIsCommandMenuOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/60 bg-slate-50/70 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                title="Mở menu lệnh (⌘K)"
              >
                <Command className="h-3.5 w-3.5 text-slate-400" />
                <span>Tìm kiếm</span>
              </button>

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

        <main className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] sm:px-6 md:px-10 md:pb-12 md:pt-10">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/70 bg-white/92 px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 shadow-sm backdrop-blur-md md:hidden">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = icons[item.id];
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold transition-all duration-150 ${
                active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`grid h-8 w-12 place-items-center rounded-xl transition-colors ${active ? 'border border-indigo-100 bg-indigo-50/80' : ''}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
