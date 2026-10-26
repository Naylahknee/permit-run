import test from 'node:test';
import assert from 'node:assert/strict';
import { isRoadSvg, validateSvgMarkup, parseNameStatus, auditRoadAssets } from './validate-road-assets.mjs';

const clean = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><rect width="80" height="100"/></svg>';
const read = () => clean;

test('only directly located sign and signal SVGs are exempt from SLD line-count heuristic', () => {
  assert.equal(isRoadSvg('app/assets/signs/stop.svg'), true);
  assert.equal(isRoadSvg('app/assets/signals/signal-green.svg'), true);
  assert.equal(isRoadSvg('app/assets/signals/nested/unsafe.svg'), false);
  assert.equal(isRoadSvg('app/assets/scenes/real-railroad-crossing.svg'), false);
  assert.equal(isRoadSvg('app/js/app.js'), false);
});

test('a brand-new valid sign or signal SVG is allowed', () => {
  const result = auditRoadAssets([{ status: 'A', path: 'app/assets/signs/new-warning.svg' }], read);
  assert.deepEqual(result.errors, []);
  assert.equal(result.additions, 1);
  assert.equal(result.replacements, 0);
});

test('a full redraw of an existing SVG is allowed with a review notice', () => {
  const result = auditRoadAssets([{ status: 'M', path: 'app/assets/signals/signal-red.svg' }], read);
  assert.deepEqual(result.errors, []);
  assert.equal(result.review.length, 1);
  assert.equal(result.replacements, 1);
});

test('real SVG deletions are blocked and not mistaken for redesigns', () => {
  const result = auditRoadAssets([{ status: 'D', path: 'app/assets/signs/stop.svg' }], read);
  assert.match(result.errors[0], /deletion.+prohibited/);
});

test('unsafe executable markup, handlers, links, and empty SVGs are blocked', () => {
  const samples = [
    clean.replace('</svg>', '<script>alert(1)</script></svg>'),
    clean.replace('<rect', '<foreignObject/> <rect'),
    clean.replace('<rect', '<rect onload="alert(1)"'),
    clean.replace('<rect', '<image href="https://host.invalid/a.png"/><rect'),
    clean.replace('<rect', '<rect fill="url(javascript:alert(1))"/> <rect'),
    '<svg viewBox="0 0 80 100"></svg>',
    '',
  ];
  for (const svg of samples) {
    assert.ok(validateSvgMarkup(svg).length > 0, 'unsafe SVG should not pass: ' + svg);
  }
});

test('unrelated source file modifications remain outside this exemption', () => {
  const result = auditRoadAssets([{ status: 'M', path: 'app/js/scene.js' }], read);
  assert.deepEqual(result.errors, []);
  assert.equal(result.replacements, 0);
});

test('NUL-delimited git name-status parsing handles special filename characters', () => {
  assert.deepEqual(parseNameStatus('A\0app/assets/signs/signal ahead.svg\0M\0app/assets/signals/signal-red.svg\0'),
    [{ status: 'A', path: 'app/assets/signs/signal ahead.svg' },
      { status: 'M', path: 'app/assets/signals/signal-red.svg' }]);
  assert.throws(() => parseNameStatus('A\0broken\0M\0'), /Malformed/);
});
