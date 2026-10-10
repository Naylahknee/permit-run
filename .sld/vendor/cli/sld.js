#!/usr/bin/env node
// @ts-nocheck
/**
 * Seven Layer Dip (SLD) command-line interface.
 *
 *   node cli/sld.js <command> [options]
 *
 * The manifest (your project's SLD configuration) is resolved from
 * --manifest <path>, the SLD_MANIFEST env var, or ./sld.manifest.js.
 *
 * Commands:
 *   init                 create .sld/ and write the first baseline
 *   baseline             (re)write .sld/baseline.json from the working tree
 *   scan                 print a summary of the current baseline scan
 *   changes [ref]        show files changed vs <ref> (default origin/main, else HEAD)
 *   analyze [ref]        evaluate the change vs <ref> and print findings (no exit code)
 *   check [ref]          analyze + encode review/blocking decisions as exit status (CI gate)
 *   impact <path...>     print the blast radius of changing the given files
 *   drift                compare the working tree to the stored baseline
 *   audit [n]            print the last n audit entries (default 20)
 *   explain <class>      explain a finding class and its policy
 *
 * Flags:
 *   --human              the change comes from a person, not an AI agent working
 *                        under a task contract. Skips the permission check and
 *                        checks the change itself. Use this for human pull requests.
 *   --report-md <file>   with analyze/check: also write the human-facing
 *                        inspector report as Markdown (for pull request comments).
 *   --report-html <file> with analyze/check: also write the inspector report as
 *                        a standalone HTML file anyone can open in a browser.
 *   --report-ref-label <text>
 *                        with analyze/check: plain-words label for what the
 *                        change is compared against in the report
 *                        (default: the ref itself). Example: "main".
 *
 * The CLI is the Node half of SLD; it uses git/fs. The pure evaluation core it
 * calls is identical to the one the Cloudflare-Workers API route uses.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs'
import { join, dirname, isAbsolute, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  evaluateChangeSet,
  computeImpact,
  buildAuditEntry,
  createTaskContract,
  validateTaskContract,
  verifyAgainstContract,
} from '../src/core/index.js'
import {
  buildBaseline,
  workingChangeSet,
  diffToChangeSet,
  detectDrift,
} from '../src/core/node/scan.mjs'
import { addSpecimenSurface } from '../src/core/engine/match.js'

const ROOT = process.cwd()
const SLD_DIR = join(ROOT, '.sld')
const BASELINE_PATH = join(SLD_DIR, 'baseline.json')
const AUDIT_PATH = join(SLD_DIR, 'audit.jsonl')
const CONTRACT_PATH = join(SLD_DIR, 'task-contract.json')

function arg(name, fallback = '') {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

function manifestPath() {
  const flag = arg('--manifest', '')
  if (flag) return isAbsolute(flag) ? flag : join(ROOT, flag)
  if (process.env.SLD_MANIFEST) return join(ROOT, process.env.SLD_MANIFEST)
  return join(ROOT, 'sld.manifest.js')
}

let _manifest = null
async function loadManifest() {
  if (_manifest) return _manifest
  const mp = manifestPath()
  if (!existsSync(mp)) {
    console.error(`SLD manifest not found: ${mp}`)
    console.error(`Copy src/core/manifest/example.manifest.js to ./sld.manifest.js and fill it in for your project.`)
    process.exit(2)
  }
  const mod = await import(pathToFileURL(mp).href)
  _manifest = mod.default || mod.manifest || mod
  // The settings file is part of the rulebook: it quotes the very patterns
  // it defines (destructivePatterns, forbiddenTerms), so content-scanning it
  // would flag its own definitions. Always treat it as a specimen surface.
  addSpecimenSurface(_manifest, relative(ROOT, mp))
  return _manifest
}

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
}
const DECISION_COLOR = {
  ALLOW: C.green,
  ALLOW_WITH_WARNING: C.yellow,
  REVIEW_REQUIRED: C.blue,
  INSUFFICIENT_EVIDENCE: C.yellow,
  BLOCK: C.red,
}

function now() {
  return new Date().toISOString()
}
function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  } catch {
    return null
  }
}
function saveBaseline(baseline) {
  mkdirSync(SLD_DIR, { recursive: true })
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`)
}
/**
 * The active TaskContract. Without one, every proposed change is unauthorized —
 * that is the point: no contract is not permission.
 */
function loadContract() {
  if (!existsSync(CONTRACT_PATH)) return null
  try {
    return createTaskContract(JSON.parse(readFileSync(CONTRACT_PATH, 'utf8')))
  } catch {
    return null
  }
}

