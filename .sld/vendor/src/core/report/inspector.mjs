// @ts-check
/**
 * The SLD inspector report: the human-facing view of a check.
 *
 * This module turns a check result into the building-inspector view a
 * non-technical buyer reads: green means the change was checked and is
 * clean, yellow means a person should look before it goes live, red means
 * the change was stopped and nothing from it should go live.
 *
 * Pure and dependency-free (no fs, no git, no network, no clock): it takes
 * plain data in and returns strings out, so the exact same code runs in the
 * Node CLI and inside a Cloudflare-Workers route.
 *
 * Buyer-language rules (hard):
 * - Never use the words "governance", "diff", or "changeset". Say "change",
 *   "check", "needs your eyes", "stopped".
 * - Never use em-dashes in buyer-facing copy.
 * - Short sentences, plain words.
 */

export const INSPECTOR_LEVELS = ['green', 'yellow', 'red']

/**
 * Map an SLD decision to an inspector level.
 * Unknown decisions fail safe to red: never show green for a decision
 * the renderer does not understand.
 * @param {string} decision
 * @returns {'green' | 'yellow' | 'red'}
 */
export function inspectorLevel(decision) {
  switch (decision) {
    case 'ALLOW':
      return 'green'
    case 'ALLOW_WITH_WARNING':
    case 'REVIEW_REQUIRED':
      return 'yellow'
    default:
      return 'red'
  }
}

const STATUS_COPY = {
  green: {
    word: 'Checked and clean',
    headline: 'This change passed every check.',
    filesTitle: 'What was checked',
  },
  yellow: {
    word: 'Needs your eyes',
    headline: 'This change needs a person to look before it goes live.',
    filesTitle: 'What was checked',
    cardsTitle: 'What to look at',
  },
  red: {
    word: 'Stopped',
    headline:
      'This change was stopped. Nothing from it should go live until the problem is fixed.',
    filesTitle: 'What was checked',
    cardsTitle: 'Why it was stopped',
  },
}

/**
 * @param {{ path: string, changeType: string, oldPath?: string, addedLineCount?: number, removedLineCount?: number }} c
 * @returns {string}
 */
function describeChange(c) {
  const added = c.addedLineCount || 0
  const removed = c.removedLineCount || 0
  switch (c.changeType) {
    case 'add':
      return `${c.path}: new file, ${added} line${added === 1 ? '' : 's'} added.`
    case 'delete':
      return `${c.path}: file removed.`
    case 'rename':
      return c.oldPath
        ? `${c.path}: renamed from ${c.oldPath}.`
        : `${c.path}: renamed.`
    default: {
      const parts = []
      if (added) parts.push(`${added} line${added === 1 ? '' : 's'} added`)
      if (removed) parts.push(`${removed} line${removed === 1 ? '' : 's'} removed`)
      return parts.length
        ? `${c.path}: ${parts.join(', ')}.`
        : `${c.path}: touched, no lines added or removed.`
    }
  }
}

/**
 * @param {{ path: string, removedLineCount?: number, baselineLineCount?: number }} c
 * @returns {string}
 */
function removalScale(c) {
  const removed = c.removedLineCount || 0
  const baseline = c.baselineLineCount || 0
  if (baseline > 0 && removed > 0) {
    const pct = Math.round((removed / baseline) * 100)
    return `${removed} of ${baseline} lines are gone from ${c.path} (${pct}%).`
  }
  if (removed > 0) return `${removed} lines were removed from ${c.path}.`
  return `${c.path} lost content.`
}

/**
 * @param {string} message
 * @param {RegExp} re
 * @returns {string | null}
 */
function capture(message, re) {
  const m = re.exec(message || '')
  return m ? m[1] : null
}

/**
 * Translate one engine finding into plain buyer words.
 * @param {{ layer: string, class: string, decision: string, message?: string, path?: string }} f
 * @param {Map<string, { path: string, removedLineCount?: number, baselineLineCount?: number }>} changesByPath
 * @returns {{ title: string, body: string, action: string }}
 */
