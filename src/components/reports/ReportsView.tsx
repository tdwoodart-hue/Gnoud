import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Flame,
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  Layers,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { tasks, projects, habits } = useApp();

  // Metrics
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const totalPlannedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const totalActualMinutes = tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);

  const plannedHours = (totalPlannedMinutes / 60).toFixed(1);
  const actualHours = (totalActualMinutes / 60).toFixed(1);
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Project breakdown
  const projectStats = projects.map((p) => {
    const pTasks = tasks.filter((t) => t.projectId === p.id);
    const pDone = pTasks.filter((t) => t.status === 'done').length;
    const rate = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      total: pTasks.length,
      done: pDone,
      rate,
    };
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Báo cáo & Phân tích hiệu suất</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Nhìn lại thời gian làm việc thực tế, tỷ lệ hoàn thành dự án và tính nhất quán thói quen
        </p>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-stone-500 text-xs">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Thời gian tập trung</span>
          </div>
          <div className="text-2xl font-bold text-stone-900 font-mono">{actualHours}h</div>
          <div className="text-[11px] text-stone-400">Trên kế hoạch {plannedHours}h</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-stone-500 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tỷ lệ hoàn thành</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{taskCompletionRate}%</div>
          <div className="text-[11px] text-stone-400">{completedTasks.length}/{tasks.length} nhiệm vụ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-stone-500 text-xs">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Thói quen duy trì</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            {habits.reduce((acc, h) => acc + h.streak, 0)} ngày
          </div>
          <div className="text-[11px] text-stone-400">Tổng tích lũy tất cả chuỗi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-stone-500 text-xs">
            <Award className="w-4 h-4 text-purple-600" />
            <span>Dự án dẫn đầu</span>
          </div>
          <div className="text-base font-bold text-stone-900 truncate">Concept hộp nhẫn LEGO</div>
          <div className="text-[11px] text-emerald-600 font-medium">85% tiến độ đạt mốc</div>
        </div>
      </div>

      {/* AI Performance Synthesis */}
      <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Tổng hợp & Nhận định tuần từ Trợ lý AI
        </div>

        <div className="space-y-2 text-xs text-stone-700 leading-relaxed">
          <p>
            • <strong className="text-stone-900">Điểm sáng:</strong> Khung giờ làm việc sâu buổi sáng từ 09:00 - 11:30 mang lại hiệu quả cao nhất trong tuần. Dự án &ldquo;Concept hộp nhẫn LEGO&rdquo; và &ldquo;The Luvin&rdquo; đang duy trì tốc độ tiến độ xuất sắc.
          </p>
          <p>
            • <strong className="text-stone-900">Điểm nghẽn cần khắc phục:</strong> Dự án &ldquo;Ra mắt Senko&rdquo; có lịch chụp studio sát nút ngày bàn giao mẫu khắc lụa. Buổi chiều thường bị ngắt quãng bởi các cuộc gọi đối tác đột xuất.
          </p>
          <p>
            • <strong className="text-stone-900">Đề xuất cho tuần tới:</strong> Dành trọn vẹn sáng Thứ Ba cho khâu đóng gói sản phẩm mẫu Senko và hoãn các cuộc họp không khẩn cấp sang sau 15:00.
          </p>
        </div>
      </div>

      {/* Progress by Project */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-stone-500" />
          Hiệu suất thực hiện theo từng dự án
        </h2>

        <div className="space-y-4">
          {projectStats.map((p) => (
            <div key={p.id} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-stone-900">{p.name}</span>
                <span className="text-stone-500 font-mono">
                  {p.done}/{p.total} hoàn thành ({p.rate}%)
                </span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${p.rate}%`, backgroundColor: p.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
