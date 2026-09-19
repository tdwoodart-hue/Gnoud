import React, { useMemo, useState } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getFormattedToday } from '../../data/mockData';
import {
  appendActivityResult,
  resolveTaskActivity,
  type ActivitySessionResult,
} from '../../services/taskActivityService';
import { LanguageChatActivity } from './LanguageChatActivity';

export const DailyActivityDock: React.FC = () => {
  const { user, tasks, updateTask, addToast } = useApp();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const today = getFormattedToday(0);

  const activityTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.plannedDate === today && task.status !== 'done')
        .map((task) => ({ task, activity: resolveTaskActivity(task) }))
        .filter((item) => Boolean(item.activity)),
    [tasks, today],
  );

  if (activityTasks.length === 0) return null;

  const first = activityTasks[0];
  if (!first) return null;
  const selected = activityTasks.find((item) => item.task.id === activeTaskId) || first;

  const finish = (result: ActivitySessionResult) => {
    const task = selected.task;
    updateTask(task.id, {
      status: 'done',
      actualMinutes: (task.actualMinutes || 0) + result.durationMinutes,
      notes: appendActivityResult(task.notes, result),
    });
    addToast(
      `Đã lưu phiên ${result.durationMinutes} phút · ${result.turns} lượt hội thoại`,
      'success',
    );
    setActiveTaskId(null);
  };

  return (
    <>
      <section className="mx-auto mb-4 w-full max-w-2xl rounded-3xl border border-indigo-100 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-500">
                Hoạt động tương tác hôm nay
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-bold text-slate-900">{first.task.title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {first.activity?.languageName} · {first.activity?.level} · {first.activity?.durationMinutes} phút
              {first.activity?.inferred ? ' · tự nhận diện từ task cũ' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTaskId(first.task.id)}
            className="h-10 shrink-0 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
          >
            Bắt đầu
          </button>
        </div>
      </section>

      {activeTaskId && selected.activity?.type === 'language_chat' ? (
        <LanguageChatActivity
          user={user}
          taskTitle={selected.task.title}
          activity={selected.activity}
          onClose={() => setActiveTaskId(null)}
          onFinish={finish}
        />
      ) : null}
    </>
  );
};
