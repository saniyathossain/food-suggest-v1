// Pathya's words live in typed dictionaries (src/lang/en.ts, bn.ts: bn is typed as en's shape). Pages read the tree (`t.nav.plan`);
// components ported from Shell Console call `t('kit.dialog.close', …args)` with a dot key, as they do there. Both read the same
// dictionaries: the adapter below is the bridge, typed so a missing key is a compile error.
import { useCallback } from 'react';
import { en, type Dictionary } from '@/lang/en';
import { readPrefs, usePrefs } from '@/lib/prefs';
import type { Lang } from '@/lib/types';

// English ships in the first bundle; Bangla is its own chunk, fetched before the first render when it is the saved language
// (main.tsx) and before the switch when the reader picks it (lib/switching). Until it is here, English stands in.
const dictionaries: Partial<Record<Lang, Dictionary>> = { en };

export function loadLanguage(lang: Lang): Promise<void> {
  if (dictionaries[lang]) return Promise.resolve();
  return import('@/lang/bn').then((module) => {
    dictionaries.bn = module.bn;
  });
}

const dictionary = (lang: Lang): Dictionary => dictionaries[lang] ?? en;
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function digits(value: string, lang: Lang): string {
  return lang === 'bn' ? value.replace(/\d/g, (digit) => BN_DIGITS[Number(digit)] ?? digit) : value;
}

/** "13:30" -> "1:30 pm" / "১:৩০ অপরাহ্ণ", locale-aware digits. */
export function clock(time: string, lang: Lang): string {
  const [hourText, minute = '00'] = time.split(':');
  const hour = Number(hourText);
  const morning = hour < 12;
  const suffix = lang === 'bn' ? (morning ? 'পূর্বাহ্ণ' : 'অপরাহ্ণ') : morning ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return digits(`${twelve}:${minute} ${suffix}`, lang);
}

export function useI18n() {
  const { lang } = usePrefs();
  return { lang, t: dictionary(lang), num: (value: string | number) => digits(String(value), lang) };
}

/** Every dot key of the dictionary that ends in a string ("kit.dialog.close"). */
type Leaves<Tree, Prefix extends string = ''> = {
  [Key in keyof Tree & string]: Tree[Key] extends string ? `${Prefix}${Key}` : Leaves<Tree[Key], `${Prefix}${Key}.`>;
}[keyof Tree & string];
export type MessageKey = Leaves<Dictionary>;

type Branch = { [key: string]: string | Branch };

function lookup(tree: Branch, key: string): string {
  let node: string | Branch | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return key;
    node = node[part];
  }
  return typeof node === 'string' ? node : key;
}

/** A value in a message: numbers take the language's digits, missing ones are left out. */
function show(value: unknown, lang: Lang): string {
  if (value === undefined || value === null) return '';
  return digits(String(value), lang);
}

/** The message for a dot key in a language; arguments fill {0}, {1}… in order. */
export function message(lang: Lang, key: MessageKey, ...args: unknown[]): string {
  return lookup(dictionary(lang) as unknown as Branch, key).replace(/\{(\d+)\}/g, (_, index: string) => show(args[Number(index)], lang));
}

/** Shell Console's `t(key, …args)`, in the language chosen now (for code outside React or in a component that re-renders anyway). */
export function t(key: MessageKey, ...args: unknown[]): string {
  return message(readPrefs().lang, key, ...args);
}

/** `t` as a hook: the component re-renders when the language changes. */
export function useT(): (key: MessageKey, ...args: unknown[]) => string {
  const { lang } = usePrefs();
  return useCallback((key: MessageKey, ...args: unknown[]) => message(lang, key, ...args), [lang]);
}

/** "12s", "1m 5s", "2h 3m": a duration in the language's words and digits. */
export function duration(totalSeconds: number, lang: Lang): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  if (whole < 60) return message(lang, 'kit.time.s', whole);
  if (whole < 3600) return message(lang, 'kit.time.ms', Math.floor(whole / 60), whole % 60);
  return message(lang, 'kit.time.hm', Math.floor(whole / 3600), Math.floor((whole % 3600) / 60));
}