function translateFinding(f, changesByPath) {
  const path = f.path || 'this change'
  const change = (f.path && changesByPath.get(f.path)) || { path }
  const msg = f.message || ''

  switch (f.class) {
    case 'contentLoss': {
      if (f.decision === 'INSUFFICIENT_EVIDENCE') {
        return {
          title: 'We could not measure what was removed',
          body: `There is no record of ${path} before this change, so the check cannot tell how much went.`,
          action:
            'Ask your developer to update the project snapshot and run the check again.',
        }
      }
      if (f.decision === 'REVIEW_REQUIRED') {
        return {
          title: 'A large removal needs a second look',
          body: `Removing this much was within the task, but the size alone means a person should confirm it. ${removalScale(change)}`,
          action: `Open ${path} and confirm the removal is what you wanted.`,
        }
      }
      return {
        title: 'Too much was removed from this file',
        body: `We compared ${path} before and after the change. ${removalScale(change)} That is more than the project allows to disappear at once.`,
        action: `Open ${path} and check that every removed part was really meant to go. If it was, approve the removal on purpose and run the check again.`,
      }
    }
    case 'generationArtifactCorruption': {
      const marker = capture(msg, /"([^"]+)"/)
      return {
        title: 'The file may have been swapped for an AI summary',
        body: marker
          ? `While ${path} changed, a placeholder marker ("${marker}") was left behind. That usually means real content was replaced with a short summary.`
          : `While ${path} changed, a placeholder marker was left behind. That usually means real content was replaced with a short summary.`,
        action: `Open ${path} and make sure the real content is still there.`,
      }
    }
    case 'unauthorizedChange':
      return {
        title: 'This change was not approved',
        body: `${path} goes beyond what the task allowed. Only the files and jobs named in the task may change.`,
        action: 'Check what the task covered. Narrow the change, or approve the wider task first.',
      }
    case 'unknownScope':
    case 'invalidContractApproval':
      return {
        title: 'The task was unclear, so the change was stopped',
        body: 'The check could not verify what the task approved, so it stopped the change to be safe.',
        action: 'Write the task down clearly and run the check again.',
      }
    case 'missingRequiredChange':
      return {
        title: 'A required part of the task is missing',
        body: `The task needed a specific change in ${path}, and it did not happen.`,
        action: 'Finish the missing part, or update the task if it is no longer needed.',
      }
    case 'destructiveChange':
      return {
        title: 'This change wipes data',
        body: 'The change contains an operation that destroys stored data. These never pass on their own.',
        action: 'Do not merge this until a person has approved it directly, with a backup in place.',
      }
    case 'duplicateAppRoot':
      return {
        title: 'A second copy of the app appeared',
        body: 'The change looks like a duplicate or nested copy of the project. Only one copy is allowed.',
        action: 'A person needs to decide which copy is the real one. Never delete either copy automatically.',
      }
    case 'architectureViolation':
      return {
        title: 'The change breaks a project rule',
        body: `The change conflicts with one of the project's structural rules (${path}).`,
        action: 'Ask your developer which rule was broken and whether the change should be reshaped.',
      }
    case 'dependencyViolation': {
      const spec = capture(msg, /Forbidden import: [^ ]+ → ([^.]+)\./)
      return {
        title: 'The change adds a connection the project does not allow',
        body: spec
          ? `${path} now connects to ${spec}, which is not on the project's allowed list.`
          : `${path} adds a connection that is not on the project's allowed list.`,
        action:
          "Decide whether this new connection is wanted. If yes, have your developer add it to the project's allowed list.",
      }
    }
    case 'protectedFeatureChange':
    case 'behavioralChange': {
      const feature = capture(msg, /protected feature "([^"]+)"/)
      return feature
        ? {
            title: `The change touches ${feature}, which needs a human look`,
            body: `${feature} is on your protected list. The change may be fine, but a person should confirm it still works the way you expect.`,
            action: `Try ${feature} yourself, or ask someone to test it before merging.`,
          }
        : {
            title: 'The change alters how part of the app behaves',
            body: `The change alters behavior in ${path}. A person should confirm it still works the way you expect.`,
            action: 'Test the affected part yourself, or ask someone to test it before merging.',
          }
    }
    case 'designSystemDrift':
      return {
        title: 'A shared design piece changed',
        body: `${path} is a shared piece used in more than one place.`,
        action: 'Check that it still looks right everywhere it appears.',
      }
    case 'forbiddenTerm': {
      const term = capture(msg, /Retired brand term "([^"]+)"/)
      return {
        title: 'An old brand name came back',
        body: term
          ? `"${term}" is on the retired list and must not appear.`
          : 'A retired brand name appeared and must not be used.',
        action: 'Remove it and run the check again.',
      }
    }
    case 'unknownChange':
      return {
        title: 'The check hit a problem and stopped the change',
        body: 'Something went wrong inside the check, so it stopped the change rather than let it through unchecked.',
        action: 'Run the check again. If it keeps stopping, ask your developer to look at the check itself.',
      }
    default:
      return {
        title: 'Something needs a look',
        body: `The check flagged ${path}.`,
        action: 'Ask your developer what the check flagged and whether it is safe.',
      }
  }
}

