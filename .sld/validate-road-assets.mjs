// Permit Run's project-owned road-asset policy.
// A full redraw of a one-line SVG must not be treated as 100% file deletion.
// SLD still checks every non-exempt source file. This guard independently
// checks sign/signal SVG additions, edits, and *real* deletions.
// No third-party dependencies or changes to .sld/vendor/.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROAD_SVG = /^app\/assets\/(?:signs|signals)\/[^/]+\.svg$/i;
const MAX_SVG_BYTES = 256 * 1024;

export function isRoadSvg(path) {
  return ROAD_SVG.test(path);
}

export function validateSvgMarkup(source) {
  const errors = [];
  if (typeof source !== 'string' || !source.trim()) return ['SVG is empty'];
  if (Buffer.byteLength(source, 'utf8') > MAX_SVG_BYTES) {
    errors.push('SVG is larger than the 256 KiB limit');
  }
  if (!/^\s*(?:<\?xml[^>]*\?>\s*)?<svg\b[^>]*\bxmlns\s*=\s*(['"])http:\/\/www\.w3\.org\/2000\/svg\1/i.test(source)) {
    errors.push('SVG must begin with a standalone SVG root and correct XML namespace');
  }
  if (!/<\/svg>\s*$/i.test(source)) {
    errors.push('SVG must end with </svg>');
  }
  if (!/\bviewBox\s*=\s*(['"])[^'"]+\1/i.test(source)) {
    errors.push('SVG must have a viewBox for responsive rendering');
  }
  if (/<\s*\/?\s*(?:script|foreignObject|iframe|object|embed)\b/i.test(source)) {
    errors.push('SVG contains an executable or embedded HTML element');
  }
  if (/\son[a-z]+\s*=/i.test(source)) {
    errors.push('SVG contains an inline event handler');
  }
  if (/\b(?:href|xlink:href|xml:base)\s*=\s*(['"])\s*(?:https?:|javascript:|data:|\/\/)/i.test(source)) {
    errors.push('SVG contains an external, script, or data URL');
  }
  if (/\burl\s*\(\s*['"]?\s*(?:https?:|javascript:|data:|\/\/)/i.test(source)) {
    errors.push('SVG references an external or script URL');
  }
  if (/<\?(?:xml-stylesheet|php)/i.test(source) || /<!DOCTYPE/i.test(source)) {
    errors.push('SVG contains a stylesheet instruction or DOCTYPE');
  }
  return errors;
}

// With --no-renames, each NUL-delimited entry is STATUS, PATH.
export function parseNameStatus(output) {
  if (!output) return [];
  const items = output.split('\0');
  if (items[items.length - 1] === '') items.pop();
  if (items.length % 2 !== 0) throw new Error('Malformed git --name-status -z output');
  const changes = [];
  for (let i = 0; i < items.length; i += 2) {
    changes.push({ status: items[i], path: items[i + 1] });
  }
  return changes;
}

export function auditRoadAssets(changes, getContent) {
  const errors = [];
  const review = [];
  let additions = 0;
  let replacements = 0;
  for (const { status, path } of changes) {
    if (!isRoadSvg(path)) continue;
    if (status.startsWith('D')) {
      errors.push(path + ': deletion of an existing sign/signal SVG is prohibited');
      continue;
    }
    if (status.startsWith('M')) {
      replacements += 1;
      review.push(path + ': existing SVG has been redesigned; visually review the change');
    } else if (status.startsWith('A')) {
      additions += 1;
    } else {
      errors.push(path + ': unsupported git status ' + status);
      continue;
    }

    try {
      const issues = validateSvgMarkup(getContent(path));
      errors.push(...issues.map(issue => path + ': ' + issue));
    } catch (error) {
      errors.push(path + ': could not inspect SVG (' + error.message + ')');
    }
  }
  return { errors, review, additions, replacements };
}

function main() {
  const baseRef = process.argv[2];
  if (!baseRef || !/^[A-Za-z0-9_.\/^~-]+$/.test(baseRef) || baseRef.startsWith('-')) {
    throw new Error('Pass a valid, explicit comparison ref (for example origin/main)');
  }
  const raw = execFileSync(
    'git',
    ['diff', '--no-renames', '--name-status', '-z', baseRef, 'HEAD',
      '--', 'app/assets/signs', 'app/assets/signals'],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
  );
  const result = auditRoadAssets(parseNameStatus(raw), p => readFileSync(p, 'utf8'));
  console.log('Road-asset policy: ' + result.additions + ' new SVG(s), ' +
    result.replacements + ' redesigned SVG(s)');
  for (const message of result.review) console.log('REVIEW: ' + message);
  for (const message of result.errors) console.error('BLOCK: ' + message);
  if (result.errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
