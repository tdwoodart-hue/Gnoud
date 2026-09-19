export interface FoodVariant {
  id: string;
  label: string;
  amount: number;
  unit: string;
  grams?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodPortion {
  id: string;
  label: string;
  amount: number;
  unit: string;
  /** Multiplier against one base variant serving. Example: 1 medium banana = 1.18 x the 100 g base serving. */
  multiplier: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category?: string;
  variants: FoodVariant[];
  portions?: FoodPortion[];
  source?: 'file' | 'imported' | 'custom';
}

export interface ScaledFoodNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const STORAGE_KEY = 'lich_song_food_library_v2';
const LEGACY_STORAGE_KEY = 'lich_song_food_library_v1';
export const DEFAULT_FOOD_FILE_URL = '/data/foods.json';

const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const slug = (value: string) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'item';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const rowValue = (row: Record<string, unknown>, aliases: string[]) => {
  const normalized = new Map(
    Object.entries(row).map(([key, value]) => [normalizeKey(key).replace(/[ _-]/g, ''), value]),
  );
  for (const alias of aliases) {
    const found = normalized.get(normalizeKey(alias).replace(/[ _-]/g, ''));
    if (found !== undefined) return found;
  }
  return undefined;
};


function parseLegacyServing(raw: unknown): { amount: number; unit: string; grams?: number } {
  const text = String(raw ?? '').trim();
  if (!text) return { amount: 1, unit: 'khẩu phần' };

  const direct = text.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([^\d(]+?)(?:\s*\(.*?([0-9]+(?:[.,][0-9]+)?)\s*g.*?\))?$/i);
  if (direct) {
    const amount = toNumber(direct[1]);
    const unit = direct[2].trim() || 'khẩu phần';
    const grams = direct[3] ? toNumber(direct[3]) : undefined;
    return {
      amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
      unit,
      ...(grams && Number.isFinite(grams) ? { grams } : {}),
    };
  }

  const gramsOnly = text.match(/^([0-9]+(?:[.,][0-9]+)?)\s*g$/i);
  if (gramsOnly) return { amount: toNumber(gramsOnly[1]), unit: 'g', grams: toNumber(gramsOnly[1]) };

  return { amount: 1, unit: text };
}

function normalizeVariant(
  raw: Record<string, unknown>,
  fallbackId: string,
  fallbackLabel = 'Mặc định',
): FoodVariant | null {
  const calories = toNumber(rowValue(raw, ['calories', 'calorie', 'kcal', 'nangluong', 'năng lượng']));
  const protein = toNumber(rowValue(raw, ['protein', 'dam', 'đạm']));
  const carbs = toNumber(rowValue(raw, ['carbs', 'carb', 'carbohydrate', 'tinhbot', 'tinh bột']));
  const fat = toNumber(rowValue(raw, ['fat', 'chatbeo', 'chất béo']));
  if (![calories, protein, carbs, fat].every((value) => Number.isFinite(value) && value >= 0)) return null;

  const legacyServing = rowValue(raw, ['serving', 'portion', 'khauphan', 'khẩu phần', 'donvi', 'đơn vị']);
  const legacy = parseLegacyServing(legacyServing);
  const amountRaw = rowValue(raw, ['amount', 'baseamount', 'quantity', 'soluong', 'số lượng']);
  const unitRaw = rowValue(raw, ['unit', 'donvitinh', 'đơn vị tính']);
  const gramsRaw = rowValue(raw, ['grams', 'gram', 'weightgrams', 'khoiluongg', 'khối lượng g']);
  const labelRaw = rowValue(raw, ['variant', 'method', 'preparation', 'cachchebien', 'cách chế biến', 'label']);
  const idRaw = rowValue(raw, ['variantid', 'variant_id', 'id']);

  const amount = toNumber(amountRaw);
  const grams = toNumber(gramsRaw);
  const label = String(labelRaw ?? fallbackLabel).trim() || fallbackLabel;

  return {
    id: String(idRaw ?? `${fallbackId}-${slug(label)}`).trim(),
    label,
    amount: Number.isFinite(amount) && amount > 0 ? amount : legacy.amount,
    unit: String(unitRaw ?? legacy.unit).trim() || legacy.unit,
    ...(Number.isFinite(grams) && grams > 0
      ? { grams }
      : legacy.grams && legacy.grams > 0
        ? { grams: legacy.grams }
        : {}),
    calories,
    protein,
    carbs,
    fat,
  };
}

function normalizePortions(raw: unknown, foodId: string): FoodPortion[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const portions = raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => {
      const amount = toNumber(rowValue(item, ['amount', 'quantity', 'soluong', 'số lượng']));
      const multiplier = toNumber(rowValue(item, ['multiplier', 'factor', 'heso', 'hệ số']));
      const unit = String(rowValue(item, ['unit', 'donvi', 'đơn vị']) ?? '').trim();
      const label = String(rowValue(item, ['label', 'name', 'ten', 'tên']) ?? '').trim();
      if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(multiplier) || multiplier <= 0 || !unit) {
        return null;
      }
      return {
        id: String(rowValue(item, ['id']) ?? `${foodId}-portion-${index + 1}`).trim(),
        label: label || `${amount} ${unit}`,
        amount,
        unit,
        multiplier,
      } satisfies FoodPortion;
    })
    .filter((item): item is FoodPortion => Boolean(item));
  return portions.length ? portions : undefined;
}

