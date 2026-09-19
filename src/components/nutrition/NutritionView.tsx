import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Beef,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileUp,
  Flame,
  Footprints,
  Plus,
  Scale,
  Search,
  Settings2,
  Trash2,
  UtensilsCrossed,
  Wheat,
  X,
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import {
  calculateBmr,
  calculateTdee,
  fromLocalIso,
  getDailyMetric,
  getEntriesForDate,
  getPreviousWeight,
  getTotals,
  getWeekDates,
  loadNutritionState,
  MealType,
  NutritionActivityLevel,
  NutritionGoal,
  NutritionProfile,
  recommendedTargets,
  saveNutritionState,
  toLocalIso,
  upsertDailyMetric,
} from '../../services/nutritionService';
import {
  FOOD_CSV_TEMPLATE,
  FoodItem,
  STARTER_FOODS,
  foodLibraryToJson,
  loadFoodLibrary,
  makeCustomFood,
  mergeFoods,
  parseFoodFile,
  saveFoodLibrary,
} from '../../services/foodLibraryService';

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const mealLabels: Record<MealType, string> = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  dinner: 'Bữa tối',
  snack: 'Ăn nhẹ',
};

const activityLabels: Record<NutritionActivityLevel, string> = {
  sedentary: 'Ngồi nhiều, không tập luyện',
  desk_training: 'Ngồi nhiều + tập 4–6 buổi/tuần',
  moderate: 'Đi lại vừa phải + tập đều',
  active: 'Vận động nhiều / công việc thể lực',
};

const goalLabels: Record<NutritionGoal, string> = {
  recomp: 'Tăng cơ giảm mỡ',
  cut: 'Giảm mỡ',
  maintain: 'Giữ cân',
  gain: 'Tăng cân / tăng cơ',
};

const formatDateLong = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

const formatDateShort = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);

const clampPercent = (value: number, target: number) => {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
};

interface ProgressRowProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  icon: React.FC<{ className?: string }>;
}

