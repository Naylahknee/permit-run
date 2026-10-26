// Shared UI kit — the light, iOS-style building blocks every screen renders with.
// The app has no framework and no build step, so these are plain DOM helpers.
import * as audio from './audio.js';

export const A = p => `assets/${p}.svg`;

/* ---------- tiny DOM helper ---------- */

export function h(tag, props, ...kids) {
  const n = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

function svgEl(tag, attrs) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

export const img = (p, cls = '', alt = '') => h('img', { src: A(p), class: cls, alt, draggable: 'false' });
export const num = n => (n || 0).toLocaleString('en-US');
export const money = n => '$' + num(n);

/* ---------- controls ---------- */

export function btn(label, onClick, cls = 'btn') {
  return h('button', { class: cls, onClick: e => { audio.sfx('tap'); onClick(e); } }, label);
}

export function speakBtn(getText) {
  if (!audio.canSpeak) return null;
  return h('button', { class: 'speak', 'aria-label': 'Read out loud', onClick: () => audio.speak(getText()) }, img('icons/sound'));
}

/* ---------- shared blocks ---------- */

export function header(title, back) {
  return h('div', { class: 'screen-head' },
    back ? h('button', { class: 'icon-btn back', 'aria-label': 'Back', onClick: () => { audio.sfx('tap'); back(); } }, '‹') : null,
    h('h2', {}, title));
}

export function dots(n, k, results) {
  return h('div', { class: 'dots' }, Array.from({ length: n }, (_, j) =>
    h('i', { class: results && results[j] != null ? (results[j] ? 'ok' : 'bad') : j === k ? 'on' : j < k ? 'done' : '' })));
}

// Small header counter: icon + number (streak, points).
export function pill(icon, value, cls = '') {
  return h('span', { class: 'pill ' + cls }, img(icon, 'pill-ico'), h('b', {}, value));
}

// Circular progress ring, drawn as SVG so it stays crisp at any size.
export function ring(percent, size = 56, stroke = 6) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'ring-svg', role: 'img', 'aria-label': pct + '%' });
  svg.append(svgEl('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-track', 'stroke-width': stroke, fill: 'none' }));
  svg.append(svgEl('circle', {
    cx: size / 2, cy: size / 2, r, class: 'ring-fill', 'stroke-width': stroke, fill: 'none',
    'stroke-linecap': 'round', 'stroke-dasharray': c.toFixed(1), 'stroke-dashoffset': (c * (1 - pct / 100)).toFixed(1),
    transform: `rotate(-90 ${size / 2} ${size / 2})`
  }));
  return svg;
}

/* ---------- bottom tab bar ---------- */

export const TABS = [
  { id: 'learn', label: 'Learn', icon: 'icons/home' },
  { id: 'practice', label: 'Practice', icon: 'icons/mission-flag' },
  { id: 'handbook', label: 'Handbook', icon: 'icons/handbook' },
  { id: 'profile', label: 'Profile', icon: 'icons/trophy' }
];

export function tabBar(active, go) {
  return h('nav', { class: 'tabbar', 'aria-label': 'Main' },
    TABS.map(t => h('button', {
      class: 'tab' + (t.id === active ? ' on' : ''),
      'aria-current': t.id === active ? 'page' : null,
      onClick: () => { audio.sfx('tap'); go[t.id](); }
    }, img(t.icon, 'tab-ico'), h('span', {}, t.label))));
}