function normalizeGroupedFood(raw: Record<string, unknown>, source: FoodItem['source']): FoodItem | null {
  const name = String(rowValue(raw, ['name', 'ten', 'tên', 'food', 'mon', 'món']) ?? '').trim();
  if (!name) return null;
  const id = String(rowValue(raw, ['id']) ?? `food-${slug(name)}`).trim();
  const categoryValue = rowValue(raw, ['category', 'group', 'nhom', 'nhóm']);
  const category = categoryValue === undefined ? undefined : String(categoryValue).trim() || undefined;
  const variantsRaw = raw.variants;

  const portions = normalizePortions(raw.portions, id);

  if (!Array.isArray(variantsRaw)) {
    const legacyVariant = normalizeVariant(raw, id, 'Mặc định');
    return legacyVariant ? { id, name, category, variants: [legacyVariant], portions, source } : null;
  }

  const variants = variantsRaw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => normalizeVariant(item, id, index === 0 ? 'Mặc định' : `Cách ${index + 1}`))
    .filter((item): item is FoodVariant => Boolean(item));

  if (!variants.length) return null;
  return { id, name, category, variants, portions, source };
}

interface FlatFoodRow {
  name: string;
  category?: string;
  variant: FoodVariant;
}

const PREPARATION_SUFFIXES = [
  'áp chảo',
  'ốp la',
  'luộc',
  'rán',
  'chiên',
  'nướng',
  'hấp',
  'xào',
  'kho',
  'tươi',
  'chín',
  'sống',
];

function splitLegacyPreparationName(name: string): { name: string; variant?: string } {
  const normalizedName = normalizeKey(name);
  for (const suffix of PREPARATION_SUFFIXES) {
    if (!normalizedName.endsWith(` ${normalizeKey(suffix)}`)) continue;
    const base = name.slice(0, name.length - suffix.length).trim();
    if (!base) break;
    return {
      name: base,
      variant: suffix.charAt(0).toUpperCase() + suffix.slice(1),
    };
  }
  return { name };
}

function normalizeFlatRow(raw: Record<string, unknown>, source: FoodItem['source']): FlatFoodRow | null {
  const rawName = String(rowValue(raw, ['name', 'ten', 'tên', 'food', 'mon', 'món']) ?? '').trim();
  if (!rawName) return null;

  const explicitVariant = rowValue(raw, ['variant', 'method', 'preparation', 'cachchebien', 'cách chế biến', 'label']);
  const split = explicitVariant === undefined ? splitLegacyPreparationName(rawName) : { name: rawName };
  const name = split.name;
  const foodId = String(rowValue(raw, ['foodid', 'food_id']) ?? `food-${slug(name)}`).trim();
  const categoryValue = rowValue(raw, ['category', 'group', 'nhom', 'nhóm']);
  const variant = normalizeVariant(raw, foodId, split.variant || 'Mặc định');
  if (!variant) return null;
  return {
    name,
    category: categoryValue === undefined ? undefined : String(categoryValue).trim() || undefined,
    variant,
  };
}