const ProgressRow: React.FC<ProgressRowProps> = ({ label, value, target, unit, icon: Icon }) => {
  const percent = clampPercent(value, target);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Icon className="h-3.5 w-3.5 text-slate-400" />
          {label}
        </span>
        <span className="font-medium tabular-nums text-slate-500">
          {decimal.format(value)} / {number.format(target)} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

interface DailyMetricsCardProps {
  steps?: number;
  weightKg?: number;
  stepTarget: number;
  previousWeightKg?: number;
  onChange: (updates: { steps?: number; weightKg?: number }) => void;
}

const DailyMetricsCard: React.FC<DailyMetricsCardProps> = ({
  steps,
  weightKg,
  stepTarget,
  previousWeightKg,
  onChange,
}) => {
  const stepPercent = clampPercent(steps || 0, stepTarget);
  const weightDelta =
    typeof weightKg === 'number' && typeof previousWeightKg === 'number'
      ? weightKg - previousWeightKg
      : null;

  const updateNumber = (field: 'steps' | 'weightKg', raw: string) => {
    if (raw === '') {
      onChange({ [field]: undefined });
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    onChange({ [field]: Math.max(0, value) });
  };

  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Hoạt động & cơ thể</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">Nhập nhanh mỗi ngày · dữ liệu tự lưu</p>
        </div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">Mỗi ngày</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-indigo-500 shadow-xs">
                <Footprints className="h-4 w-4" />
              </span>
              Số bước
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Mục tiêu {number.format(stepTarget)}</span>
          </div>
          <div className="flex items-end gap-2">
            <input
              type="number"
              min="0"
              step="100"
              inputMode="numeric"
              value={steps ?? ''}
              onChange={(event) => updateNumber('steps', event.target.value)}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 outline-hidden placeholder:text-slate-300"
            />
            <span className="pb-1 text-xs font-semibold text-slate-400">bước</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${stepPercent}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] font-medium text-slate-400">
            {steps && steps >= stepTarget
              ? 'Đã đạt mục tiêu vận động hôm nay'
              : `Còn ${number.format(Math.max(0, stepTarget - (steps || 0)))} bước`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-indigo-500 shadow-xs">
                <Scale className="h-4 w-4" />
              </span>
              Cân nặng
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Buổi sáng</span>
          </div>
          <div className="flex items-end gap-2">
            <input
              type="number"
              min="20"
              max="300"
              step="0.1"
              inputMode="decimal"
              value={weightKg ?? ''}
              onChange={(event) => updateNumber('weightKg', event.target.value)}
              placeholder="65.5"
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 outline-hidden placeholder:text-slate-300"
            />
            <span className="pb-1 text-xs font-semibold text-slate-400">kg</span>
          </div>
          <p className={`mt-3 text-[10px] font-semibold ${
            weightDelta === null
              ? 'text-slate-400'
              : Math.abs(weightDelta) < 0.05
                ? 'text-slate-500'
                : weightDelta < 0
                  ? 'text-emerald-600'
                  : 'text-amber-600'
          }`}>
            {weightDelta === null
              ? 'Chưa có lần cân trước để so sánh'
              : `${weightDelta > 0 ? '+' : ''}${decimal.format(weightDelta)} kg so với lần cân trước`}
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            TDEE vẫn dùng cân nặng trong phần mục tiêu để tránh dao động nước làm thay đổi calories mỗi ngày.
          </p>
        </div>
      </div>
    </section>
  );
};

interface AddEntryModalProps {
  date: string;
  foods: FoodItem[];
  onClose: () => void;
  onManageFoods: () => void;
  onAdd: (entry: {
    name: string;
    meal: MealType;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({ date, foods, onClose, onManageFoods, onAdd }) => {
  const [name, setName] = useState('');
  const [meal, setMeal] = useState<MealType>('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [foodQuery, setFoodQuery] = useState('');
  const [error, setError] = useState('');

  const matchedFoods = useMemo(() => {
    const query = foodQuery.trim().toLocaleLowerCase('vi');
    if (!query) return foods.slice(0, 6);
    return foods
      .filter((food) => `${food.name} ${food.category || ''}`.toLocaleLowerCase('vi').includes(query))
      .slice(0, 8);
  }, [foodQuery, foods]);

  const applyFood = (food: FoodItem) => {
    setName(food.name);
    setCalories(String(food.calories));
    setProtein(String(food.protein));
    setCarbs(String(food.carbs));
    setFat(String(food.fat));
    setFoodQuery('');
    setError('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const kcal = Number(calories);
    if (!name.trim()) {
      setError('Nhập tên món hoặc bữa ăn.');
      return;
    }
    if (!Number.isFinite(kcal) || kcal <= 0) {
      setError('Calories phải lớn hơn 0.');
      return;
    }

    onAdd({
      name: name.trim(),
      meal,
      calories: kcal,
      protein: Math.max(0, Number(protein) || 0),
      carbs: Math.max(0, Number(carbs) || 0),
      fat: Math.max(0, Number(fat) || 0),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-t-[28px] border border-slate-200/80 bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Thêm dinh dưỡng</h2>
            <p className="mt-1 text-xs text-slate-400">Ngày {formatDateShort(fromLocalIso(date))}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/45 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-700">Chọn nhanh từ kho thức ăn</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Chọn món để tự điền kcal và macro.</p>
              </div>
              <button
                type="button"
                onClick={onManageFoods}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[10px] font-bold text-indigo-600 shadow-xs transition hover:bg-indigo-50"
              >
                <Database className="h-3.5 w-3.5" />
                Quản lý file
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={foodQuery}
                onChange={(event) => setFoodQuery(event.target.value)}
                placeholder="Tìm trứng, chuối, cơm..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-hidden transition focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
              />
            </div>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {matchedFoods.length === 0 ? (
                <p className="px-2 py-2 text-[10px] text-slate-400">Không có món phù hợp. Có thể tạo món mới trong Kho thức ăn.</p>
              ) : matchedFoods.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => applyFood(food)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-white"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-bold text-slate-700">{food.name}</span>
                    <span className="block truncate text-[9px] font-medium text-slate-400">{food.serving}{food.category ? ` · ${food.category}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold tabular-nums text-indigo-600">{number.format(food.calories)} kcal</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Món / bữa ăn</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Cơm gà"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-hidden transition focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Bữa</span>
            <select
              value={meal}
              onChange={(event) => setMeal(event.target.value as MealType)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-hidden transition focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            >
              {Object.entries(mealLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Calories</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
              placeholder="450"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-hidden transition focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            />
          </label>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              ['Protein', protein, setProtein],
              ['Carb', carbs, setCarbs],
              ['Fat', fat, setFat],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label as string} (g)</span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={value as string}
                  onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
                  placeholder="0"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-hidden transition focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
                />
              </label>
            ))}
          </div>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>

        <button
          type="submit"
          className="mt-5 h-11 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.99]"
        >
          Thêm vào ngày
        </button>
      </form>
    </div>
  );
};

interface FoodLibraryModalProps {
  foods: FoodItem[];
  onClose: () => void;
  onChange: (foods: FoodItem[]) => void;
}

const downloadTextFile = (name: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const FoodLibraryModal: React.FC<FoodLibraryModalProps> = ({ foods, onClose, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [name, setName] = useState('');
  const [serving, setServing] = useState('100 g');
  const [category, setCategory] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const visibleFoods = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    if (!normalized) return foods;
    return foods.filter((food) =>
      `${food.name} ${food.serving} ${food.category || ''}`.toLocaleLowerCase('vi').includes(normalized),
    );
  }, [foods, query]);

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseFoodFile(text, file.name);
      if (!imported.length) {
        setStatus('Không đọc được món hợp lệ. Kiểm tra đúng cột name, serving, calories, protein, carbs, fat.');
        return;
      }
      onChange(mergeFoods(foods, imported));
      setStatus(`Đã nhập ${imported.length} món từ ${file.name}. Món trùng tên + khẩu phần sẽ được cập nhật.`);
    } catch (error) {
      console.warn('Could not import food file:', error);
      setStatus('File không hợp lệ. Hỗ trợ CSV hoặc JSON.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addCustomFood = (event: FormEvent) => {
    event.preventDefault();
    const numeric = [calories, protein, carbs, fat].map(Number);
    if (!name.trim() || !serving.trim() || numeric.some((value) => !Number.isFinite(value) || value < 0)) {
      setStatus('Nhập đủ tên, khẩu phần và các chỉ số không âm.');
      return;
    }

    const food = makeCustomFood({
      name: name.trim(),
      serving: serving.trim(),
      category: category.trim() || undefined,
      calories: numeric[0],
      protein: numeric[1],
      carbs: numeric[2],
      fat: numeric[3],
    });
    onChange(mergeFoods(foods, [food]));
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setStatus(`Đã thêm ${food.name} vào kho.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-slate-200/80 bg-white shadow-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Kho thức ăn</h2>
            <p className="mt-1 text-xs text-slate-400">Upload file để thêm hàng loạt hoặc tự tạo món rồi xuất lại thành file JSON.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={(event) => void importFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-[11px] font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <FileUp className="h-3.5 w-3.5" /> Upload CSV/JSON
            </button>
            <button
              type="button"
              onClick={() => downloadTextFile('food-library-template.csv', FOOD_CSV_TEMPLATE, 'text/csv;charset=utf-8')}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> File mẫu CSV
            </button>
            <button
              type="button"
              onClick={() => downloadTextFile('foods.json', foodLibraryToJson(foods), 'application/json;charset=utf-8')}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Xuất foods.json
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(STARTER_FOODS);
                setStatus('Đã khôi phục kho món mẫu.');
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Khôi phục món mẫu
            </button>
          </section>

          <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 text-[10px] leading-relaxed text-slate-500">
            <strong className="text-slate-700">Cấu trúc file:</strong> name, serving, calories, protein, carbs, fat, category. CSV dùng dấu phẩy hoặc chấm phẩy. JSON có thể là mảng món hoặc <code>{'{ "foods": [...] }'}</code>.
          </div>
          {status && <p className="mt-2 text-[11px] font-semibold text-indigo-600">{status}</p>}

          <form onSubmit={addCustomFood} className="mt-5 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4">
            <div className="mb-3">
              <h3 className="text-xs font-bold text-slate-800">Tạo một món mới</h3>
              <p className="mt-0.5 text-[10px] text-slate-400">Dùng khi món không có sẵn trong file.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên món" className="col-span-2 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100 sm:col-span-1" />
              <input value={serving} onChange={(event) => setServing(event.target.value)} placeholder="Khẩu phần: 100 g / 1 quả" className="col-span-2 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100 sm:col-span-1" />
              <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Nhóm: Trái cây..." className="col-span-2 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100" />
              {[
                ['kcal', calories, setCalories],
                ['Protein (g)', protein, setProtein],
                ['Carb (g)', carbs, setCarbs],
                ['Fat (g)', fat, setFat],
              ].map(([placeholder, value, setter]) => (
                <input
                  key={placeholder as string}
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={value as string}
                  onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
                  placeholder={placeholder as string}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
                />
              ))}
            </div>
            <button type="submit" className="mt-3 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-slate-800">Lưu vào kho thức ăn</button>
          </form>

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Danh sách món</h3>
                <p className="mt-0.5 text-[10px] text-slate-400">{foods.length} món trong kho</p>
              </div>
              <div className="relative w-48 max-w-[55%]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm món" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[11px] outline-hidden focus:border-indigo-300" />
              </div>
            </div>

            <div className="space-y-2">
              {visibleFoods.map((food) => (
                <div key={food.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[11px] font-bold text-slate-700">{food.name}</p>
                      {food.source && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-400">{food.source === 'starter' ? 'mẫu' : food.source === 'custom' ? 'tự tạo' : 'import'}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-slate-400">{food.serving} · P {decimal.format(food.protein)} · C {decimal.format(food.carbs)} · F {decimal.format(food.fat)}</p>
                  </div>
                  <p className="shrink-0 text-[10px] font-bold tabular-nums text-slate-700">{number.format(food.calories)} kcal</p>
                  <button type="button" onClick={() => onChange(foods.filter((item) => item.id !== food.id))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" aria-label={`Xóa ${food.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {visibleFoods.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-[11px] text-slate-400">Không tìm thấy món.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  profile: NutritionProfile;
  onClose: () => void;
  onSave: (profile: NutritionProfile) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onClose, onSave }) => {
  const [draft, setDraft] = useState<NutritionProfile>(profile);
  const suggestedTdee = calculateTdee(draft);
  const suggestedBmr = calculateBmr(draft);

  const setNumber = (key: keyof NutritionProfile, value: string) => {
    setDraft((current) => ({ ...current, [key]: Number(value) || 0 }));
  };

  const applySuggestion = () => {
    setDraft((current) => ({ ...current, ...recommendedTargets(current) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-slate-200/80 bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">TDEE & mục tiêu</h2>
            <p className="mt-1 text-xs text-slate-400">Chỉnh thông số một lần, app tự tính lại mốc theo dõi.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Giới tính</span>
            <select
              value={draft.sex}
              onChange={(event) => setDraft((current) => ({ ...current, sex: event.target.value as NutritionProfile['sex'] }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Tuổi</span>
            <input
              type="number"
              min="14"
              max="100"
              value={draft.age}
              onChange={(event) => setNumber('age', event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Chiều cao (cm)</span>
            <input
              type="number"
              min="120"
              max="230"
              value={draft.heightCm}
              onChange={(event) => setNumber('heightCm', event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Cân nặng tính TDEE (kg)</span>
            <input
              type="number"
              min="30"
              max="250"
              step="0.1"
              value={draft.weightKg}
              onChange={(event) => setNumber('weightKg', event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            />
          </label>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Mức vận động</span>
            <select
              value={draft.activityLevel}
              onChange={(event) => setDraft((current) => ({
                ...current,
                activityLevel: event.target.value as NutritionActivityLevel,
              }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            >
              {Object.entries(activityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Mục tiêu</span>
            <select
              value={draft.goal}
              onChange={(event) => setDraft((current) => ({ ...current, goal: event.target.value as NutritionGoal }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-hidden focus:border-indigo-300 focus:ring-3 focus:ring-indigo-100"
            >
              {Object.entries(goalLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400">BMR</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{number.format(Math.round(suggestedBmr))}</p>
            <p className="text-[11px] text-slate-400">kcal/ngày</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400">TDEE ước tính</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-indigo-700">{number.format(Math.round(suggestedTdee / 10) * 10)}</p>
            <p className="text-[11px] text-slate-400">kcal/ngày</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-700">Mục tiêu theo dõi</p>
            <button
              type="button"
              onClick={applySuggestion}
              className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100"
            >
              Tính lại gợi ý
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Calories', 'calorieTarget', 'kcal'],
              ['Protein', 'proteinTarget', 'g'],
              ['Carb', 'carbTarget', 'g'],
              ['Fat', 'fatTarget', 'g'],
              ['Steps', 'stepTarget', 'bước'],
            ].map(([label, key, unit]) => (
              <label key={key} className="block rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={draft[key as keyof NutritionProfile] as number}
                    onChange={(event) => setNumber(key as keyof NutritionProfile, event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-base font-bold tabular-nums text-slate-900 outline-hidden"
                  />
                  <span className="text-[11px] font-semibold text-slate-400">{unit}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700"
          >
            Lưu mục tiêu
          </button>
        </div>
      </div>
    </div>
  );
};

export const NutritionView: React.FC = () => {
  const [nutrition, setNutrition] = useState(() => loadNutritionState());
  const [foods, setFoods] = useState(() => loadFoodLibrary());
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(() => toLocalIso(new Date()));
  const [addOpen, setAddOpen] = useState(false);
  const [foodLibraryOpen, setFoodLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    saveNutritionState(nutrition);
  }, [nutrition]);

  useEffect(() => {
    saveFoodLibrary(foods);
  }, [foods]);

  const profile = nutrition.profile;
  const tdee = Math.round(calculateTdee(profile) / 10) * 10;
  const selectedDateObject = fromLocalIso(selectedDate);
  const isToday = selectedDate === toLocalIso(new Date());
  const dayEntries = useMemo(
    () => getEntriesForDate(nutrition.entries, selectedDate),
    [nutrition.entries, selectedDate],
  );
  const dayTotals = useMemo(() => getTotals(dayEntries), [dayEntries]);
  const dayMetric = getDailyMetric(nutrition.dailyMetrics, selectedDate);
  const previousWeightMetric = getPreviousWeight(nutrition.dailyMetrics, selectedDate);
  const caloriesLeft = profile.calorieTarget - dayTotals.calories;
  const caloriePercent = clampPercent(dayTotals.calories, profile.calorieTarget);

  const weekDates = useMemo(() => getWeekDates(selectedDateObject), [selectedDate]);
  const weekRows = useMemo(
    () => weekDates.map((date) => {
      const key = toLocalIso(date);
      const entries = getEntriesForDate(nutrition.entries, key);
      return {
        date,
        key,
        entries,
        totals: getTotals(entries),
        metric: getDailyMetric(nutrition.dailyMetrics, key),
      };
    }),
    [weekDates, nutrition.entries, nutrition.dailyMetrics],
  );
  const loggedWeekRows = weekRows.filter((row) => row.entries.length > 0);
  const weekTotals = getTotals(loggedWeekRows.flatMap((row) => row.entries));
  const loggedDays = loggedWeekRows.length;
  const avgCalories = loggedDays ? weekTotals.calories / loggedDays : 0;
  const avgProtein = loggedDays ? weekTotals.protein / loggedDays : 0;
  const weeklyBalance = loggedWeekRows.reduce((sum, row) => sum + row.totals.calories - tdee, 0);
  const targetDays = loggedWeekRows.filter(
    (row) => Math.abs(row.totals.calories - profile.calorieTarget) <= profile.calorieTarget * 0.1,
  ).length;
  const stepRows = weekRows.filter((row) => typeof row.metric?.steps === 'number');
  const weightRows = weekRows.filter((row) => typeof row.metric?.weightKg === 'number');
  const avgSteps = stepRows.length
    ? stepRows.reduce((sum, row) => sum + (row.metric?.steps || 0), 0) / stepRows.length
    : 0;
  const avgWeight = weightRows.length
    ? weightRows.reduce((sum, row) => sum + (row.metric?.weightKg || 0), 0) / weightRows.length
    : 0;
  const stepTargetDays = stepRows.filter((row) => (row.metric?.steps || 0) >= profile.stepTarget).length;
  const weekWeightChange = weightRows.length >= 2
    ? (weightRows[weightRows.length - 1].metric?.weightKg || 0) - (weightRows[0].metric?.weightKg || 0)
    : null;

  const moveDate = (amount: number) => {
    const date = fromLocalIso(selectedDate);
    date.setDate(date.getDate() + amount);
    setSelectedDate(toLocalIso(date));
  };

  const addEntry = (entry: {
    name: string;
    meal: MealType;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    setNutrition((current) => ({
      ...current,
      entries: [
        ...current.entries,
        {
          ...entry,
          id: `nutrition-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: selectedDate,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const removeEntry = (id: string) => {
    setNutrition((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }));
  };

  const updateDailyMetric = (updates: { steps?: number; weightKg?: number }) => {
    setNutrition((current) => ({
      ...current,
      dailyMetrics: upsertDailyMetric(current.dailyMetrics, selectedDate, updates),
    }));
  };

  return (
    <div className="mx-auto min-w-0 w-full max-w-3xl overflow-x-hidden">
      <PageHeader
        title="Dinh dưỡng"
        action={
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-slate-50 active:scale-95"
            aria-label="Cài đặt TDEE"
          >
            <Settings2 className="h-4.5 w-4.5" />
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 rounded-2xl border border-slate-200/70 bg-white p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setMode('day')}
          className={`h-9 rounded-xl text-xs font-bold transition ${
            mode === 'day' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Trong ngày
        </button>
        <button
          type="button"
          onClick={() => setMode('week')}
          className={`h-9 rounded-xl text-xs font-bold transition ${
            mode === 'week' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Trong tuần
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-2 shadow-xs">
        <button
          type="button"
          onClick={() => moveDate(mode === 'day' ? -1 : -7)}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={mode === 'day' ? 'Ngày trước' : 'Tuần trước'}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setSelectedDate(toLocalIso(new Date()))}
          className="min-w-0 rounded-xl px-3 py-1 text-center transition hover:bg-slate-50"
        >
          {mode === 'day' ? (
            <>
              <p className="truncate text-sm font-bold capitalize text-slate-900">{formatDateLong(selectedDateObject)}</p>
              {!isToday && <span className="text-[11px] font-semibold text-indigo-600">Về hôm nay</span>}
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-900">
                {formatDateShort(weekDates[0])} – {formatDateShort(weekDates[6])}
              </p>
              <span className="text-[11px] font-medium text-slate-400">Theo dõi 7 ngày</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => moveDate(mode === 'day' ? 1 : 7)}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={mode === 'day' ? 'Ngày sau' : 'Tuần sau'}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {mode === 'day' ? (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center gap-5">
              <div
                className="grid h-28 w-28 shrink-0 place-items-center rounded-full p-2"
                style={{
                  background: `conic-gradient(rgb(79 70 229) ${caloriePercent * 3.6}deg, rgb(241 245 249) 0deg)`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
                  <div>
                    <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{number.format(dayTotals.calories)}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">đã ăn</p>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400">Mục tiêu hôm nay</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">{number.format(profile.calorieTarget)}</span>
                  <span className="pb-1 text-xs font-semibold text-slate-400">kcal</span>
                </div>
                <p className={`mt-2 text-xs font-semibold ${caloriesLeft >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {caloriesLeft >= 0
                    ? `Còn ${number.format(caloriesLeft)} kcal`
                    : `Vượt ${number.format(Math.abs(caloriesLeft))} kcal`}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-4">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">TDEE ước tính</p>
                <p className="mt-1 text-base font-bold tabular-nums text-slate-800">{number.format(tdee)} kcal</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">BMR</p>
                <p className="mt-1 text-base font-bold tabular-nums text-slate-800">{number.format(Math.round(calculateBmr(profile)))} kcal</p>
              </div>
            </div>
          </section>

          <DailyMetricsCard
            steps={dayMetric?.steps}
            weightKg={dayMetric?.weightKg}
            stepTarget={profile.stepTarget}
            previousWeightKg={previousWeightMetric?.weightKg}
            onChange={updateDailyMetric}
          />

          <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Macro</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Theo mục tiêu {goalLabels[profile.goal].toLowerCase()}</p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">{profile.proteinTarget}P · {profile.carbTarget}C · {profile.fatTarget}F</span>
            </div>
            <div className="space-y-4">
              <ProgressRow label="Protein" value={dayTotals.protein} target={profile.proteinTarget} unit="g" icon={Beef} />
              <ProgressRow label="Carb" value={dayTotals.carbs} target={profile.carbTarget} unit="g" icon={Wheat} />
              <ProgressRow label="Fat" value={dayTotals.fat} target={profile.fatTarget} unit="g" icon={Flame} />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-xs sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bữa ăn</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">{dayEntries.length} mục đã ghi</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFoodLibraryOpen(true)}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <Database className="h-3.5 w-3.5" />
                  Kho món
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Thêm
                </button>
              </div>
            </div>

            {dayEntries.length === 0 ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center transition hover:border-indigo-200 hover:bg-indigo-50/30"
              >
                <span className="mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-400 shadow-xs">
                  <UtensilsCrossed className="h-4.5 w-4.5" />
                </span>
                <span className="text-xs font-bold text-slate-600">Chưa ghi bữa ăn nào</span>
                <span className="mt-1 text-[11px] text-slate-400">Thêm calories và macro để bắt đầu theo dõi.</span>
              </button>
            ) : (
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/45 px-3.5 py-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-500 shadow-xs">
                      <UtensilsCrossed className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold text-slate-800">{entry.name}</p>
                        <span className="shrink-0 text-[10px] font-medium text-slate-400">{mealLabels[entry.meal]}</span>
                      </div>
                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        P {decimal.format(entry.protein)}g · C {decimal.format(entry.carbs)}g · F {decimal.format(entry.fat)}g
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-extrabold tabular-nums text-slate-800">{number.format(entry.calories)}</p>
                      <p className="text-[9px] font-semibold uppercase text-slate-400">kcal</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                      aria-label={`Xóa ${entry.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['TB calories', `${number.format(Math.round(avgCalories))}`, 'kcal/ngày'],
              ['TB protein', `${number.format(Math.round(avgProtein))}`, 'g/ngày'],
              ['TB steps', stepRows.length ? `${number.format(Math.round(avgSteps))}` : '—', 'bước/ngày'],
              ['TB cân nặng', weightRows.length ? `${decimal.format(avgWeight)}` : '—', 'kg'],
              ['Ngày ghi ăn', `${loggedDays}/7`, 'ngày'],
              ['Đúng calories', `${targetDays}/${loggedDays || 0}`, '±10% mục tiêu'],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1.5 text-xl font-extrabold tabular-nums text-slate-900">{value}</p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400">{sub}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-xs">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Calories 7 ngày</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Mục tiêu {number.format(profile.calorieTarget)} kcal/ngày</p>
              </div>
              <p className={`text-xs font-bold ${weeklyBalance <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {loggedDays === 0
                  ? 'Chưa có dữ liệu'
                  : `${weeklyBalance <= 0 ? 'Thiếu' : 'Dư'} ${number.format(Math.abs(Math.round(weeklyBalance)))} kcal so TDEE`}
              </p>
            </div>

            <div className="flex h-44 items-end gap-2 sm:gap-3">
              {weekRows.map((row) => {
                const hasData = row.entries.length > 0;
                const barPercent = hasData ? Math.min(100, Math.max(8, (row.totals.calories / profile.calorieTarget) * 78)) : 4;
                const isSelected = row.key === selectedDate;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(row.key);
                      setMode('day');
                    }}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-xl px-0.5 transition hover:bg-slate-50"
                  >
                    <span className="text-[9px] font-semibold tabular-nums text-slate-400">
                      {hasData ? number.format(row.totals.calories) : '—'}
                    </span>
                    <span className="flex h-28 w-full max-w-8 items-end overflow-hidden rounded-lg bg-slate-100">
                      <span
                        className={`w-full rounded-lg transition-all ${isSelected ? 'bg-indigo-600' : hasData ? 'bg-indigo-400' : 'bg-slate-200'}`}
                        style={{ height: `${barPercent}%` }}
                      />
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(row.date).replace('Th ', 'T')}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Steps & cân nặng 7 ngày</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Theo dõi mức vận động và xu hướng cân mỗi ngày.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500">{stepTargetDays}/{stepRows.length || 0} ngày đạt steps</p>
                <p className={`mt-0.5 text-[10px] font-semibold ${
                  weekWeightChange === null
                    ? 'text-slate-400'
                    : weekWeightChange <= 0
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                }`}>
                  {weekWeightChange === null
                    ? 'Chưa đủ dữ liệu cân'
                    : `${weekWeightChange > 0 ? '+' : ''}${decimal.format(weekWeightChange)} kg trong tuần`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {weekRows.map((row) => {
                const steps = row.metric?.steps;
                const weight = row.metric?.weightKg;
                return (
                  <button
                    key={`metric-${row.key}`}
                    type="button"
                    onClick={() => {
                      setSelectedDate(row.key);
                      setMode('day');
                    }}
                    className="grid w-full grid-cols-[56px_1fr_72px] items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-50 sm:grid-cols-[64px_1fr_92px]"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-slate-700">
                        {new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(row.date)}
                      </p>
                      <p className="text-[10px] text-slate-400">{formatDateShort(row.date)}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                          <Footprints className="h-3 w-3" />
                          {typeof steps === 'number' ? number.format(steps) : '—'}
                        </span>
                        <span className="text-[9px] text-slate-400">/{number.format(profile.stepTarget)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${clampPercent(steps || 0, profile.stepTarget)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center justify-end gap-1 text-[11px] font-bold tabular-nums text-slate-700">
                        <Scale className="h-3 w-3 text-slate-400" />
                        {typeof weight === 'number' ? `${decimal.format(weight)} kg` : '—'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Macro trung bình</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Chỉ tính các ngày đã ghi dữ liệu.</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">TDEE {number.format(tdee)}</span>
            </div>
            <div className="space-y-4">
              <ProgressRow label="Protein" value={loggedDays ? weekTotals.protein / loggedDays : 0} target={profile.proteinTarget} unit="g" icon={Beef} />
              <ProgressRow label="Carb" value={loggedDays ? weekTotals.carbs / loggedDays : 0} target={profile.carbTarget} unit="g" icon={Wheat} />
              <ProgressRow label="Fat" value={loggedDays ? weekTotals.fat / loggedDays : 0} target={profile.fatTarget} unit="g" icon={Flame} />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-xs">
            <div className="space-y-2">
              {weekRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(row.key);
                    setMode('day');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="w-14 shrink-0">
                    <p className="text-[11px] font-bold text-slate-700">
                      {new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(row.date)}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDateShort(row.date)}</p>
                  </div>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${clampPercent(row.totals.calories, profile.calorieTarget)}%` }}
                    />
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-[11px] font-bold tabular-nums text-slate-700">{number.format(row.totals.calories)} kcal</p>
                    <p className="text-[9px] text-slate-400">P {number.format(Math.round(row.totals.protein))}g</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {addOpen && (
        <AddEntryModal
          date={selectedDate}
          foods={foods}
          onClose={() => setAddOpen(false)}
          onManageFoods={() => {
            setAddOpen(false);
            setFoodLibraryOpen(true);
          }}
          onAdd={addEntry}
        />
      )}
      {foodLibraryOpen && (
        <FoodLibraryModal
          foods={foods}
          onClose={() => setFoodLibraryOpen(false)}
          onChange={setFoods}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          profile={profile}
          onClose={() => setSettingsOpen(false)}
          onSave={(nextProfile) => setNutrition((current) => ({ ...current, profile: nextProfile }))}
        />
      )}
    </div>
  );
};