/**
 * Build the structured inspector report. Markdown and HTML renderers
 * consume this shape.
 * @param {{
 *   changes?: Array<{ path: string, changeType: string, oldPath?: string, addedLineCount?: number, removedLineCount?: number, baselineLineCount?: number }>,
 *   result: { decision: string, findings?: Array<{ layer: string, class: string, decision: string, message?: string, path?: string }>, failedClosed?: boolean },
 *   projectName?: string,
 *   refLabel?: string,
 *   generatedAt?: string,
 * }} input
 */
export function buildInspectorReport(input) {
  const changes = input.changes || []
  const findings = (input.result && input.result.findings) || []
  const level = inspectorLevel(input.result ? input.result.decision : '')
  const status = STATUS_COPY[level]
  const changesByPath = new Map(changes.map((c) => [c.path, c]))
  return {
    level,
    statusWord: status.word,
    headline: status.headline,
    filesTitle: status.filesTitle,
    cardsTitle: status.cardsTitle || '',
    files: changes.map(describeChange),
    cards: findings.map((f) => translateFinding(f, changesByPath)),
    projectName: input.projectName || 'your project',
    refLabel: input.refLabel || '',
    generatedAt: input.generatedAt || '',
  }
}

/**
 * @param {ReturnType<typeof buildInspectorReport>} report
 * @returns {string}
 */