function rowsToFoods(rows: FlatFoodRow[], source: FoodItem['source']): FoodItem[] {
  const map = new Map<string, FoodItem>();

  rows.forEach((row) => {
    const key = normalizeKey(row.name);
    const current = map.get(key) || {
      id: `food-${slug(row.name)}`,
      name: row.name,
      category: row.category,
      variants: [],
      source,
    };
    const variantKey = normalizeKey(row.variant.label);
    const existingIndex = current.variants.findIndex((variant) => normalizeKey(variant.label) === variantKey);
    if (existingIndex >= 0) current.variants[existingIndex] = row.variant;
    else current.variants.push(row.variant);
    if (row.category) current.category = row.category;
    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
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
  const rows = lines
    .slice(1)
    .map((line) => {
      const cells = parseCsvLine(line, delimiter);
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    })
    .map((row) => normalizeFlatRow(row, 'imported'))
    .filter((item): item is FlatFoodRow => Boolean(item));

  return rowsToFoods(rows, 'imported');
}

export function parseFoodJson(text: string, source: FoodItem['source'] = 'file'): FoodItem[] {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { foods?: unknown }).foods)
      ? (parsed as { foods: unknown[] }).foods
      : [];

  const objectRows = rows.filter(
    (row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row),
  );

  const grouped = objectRows.filter((row) => Array.isArray(row.variants));
  const flat = objectRows.filter((row) => !Array.isArray(row.variants));
  const groupedFoods = grouped
    .map((row) => normalizeGroupedFood(row, source))
    .filter((item): item is FoodItem => Boolean(item));
  const flatFoods = rowsToFoods(
    flat.map((row) => normalizeFlatRow(row, source)).filter((item): item is FlatFoodRow => Boolean(item)),
    source,
  );

  return mergeFoods(groupedFoods, flatFoods);
}

export function parseFoodFile(text: string, fileName = ''): FoodItem[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) return parseFoodJson(text, 'imported');
  if (lower.endsWith('.csv')) return parseFoodCsv(text);
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return parseFoodJson(text, 'imported');
  return parseFoodCsv(text);
}

export function mergeFoods(existing: FoodItem[], incoming: FoodItem[]): FoodItem[] {
  const map = new Map(existing.map((food) => [normalizeKey(food.name), { ...food, variants: [...food.variants] }]));
  incoming.forEach((food) => {
    const key = normalizeKey(food.name);
    const current = map.get(key);
    if (!current) {
      map.set(key, { ...food, variants: [...food.variants] });
      return;
    }
    const variants = new Map(current.variants.map((variant) => [normalizeKey(variant.label), variant]));
    food.variants.forEach((variant) => variants.set(normalizeKey(variant.label), variant));
    map.set(key, {
      ...current,
      ...food,
      id: current.id || food.id,
      category: food.category || current.category,
      variants: [...variants.values()],
    });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

function migrateLegacy(value: unknown): FoodItem[] {
  if (!Array.isArray(value)) return [];
  const rows = value
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
    .map((row) => normalizeFlatRow(row, 'imported'))
    .filter((item): item is FlatFoodRow => Boolean(item));
  return rowsToFoods(rows, 'imported');
}

export function loadFoodLibrary(): FoodItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return parseFoodJson(raw, 'imported');

    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return [];
    const migrated = migrateLegacy(JSON.parse(legacyRaw));
    if (migrated.length) saveFoodLibrary(migrated);
    return migrated;
  } catch (error) {
    console.warn('Could not load food library:', error);
    return [];
  }
}

export async function loadDefaultFoodLibrary(): Promise<FoodItem[]> {
  if (typeof fetch === 'undefined') return [];
  try {
    const response = await fetch(DEFAULT_FOOD_FILE_URL, { cache: 'no-store' });
    if (!response.ok) return [];
    return parseFoodJson(await response.text(), 'file');
  } catch (error) {
    console.warn('Could not load default food data file:', error);
    return [];
  }
}

export function saveFoodLibrary(foods: FoodItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, foodLibraryToJson(foods));
  } catch (error) {
    console.warn('Could not save food library:', error);
  }
}

