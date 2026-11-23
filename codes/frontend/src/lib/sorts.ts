// Every way a list can be ordered, in one place: the comparators for foods, recipes and articles. A value a food does not have (no GI
// measured, no age stated) always sorts last, whichever way the sort runs, so the lists never open on blanks.
import type { FoodSearch, PostCard, RecipeCard } from '@/lib/types';

const last = (value: number | null | undefined, high: boolean): number => value ?? (high ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
const low = (pick: (item: FoodSearch) => number | null | undefined) => (first: FoodSearch, second: FoodSearch) => last(pick(first), false) - last(pick(second), false);
const high = (pick: (item: FoodSearch) => number | null | undefined) => (first: FoodSearch, second: FoodSearch) => last(pick(second), true) - last(pick(first), true);

export type FoodSort = 'relevance' | 'az' | 'za' | 'kcalLow' | 'kcalHigh' | 'proteinHigh' | 'carbLow' | 'fatLow' | 'giLow' | 'giHigh' | 'ageLow' | 'conditions' | 'season';
export const FOOD_SORTS: FoodSort[] = ['relevance', 'az', 'za', 'kcalLow', 'kcalHigh', 'proteinHigh', 'carbLow', 'fatLow', 'giLow', 'giHigh', 'ageLow', 'conditions', 'season'];
export const foodOrder: Record<FoodSort, (first: FoodSearch, second: FoodSearch) => number> = {
  relevance: () => 0,
  az: (first, second) => first.name.localeCompare(second.name),
  za: (first, second) => second.name.localeCompare(first.name),
  kcalLow: low((food) => food.macros?.kcal),
  kcalHigh: high((food) => food.macros?.kcal),
  proteinHigh: high((food) => food.macros?.protein_g),
  carbLow: low((food) => food.macros?.carb_g),
  fatLow: low((food) => food.macros?.fat_g),
  giLow: low((food) => food.gi),
  giHigh: high((food) => food.gi),
  ageLow: low((food) => food.age_from_months),
  conditions: (first, second) => second.verdicts.length - first.verdicts.length,
  season: (first, second) => Number(second.in_season) - Number(first.in_season),
};

const LEVEL = { easy: 0, medium: 1, hard: 2 } as const;
export type RecipeSort = 'quickest' | 'slowest' | 'fewest' | 'most' | 'easiest' | 'prepQuick' | 'servings' | 'video' | 'az' | 'za';
export const RECIPE_SORTS: RecipeSort[] = ['quickest', 'slowest', 'fewest', 'most', 'easiest', 'prepQuick', 'servings', 'video', 'az', 'za'];
export const recipeOrder: Record<RecipeSort, (first: RecipeCard, second: RecipeCard) => number> = {
  quickest: (first, second) => first.minutes - second.minutes,
  slowest: (first, second) => second.minutes - first.minutes,
  fewest: (first, second) => first.ingredient_count - second.ingredient_count,
  most: (first, second) => second.ingredient_count - first.ingredient_count,
  easiest: (first, second) => LEVEL[first.difficulty] - LEVEL[second.difficulty] || first.minutes - second.minutes,
  prepQuick: (first, second) => first.prep_minutes - second.prep_minutes,
  servings: (first, second) => second.servings - first.servings,
  video: (first, second) => Number(second.has_video) - Number(first.has_video),
  az: (first, second) => first.title.localeCompare(second.title),
  za: (first, second) => second.title.localeCompare(first.title),
};

export type PostSort = 'newest' | 'oldest' | 'shortest' | 'longest' | 'topics' | 'az' | 'za';
export const POST_SORTS: PostSort[] = ['newest', 'oldest', 'shortest', 'longest', 'topics', 'az', 'za'];
export const postOrder: Record<PostSort, (first: PostCard, second: PostCard) => number> = {
  newest: (first, second) => second.published_on.localeCompare(first.published_on),
  oldest: (first, second) => first.published_on.localeCompare(second.published_on),
  shortest: (first, second) => first.reading_minutes - second.reading_minutes,
  longest: (first, second) => second.reading_minutes - first.reading_minutes,
  topics: (first, second) => second.tags.length - first.tags.length,
  az: (first, second) => first.title.localeCompare(second.title),
  za: (first, second) => second.title.localeCompare(first.title),
};
