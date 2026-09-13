import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NavTab } from '../../types';
import {
  Sun,
  ListTodo,
  Calendar,
  Target,
  Flame,
  Heart,
  BarChart3,
  Settings,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  User,
  ShieldCheck,
} from 'lucide-react';
import { SettingsModal } from '../settings/SettingsModal';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    isAssistantOpen,
    setIsAssistantOpen,
    aiSuggestions,
    chatMessages,
  } = useApp();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pendingSuggestionsCount = aiSuggestions.filter((s) => s.status === 'pending').length;

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'today', label: 'Hôm nay', icon: Sun },
    { id: 'tasks', label: 'Công việc', icon: ListTodo },
    { id: 'calendar', label: 'Lịch', icon: Calendar },
    { id: 'goals', label: 'Mục tiêu', icon: Target },
    { id: 'habits', label: 'Thói quen', icon: Flame },
    { id: 'life', label: 'Cuộc sống', icon: Heart },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f5] text-stone-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header (Shared for Desktop & Mobile) */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('today')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-blue-700 transition-colors">
              LS
            </div>
            <div>
              <span className="font-bold text-stone-900 text-base tracking-tight block leading-tight">
                Lịch Sống
              </span>
              <span className="text-[10px] text-stone-400 font-medium block">
                Trợ lý cá nhân thông minh
              </span>
            </div>
          </div>
        </div>

        {/* Right actions: AI Assistant toggle + Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
              isAssistantOpen
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-stone-200/90 text-stone-700 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trợ lý AI</span>
            {pendingSuggestionsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            title="Cài đặt cá nhân"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Desktop Sidebar */}
        <aside className="hidden md:flex flex-col justify-between w-56 p-4 border-r border-stone-200/70 shrink-0 min-h-[calc(100vh-57px)]">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile Card at Sidebar Bottom */}
          <div className="pt-4 border-t border-stone-200/70 space-y-2">
            <div
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl hover:bg-stone-100/80 cursor-pointer flex items-center gap-2.5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                TD
              </div>
              <div className="min-w-0 flex-1 text-left">
                <span className="text-xs font-semibold text-stone-900 block truncate">
                  Trần Đăng
                </span>
                <span className="text-[10px] text-stone-400 block truncate">
                  tdwoodart@gmail.com
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Central Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 py-1.5 px-3 flex items-center justify-around">
        {[
          { id: 'today' as NavTab, label: 'Hôm nay', icon: Sun },
          { id: 'tasks' as NavTab, label: 'Công việc', icon: ListTodo },
          { id: 'calendar' as NavTab, label: 'Lịch', icon: Calendar },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-stone-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Assistant quick trigger */}
        <button
          onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            isAssistantOpen ? 'text-blue-600 font-bold' : 'text-stone-500'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Trợ lý</span>
        </button>

        {/* More menu drawer trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium text-stone-500"
        >
          <Menu className="w-4 h-4" />
          <span>Thêm</span>
        </button>
      </div>

      {/* Mobile Drawer (Full Navigation) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-start animate-in fade-in">
          <div className="bg-white w-72 h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    LS
                  </div>
                  <span className="font-bold text-stone-900 text-sm">Lịch Sống</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-stone-400 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-100 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  TD
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-stone-900 block">Trần Đăng</span>
                  <span className="text-[10px] text-stone-400 block">Cài đặt cá nhân</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
