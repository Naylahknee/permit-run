// @ts-nocheck
/**
 * The manifest's own file is a specimen surface.
 *
 * The settings file quotes the very patterns it defines (destructivePatterns,
 * forbiddenTerms), so content-scanning it finds its own definitions:
 * installing SLD once BLOCKed on its own settings file because the generated
 * `destructivePatterns: ['DROP TABLE', ...]` matched the destructive-SQL rule.
 * addSpecimenSurface() records the manifest's own path so the content layers
 * skip it; the CLI calls it for whichever manifest file it loaded.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { addSpecimenSurface, isSpecimenSurface } from '../engine/match.js'
import { analyzeData } from '../layers/layer-5-data.js'

/** Shaped like the settings file installer/first-scan.mjs generates. */
const settingsLikeManifest = () => ({
  version: 1,
  application: { name: 'test-app', description: '' },
  data: {
    protectedTables: [],
    destructivePatterns: ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE'],
  },
  protection: {
    paths: ['.sld/', '.github/workflows/sld-check.yml'],
    sourcePaths: ['.sld/vendor/'],
  },
  policies: { destructiveChange: 'BLOCK' },
})

const SETTINGS_TEXT = `export default {
  data: {
    destructivePatterns: ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE'],
  },
};`

test('addSpecimenSurface records the manifest path without disturbing existing entries', () => {
  const m = settingsLikeManifest()
  addSpecimenSurface(m, '.sld/settings.mjs')
  assert.deepEqual(m.protection.sourcePaths, ['.sld/vendor/', '.sld/settings.mjs'])
  assert.ok(isSpecimenSurface('.sld/settings.mjs', m))
  assert.ok(isSpecimenSurface('.sld/vendor/src/core/layers/layer-5-data.js', m))
  assert.ok(!isSpecimenSurface('src/app.js', m))
})

test('addSpecimenSurface is idempotent', () => {
  const m = settingsLikeManifest()
  addSpecimenSurface(m, '.sld/settings.mjs')
  addSpecimenSurface(m, '.sld/settings.mjs')
  assert.deepEqual(m.protection.sourcePaths, ['.sld/vendor/', '.sld/settings.mjs'])
})

test('addSpecimenSurface respects the older governance: key instead of shadowing it', () => {
  const m = { governance: { sourcePaths: ['vendor/core/'] } }
  addSpecimenSurface(m, 'sld.manifest.js')
  assert.deepEqual(m.governance.sourcePaths, ['vendor/core/', 'sld.manifest.js'])
  assert.equal(m.protection, undefined)
  assert.ok(isSpecimenSurface('sld.manifest.js', m))
  assert.ok(isSpecimenSurface('vendor/core/engine.js', m))
})

test('addSpecimenSurface creates a protection section when neither key exists', () => {
  const m = {}
  addSpecimenSurface(m, '.sld/settings.mjs')
  assert.deepEqual(m.protection.sourcePaths, ['.sld/settings.mjs'])
})

test('the data layer no longer flags the settings file quoting destructive patterns', () => {
  const m = settingsLikeManifest()
  addSpecimenSurface(m, '.sld/settings.mjs')
  const changeSet = {
    label: 'test',
    changes: [{ path: '.sld/settings.mjs', changeType: 'add', addedText: SETTINGS_TEXT }],
  }
  assert.deepEqual(analyzeData(changeSet, m), [])
})

test('the data layer still flags real destructive SQL anywhere else', () => {
  const m = settingsLikeManifest()
  addSpecimenSurface(m, '.sld/settings.mjs')
  const changeSet = {
    label: 'test',
    changes: [{ path: 'db/migrations/003.sql', changeType: 'add', addedText: 'DROP TABLE users;' }],
  }
  const findings = analyzeData(changeSet, m)
  assert.equal(findings.length, 1)
  assert.equal(findings[0].class, 'destructiveChange')
})
