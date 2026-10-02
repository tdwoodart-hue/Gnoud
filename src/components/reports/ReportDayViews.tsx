import React from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Footprints,
  Headphones,
  Scale,
  Target,
  UtensilsCrossed,
} from 'lucide-react';
import type { NutritionDayReport, ReadingDayReport } from '../../services/reportService';
import { DetailHeader, decimal, formatDate, formatDuration, formatSessionTime, MetricCard, ProgressBar, Section, whole } from './reportUi';

const mealLabels = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  dinner: 'Bữa tối',
  snack: 'Bữa phụ',
} as const;

export const ReadingDayReportView: React.FC<{
  report: ReadingDayReport;
  onBack: () => void;
  onOpenBook: (id: string) => void;
}> = ({ report, onBack, onOpenBook }) => (
  <div className="mx-auto max-w-5xl space-y-5 pb-6">
    <DetailHeader title={'Đọc sách · ' + formatDate(report.date)} subtitle="Báo cáo chi tiết theo ngày" onBack={onBack} />

    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <MetricCard label="Tổng thời gian" value={formatDuration(report.totalSeconds)} icon={Clock3} />
      <MetricCard label="Đọc chủ động" value={formatDuration(report.readingSeconds)} icon={BookOpen} />
      <MetricCard label="Nghe sách" value={formatDuration(report.listeningSeconds)} icon={Headphones} tone="bg-violet-50 text-violet-700" />
      <MetricCard label="Số phiên" value={String(report.sessionCount)} meta={report.longestSessionSeconds ? 'Lâu nhất ' + formatDuration(report.longestSessionSeconds) : 'Chưa có session chi tiết'} icon={CalendarDays} tone="bg-emerald-50 text-emerald-700" />
    </div>

    <Section title="Sách đã hoạt động" subtitle="Bấm một cuốn để xem toàn bộ báo cáo của cuốn đó">
      {report.books.length ? (
        <div className="space-y-2">
          {report.books.map((book) => (
            <button key={book.bookId} type="button" onClick={() => onOpenBook(book.bookId)} className="w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-xs active:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{book.title}</p>
                  <p className="mt-0.5 truncate text-[9px] text-slate-400">{book.author || 'Không có tác giả'} · {book.sessionCount} phiên</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                <div><p className="text-slate-400">Tổng</p><p className="mt-0.5 font-bold text-slate-700">{formatDuration(book.totalSeconds)}</p></div>
                <div><p className="text-slate-400">Đọc</p><p className="mt-0.5 font-bold text-slate-700">{formatDuration(book.readingSeconds)}</p></div>
                <div><p className="text-slate-400">Nghe</p><p className="mt-0.5 font-bold text-slate-700">{formatDuration(book.listeningSeconds)}</p></div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">Không có sách hoạt động trong ngày này.</div>
      )}
    </Section>

    <Section title="Từng session" subtitle="Giờ bắt đầu và thời lượng thực tế đã ghi">
      {report.sessions.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
          {report.sessions.map((session, index) => (
            <div key={session.id} className={'flex items-center justify-between gap-3 px-4 py-3 ' + (index ? 'border-t border-slate-100' : '')}>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-slate-700">{session.bookTitle}</p>
                <p className="mt-0.5 text-[9px] text-slate-400">{formatSessionTime(session.startedAt)} · {session.mode === 'mixed' ? 'Đọc + nghe' : session.mode === 'listening' ? 'Nghe' : 'Đọc'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{formatDuration(session.totalSeconds)}</p>
                <p className="mt-0.5 text-[9px] text-slate-400">Đọc {Math.round(session.readingSeconds / 60)}p · Nghe {Math.round(session.listeningSeconds / 60)}p</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">Ngày này chỉ có tổng thời gian cũ, chưa có session chi tiết.</div>
      )}
    </Section>
  </div>
);

export const NutritionDayReportView: React.FC<{
  report: NutritionDayReport;
  onBack: () => void;
}> = ({ report, onBack }) => {
  const incomplete = report.tracking === 'untracked';
  const estimated = report.tracking === 'estimated';
  const calorieMeta = incomplete
    ? 'Dữ liệu chưa đầy đủ · không chấm mục tiêu'
    : (report.calorieDelta > 0 ? '+' : '') + whole.format(report.calorieDelta) + ' kcal so mục tiêu';
  const proteinMeta = incomplete
    ? 'Dữ liệu chưa đầy đủ'
    : (report.proteinDelta > 0 ? '+' : '') + whole.format(report.proteinDelta) + ' g so mục tiêu';

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <DetailHeader title={'Dinh dưỡng · ' + formatDate(report.date)} subtitle="Báo cáo theo ngày → bữa → từng món" onBack={onBack} />

      {incomplete || estimated ? (
        <div className={`rounded-2xl px-4 py-3 text-[11px] font-semibold leading-5 ${incomplete ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'}`}>
          {incomplete
            ? 'Ngày này có ít nhất một bữa không theo dõi. Các số kcal/macro chỉ là phần đã ghi và ngày này bị loại khỏi trung bình dinh dưỡng.'
            : 'Ngày này dùng số liệu ước tính. Kcal/macro vẫn được tính nhưng được giữ nhãn ước tính trong báo cáo.'}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard label="Calories" value={whole.format(report.calories) + ' kcal'} meta={calorieMeta} icon={UtensilsCrossed} />
        <MetricCard label="Protein" value={whole.format(report.protein) + ' g'} meta={proteinMeta} icon={Target} tone="bg-sky-50 text-sky-700" />
        <MetricCard label="Steps" value={report.steps === null ? '—' : whole.format(report.steps)} meta={report.steps === null ? 'Chưa ghi trong ngày' : whole.format(report.stepTarget) + ' mục tiêu'} icon={Footprints} tone="bg-emerald-50 text-emerald-700" />
        <MetricCard label="Cân nặng" value={report.weightKg === null ? '—' : decimal.format(report.weightKg) + ' kg'} meta={report.itemCount + ' mục đã ghi'} icon={Scale} tone="bg-violet-50 text-violet-700" />
      </div>

      {incomplete ? (
        <Section title="So với mục tiêu ngày">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-[11px] leading-5 text-amber-800">
            Bỏ qua chấm mục tiêu kcal và macro vì ngày này có bữa không theo dõi. App không coi phần thiếu là 0 kcal.
          </div>
        </Section>
      ) : (
        <Section title="So với mục tiêu ngày">
          <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
            {[
              ['Calories', report.caloriePercent, whole.format(report.calories) + ' / ' + whole.format(report.calorieTarget) + ' kcal', 'bg-indigo-500'],
              ['Protein', report.proteinPercent, whole.format(report.protein) + ' / ' + whole.format(report.proteinTarget) + ' g', 'bg-sky-500'],
              ['Carb', report.carbPercent, whole.format(report.carbs) + ' / ' + whole.format(report.carbTarget) + ' g', 'bg-amber-500'],
              ['Fat', report.fatPercent, whole.format(report.fat) + ' / ' + whole.format(report.fatTarget) + ' g', 'bg-rose-500'],
            ].map(([label, percent, value, color]) => (
              <div key={String(label)}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
                  <span className="font-semibold text-slate-500">{label}</span>
                  <span className="font-bold text-slate-700">{value} · {percent}%</span>
                </div>
                <ProgressBar value={Number(percent)} className={String(color)} />
              </div>
            ))}
            {report.stepPercent !== null ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
                  <span className="font-semibold text-slate-500">Steps</span>
                  <span className="font-bold text-slate-700">{whole.format(report.steps || 0)} / {whole.format(report.stepTarget)} · {report.stepPercent}%</span>
                </div>
                <ProgressBar value={report.stepPercent} className="bg-emerald-500" />
              </div>
            ) : null}
          </div>
        </Section>
      )}

      <Section title="Theo từng bữa" subtitle="Mỗi bữa mở ra toàn bộ món đã log">
        {report.meals.length ? (
          <div className="space-y-3">
            {report.meals.map((meal) => (
              <div key={meal.meal} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{mealLabels[meal.meal]}</p>
                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {meal.tracking === 'untracked' ? 'Không theo dõi' : meal.tracking === 'estimated' ? `${meal.items.length} món · Ước tính` : `${meal.items.length} món`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{meal.tracking === 'untracked' ? '— kcal' : whole.format(meal.calories) + ' kcal'}</p>
                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {meal.tracking === 'untracked' ? 'Không tính macro' : `P ${whole.format(meal.protein)} · C ${whole.format(meal.carbs)} · F ${whole.format(meal.fat)}`}
                      </p>
                    </div>
                  </div>
                </div>
                {meal.items.map((item, index) => (
                  <div key={item.id} className={'px-4 py-3 ' + (index ? 'border-t border-slate-100' : '')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{item.name}</p>
                        <p className="mt-0.5 text-[9px] text-slate-400">{item.servingLabel || (item.amount !== undefined ? String(item.amount) + ' ' + (item.unit || '') : 'Khẩu phần đã lưu')}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-bold text-slate-700">{item.tracking === 'untracked' ? 'Không theo dõi' : whole.format(item.calories) + ' kcal'}</p>
                        <p className="mt-0.5 text-[9px] text-slate-400">
                          {item.tracking === 'untracked' ? 'Không tính kcal / macro' : `P ${decimal.format(item.protein)} · C ${decimal.format(item.carbs)} · F ${decimal.format(item.fat)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">Ngày này chưa có món ăn được log.</div>
        )}
      </Section>
    </div>
  );
};
