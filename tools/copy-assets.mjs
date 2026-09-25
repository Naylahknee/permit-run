// Copies the design kit's SVG assets into app/assets, stripping the
// embedded C2PA <metadata> block (~7.5 KB per file) so the PWA cache stays small.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../project/assets/', import.meta.url).pathname;
const DST = new URL('../app/assets/', import.meta.url).pathname;

let count = 0, before = 0, after = 0;
for (const dir of readdirSync(SRC)) {
  const src = join(SRC, dir);
  if (!statSync(src).isDirectory()) continue;
  mkdirSync(join(DST, dir), { recursive: true });
  for (const f of readdirSync(src)) {
    if (!f.endsWith('.svg')) continue;
    const raw = readFileSync(join(src, f), 'utf8');
    const out = raw.replace(/<metadata>[\s\S]*?<\/metadata>/g, '').replace(/\s+xmlns:c2pa="[^"]*"/, '');
    writeFileSync(join(DST, dir, f), out);
    count++; before += raw.length; after += out.length;
  }
}
console.log(`copied ${count} svgs: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);