function printLedger(ledger) {
  if (!ledger) return
  console.log(`${C.bold}Change ledger${C.reset}${ledger.taskId ? ` — ${ledger.taskId}` : ''}`)
  if (ledger.authorized.length) {
    console.log(`${C.green}  AUTHORIZED${C.reset}`)
    for (const a of ledger.authorized) {
      console.log(`    ${a.path}`)
      console.log(`${C.dim}      entity: ${a.entity} · state: ${a.states.join(', ')} · behavior: ${a.behaviors.join(', ')} · UI region: ${a.uiRegions.join(', ')} · action: ${a.action} · source: ${a.source}${C.reset}`)
    }
  }
  if (ledger.unauthorized.length) {
    console.log(`${C.red}  UNAUTHORIZED${C.reset}`)
    for (const u of ledger.unauthorized) {
      console.log(`    ${u.path}`)
      console.log(`${C.dim}      reason: ${u.reason}${C.reset}`)
    }
  }
  for (const o of ledger.observations) {
    console.log(`${C.yellow}  OUT-OF-SCOPE OBSERVATION${C.reset} ${o.observation}`)
  }
  console.log('')
}

function pickRef() {
  // First non-flag argument after the command; prefer origin/main if it resolves, else HEAD.
  // Skips the values of flags that take a path, so `check --report-md out.md main`
  // still compares against main instead of mistaking the output path for the ref.
  const args = process.argv.slice(3)
  const VALUE_FLAGS = new Set(['--manifest', '--report-md', '--report-html', '--report-ref-label'])
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (VALUE_FLAGS.has(a)) {
      i++
      continue
    }
    if (!a.startsWith('-')) return a
  }
  return 'origin/main'
}
function printFinding(f) {
  const col = DECISION_COLOR[f.decision] || C.reset
  const loc = f.path ? ` ${C.dim}${f.path}${C.reset}` : ''
  console.log(`  ${col}${f.decision.padEnd(6)}${C.reset} ${C.cyan}[${f.layer}/${f.class}]${C.reset}${loc}`)
  console.log(`         ${f.message}`)
}
function printResult(result) {
  const col = DECISION_COLOR[result.decision] || C.reset
  console.log('')
  console.log(`${C.bold}SLD decision:${C.reset} ${col}${C.bold}${result.decision}${C.reset}` +
    (result.failedClosed ? ` ${C.red}(failed closed)${C.reset}` : ''))
  const s = result.summary
  console.log(`${C.dim}  BLOCK ${s.BLOCK}  INSUFFICIENT ${s.INSUFFICIENT_EVIDENCE}  REVIEW ${s.REVIEW_REQUIRED}  WARNING ${s.ALLOW_WITH_WARNING}  ALLOW ${s.ALLOW}${C.reset}`)
  if (result.findings.length) {
    console.log('')
    for (const f of result.findings) printFinding(f)
  } else {
    console.log(`${C.green}  No findings.${C.reset}`)
  }
  console.log('')
}
function recordAudit(changeSet, result) {
  try {
    mkdirSync(SLD_DIR, { recursive: true })
    const entry = buildAuditEntry(changeSet, result, now())
    appendFileSync(AUDIT_PATH, `${JSON.stringify(entry)}\n`)
  } catch (err) {
    console.error(`${C.yellow}Warning: could not write audit entry.${C.reset}`)
  }
}

async function cmdInit(manifest) {
  mkdirSync(SLD_DIR, { recursive: true })
  const baseline = buildBaseline(ROOT, { name: manifest.application.name }, manifest.version, now())
  saveBaseline(baseline)
  console.log(`${C.green}Initialized SLD.${C.reset}`)
  console.log(`  baseline: ${BASELINE_PATH}`)
  console.log(`  files:    ${Object.keys(baseline.files).length}`)
  console.log(`  appRoots: ${baseline.appRoots.join(', ') || '(none)'}`)
  if (baseline.appRoots.length > 1) {
    console.log(`${C.red}  WARNING: multiple application roots detected — duplicate/nested project.${C.reset}`)
  }
}

async function cmdBaseline(manifest) {
  const baseline = buildBaseline(ROOT, { name: manifest.application.name }, manifest.version, now())
  saveBaseline(baseline)
  console.log(`${C.green}Baseline written:${C.reset} ${Object.keys(baseline.files).length} files, ${Object.keys(baseline.edges).length} with edges.`)
}

async function cmdScan(manifest) {
  const baseline = loadBaseline() || buildBaseline(ROOT, { name: manifest.application.name }, manifest.version, now())
  console.log(`${C.bold}SLD scan${C.reset} — ${manifest.application.name}`)
  console.log(`  files:      ${Object.keys(baseline.files).length}`)
  console.log(`  edges:      ${Object.keys(baseline.edges).length}`)
  console.log(`  env names:  ${baseline.envNames.length ? baseline.envNames.join(', ') : '(none)'}`)
  console.log(`  app roots:  ${baseline.appRoots.join(', ') || '(none)'}`)
}

