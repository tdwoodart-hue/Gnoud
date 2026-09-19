import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Heart,
  Smile,
  Shield,
  Coffee,
  BookOpen,
  DollarSign,
  Users,
  PenLine,
  Calendar,
  Save,
  Plus,
  Clock,
} from 'lucide-react';

export const LifeView: React.FC = () => {
  const { addToast } = useApp();

  const [lifeScores, setLifeScores] = useState({
    health: 8,
    work: 9,
    family: 8,
    mind: 7,
    finance: 8,
    growth: 8,
  });

  const [journalText, setJournalText] = useState(
    'Hôm nay cảm thấy năng lượng dồi dào sau buổi chạy bộ sáng sớm. Đã giải quyết xong phần lớn khúc mắc của bộ khuôn gỗ Senko. Buổi tối sẽ dành trọn vẹn cho gia đình.'
  );

  const [personalEvents, setPersonalEvents] = useState([
    { id: '1', title: 'Đưa mẹ đi kiểm tra mắt định kỳ', date: '2026-09-18', time: '08:00', location: 'Bệnh viện Mắt TP.HCM' },
    { id: '2', title: 'Cà phê trò chuyện cùng người bạn thân cấp 3', date: '2026-09-20', time: '09:30', location: 'The Coffee House' },
    { id: '3', title: 'Đi dạo công viên cùng gia đình', date: '2026-09-13', time: '17:30', location: 'Công viên Gia Định' },
  ]);

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-09-15');
  const [newEventTime, setNewEventTime] = useState('19:00');
  const [isAddingPersonalEvent, setIsAddingPersonalEvent] = useState(false);

  const handleScoreChange = (dimension: keyof typeof lifeScores, value: number) => {
    setLifeScores((prev) => ({ ...prev, [dimension]: value }));
  };

  const handleSaveJournal = () => {
    addToast('Đã lưu nhật ký phản chiếu cá nhân', 'success');
  };

  const handleAddPersonalEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    setPersonalEvents([
      ...personalEvents,
      {
        id: `pe-${Date.now()}`,
        title: newEventTitle.trim(),
        date: newEventDate,
        time: newEventTime,
        location: 'Tự do',
      },
    ]);
    setNewEventTitle('');
    setIsAddingPersonalEvent(false);
    addToast('Đã thêm lịch hẹn cá nhân', 'success');
  };

  const values = Object.values(lifeScores) as number[];
  const averageBalance = Math.round(
    (values.reduce((a, b) => a + b, 0) / 6) * 10
  );

  const dimensions = [
    { key: 'health' as const, label: 'Sức khỏe & Thể chất', icon: Heart, color: 'text-red-500 bg-red-50' },
    { key: 'work' as const, label: 'Công việc & Tay nghề mộc', icon: Coffee, color: 'text-blue-500 bg-blue-50' },
    { key: 'family' as const, label: 'Gia đình & Mối quan hệ', icon: Users, color: 'text-purple-500 bg-purple-50' },
    { key: 'mind' as const, label: 'Tâm trí & Bình an', icon: Smile, color: 'text-teal-500 bg-teal-50' },
    { key: 'finance' as const, label: 'Tài chính vững vàng', icon: DollarSign, color: 'text-emerald-500 bg-emerald-50' },
    { key: 'growth' as const, label: 'Phát triển bản thân', icon: BookOpen, color: 'text-amber-500 bg-amber-50' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Cân bằng cuộc sống & Tâm trí</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Giữ sự hài hòa giữa đam mê công việc, gia đình, sức khỏe và đời sống tinh thần
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700">
          <span>Chỉ số cân bằng: </span>
          <strong className="text-emerald-600 text-sm">{averageBalance}%</strong>
        </div>
      </div>

      {/* 6 Dimensions Slider Grid */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600">
          6 Trụ cột bánh xe cuộc sống (Wheel of Life)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensions.map((dim) => {
            const Icon = dim.icon;
            const currentVal = lifeScores[dim.key];

            return (
              <div
                key={dim.key}
                className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${dim.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-stone-900">{dim.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-700">{currentVal}/10</span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentVal}
                    onChange={(e) => handleScoreChange(dim.key, Number(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal Appointments & Reflection Journal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Lịch hẹn & Sự kiện cá nhân
            </h3>
            <button
              onClick={() => setIsAddingPersonalEvent(!isAddingPersonalEvent)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Thêm lịch
            </button>
          </div>

          {isAddingPersonalEvent && (
            <form onSubmit={handleAddPersonalEvent} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2 animate-in fade-in">
              <input
                type="text"
                required
                placeholder="Tên lịch hẹn (ví dụ: Đi bơi với con...)"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="px-2 py-1 text-xs bg-white border border-stone-200 rounded-lg"
                />
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="px-2 py-1 text-xs bg-white border border-stone-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingPersonalEvent(false)}
                  className="px-2.5 py-1 text-xs text-stone-500"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium"
                >
                  Lưu
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2.5">
            {personalEvents.map((pe) => (
              <div
                key={pe.id}
                className="p-3 rounded-xl border border-stone-200/70 bg-stone-50/40 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-900">{pe.title}</span>
                  <span className="text-[10px] text-stone-400 font-mono">{pe.time}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-400" /> {pe.date}
                  </span>
                  <span>{pe.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Reflection Journal */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5 text-indigo-600" />
              Nhật ký phản chiếu cuối ngày
            </h3>
            <span className="text-[11px] text-stone-400">Ghi lại suy nghĩ & lòng biết ơn</span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Dành 3 phút tĩnh tâm: Điều gì khiến bạn cảm thấy hài lòng nhất hôm nay?
          </p>

          <textarea
            rows={5}
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            className="w-full p-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-blue-500 text-stone-800 leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveJournal}
              className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" /> Lưu nhật ký
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
