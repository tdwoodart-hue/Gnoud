import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, User, Clock, ShieldCheck, Sparkles, Download, RotateCcw, LogIn, LogOut, Check } from 'lucide-react';
import {
  INITIAL_TASKS,
  INITIAL_PROJECTS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_HABITS,
  INITIAL_GOALS,
  INITIAL_AI_SUGGESTIONS,
} from '../../data/mockData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, signInWithGoogle, logout, addToast } = useApp();
  const [userName, setUserName] = useState('Trần Đăng (TD Woodart)');
  const [workStart, setWorkStart] = useState('08:30');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [breakMinutes, setBreakMinutes] = useState(15);
  const [aiLevel, setAiLevel] = useState<'Ít đề xuất' | 'Cân bằng' | 'Chủ động'>('Cân bằng');

  if (!isOpen) return null;

  const handleExport = () => {
    const data = {
      user: {
        name: user?.displayName || userName,
        email: user?.email || 'tdwoodart@gmail.com',
        uid: user?.uid || 'guest',
      },
      exportedAt: new Date().toISOString(),
      tasks: JSON.parse(localStorage.getItem('lich_song_tasks') || '[]'),
      projects: JSON.parse(localStorage.getItem('lich_song_projects') || '[]'),
      events: JSON.parse(localStorage.getItem('lich_song_events') || '[]'),
      habits: JSON.parse(localStorage.getItem('lich_song_habits') || '[]'),
      goals: JSON.parse(localStorage.getItem('lich_song_goals') || '[]'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lich-song-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast('Đã xuất dữ liệu Lịch Sống thành công', 'success');
  };

  const handleResetData = () => {
    if (confirm('Bạn có chắc muốn khôi phục dữ liệu mẫu ban đầu? Các thay đổi gần đây sẽ được thiết lập lại.')) {
      localStorage.setItem('lich_song_tasks', JSON.stringify(INITIAL_TASKS));
      localStorage.setItem('lich_song_projects', JSON.stringify(INITIAL_PROJECTS));
      localStorage.setItem('lich_song_events', JSON.stringify(INITIAL_CALENDAR_EVENTS));
      localStorage.setItem('lich_song_habits', JSON.stringify(INITIAL_HABITS));
      localStorage.setItem('lich_song_goals', JSON.stringify(INITIAL_GOALS));
      localStorage.setItem('lich_song_suggestions', JSON.stringify(INITIAL_AI_SUGGESTIONS));
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto text-stone-800 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white/95 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-base">Cài đặt cá nhân</h3>
              <p className="text-xs text-stone-500">Tùy biến lịch làm việc & tài khoản Firebase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm flex-1">
          {/* User profile & Firebase Auth */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-sm shadow-xs overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'TD'}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900">
                    {user?.displayName || userName}
                  </h4>
                  <p className="text-xs text-stone-500">{user?.email || 'tdwoodart@gmail.com'}</p>
                </div>
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-red-50 text-xs font-semibold text-stone-700 hover:text-red-600 hover:border-red-200 flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5" /> Đăng nhập Google
                </button>
              )}
            </div>

            <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-1 border-t border-stone-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {user
                  ? 'Đã kết nối Firestore: dữ liệu được đồng bộ hóa tức thời trên đám mây.'
                  : 'Chế độ khách: dữ liệu lưu an toàn trên trình duyệt, đăng nhập để lưu trữ bền vững.'}
              </span>
            </div>
          </div>

          {/* Timezone & Working Hours */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400" /> Khung giờ sinh hoạt & Làm việc
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-600 mb-1">Bắt đầu ngày làm việc</label>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-600 mb-1">Kết thúc ngày làm việc</label>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-600 mb-1">Múi giờ</label>
                <div className="px-3 py-2 text-xs bg-stone-100/70 border border-stone-200 rounded-lg text-stone-700 font-mono">
                  Asia/Ho_Chi_Minh (GMT+7)
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-600 mb-1">Khoảng nghỉ giữa các phiên</label>
                <select
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-hidden"
                >
                  <option value={10}>10 phút</option>
                  <option value={15}>15 phút (khuyên dùng)</option>
                  <option value={20}>20 phút</option>
                  <option value={30}>30 phút</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Recommendation Level */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Mức độ chủ động của Trợ lý AI
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {(['Ít đề xuất', 'Cân bằng', 'Chủ động'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setAiLevel(level)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    aiLevel === level
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <span className="text-xs block">{level}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-500">
              {aiLevel === 'Ít đề xuất' && 'Chỉ đưa ra gợi ý khi được yêu cầu trực tiếp qua khung chat.'}
              {aiLevel === 'Cân bằng' && 'Đề xuất khi phát hiện quá tải, trùng giờ hoặc mục tiêu bị ngưng trệ (khuyên dùng).'}
              {aiLevel === 'Chủ động' && 'Chủ động tìm kiếm các khung giờ trống và tự động dự thảo lịch làm việc hàng ngày.'}
            </p>
          </div>

          {/* Data Management Actions */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleExport}
              className="text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Xuất dữ liệu sao lưu
            </button>

            <button
              type="button"
              onClick={handleResetData}
              className="text-xs text-stone-500 hover:text-amber-700 font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Khôi phục dữ liệu mẫu
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-3 border-t border-stone-100 bg-white/95 backdrop-blur-xs flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs"
          >
            Đã lưu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