function cmdChanges() {
  const ref = pickRef()
  const cs = diffToChangeSet(ROOT, ref)
  if (!cs.changes.length) {
    console.log(`${C.dim}No changes vs ${ref}.${C.reset}`)
    return
  }
  console.log(`${C.bold}Changes vs ${ref}:${C.reset}`)
  for (const c of cs.changes) {
    console.log(`  ${c.changeType.padEnd(7)} ${c.path}${c.oldPath ? ` ${C.dim}(from ${c.oldPath})${C.reset}` : ''}`)
  }
}

async function cmdAnalyze(manifest, exitOnSeverity) {
  const ref = pickRef()
  const human = process.argv.includes('--human')
  const cs = diffToChangeSet(ROOT, ref)
  const baseline = loadBaseline()
  const contract = loadContract()
  const at = now()
  const result = evaluateChangeSet(cs, manifest, baseline, at, contract, { skipScopeGate: human })
  printResult(result)
  printLedger(result.ledger)
  const reportMd = arg('--report-md', '')
  const reportHtml = arg('--report-html', '')
  const reportRefLabel = arg('--report-ref-label', ref)
  if (reportMd || reportHtml) {
    const {
      buildInspectorReport,
      renderInspectorMarkdown,
      renderInspectorHtml,
    } = await import('../src/core/report/inspector.mjs')
    const report = buildInspectorReport({
      changes: cs.changes.map((c) => ({
        path: c.path,
        changeType: c.changeType,
        oldPath: c.oldPath,
        addedLineCount: c.addedLineCount,
        removedLineCount: c.removedLineCount,
        baselineLineCount: c.baselineLineCount,
      })),
      result,
      projectName: (manifest.application && manifest.application.name) || 'your project',
      refLabel: reportRefLabel,
      generatedAt: at,
    })
    if (reportMd) writeFileSync(reportMd, `${renderInspectorMarkdown(report)}\n`)
    if (reportHtml) writeFileSync(reportHtml, renderInspectorHtml(report))
    console.log(`${C.dim}Inspector report written:${C.reset}${reportMd ? ` ${reportMd}` : ''}${reportHtml ? ` ${reportHtml}` : ''}`)
  }
  recordAudit(cs, result)
  if (exitOnSeverity && ['REVIEW_REQUIRED', 'INSUFFICIENT_EVIDENCE', 'BLOCK'].includes(result.decision)) {
    process.exitCode = ['BLOCK', 'INSUFFICIENT_EVIDENCE'].includes(result.decision) ? 2 : 1
  }
}

async function cmdImpact(manifest) {
  const paths = process.argv.slice(3)
  if (!paths.length) {
    console.error('Usage: sld impact <path> [path...]')
    process.exitCode = 1
    return
  }
  const baseline = loadBaseline()
  if (!baseline) {
    console.error(`${C.red}No baseline. Run "npm run sld:init" first.${C.reset}`)
    process.exitCode = 1
    return
  }
  const { files, features } = computeImpact(paths, baseline, manifest)
  console.log(`${C.bold}Impact of changing:${C.reset} ${paths.join(', ')}`)
  console.log(`${C.cyan}  ${files.length} file(s) in blast radius:${C.reset}`)
  for (const f of files) console.log(`    ${f}`)
  console.log(`${C.cyan}  protected features touched:${C.reset} ${features.length ? features.join(', ') : '(none)'}`)
}

function cmdDrift() {
  const baseline = loadBaseline()
  if (!baseline) {
    console.error(`${C.red}No baseline. Run "npm run sld:init" first.${C.reset}`)
    process.exitCode = 1
    return
  }
  const drift = detectDrift(baseline, ROOT, now())
  console.log(`${C.bold}Drift vs baseline (generated ${baseline.generatedAt}):${C.reset}`)
  console.log(`  ${C.green}added:${C.reset}   ${drift.added.length}`)
  console.log(`  ${C.yellow}changed:${C.reset} ${drift.changed.length}`)
  console.log(`  ${C.red}removed:${C.reset} ${drift.removed.length}`)
  if (drift.appRootDrift) console.log(`${C.red}  App-root drift detected — possible duplicate/nested project.${C.reset}`)
}

