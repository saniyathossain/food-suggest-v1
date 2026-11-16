// A food's season as words: months 1–12 grouped into runs ("Nov–Feb", "Jun–Aug, Oct"), a run may wrap the year's end. Month names
// come from the dictionary (season.months), so Bangla reads in Bangla.
export function seasonText(months: number[], names: string): string {
  const labels = names.split('|');
  const name = (month: number) => labels[month - 1] ?? String(month);
  const set = new Set(months.filter((month) => month >= 1 && month <= 12));
  if (set.size === 0) return '';
  const ordered = [...set].sort((left, right) => left - right);
  const runs: number[][] = [];
  for (const month of ordered) {
    const last = runs.at(-1);
    if (last && last.at(-1) === month - 1) last.push(month);
    else runs.push([month]);
  }
  const first = runs[0];
  const final = runs.at(-1);
  const wraps = runs.length > 1 && first?.[0] === 1 && final?.at(-1) === 12;
  if (wraps && first && final) {
    runs.pop();
    runs[0] = [...final, ...first];
  }
  return runs.map((run) => (run.length === 1 ? name(run[0] ?? 1) : `${name(run[0] ?? 1)}–${name(run.at(-1) ?? 1)}`)).join(', ');
}

/** True when all twelve months are listed. */
export const yearRound = (months: number[]): boolean => new Set(months).size >= 12;
