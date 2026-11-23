// Which top-level place a path belongs to, so the bar and the dock mark the right one while the reader is deep inside it
// (a food page lights Foods, a recipe lights Recipes). Today is only the front page; places with no link of their own return "".
const SECTIONS: [RegExp, string][] = [
  [/^\/plan(\/|$)/, '/plan'],
  [/^\/planner(\/|$)/, '/planner'],
  [/^\/medicines(\/|$)/, '/medicines'],
  [/^\/(foods|food)(\/|$)/, '/foods'],
  [/^\/(recipes|recipe)(\/|$)/, '/recipes'],
  [/^\/(read)(\/|$)/, '/read'],
  [/^\/tools\/bmi(\/|$)/, '/tools/bmi'],
];

export function sectionOf(path: string): string {
  if (path === '/') return '/';
  return SECTIONS.find(([pattern]) => pattern.test(path))?.[1] ?? '';
}
