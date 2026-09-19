export interface ServingAmount {
  amount: number;
  unit: string;
  step: number;
}

export interface MacroValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function parseServingAmount(serving?: string): ServingAmount {
  const raw = (serving || '').trim().toLocaleLowerCase('vi');
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|quả|qua|chai|hộp|hop|bát|bat|miếng|mieng|phần|phan|khẩu phần)/i);
  if (!match) return { amount: 1, unit: 'phần', step: 1 };

  let amount = Number(match[1].replace(',', '.'));
  let unit = match[2].toLocaleLowerCase('vi');
  if (!Number.isFinite(amount) || amount <= 0) return { amount: 1, unit: 'phần', step: 1 };

  if (unit === 'kg') { amount *= 1000; unit = 'g'; }
  if (unit === 'l') { amount *= 1000; unit = 'ml'; }
  if (unit === 'qua') unit = 'quả';
  if (unit === 'hop') unit = 'hộp';
  if (unit === 'bat') unit = 'bát';
  if (unit === 'mieng') unit = 'miếng';
  if (unit === 'phan' || unit === 'khẩu phần') unit = 'phần';

  return {
    amount,
    unit,
    step: unit === 'g' || unit === 'ml' ? 5 : 1,
  };
}

export function scaleNutrition(
  base: MacroValues,
  amount: number,
  baseAmount: number,
): MacroValues {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const factor = baseAmount > 0 ? safeAmount / baseAmount : 1;
  return {
    calories: Math.max(0, base.calories * factor),
    protein: Math.max(0, base.protein * factor),
    carbs: Math.max(0, base.carbs * factor),
    fat: Math.max(0, base.fat * factor),
  };
}