function cmdAudit() {
  if (!existsSync(AUDIT_PATH)) {
    console.log(`${C.dim}No audit entries yet.${C.reset}`)
    return
  }
  const n = Number(process.argv[3]) || 20
  const lines = readFileSync(AUDIT_PATH, 'utf8').trim().split('\n').filter(Boolean)
  for (const line of lines.slice(-n)) {
    try {
      const e = JSON.parse(line)
      const col = DECISION_COLOR[e.decision] || C.reset
      console.log(`${C.dim}${e.at}${C.reset}  ${col}${e.decision.padEnd(22)}${C.reset}  ${e.label}  ${C.dim}(B${e.counts.BLOCK} I${e.counts.INSUFFICIENT_EVIDENCE} R${e.counts.REVIEW_REQUIRED} W${e.counts.ALLOW_WITH_WARNING} A${e.counts.ALLOW})${C.reset}`)
    } catch {
      // skip malformed line
    }
  }
}

function cmdContract() {
  const contract = loadContract()
  if (!contract) {
    console.log(`${C.red}No TaskContract at ${CONTRACT_PATH}.${C.reset}`)
    console.log(`${C.dim}Without one every change is unauthorized. Write the contract the user's request authorizes.${C.reset}`)
    process.exitCode = 1
    return
  }
  const v = validateTaskContract(contract)
  console.log(`${C.bold}TaskContract${C.reset} ${contract.taskId}`)
  console.log(`  instruction : ${contract.instruction}`)
  console.log(`  entities    : ${contract.allowedEntities.join(', ') || '(none)'}`)
  console.log(`  files       : ${contract.allowedFiles.join(', ') || '(none)'}`)
  console.log(`  directories : ${contract.allowedDirectories.join(', ') || '(none)'}`)
  console.log(`  actions     : ${contract.allowedActions.join(', ') || '(none)'}`)
  console.log(`  states      : ${contract.allowedStates.join(', ') || '(any within scope)'}`)
  console.log(`  grants      : ${contract.grants.join(', ') || '(none)'}`)
  console.log(`  valid       : ${v.ok ? `${C.green}yes${C.reset}` : `${C.red}no — ${v.reason}${C.reset}`}`)
  if (!v.ok) process.exitCode = 1
}

/** Post-change verification: compare the real diff to the contract. */
async function cmdVerify(manifest) {
  const ref = pickRef()
  const contract = loadContract()
  const cs = diffToChangeSet(ROOT, ref)
  const v = verifyAgainstContract(cs, manifest, contract)

  console.log(`${C.bold}Post-change verification${C.reset} vs ${ref}`)
  printLedger(v.ledger)
  for (const f of v.findings) printFinding(f)
  const verdict = v.pass ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`
  console.log(`  unauthorized changes: ${v.unauthorizedCount}`)
  console.log(`  verification: ${verdict}`)
  if (!v.pass) process.exitCode = 2
}

async function cmdExplain(manifest) {
  const cls = process.argv[3]
  const policies = manifest.policies
  if (!cls || !(cls in policies)) {
    console.log(`${C.bold}Finding classes and their policies:${C.reset}`)
    for (const [k, v] of Object.entries(policies)) {
      const col = DECISION_COLOR[v] || C.reset
      console.log(`  ${k.padEnd(24)} → ${col}${v}${C.reset}`)
    }
    return
  }
  const col = DECISION_COLOR[policies[cls]] || C.reset
  console.log(`${C.bold}${cls}${C.reset} → ${col}${policies[cls]}${C.reset}`)
}

const MANIFEST_COMMANDS = new Set(['init', 'baseline', 'scan', 'analyze', 'check', 'impact', 'verify', 'explain'])

async function main() {
  const cmd = process.argv[2]
  const manifest = MANIFEST_COMMANDS.has(cmd) ? await loadManifest() : null
  switch (cmd) {
    case 'init': return cmdInit(manifest)
    case 'baseline': return cmdBaseline(manifest)
    case 'scan': return cmdScan(manifest)
    case 'changes': return cmdChanges()
    case 'diff': return cmdChanges() // old name, kept working
    case 'analyze': return cmdAnalyze(manifest, false)
    case 'check': return cmdAnalyze(manifest, true)
    case 'impact': return cmdImpact(manifest)
    case 'drift': return cmdDrift()
    case 'audit': return cmdAudit()
    case 'explain': return cmdExplain(manifest)
    case 'contract': return cmdContract()
    case 'verify': return cmdVerify(manifest)
    default:
      console.log(`${C.bold}SLD — Seven Layer Dip check${C.reset}`)
      console.log('Usage: node cli/sld.js <init|baseline|scan|changes|contract|analyze|check|verify|impact|drift|audit|explain> [--manifest <path>] [--human] [--report-md <file>] [--report-html <file>] [--report-ref-label <text>]')
      if (cmd) process.exitCode = 1
  }
}

main()
