// Fails the build when a source file uses what the house rules forbid: the browser's own dialogs (window.confirm / alert / prompt), raw
// HTML injection (dangerouslySetInnerHTML, innerHTML, outerHTML, insertAdjacentHTML, document.write) or eval. Run by `npm run build`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RULES = [
  [/(^|[^\w.$])(window\.)?(confirm|prompt)\(/, 'native dialog: use confirmDialog() from lib/confirm'],
  [/window\.alert\(|(^|[\s;{(])alert\(/, 'native alert: use notice() from lib/confirm or toast()'],
  [/dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\(/, 'raw HTML injection (XSS): render text, never markup'],
  [/(^|[^\w.])eval\(|new Function\(/, 'eval is forbidden'],
];
const SKIP = [/[\\/]components[\\/]islandcn[\\/]/, /[\\/]components[\\/]island[\\/]/, /[\\/]lib[\\/]island[\\/]/, /[\\/]lib[\\/]confirm\.ts$/, /[\\/]main\.tsx$/];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name) && !/[\\/]generated[\\/]/.test(path)) out.push(path);
  }
  return out;
}

let bad = 0;
for (const file of walk('src')) {
  if (SKIP.some((pattern) => pattern.test(file))) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const [pattern, why] of RULES) {
      if (pattern.test(line)) {
        console.error(`${file}:${index + 1}: ${why}\n    ${line.trim()}`);
        bad += 1;
      }
    }
  });
}
if (bad > 0) {
  console.error(`\n${bad} forbidden call${bad === 1 ? '' : 's'} found.`);
  process.exit(1);
}
