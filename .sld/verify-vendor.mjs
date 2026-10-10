#!/usr/bin/env node
/**
 * SLD engine drift check (consumer copy).
 *
 * Installed by the SLD installer at .sld/verify-vendor.mjs. Verifies that
 * .sld/vendor/ is still a byte-identical copy of the canonical SLD repo at
 * the commit pinned in .sld/vendor/.core-version. Any local edit to the
 * vendored engine fails loudly: fixes belong in the canonical SLD repo and
 * get re-installed, never patched in place.
 *
 *   node .sld/verify-vendor.mjs              verify only (CI)
 *   node .sld/verify-vendor.mjs --regenerate rewrite .core-hashes.json
 *                                             from the current tree (install time)
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = join(ROOT, '.sld', 'vendor')
const HASHES_PATH = join(VENDOR, '.core-hashes.json')
const SKIP = new Set(['.core-hashes.json', '.core-version', 'VENDOR.md'])

function* walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else yield p
  }
}

function sha256File(p) {
  return 'sha256:' + createHash('sha256').update(readFileSync(p)).digest('hex')
}

function currentHashes() {
  const out = {}
  for (const p of walk(VENDOR)) {
    const rel = relative(VENDOR, p)
    if (SKIP.has(rel)) continue
    out[rel] = sha256File(p)
  }
  return out
}

const regenerate = process.argv.includes('--regenerate')

if (regenerate) {
  const recorded = JSON.parse(readFileSync(HASHES_PATH, 'utf8'))
  recorded.files = currentHashes()
  writeFileSync(HASHES_PATH, JSON.stringify(recorded, null, 2) + '\n')
  console.log(`Regenerated ${HASHES_PATH}: ${Object.keys(recorded.files).length} files.`)
  process.exit(0)
}

const recorded = JSON.parse(readFileSync(HASHES_PATH, 'utf8'))
const current = currentHashes()
let failures = 0

for (const [rel, hash] of Object.entries(recorded.files)) {
  if (!(rel in current)) {
    console.error(`MISSING engine file: ${rel}`)
    failures++
  } else if (current[rel] !== hash) {
    console.error(`CHANGED engine file: ${rel} (does not match the installed version)`)
    failures++
  }
}
for (const rel of Object.keys(current)) {
  if (!(rel in recorded.files)) {
    console.error(`UNEXPECTED file in engine folder: ${rel}`)
    failures++
  }
}

if (failures > 0) {
  console.error(
    `\nSLD engine check FAILED (${failures} problem${failures === 1 ? '' : 's'}). ` +
      'The files in .sld/vendor/ must stay exactly as installed ' +
      `at ${recorded.core_commit}. Re-run the installer to repair them; ` +
      'never edit them by hand.',
  )
  process.exit(1)
}
console.log(
  `SLD engine check passed: ${Object.keys(current).length} files match ` +
    `the installed version (${recorded.core_commit.slice(0, 7)}).`,
)
