// The food lookup's filters as one object that survives a reload and a visit elsewhere (localStorage, per device): the search words,
// the food groups and kinds picked (several at once), the in-season and low-GI switches. A link with ?q= wins for the search words.
import { useEffect, useState } from 'react';
import { FOOD_SORTS, type FoodSort } from '@/lib/sorts';

export interface FoodFilters {
  q: string;
  categories: string[];
  subcategories: string[];
  inSeason: boolean;
  lowGi: boolean;
  /** the baby's age in months picked in the feeding stages (None = every food) */
  age: number | null;
  /** the order of the results (not a filter: it is not counted and a reset keeps it) */
  sort: FoodSort;
}

const KEY = 'pathya.foodfilters';
export const NO_FILTERS: FoodFilters = { q: '', categories: [], subcategories: [], inSeason: false, lowGi: false, age: null, sort: 'relevance' };

function read(): FoodFilters {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<FoodFilters> | null;
    const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
    return { q: typeof raw?.q === 'string' ? raw.q : '', categories: list(raw?.categories), subcategories: list(raw?.subcategories), inSeason: raw?.inSeason === true, lowGi: raw?.lowGi === true, age: typeof raw?.age === 'number' ? raw.age : null, sort: FOOD_SORTS.includes(raw?.sort as FoodSort) ? (raw?.sort as FoodSort) : 'relevance' };
  } catch {
    return NO_FILTERS;
  }
}

export function useFoodFilters(): [FoodFilters, (patch: Partial<FoodFilters>) => void, () => void] {
  const [filters, setFilters] = useState<FoodFilters>(() => {
    const saved = read();
    const q = new URLSearchParams(location.search).get('q');
    return q === null ? saved : { ...saved, q };
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(filters));
    } catch {
      // private mode: kept for this visit only
    }
  }, [filters]);
  return [filters, (patch) => setFilters((now) => ({ ...now, ...patch })), () => setFilters((now) => ({ ...NO_FILTERS, sort: now.sort }))];
}

/** How many filters are switched on (the search words count as one). */
export const activeFilters = (filters: FoodFilters): number => Number(filters.q.trim() !== '') + filters.categories.length + filters.subcategories.length + Number(filters.inSeason) + Number(filters.lowGi) + Number(filters.age !== null);

export const toggle = (list: string[], slug: string): string[] => (list.includes(slug) ? list.filter((item) => item !== slug) : [...list, slug]);
