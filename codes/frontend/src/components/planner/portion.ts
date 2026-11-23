// Portion maths for the meal planner: what a number of grams of a food brings, from the per-100 g figures the catalogue carries.
import type { FoodSearch } from '@/lib/types';

export const PORTIONS = [50, 100, 150, 200, 300];

export type Brings = { kcal: number; protein: number; carbs: number; fat: number };

/** What `grams` of this food brings; a food with no figures brings nothing (the planner says so instead of guessing). */
export function bring(food: FoodSearch | undefined, grams: number): Brings | null {
  const macros = food?.macros;
  if (!macros) return null;
  const share = grams / 100;
  return {
    kcal: macros.kcal * share,
    protein: (macros.protein_g ?? 0) * share,
    carbs: (macros.carb_g ?? 0) * share,
    fat: (macros.fat_g ?? 0) * share,
  };
}

export const today = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const shift = (date: string, days: number): string => {
  const moved = new Date(`${date}T12:00:00`);
  moved.setDate(moved.getDate() + days);
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, '0')}-${String(moved.getDate()).padStart(2, '0')}`;
};
