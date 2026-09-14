import React, { useEffect, useState } from 'react';
import { BarChart3, Calendar, ListTodo, Sun, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavTab } from '../../types';
import { PRIMARY_NAV_ITEMS } from '../../config/navigation';
import { SettingsModal } from '../settings/SettingsModal';

const icons: Record<NavTab, React.FC<{ className?: string }>> = { today: Sun, tasks: ListTodo, calendar: Calendar, personal: UserRound, reports: BarChart3 };

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTab, setActiveTab } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => { const open = () => setSettingsOpen(true); window.addEventListener('lich-song-open-settings', open); return () => window.removeEventListener('lich-song-open-settings', open); }, []);
  return <div className="min-h-screen bg-[#f7f8fa] text-slate-950 font-sans">
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="hidden w-52 shrink-0 border-r border-slate-200 bg-white px-3 py-6 md:block">
        <div className="mb-8 px-3 text-lg font-bold tracking-tight">Lịch Sống</div>
        <nav className="space-y-1">{PRIMARY_NAV_ITEMS.map((item) => { const Icon = icons[item.id]; const active = activeTab === item.id; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] sm:px-6 md:px-10 md:pb-10 md:pt-8">{children}</main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">{PRIMARY_NAV_ITEMS.map((item) => { const Icon = icons[item.id]; const active = activeTab === item.id; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? 'text-blue-600' : 'text-slate-400'}`}><Icon className="h-[18px] w-[18px]" /><span>{item.label}</span></button>; })}</nav>
    <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
  </div>;
};
