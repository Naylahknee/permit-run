// @ts-nocheck
/**
 * Inspector report tests — the human-facing view of a check.
 *
 * The buyer reading this report is non-technical, so these tests guard the
 * buyer-language rules, not just the rendering:
 * - green / yellow / red map from the right decisions, unknown fails to red
 * - no banned words ("governance", "diff", "changeset") in buyer copy
 * - no em-dashes in buyer copy
 * - every finding class translates to a title, body, and action
 * - the HTML escapes hostile input
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  inspectorLevel,
  buildInspectorReport,
  renderInspectorMarkdown,
  renderInspectorHtml,
} from '../report/inspector.mjs'

const BANNED = ['governance', 'diff', 'changeset']
const EM_DASH = '—'

function buyerText(markdown, html) {
  return `${markdown}\n${html || ''}`
}
function assertBuyerClean(report) {
  const md = renderInspectorMarkdown(report)
  const html = renderInspectorHtml(report)
  const text = buyerText(md, html)
  for (const word of BANNED) {
    assert.ok(
      !new RegExp(`\\b${word}\\b`, 'i').test(text),
      `buyer copy must not contain "${word}"`,
    )
  }
  assert.ok(!text.includes(EM_DASH), 'buyer copy must not contain em-dashes')
  return { md, html }
}

const greenResult = { decision: 'ALLOW', findings: [] }
const changes = [
  { path: 'src/db.js', changeType: 'modify', addedLineCount: 1, removedLineCount: 0 },
]

test('inspectorLevel maps every decision, unknown fails safe to red', () => {
  assert.equal(inspectorLevel('ALLOW'), 'green')
  assert.equal(inspectorLevel('ALLOW_WITH_WARNING'), 'yellow')
  assert.equal(inspectorLevel('REVIEW_REQUIRED'), 'yellow')
  assert.equal(inspectorLevel('INSUFFICIENT_EVIDENCE'), 'red')
  assert.equal(inspectorLevel('BLOCK'), 'red')
  assert.equal(inspectorLevel('SOMETHING_NEW'), 'red')
  assert.equal(inspectorLevel(''), 'red')
})

test('green report says what was checked and stays buyer-clean', () => {
  const report = buildInspectorReport({
    changes,
    result: greenResult,
    projectName: 'scratch-app',
    refLabel: 'main',
    generatedAt: '2026-10-09T12:00:00.000Z',
  })
  assert.equal(report.level, 'green')
  const { md } = assertBuyerClean(report)
  assert.ok(md.includes('Checked and clean'))
  assert.ok(md.includes('This change passed every check.'))
  assert.ok(md.includes('src/db.js: 1 line added.'))
  assert.ok(md.includes('What was checked'))
  assert.ok(!md.includes('What to do'))
})

test('yellow report names exactly what to look at', () => {
  const report = buildInspectorReport({
    changes: [
      {
        path: 'src/app.js',
        changeType: 'modify',
        addedLineCount: 2,
        removedLineCount: 74,
        baselineLineCount: 100,
      },
    ],
    result: {
      decision: 'REVIEW_REQUIRED',
      findings: [
        {
          layer: 'execution',
          class: 'contentLoss',
          decision: 'REVIEW_REQUIRED',
          message: 'x',
          path: 'src/app.js',
        },
      ],
    },
    projectName: 'scratch-app',
  })
  assert.equal(report.level, 'yellow')
  const { md } = assertBuyerClean(report)
  assert.ok(md.includes('Needs your eyes'))
  assert.ok(md.includes('What to look at'))
  assert.ok(md.includes('A large removal needs a second look'))
  assert.ok(md.includes('What to do:'))
})

test('red report says what was stopped and that nothing goes live', () => {
  const report = buildInspectorReport({
    changes: [
      {
        path: 'src/app.js',
        changeType: 'modify',
        addedLineCount: 2,
        removedLineCount: 74,
        baselineLineCount: 100,
      },
    ],
    result: {
      decision: 'BLOCK',
      findings: [
        {
          layer: 'execution',
          class: 'contentLoss',
          decision: 'BLOCK',
          message: 'x',
          path: 'src/app.js',
        },
      ],
    },
    projectName: 'scratch-app',
    refLabel: 'main',
    generatedAt: '2026-10-09T12:00:00.000Z',
  })
  assert.equal(report.level, 'red')
  const { md, html } = assertBuyerClean(report)
  assert.ok(md.includes('Stopped'))
  assert.ok(md.includes('Nothing from it should go live'))
  assert.ok(md.includes('Why it was stopped'))
  assert.ok(md.includes('Too much was removed from this file'))
  assert.ok(md.includes('74 of 100 lines are gone from src/app.js (74%)'))
  assert.ok(md.includes('Checked on 2026-10-09 against main.'))
  assert.ok(html.startsWith('<!DOCTYPE html>'))
  assert.ok(html.includes('Too much was removed from this file'))
})

test('empty change set renders honestly', () => {
  const report = buildInspectorReport({ changes: [], result: greenResult, projectName: 'p' })
  const { md } = assertBuyerClean(report)
  assert.ok(md.includes('No changes found to check.'))
})

test('every known finding class translates to a card with title, body, action', () => {
  const classes = [
    'contentLoss',
    'generationArtifactCorruption',
    'unauthorizedChange',
    'unknownScope',
    'invalidContractApproval',
    'missingRequiredChange',
    'destructiveChange',
    'duplicateAppRoot',
    'architectureViolation',
    'dependencyViolation',
    'protectedFeatureChange',
    'behavioralChange',
    'designSystemDrift',
    'forbiddenTerm',
    'unknownChange',
    'someFutureClass',
  ]
  for (const cls of classes) {
    for (const decision of ['BLOCK', 'REVIEW_REQUIRED', 'INSUFFICIENT_EVIDENCE']) {
      const report = buildInspectorReport({
        changes: [
          {
            path: 'src/app.js',
            changeType: 'modify',
            addedLineCount: 1,
            removedLineCount: 50,
            baselineLineCount: 100,
          },
        ],
        result: {
          decision,
          findings: [
            {
              layer: 'execution',
              class: cls,
              decision,
              message: 'Forbidden import: src/app.js → evil-pkg. Not allowed. Retired brand term "OldName" reintroduced. protected feature "checkout".',
              path: 'src/app.js',
            },
          ],
        },
        projectName: 'p',
      })
      assert.ok(report.cards.length === 1, cls)
      const card = report.cards[0]
      assert.ok(card.title && card.title.length > 0, `${cls} title`)
      assert.ok(card.body && card.body.length > 0, `${cls} body`)
      assert.ok(card.action && card.action.length > 0, `${cls} action`)
      assertBuyerClean(report)
    }
  }
})

test('HTML escapes hostile input', () => {
  const report = buildInspectorReport({
    changes: [
      { path: '<script>alert(1)</script>.js', changeType: 'add', addedLineCount: 3 },
    ],
    result: greenResult,
    projectName: '<b>evil</b>',
  })
  const html = renderInspectorHtml(report)
  assert.ok(!html.includes('<script>alert(1)</script>.js'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;.js'))
  assert.ok(html.includes('&lt;b&gt;evil&lt;/b&gt;'))
})

test('red INSUFFICIENT_EVIDENCE explains the missing record in plain words', () => {
  const report = buildInspectorReport({
    changes: [{ path: 'src/new.js', changeType: 'add', addedLineCount: 10 }],
    result: {
      decision: 'INSUFFICIENT_EVIDENCE',
      findings: [
        {
          layer: 'execution',
          class: 'contentLoss',
          decision: 'INSUFFICIENT_EVIDENCE',
          message: 'x',
          path: 'src/new.js',
        },
      ],
    },
    projectName: 'p',
  })
  assert.equal(report.level, 'red')
  const { md } = assertBuyerClean(report)
  assert.ok(md.includes('We could not measure what was removed'))
})
