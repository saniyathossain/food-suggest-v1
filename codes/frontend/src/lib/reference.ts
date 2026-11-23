// A typical adult's daily reference, to put one food's numbers in proportion (per 100 g as a share of a day). General guidance, not
// personal advice: a person's own needs differ with age, sex, size and conditions, and the plan's rules always come first. The
// "limit" values follow WHO advice (free sugars under 10 % of energy ≈ 50 g on 2,000 kcal; sodium under 2,000 mg), saturated fat
// under 10 % of energy ≈ 22 g, rounded to 20 g; the "get" values are EU labelling reference intakes.
import type { Nutrients } from '@/lib/types';

export const DAILY_KCAL = 2000;

export const GET: readonly { key: keyof Nutrients; id: 'protein' | 'fibre' | 'iron' | 'calcium' | 'potassium'; daily: number }[] = [
  { key: 'protein_g', id: 'protein', daily: 50 },
  { key: 'fibre_g', id: 'fibre', daily: 25 },
  { key: 'iron_mg', id: 'iron', daily: 14 },
  { key: 'calcium_mg', id: 'calcium', daily: 800 },
  { key: 'potassium_mg', id: 'potassium', daily: 3500 },
];

export const WATCH: readonly { key: keyof Nutrients; id: 'sugar' | 'satFat' | 'sodium'; limit: number }[] = [
  { key: 'sugar_g', id: 'sugar', limit: 50 },
  { key: 'sat_fat_g', id: 'satFat', limit: 20 },
  { key: 'sodium_mg', id: 'sodium', limit: 2000 },
];

/** 100 g of this food as a share of the day (1 = all of it). Null when the source did not report the nutrient. */
export function share(nutrients: Nutrients, key: keyof Nutrients, daily: number): number | null {
  const value = nutrients[key];
  return typeof value === 'number' ? value / daily : null;
}