export function renderInspectorMarkdown(report) {
  const lines = []
  lines.push(`# SLD change report: ${report.projectName}`)
  lines.push('')
  lines.push(`## ${report.statusWord}`)
  lines.push('')
  lines.push(report.headline)
  lines.push('')
  lines.push(`### ${report.filesTitle}`)
  lines.push('')
  if (report.files.length) {
    for (const f of report.files) lines.push(`- ${f}`)
  } else {
    lines.push('- No changes found to check.')
  }
  lines.push('')
  if (report.cards.length) {
    lines.push(`### ${report.cardsTitle}`)
    lines.push('')
    for (const card of report.cards) {
      lines.push(`#### ${card.title}`)
      lines.push('')
      lines.push(card.body)
      lines.push('')
      lines.push(`What to do: ${card.action}`)
      lines.push('')
    }
  }
  lines.push('---')
  lines.push('')
  lines.push(
    'Green means the change was checked and is clean. Yellow means a person should look before it goes live. Red means the change was stopped.',
  )
  lines.push('')
  const when = report.generatedAt ? report.generatedAt.slice(0, 10) : ''
  const against = report.refLabel ? ` against ${report.refLabel}` : ''
  if (when || against) lines.push(`Checked${when ? ` on ${when}` : ''}${against}.`)
  return lines.join('\n')
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Standalone shareable HTML report. One file, no external assets, light
 * theme in the quiet-minimalism house style: generous whitespace, hairline
 * borders instead of shadows, small-caps gray section labels, simple line
 * icons, one black action button, rounded one-idea cards.
 * @param {ReturnType<typeof buildInspectorReport>} report
 * @returns {string}
 */
export function renderInspectorHtml(report) {
  const levelColor =
    report.level === 'green' ? '#15803d' : report.level === 'yellow' ? '#b45309' : '#b91c1c'
  const icon =
    report.level === 'green'
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5.5"/></svg>'
      : report.level === 'yellow'
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
        : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>'

  const fileItems = report.files.length
    ? report.files
        .map((f) => {
          const idx = f.indexOf(': ')
          const path = idx >= 0 ? f.slice(0, idx) : f
          const rest = idx >= 0 ? f.slice(idx + 2) : ''
          return `        <li><code>${escapeHtml(path)}</code>${rest ? `: ${escapeHtml(rest)}` : ''}</li>`
        })
        .join('\n')
    : '        <li>No changes found to check.</li>'

  const cards = report.cards
    .map(
      (card) => `      <div class="card">
        <div class="card-title">${escapeHtml(card.title)}</div>
        <p>${escapeHtml(card.body)}</p>
        <div class="todo"><span class="label">What to do</span><p>${escapeHtml(card.action)}</p></div>
      </div>`,
    )
    .join('\n')

  const when = report.generatedAt ? report.generatedAt.slice(0, 10) : ''
  const against = report.refLabel ? ` against ${escapeHtml(report.refLabel)}` : ''
  const meta = when || against ? `<p class="meta">Checked${when ? ` on ${when}` : ''}${against}.</p>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Change report: ${escapeHtml(report.projectName)}</title>
<style>
  :root {
    --ink: #111111;
    --gray: #6b7280;
    --hairline: #e5e7eb;
    --soft: #f9fafb;
    --accent: ${levelColor};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #ffffff;
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    line-height: 1.65;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 56px 24px 72px; }
  .label {
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-size: 12px;
    font-weight: 600;
    color: var(--gray);
    margin: 40px 0 12px;
  }
  h1 { font-size: 30px; font-weight: 650; letter-spacing: -0.01em; margin: 8px 0 0; }
  .status {
    border: 1px solid var(--hairline);
    border-radius: 16px;
    padding: 24px;
    margin-top: 28px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }
  .icon {
    flex: 0 0 auto;
    width: 44px; height: 44px;
    border-radius: 50%;
    border: 1px solid var(--hairline);
    display: flex; align-items: center; justify-content: center;
    color: var(--accent);
  }
  .pill {
    display: inline-block;
    font-size: 13px; font-weight: 700;
    color: var(--accent);
    margin-bottom: 6px;
  }
  .pill .dot {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent); margin-right: 8px;
  }
  .status p { margin: 0; color: #374151; font-size: 17px; }
  ul.files { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--hairline); }
  ul.files li { padding: 12px 2px; border-bottom: 1px solid var(--hairline); font-size: 15px; }
  ul.files li code, .card code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
    background: var(--soft);
    border: 1px solid var(--hairline);
    border-radius: 6px;
    padding: 1px 6px;
  }
  .card {
    border: 1px solid var(--hairline);
    border-radius: 12px;
    padding: 20px 22px;
    margin-top: 16px;
  }
  .card-title { font-size: 17px; font-weight: 650; margin-bottom: 8px; }
  .card p { margin: 0 0 12px; color: #374151; font-size: 15px; }
  .card p:last-child { margin-bottom: 0; }
  .todo { background: var(--soft); border-radius: 8px; padding: 12px 14px; margin-top: 4px; }
  .todo .label { margin: 0 0 6px; font-size: 11px; }
  .todo p { margin: 0; font-size: 14px; color: var(--ink); }
  .btn {
    display: inline-block;
    background: #111111; color: #ffffff;
    font-weight: 600; font-size: 15px;
    padding: 12px 24px;
    border-radius: 999px;
    text-decoration: none;
    margin-top: 32px;
  }
  footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--hairline); }
  footer p { font-size: 13px; color: var(--gray); margin: 4px 0; }
</style>
</head>
<body>
<div class="wrap">
  <span class="label">Change report</span>
  <h1>${escapeHtml(report.projectName)}</h1>

  <div class="status">
    <div class="icon">${icon}</div>
    <div>
      <span class="pill"><span class="dot"></span>${escapeHtml(report.statusWord)}</span>
      <p>${escapeHtml(report.headline)}</p>
    </div>
  </div>

  <span class="label">${escapeHtml(report.filesTitle)}</span>
  <ul class="files">
${fileItems}
  </ul>

${
  report.cards.length
    ? `  <span class="label">${escapeHtml(report.cardsTitle)}</span>
${cards}

  <span class="label" id="next">What to do next</span>
  <p style="color:#374151;font-size:15px;margin:0 0 4px;">Work through each card above from top to bottom. When every item is handled, run the check again to confirm the change is clean.</p>
  <a class="btn" href="#next">Start at the top</a>
`
    : `  <p style="color:#374151;font-size:15px;">Nothing needed a second look. This change is ready.</p>
`
}
  <footer>
    ${meta}
    <p>Checked by SLD. Green means the change was checked and is clean. Yellow means a person should look before it goes live. Red means the change was stopped.</p>
  </footer>
</div>
</body>
</html>
`
}
