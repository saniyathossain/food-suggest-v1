// Tier features: which are counts (-1 = unlimited) and which are switches (1 / 0). Mirrors `FeatureKey::is_switch` in the API.
import type { FeatureKey } from '@/lib/types';

const COUNTS: readonly FeatureKey[] = ['profiles', 'conditions', 'suggestions', 'meal_alternatives', 'spotlight'];

export const isSwitch = (feature: FeatureKey): boolean => !COUNTS.includes(feature);
