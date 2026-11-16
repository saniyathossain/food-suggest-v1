// BMI with the Asian cut-offs (WHO expert consultation, Lancet 2004: South Asians carry more risk at a lower BMI) and the WHO
// international bands for reference. Pure arithmetic; nothing is stored or sent.
export type Band = 'under' | 'healthy' | 'over' | 'obese';

/** Asian cut-offs: < 18.5, 18.5–22.9, 23–27.4, ≥ 27.5. */
export const BANDS: { band: Band; from: number; to: number; tone: string }[] = [
  { band: 'under', from: 12, to: 18.5, tone: 'var(--tone-sky)' },
  { band: 'healthy', from: 18.5, to: 23, tone: 'var(--tone-leaf)' },
  { band: 'over', from: 23, to: 27.5, tone: 'var(--saffron)' },
  { band: 'obese', from: 27.5, to: 40, tone: 'var(--coral)' },
];
export const SCALE_MIN = 12;
export const SCALE_MAX = 40;

export const bandOf = (bmi: number): Band => BANDS.find((entry) => bmi < entry.to)?.band ?? 'obese';

export function worldBand(bmi: number): Band {
  if (bmi < 18.5) return 'under';
  if (bmi < 25) return 'healthy';
  return bmi < 30 ? 'over' : 'obese';
}

export const round1 = (value: number) => Math.round(value * 10) / 10;

export const bmiOf = (heightCm: number, weightKg: number) => round1(weightKg / (heightCm / 100) ** 2);
