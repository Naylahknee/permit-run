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

// Line icons are drawn inline so they take the text colour around them — the
// old SVG files are cream-on-transparent and only work on the dark artwork.
const icon = (body, size = 24, stroke = 1.9) => {
  const n = svgEl('svg', {
    viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true', focusable: 'false',
    fill: 'none', stroke: 'currentColor', 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  });
  n.innerHTML = body;
  return n;
};

export const ico = {
  home: (s = 26) => icon('<path d="M3.7 10.3 12 3.6l8.3 6.7V20a1 1 0 0 1-1 1h-4.6v-6.3H9.3V21H4.7a1 1 0 0 1-1-1z"/>', s),
  flag: (s = 26) => icon('<path d="M6 21V4"/><path d="M6 4.6h10.6l-1.9 3.7 1.9 3.7H6"/>', s),
  book: (s = 26) => icon('<path d="M3.5 5.2c2.8-1 5.6-.6 8.5 1.2v13c-2.9-1.8-5.7-2.2-8.5-1.2z"/><path d="M20.5 5.2c-2.8-1-5.6-.6-8.5 1.2v13c2.9-1.8 5.7-2.2 8.5-1.2z"/>', s),
  person: (s = 26) => icon('<circle cx="12" cy="8.2" r="3.9"/><path d="M4.8 20.4c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/>', s),
  check: (s = 20) => icon('<path d="M4.6 12.7l4.7 4.7 10-10.7"/>', s, 2.4),
  lock: (s = 18) => icon('<rect x="4.8" y="10.4" width="14.4" height="10.2" rx="2.6"/><path d="M8.4 10.4V7.6a3.6 3.6 0 0 1 7.2 0v2.8"/>', s, 1.8),
  chev: (s = 18) => icon('<path d="M9 5.5 15.5 12 9 18.5"/>', s, 2),
  arrow: (s = 20) => icon('<path d="M14.5 5.5 8 12l6.5 6.5"/>', s, 2),
  pause: (s = 16) => icon('<rect x="7.5" y="5" width="3.2" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.3" y="5" width="3.2" height="14" rx="1.4" fill="currentColor" stroke="none"/>', s),
  gear: (s = 22) => icon('<path d="M4 7h8.6M17.4 7H20M4 17h2.6M11.4 17H20"/><circle cx="15" cy="7" r="2.6"/><circle cx="9" cy="17" r="2.6"/>', s, 1.8),
  clock: (s = 15) => icon('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 1.8"/>', s, 2),
  play: (s = 18) => {
    const n = svgEl('svg', { viewBox: '0 0 24 24', width: s, height: s, 'aria-hidden': 'true' });
    n.innerHTML = '<path d="M8 5.4v13.2L19 12z" fill="#fff"/>';
    return n;
  },
  heart: (filled, s = 20) => {
    const n = svgEl('svg', { viewBox: '0 0 24 24', width: s, height: s, 'aria-hidden': 'true' });
    n.innerHTML = filled
      ? '<path d="M12 20.4 4.5 13a4.9 4.9 0 0 1 6.9-6.9l.6.6.6-.6A4.9 4.9 0 0 1 19.5 13z" fill="#FF4D5E"/>'
      : '<path d="M12 20.4 4.5 13a4.9 4.9 0 0 1 6.9-6.9l.6.6.6-.6A4.9 4.9 0 0 1 19.5 13z" fill="none" stroke="#D8D5CF" stroke-width="1.8"/>';
    return n;
  },
  checkCircle: (s = 22) => {
    const n = svgEl('svg', { viewBox: '0 0 24 24', width: s, height: s, 'aria-hidden': 'true' });
    n.innerHTML = '<circle cx="12" cy="12" r="10" fill="#1E9E61"/><path d="M7.5 12.3l3.2 3.2 5.8-6.9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    return n;
  },
  xCircle: (s = 22) => {
    const n = svgEl('svg', { viewBox: '0 0 24 24', width: s, height: s, 'aria-hidden': 'true' });
    n.innerHTML = '<circle cx="12" cy="12" r="10" fill="#E5484D"/><path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>';
    return n;
  }
};

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
    back ? h('button', { class: 'round-btn', 'aria-label': 'Back', onClick: () => { audio.sfx('tap'); back(); } }, ico.arrow(20)) : null,
    h('h2', {}, title));
}

// Question progress: one bar per question, coloured by how it went.
export function dots(n, k, results) {
  return h('div', { class: 'dots' }, Array.from({ length: n }, (_, j) =>
    h('i', { class: results && results[j] != null ? (results[j] ? 'ok' : 'bad') : j === k ? 'on' : j < k ? 'done' : '' })));
}

// Small header counter: icon + number (streak, points).
export function pill(iconPath, value) {
  return h('span', { class: 'pill' }, img(iconPath, 'pill-ico'), h('b', {}, value));
}

// Circular progress, drawn with a conic gradient like the design.
export function ring(percent, opts = {}) {
  const { size = 56, stroke = 6, color = 'var(--blue)', label = null, onBg = false } = opts;
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const inner = size - stroke * 2;
  return h('div', {
    class: 'ring' + (onBg ? ' on-bg' : ''),
    style: `width:${size}px;height:${size}px;background:conic-gradient(${color} 0 ${pct}%,var(--track) 0)`,
    role: 'img', 'aria-label': pct + '%'
  }, h('div', { class: 'ring-hole', style: `width:${inner}px;height:${inner}px` }, label));
}

/* ---------- bottom tab bar ---------- */

export const TABS = [
  { id: 'learn', label: 'Learn', icon: 'learn' },
  { id: 'practice', label: 'Practice', icon: 'practice' },
  { id: 'handbook', label: 'Handbook', icon: 'handbook' },
  { id: 'profile', label: 'Me', icon: 'me' }
];

export function tabBar(active, go) {
  return h('nav', { class: 'tabbar', 'aria-label': 'Main' },
    TABS.map(t => h('button', {
      class: 'tab' + (t.id === active ? ' on' : ''),
      'aria-current': t.id === active ? 'page' : null,
      onClick: () => { audio.sfx('tap'); go[t.id](); }
    }, h('span', { class: 'tab-ico' }, img('ui/tab-' + t.icon + '-' + (t.id === active ? 'on' : 'off'))),
      h('span', {}, t.label))));
}
