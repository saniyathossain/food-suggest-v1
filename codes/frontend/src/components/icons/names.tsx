// The icon for each name the database stores (admin-managed condition and habit icons, food groups, meal slots, verdicts). Loaded
// after first paint (components/icons/index.tsx loadIconNames); unknown names fall back to a neutral glyph.
import {
  Activity01Icon, Apple01Icon, BanIcon, BeanIcon, BedDoubleIcon, BedIcon, BrainIcon, BroccoliIcon, CandyIcon, CarrotIcon, CheckmarkCircle02Icon, CigaretteOffIcon, CircleIcon, Coffee01Icon, CookieIcon, CookingPotIcon, DropletIcon, Dumbbell01Icon, FishFoodIcon, FootprintsIcon, GaugeIcon, HeartIcon, HeartPulseIcon, MilkBottleIcon, Moon02Icon, MoonStarIcon, NotebookPenIcon, PackageIcon, PillIcon, RiceBowl01Icon, SaladIcon, Shield01Icon, ShieldPlusIcon, SmartphoneIcon, SoftDrink01Icon, SparklesIcon, Sun03Icon, SunriseIcon, SunsetIcon, ThumbsUpIcon, WindIcon,
} from '@hugeicons/core-free-icons';
import { icon, type AppIcon } from '@/components/icons/make';
import { Scale } from '@/components/icons';
import { CircleAlert, GlassWater, Ruler, Stethoscope, Zap } from '@/components/icons/page';
import type { Verdict } from '@/lib/types';

/** Condition and habit icons (admin-managed names). */
const REGISTRY: Record<string, AppIcon> = {
  activity: /* @__PURE__ */ icon(Activity01Icon, 'activity'),
  bed: /* @__PURE__ */ icon(BedIcon, 'bed'),
  brain: /* @__PURE__ */ icon(BrainIcon, 'brain'),
  'cigarette-off': /* @__PURE__ */ icon(CigaretteOffIcon, 'cigarette-off'),
  droplet: /* @__PURE__ */ icon(DropletIcon, 'droplet'),
  dumbbell: /* @__PURE__ */ icon(Dumbbell01Icon, 'dumbbell'),
  footprints: /* @__PURE__ */ icon(FootprintsIcon, 'footprints'),
  gauge: /* @__PURE__ */ icon(GaugeIcon, 'gauge'),
  'glass-water': GlassWater,
  heart: /* @__PURE__ */ icon(HeartIcon, 'heart'),
  'heart-pulse': /* @__PURE__ */ icon(HeartPulseIcon, 'heart-pulse'),
  moon: /* @__PURE__ */ icon(Moon02Icon, 'moon'),
  'moon-star': /* @__PURE__ */ icon(MoonStarIcon, 'moon-star'),
  'notebook-pen': /* @__PURE__ */ icon(NotebookPenIcon, 'notebook-pen'),
  pill: /* @__PURE__ */ icon(PillIcon, 'pill'),
  ruler: Ruler,
  salad: /* @__PURE__ */ icon(SaladIcon, 'salad'),
  scale: Scale,
  shield: /* @__PURE__ */ icon(Shield01Icon, 'shield'),
  'shield-plus': /* @__PURE__ */ icon(ShieldPlusIcon, 'shield-plus'),
  smartphone: /* @__PURE__ */ icon(SmartphoneIcon, 'smartphone'),
  sparkles: /* @__PURE__ */ icon(SparklesIcon, 'sparkles'),
  stethoscope: Stethoscope,
  sun: /* @__PURE__ */ icon(Sun03Icon, 'sun'),
  wind: /* @__PURE__ */ icon(WindIcon, 'wind'),
  zap: Zap,
};

/** Every name the admin can choose for a condition icon. */
export const iconNames = Object.keys(REGISTRY);

const Fallback = /* @__PURE__ */ icon(CircleIcon, 'circle');

const CATEGORIES: Record<string, AppIcon> = {
  grains: /* @__PURE__ */ icon(RiceBowl01Icon, 'grains'),
  proteins: /* @__PURE__ */ icon(FishFoodIcon, 'proteins'),
  lentils: /* @__PURE__ */ icon(BeanIcon, 'lentils'),
  vegetables: /* @__PURE__ */ icon(BroccoliIcon, 'vegetables'),
  fruits: /* @__PURE__ */ icon(Apple01Icon, 'fruits'),
  dairy: /* @__PURE__ */ icon(MilkBottleIcon, 'dairy'),
  snacks: /* @__PURE__ */ icon(CookieIcon, 'snacks'),
  sweets: /* @__PURE__ */ icon(CandyIcon, 'sweets'),
  drinks: /* @__PURE__ */ icon(SoftDrink01Icon, 'drinks'),
  kitchen: /* @__PURE__ */ icon(CookingPotIcon, 'kitchen'),
  processed: /* @__PURE__ */ icon(PackageIcon, 'processed'),
};
const CategoryFallback = /* @__PURE__ */ icon(CarrotIcon, 'category');
const MealFallback = /* @__PURE__ */ icon(Sun03Icon, 'meal');

const MEALS: Record<string, AppIcon> = {
  breakfast: /* @__PURE__ */ icon(SunriseIcon, 'breakfast'),
  'mid-morning': /* @__PURE__ */ icon(Coffee01Icon, 'mid-morning'),
  lunch: /* @__PURE__ */ icon(Sun03Icon, 'lunch'),
  evening: /* @__PURE__ */ icon(SunsetIcon, 'evening'),
  dinner: /* @__PURE__ */ icon(Moon02Icon, 'dinner'),
  bedtime: /* @__PURE__ */ icon(BedDoubleIcon, 'bedtime'),
};

const VERDICTS: Record<Verdict, AppIcon> = {
  avoid: /* @__PURE__ */ icon(BanIcon, 'avoid'),
  limit: CircleAlert,
  ok: /* @__PURE__ */ icon(CheckmarkCircle02Icon, 'ok'),
  recommended: /* @__PURE__ */ icon(ThumbsUpIcon, 'recommended'),
};


export const conditionIcon = (name: string): AppIcon => REGISTRY[name] ?? Fallback;
export const categoryIcon = (slug: string): AppIcon => CATEGORIES[slug] ?? CategoryFallback;
export const mealIcon = (slug: string): AppIcon => MEALS[slug] ?? MealFallback;
export const verdictIcon = (verdict: Verdict): AppIcon => VERDICTS[verdict];
