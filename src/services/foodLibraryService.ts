export interface FoodItem {
  id: string;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category?: string;
  source?: 'starter' | 'imported' | 'custom';
}

const STORAGE_KEY = 'lich_song_food_library_v1';

export const STARTER_FOODS: FoodItem[] = [
  {
    id: 'starter-boiled-egg',
    name: 'Trứng gà luộc',
    serving: '1 quả (~50 g)',
    calories: 78,
    protein: 6.3,
    carbs: 0.6,
    fat: 5.3,
    category: 'Trứng',
    source: 'starter',
  },
  {
    id: 'starter-fried-egg',
    name: 'Trứng gà rán',
    serving: '1 quả',
    calories: 90,
    protein: 6.3,
    carbs: 0.4,
    fat: 7,
    category: 'Trứng',
    source: 'starter',
  },
  {
    id: 'starter-banana',
    name: 'Chuối',
    serving: '100 g',
    calories: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    category: 'Trái cây',
    source: 'starter',
  },
  {
    id: 'starter-apple',
    name: 'Táo',
    serving: '100 g',
    calories: 52,
    protein: 0.3,
    carbs: 13.8,
    fat: 0.2,
    category: 'Trái cây',
    source: 'starter',
  },
  {
    id: 'starter-rice',
    name: 'Cơm trắng chín',
    serving: '100 g',
    calories: 130,
    protein: 2.7,
    carbs: 28.2,
    fat: 0.3,
    category: 'Tinh bột',
    source: 'starter',
  },
  {
    id: 'starter-chicken-breast',
    name: 'Ức gà chín',
    serving: '100 g',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    category: 'Đạm',
    source: 'starter',
  },
  {
    id: 'starter-sweet-potato',
    name: 'Khoai lang chín',
    serving: '100 g',
    calories: 86,
    protein: 1.6,
    carbs: 20.1,
    fat: 0.1,
    category: 'Tinh bột',
    source: 'starter',
  },
  {
    id: 'starter-guava',
    name: 'Ổi',
    serving: '100 g',
    calories: 68,
    protein: 2.6,
    carbs: 14.3,
    fat: 1,
    category: 'Trái cây',
    source: 'starter',
  },
  {
    id: 'starter-pepper-beef',
    name: 'Bò sốt tiêu (ước tính)',
    serving: '100 g',
    calories: 250,
    protein: 24,
    carbs: 5,
    fat: 14.5,
    category: 'Đạm',
    source: 'starter',
  },
  {
    id: 'starter-probi-65',
    name: 'Probi',
    serving: '65 ml',
    calories: 41,
    protein: 0.7,
    carbs: 9.6,
    fat: 0,
    category: 'Sữa chua uống',
    source: 'starter',
  },
];

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const rowValue = (row: Record<string, unknown>, aliases: string[]) => {
  const byNormalizedKey = new Map(
    Object.entries(row).map(([key, value]) => [normalizeKey(key).replace(/[ _-]/g, ''), value]),
  );
  for (const alias of aliases) {
    const found = byNormalizedKey.get(normalizeKey(alias).replace(/[ _-]/g, ''));
    if (found !== undefined) return found;
  }
  return undefined;
};

function makeFoodId(name: string, serving: string): string {
  const base = normalizeKey(`${name}-${serving}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 46);
  return `food-${base || 'item'}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeFoodRow(
  row: Record<string, unknown>,
  source: FoodItem['source'] = 'imported',
): FoodItem | null {
  const name = String(rowValue(row, ['name', 'ten', 'tên', 'food', 'mon', 'món']) ?? '').trim();
  if (!name) return null;

  const serving = String(
    rowValue(row, ['serving', 'portion', 'khauphan', 'khẩu phần', 'donvi', 'đơn vị']) ?? '1 khẩu phần',
  ).trim();
  const calories = toNumber(rowValue(row, ['calories', 'calorie', 'kcal', 'nangluong', 'năng lượng']));
  const protein = toNumber(rowValue(row, ['protein', 'dam', 'đạm']));
  const carbs = toNumber(rowValue(row, ['carbs', 'carb', 'carbohydrate', 'tinhbot', 'tinh bột']));
  const fat = toNumber(rowValue(row, ['fat', 'chatbeo', 'chất béo']));

  if (![calories, protein, carbs, fat].every((value) => Number.isFinite(value) && value >= 0)) {
    return null;
  }

  const categoryRaw = rowValue(row, ['category', 'group', 'nhom', 'nhóm']);
  const category = categoryRaw === undefined ? undefined : String(categoryRaw).trim() || undefined;
  const idRaw = rowValue(row, ['id']);
  const id = idRaw ? String(idRaw).trim() : makeFoodId(name, serving);

  return {
    id,
    name,
    serving: serving || '1 khẩu phần',
    calories,
    protein,
    carbs,
    fat,
    category,
    source,
  };
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseFoodCsv(text: string): FoodItem[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = parseCsvLine(lines[0], delimiter);
  return lines
    .slice(1)
    .map((line) => {
      const cells = parseCsvLine(line, delimiter);
      const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
      return normalizeFoodRow(row, 'imported');
    })
    .filter((item): item is FoodItem => Boolean(item));
}

export function parseFoodJson(text: string): FoodItem[] {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { foods?: unknown }).foods)
      ? (parsed as { foods: unknown[] }).foods
      : [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
    .map((row) => normalizeFoodRow(row, 'imported'))
    .filter((item): item is FoodItem => Boolean(item));
}

export function parseFoodFile(text: string, fileName = ''): FoodItem[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) return parseFoodJson(text);
  if (lower.endsWith('.csv')) return parseFoodCsv(text);

  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return parseFoodJson(text);
  return parseFoodCsv(text);
}

export function mergeFoods(existing: FoodItem[], incoming: FoodItem[]): FoodItem[] {
  const keyOf = (food: FoodItem) => `${normalizeKey(food.name)}|${normalizeKey(food.serving)}`;
  const map = new Map(existing.map((food) => [keyOf(food), food]));
  incoming.forEach((food) => map.set(keyOf(food), food));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export function loadFoodLibrary(): FoodItem[] {
  if (typeof window === 'undefined') return STARTER_FOODS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return STARTER_FOODS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return STARTER_FOODS;
    const savedFoods = parsed
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
      .map((row) => normalizeFoodRow(row, (row.source as FoodItem['source']) || 'custom'))
      .filter((item): item is FoodItem => Boolean(item));
    return mergeFoods(STARTER_FOODS, savedFoods);
  } catch (error) {
    console.warn('Could not load food library:', error);
    return STARTER_FOODS;
  }
}

export function saveFoodLibrary(foods: FoodItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
  } catch (error) {
    console.warn('Could not save food library:', error);
  }
}

export function makeCustomFood(input: Omit<FoodItem, 'id' | 'source'>): FoodItem {
  return {
    ...input,
    id: makeFoodId(input.name, input.serving),
    source: 'custom',
  };
}

export function foodLibraryToJson(foods: FoodItem[]): string {
  return JSON.stringify({ version: 1, foods }, null, 2);
}

export const FOOD_CSV_TEMPLATE = [
  'name,serving,calories,protein,carbs,fat,category',
  'Trứng gà luộc,1 quả (~50 g),78,6.3,0.6,5.3,Trứng',
  'Chuối,100 g,89,1.1,22.8,0.3,Trái cây',
].join('\n');