export function clearFoodLibraryOverride(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function foodLibraryToJson(foods: FoodItem[]): string {
  return JSON.stringify(
    {
      version: 2,
      updatedAt: new Date().toISOString(),
      foods: foods.map(({ source: _source, ...food }) => food),
    },
    null,
    2,
  );
}

export function getFoodVariant(food: FoodItem, variantId?: string): FoodVariant {
  return food.variants.find((variant) => variant.id === variantId) || food.variants[0];
}

export function getFoodPortions(food: FoodItem, variant: FoodVariant): FoodPortion[] {
  if (food.portions?.length) return food.portions;

  // Compatibility for libraries saved before portion options existed.
  // Nutrition remains based on the food's 100 g data; these only add convenient real-life units.
  const key = normalizeKey(food.name);
  const isHundredGramBase = variant.unit.toLowerCase() === 'g' && Math.abs(variant.amount - 100) < 0.001;
  if (isHundredGramBase && (key === 'chuoi' || key.startsWith('chuoi '))) {
    return [
      { id: `${food.id}-medium-piece`, label: '1 quả vừa', amount: 1, unit: 'quả', multiplier: 1.18 },
      { id: `${variant.id}-base-portion`, label: 'Theo gram', amount: 100, unit: 'g', multiplier: 1 },
    ];
  }
  if (isHundredGramBase && (key === 'tao' || key.startsWith('tao '))) {
    return [
      { id: `${food.id}-medium-piece`, label: '1 quả vừa', amount: 1, unit: 'quả', multiplier: 1.82 },
      { id: `${variant.id}-base-portion`, label: 'Theo gram', amount: 100, unit: 'g', multiplier: 1 },
    ];
  }

  return [{
    id: `${variant.id}-base-portion`,
    label: formatFoodServing(variant),
    amount: variant.amount,
    unit: variant.unit,
    multiplier: 1,
  }];
}

export function getFoodPortion(food: FoodItem, variant: FoodVariant, portionId?: string): FoodPortion {
  const portions = getFoodPortions(food, variant);
  return portions.find((portion) => portion.id === portionId) || portions[0];
}

export function scaleFoodPortion(
  variant: FoodVariant,
  portion: FoodPortion,
  amount: number,
): ScaledFoodNutrition {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : portion.amount;
  const factor = (safeAmount / portion.amount) * portion.multiplier;
  return {
    calories: variant.calories * factor,
    protein: variant.protein * factor,
    carbs: variant.carbs * factor,
    fat: variant.fat * factor,
  };
}

export function formatPortionAmount(amount: number, unit: string): string {
  const formatted = Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 10) / 10).replace('.', ',');
  return `${formatted} ${unit}`;
}

export function scaleFoodVariant(variant: FoodVariant, amount: number): ScaledFoodNutrition {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : variant.amount;
  const factor = safeAmount / variant.amount;
  return {
    calories: variant.calories * factor,
    protein: variant.protein * factor,
    carbs: variant.carbs * factor,
    fat: variant.fat * factor,
  };
}

export function formatFoodServing(variant: FoodVariant): string {
  const amount = Number.isInteger(variant.amount) ? String(variant.amount) : String(variant.amount).replace('.', ',');
  const grams = variant.grams && variant.unit.toLowerCase() !== 'g' ? ` (~${variant.grams} g)` : '';
  return `${amount} ${variant.unit}${grams}`;
}

export const FOOD_CSV_TEMPLATE = [
  'name,variant,amount,unit,grams,calories,protein,carbs,fat,category',
  'Trứng gà,Luộc,1,quả,50,78,6.3,0.6,5.3,Trứng',
  'Trứng gà,Rán,1,quả,50,90,6.3,0.4,7,Trứng',
  'Chuối,Tươi,100,g,100,89,1.1,22.8,0.3,Trái cây',
].join('\n');
