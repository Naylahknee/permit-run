// Top-down road scenes drawn in SVG. Used by "trace your path" and
// "tap the spot" questions and by the animated learn cards.
//
// Coordinate system: 360 x 360 viewBox, y grows downward.
// Right-hand traffic: northbound lanes sit east of the centre line,
// southbound west; eastbound lanes sit south, westbound north.
// Lanes are numbered like the handbook: lane 1 is next to the centre.

export const SIZE = 360;
export const L = 34; // lane width
const C = SIZE / 2;

const COL = {
  grass: '#51795D', grass2: '#5B8566', walk: '#CFC6B4', curb: '#B5AB97',
  road: '#3B4050', paint: '#F7EEDD', yellow: '#FFC53D',
  pink: '#FF3E7F', teal: '#1FC7B6', gold: '#FFC53D', white: '#E9E4DA', orange: '#FF8A2A', navy: '#11152A'
};

const NS = 'http://www.w3.org/2000/svg';

/* ---------- geometry ---------- */

// A crossroads spec: { ns: {n, s, twlt}, ew: {e, w} | null }
export function geom(spec) {
  const ns = spec.ns || { n: 1, s: 1 };
  const ew = spec.ew === undefined ? { e: 1, w: 1 } : spec.ew;
  const twlt = ns.twlt ? L : 0;
  const nsW = (ns.n + ns.s) * L + twlt;
  const xL = C - nsW / 2, xR = C + nsW / 2;
  const nsDiv = xL + ns.s * L; // west edge of the northbound lanes (or of the turn lane)
  const g = { spec, ns, ew, xL, xR, nsDiv, twlt, twltX: nsDiv + twlt / 2 };
  if (ew) {
    const ewW = (ew.e + ew.w) * L;
    g.yT = C - ewW / 2; g.yB = C + ewW / 2; g.ewDiv = g.yT + ew.w * L;
  } else { g.yT = g.yB = g.ewDiv = null; }
  return g;
}

export function laneX(g, dir, k) {
  if (dir === 'N') return g.nsDiv + g.twlt + (k - 0.5) * L;
  return g.nsDiv - (k - 0.5) * L; // S
}
export function laneY(g, dir, k) {
  if (dir === 'E') return g.ewDiv + (k - 0.5) * L;
  return g.ewDiv - (k - 0.5) * L; // W
}

// Named rectangular zones used by trace / tap checks.
// "exit" zones are the stretch of road beyond the intersection.
export function zone(g, name) {
  const [dir, k, where] = name.split(':');
  const n = +k, pad = 6, half = L / 2 - 2;
  if (dir === 'N' || dir === 'S') {
    const x = laneX(g, dir, n) - half;
    if (where === 'exit') return dir === 'N' ? { x, y: 0, w: half * 2, h: g.yT - pad } : { x, y: g.yB + pad, w: half * 2, h: SIZE - g.yB };
    if (where === 'approach') return dir === 'N' ? { x, y: g.yB + 14, w: half * 2, h: SIZE - g.yB } : { x, y: 0, w: half * 2, h: g.yT - 14 };
  } else {
    const y = laneY(g, dir, n) - half;
    if (where === 'exit') return dir === 'W' ? { x: 0, y, w: g.xL - pad, h: half * 2 } : { x: g.xR + pad, y, w: SIZE - g.xR, h: half * 2 };
    if (where === 'approach') return dir === 'W' ? { x: g.xR + 14, y, w: SIZE - g.xR, h: half * 2 } : { x: 0, y, w: g.xL - 14, h: half * 2 };
  }
  throw new Error('bad zone ' + name);
}

export function inZone(p, z) {
  if (z.r) return Math.hypot(p.x - z.cx, p.y - z.cy) <= z.r;
  return p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
}

/* ---------- svg helpers ---------- */

export function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

export function svgRoot(extraClass = '') {
  return el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'scene ' + extraClass, preserveAspectRatio: 'xMidYMid meet', role: 'img' });
}

function dashLine(p, x1, y1, x2, y2, color = COL.paint, w = 3, dash = '14 12') {
  el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w, 'stroke-dasharray': dash }, p);
}
function solid(p, x1, y1, x2, y2, color = COL.paint, w = 3) {
  el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w }, p);
}

/* ---------- actors ---------- */

// Top-down car, nose pointing "up" before rotation.
export function car(p, { x, y, rot = 0, color = COL.pink, kind = 'car', id, label }) {
  const grp = el('g', { transform: `translate(${x} ${y}) rotate(${rot})`, class: 'actor' + (id ? ' tappable' : '') }, p);
  if (id) grp.dataset.id = id;
  if (kind === 'truck') {
    el('rect', { x: -14, y: -52, width: 28, height: 22, rx: 5, fill: COL.orange }, grp);
    el('rect', { x: -11, y: -48, width: 22, height: 7, rx: 2, fill: '#1B2140', opacity: .8 }, grp);
    el('rect', { x: -15, y: -27, width: 30, height: 80, rx: 3, fill: COL.white }, grp);
  } else if (kind === 'bus') {
    el('rect', { x: -14, y: -44, width: 28, height: 88, rx: 6, fill: COL.yellow }, grp);
    el('rect', { x: -11, y: -40, width: 22, height: 8, rx: 2, fill: '#1B2140', opacity: .8 }, grp);
    for (let i = 0; i < 5; i++) el('rect', { x: -12, y: -26 + i * 13, width: 24, height: 3, fill: '#D9A21F' }, grp);
  } else if (kind === 'bike') {
    el('rect', { x: -2.5, y: -14, width: 5, height: 28, rx: 2.5, fill: '#1B2140' }, grp);
    el('circle', { cx: 0, cy: -2, r: 6, fill: COL.teal }, grp);
    el('circle', { cx: 0, cy: -3, r: 3.5, fill: '#F7C99B' }, grp);
  } else if (kind === 'walker') {
    el('circle', { cx: 0, cy: 0, r: 9, fill: COL.gold }, grp);
    el('circle', { cx: 0, cy: -1, r: 5, fill: '#8B5A3C' }, grp);
  } else {
    const siren = kind === 'ambulance' || kind === 'police';
    const body = kind === 'ambulance' ? COL.white : kind === 'police' ? COL.white : color;
    el('rect', { x: -12, y: -22, width: 24, height: 44, rx: 7, fill: body }, grp);
    el('rect', { x: -9.5, y: -12, width: 19, height: 9, rx: 3, fill: '#1B2140', opacity: .85 }, grp);
    el('rect', { x: -9.5, y: 9, width: 19, height: 6, rx: 2, fill: '#1B2140', opacity: .7 }, grp);
    el('rect', { x: -8, y: -21, width: 5, height: 3, rx: 1, fill: '#FFF6C9' }, grp);
    el('rect', { x: 3, y: -21, width: 5, height: 3, rx: 1, fill: '#FFF6C9' }, grp);
    if (kind === 'ambulance') { el('rect', { x: -2, y: -1, width: 4, height: 10, fill: COL.pink }, grp); el('rect', { x: -5, y: 2, width: 10, height: 4, fill: COL.pink }, grp); }
    if (siren) {
      el('rect', { x: -9, y: 1, width: 9, height: 4, rx: 1, fill: '#FF3E3E', class: 'siren-a' }, grp);
      el('rect', { x: 0, y: 1, width: 9, height: 4, rx: 1, fill: '#3E7BFF', class: 'siren-b' }, grp);
    }
    if (kind === 'police') el('rect', { x: -12, y: -4, width: 24, height: 3, fill: '#11152A' }, grp);
  }
  if (label) {
    const t = el('g', { transform: `rotate(${-rot})` }, grp);
    el('rect', { x: -17, y: -11, width: 34, height: 18, rx: 9, fill: COL.navy, opacity: .9 }, t);
    const tx = el('text', { x: 0, y: 3, 'text-anchor': 'middle', class: 'scene-label' }, t);
    tx.textContent = label;
  }
  return grp;
}

export function stopSign(p, x, y) {
  const g = el('g', { transform: `translate(${x} ${y})` }, p);
  const r = 9, pts = [];
  for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; pts.push((r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1)); }
  el('polygon', { points: pts.join(' '), fill: '#E0263B', stroke: '#fff', 'stroke-width': 1.5 }, g);
}

function palm(p, x, y) {
  el('circle', { cx: x, cy: y, r: 13, fill: '#2F6B45' }, p);
  el('circle', { cx: x - 4, cy: y - 3, r: 7, fill: '#3E8A58' }, p);
  el('circle', { cx: x, cy: y, r: 3, fill: '#7A5B3A' }, p);
}

/* ---------- crossroads ---------- */

export function drawCross(root, spec) {
  const g = geom(spec);
  const base = el('g', {}, root);
  el('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: COL.grass }, base);
  // sidewalks
  const sw = 12;
  el('rect', { x: g.xL - sw, y: 0, width: g.xR - g.xL + sw * 2, height: SIZE, fill: COL.walk }, base);
  if (g.ew) el('rect', { x: 0, y: g.yT - sw, width: SIZE, height: g.yB - g.yT + sw * 2, fill: COL.walk }, base);
  // corner trees for a bit of life
  if (g.ew) {
    const tl = [[g.xL - 40, g.yT - 40], [g.xR + 40, g.yT - 40], [g.xL - 40, g.yB + 40], [g.xR + 40, g.yB + 40]];
    tl.forEach(([x, y]) => { if (x > 14 && x < SIZE - 14 && y > 14 && y < SIZE - 14) palm(base, x, y); });
  } else {
    palm(base, 30, 60); palm(base, SIZE - 30, 280); palm(base, SIZE - 34, 90);
  }
  // asphalt
  el('rect', { x: g.xL, y: 0, width: g.xR - g.xL, height: SIZE, fill: COL.road }, base);
  if (g.ew) el('rect', { x: 0, y: g.yT, width: SIZE, height: g.yB - g.yT, fill: COL.road }, base);
  // driveway cut on the west side (for centre-turn-lane scenes)
  if (spec.driveway) {
    const d = spec.driveway;
    el('rect', { x: 0, y: d.y - 22, width: g.xL, height: 44, fill: '#5A5F6E' }, base);
    const t = el('text', { x: (g.xL) / 2, y: d.y + 4, 'text-anchor': 'middle', class: 'scene-label' }, base);
    t.textContent = d.label || 'SHOP';
  }

  const m = el('g', {}, base);
  const segsNS = g.ew ? [[0, g.yT], [g.yB, SIZE]] : [[0, SIZE]];
  const segsEW = g.ew ? [[0, g.xL], [g.xR, SIZE]] : [];

  // N/S centre markings
  for (const [a, b] of segsNS) {
    if (g.ns.n && g.ns.s) {
      if (g.twlt) {
        solid(m, g.nsDiv + 2, a, g.nsDiv + 2, b, COL.yellow, 2.5);
        dashLine(m, g.nsDiv + 7, a, g.nsDiv + 7, b, COL.yellow, 2.5);
        dashLine(m, g.nsDiv + g.twlt - 7, a, g.nsDiv + g.twlt - 7, b, COL.yellow, 2.5);
        solid(m, g.nsDiv + g.twlt - 2, a, g.nsDiv + g.twlt - 2, b, COL.yellow, 2.5);
      } else {
        solid(m, g.nsDiv - 2.5, a, g.nsDiv - 2.5, b, COL.yellow, 2.5);
        solid(m, g.nsDiv + 2.5, a, g.nsDiv + 2.5, b, COL.yellow, 2.5);
      }
    }
    for (let k = 1; k < g.ns.n; k++) {
      const x = g.nsDiv + g.twlt + k * L;
      if (g.ns.doubleWhite) { solid(m, x - 3, a, x - 3, b); solid(m, x + 3, a, x + 3, b); } else dashLine(m, x, a, x, b);
    }
    for (let k = 1; k < g.ns.s; k++) dashLine(m, g.nsDiv - k * L, a, g.nsDiv - k * L, b);
  }
  if (g.twlt) {
    // turn-lane arrows
    for (const yy of [70, 290]) {
      el('path', { d: `M${g.twltX - 5} ${yy + 10} v-10 l-5 0 l5 -8 M${g.twltX + 5} ${yy - 10} v10 l5 0 l-5 8`, stroke: COL.paint, 'stroke-width': 2.5, fill: 'none' }, m);
    }
  }
  for (const [a, b] of segsEW) {
    if (g.ew.e && g.ew.w) {
      solid(m, a, g.ewDiv - 2.5, b, g.ewDiv - 2.5, COL.yellow, 2.5);
      solid(m, a, g.ewDiv + 2.5, b, g.ewDiv + 2.5, COL.yellow, 2.5);
    }
    for (let k = 1; k < g.ew.e; k++) dashLine(m, a, g.ewDiv + k * L, b, g.ewDiv + k * L);
    for (let k = 1; k < g.ew.w; k++) dashLine(m, a, g.ewDiv - k * L, b, g.ewDiv - k * L);
  }

  // crosswalks and limit lines
  if (g.ew && spec.crosswalks !== false) {
    const cw = (x, y, w, h, vertical) => {
      const n = Math.floor((vertical ? w : h) / 10);
      for (let i = 0; i < n; i++) {
        if (vertical) el('rect', { x: x + i * 10 + 2, y, width: 6, height: h, fill: COL.paint, opacity: .9 }, m);
        else el('rect', { x, y: y + i * 10 + 2, width: w, height: 6, fill: COL.paint, opacity: .9 }, m);
      }
    };
    cw(g.xL, g.yB + 4, g.xR - g.xL, 16, true);
    cw(g.xL, g.yT - 20, g.xR - g.xL, 16, true);
    cw(g.xL - 20, g.yT, 16, g.yB - g.yT, false);
    cw(g.xR + 4, g.yT, 16, g.yB - g.yT, false);
    // limit lines on the approach side of each crosswalk
    if (g.ns.n) solid(m, g.nsDiv + g.twlt, g.yB + 26, g.xR, g.yB + 26, COL.paint, 5);
    if (g.ns.s) solid(m, g.xL, g.yT - 26, g.nsDiv, g.yT - 26, COL.paint, 5);
    if (g.ew.w) solid(m, g.xR + 26, g.yT, g.xR + 26, g.ewDiv, COL.paint, 5);
    if (g.ew.e) solid(m, g.xL - 26, g.ewDiv, g.xL - 26, g.yB, COL.paint, 5);
  }

  // one-way arrows for roads that only go one direction
  const arrow = (x, y, rot) => el('path', { d: 'M0 12 V-6 M-7 0 L0 -10 L7 0', transform: `translate(${x} ${y}) rotate(${rot})`, stroke: COL.paint, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, m);
  if (!g.ns.s && g.ns.n) for (let k = 1; k <= g.ns.n; k++) arrow(laneX(g, 'N', k), g.ew ? SIZE - 30 : 300, 0);
  if (g.ew && !g.ew.e && g.ew.w) for (let k = 1; k <= g.ew.w; k++) arrow(24, laneY(g, 'W', k), -90);
  if (g.ew && !g.ew.w && g.ew.e) for (let k = 1; k <= g.ew.e; k++) arrow(SIZE - 24, laneY(g, 'E', k), 90);

  if (spec.stopSigns && g.ew) {
    stopSign(base, g.xR + 18, g.yB + 30);
    stopSign(base, g.xL - 18, g.yT - 30);
    stopSign(base, g.xR + 30, g.yT - 18);
    stopSign(base, g.xL - 30, g.yB + 18);
  }
  return g;
}

/* ---------- roundabout ---------- */

export function roundaboutGeom() {
  return { cx: C, cy: C, rOut: 112, rIn: 52, rLane: 82 };
}

export function drawRoundabout(root) {
  const r = roundaboutGeom();
  const base = el('g', {}, root);
  el('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: COL.grass }, base);
  const w = 2 * L;
  // approach roads
  el('rect', { x: C - w / 2 - 12, y: 0, width: w + 24, height: SIZE, fill: COL.walk }, base);
  el('rect', { x: 0, y: C - w / 2 - 12, width: SIZE, height: w + 24, fill: COL.walk }, base);
  el('circle', { cx: C, cy: C, r: r.rOut + 12, fill: COL.walk }, base);
  el('rect', { x: C - w / 2, y: 0, width: w, height: SIZE, fill: COL.road }, base);
  el('rect', { x: 0, y: C - w / 2, width: SIZE, height: w, fill: COL.road }, base);
  el('circle', { cx: C, cy: C, r: r.rOut, fill: COL.road }, base);
  el('circle', { cx: C, cy: C, r: r.rIn, fill: COL.grass2, stroke: COL.walk, 'stroke-width': 6 }, base);
  palm(base, C, C);
  // splitter islands and centre lines on each approach
  for (const rot of [0, 90, 180, 270]) {
    const t = el('g', { transform: `rotate(${rot} ${C} ${C})` }, base);
    el('path', { d: `M${C} ${C + r.rOut + 4} L${C - 4} ${C + r.rOut + 40} L${C + 4} ${C + r.rOut + 40} Z`, fill: COL.walk }, t);
    solid(t, C - 2.5, C + r.rOut + 40, C - 2.5, SIZE, COL.yellow, 2.5);
    solid(t, C + 2.5, C + r.rOut + 40, C + 2.5, SIZE, COL.yellow, 2.5);
    // yield triangles on the entry lane (right side of each approach)
    for (let i = 0; i < 3; i++) el('path', { d: `M${C + 8 + i * 9} ${C + r.rOut + 14} l4 7 l4 -7 z`, fill: COL.paint }, t);
  }
  // direction arrows around the ring (counter-clockwise on screen)
  for (const a of [45, 135, 225, 315]) {
    const rad = a * Math.PI / 180, x = C + r.rLane * Math.cos(rad), y = C + r.rLane * Math.sin(rad);
    el('path', { d: 'M0 10 V-6 M-6 0 L0 -9 L6 0', transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a})`, stroke: COL.paint, 'stroke-width': 2.5, fill: 'none', opacity: .7 }, base);
  }
  return r;
}

/* ---------- curbs (colour-coded parking) ---------- */

export const CURB_ORDER = ['red', 'yellow', 'white', 'green', 'blue'];
const CURB_HEX = { red: '#E0263B', yellow: '#FFC53D', white: '#F7EEDD', green: '#2FB36B', blue: '#2F6FE0' };

export function drawCurbs(root) {
  const base = el('g', {}, root);
  el('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: COL.grass }, base);
  el('rect', { x: 0, y: 0, width: SIZE, height: 150, fill: COL.walk }, base);
  // building fronts
  const fronts = ['#2B3160', '#3A2F5E', '#2B3160', '#3A2F5E', '#2B3160'];
  fronts.forEach((c, i) => el('rect', { x: i * 72 + 4, y: 0, width: 64, height: 70, fill: c }, base));
  el('rect', { x: 0, y: 160, width: SIZE, height: 200, fill: COL.road }, base);
  dashLine(base, 0, 290, SIZE, 290, COL.yellow, 3, '0');
  const zones = {};
  CURB_ORDER.forEach((c, i) => {
    const x = i * 72;
    el('rect', { x: x + 2, y: 150, width: 68, height: 10, fill: CURB_HEX[c], class: 'curb' }, base);
    const hit = el('rect', { x: x + 2, y: 100, width: 68, height: 110, fill: 'transparent', class: 'tappable zone-hit' }, base);
    hit.dataset.id = c;
    zones[c] = { x: x + 2, y: 100, w: 68, h: 110 };
    const lb = el('text', { x: x + 36, y: 136, 'text-anchor': 'middle', class: 'scene-label dark' }, base);
    lb.textContent = c.toUpperCase();
    if (c === 'blue') {
      const t = el('text', { x: x + 36, y: 196, 'text-anchor': 'middle', class: 'scene-label', fill: '#fff' }, base);
      t.textContent = '♿';
    }
  });
  return zones;
}

/* ---------- misc ---------- */

export function highlight(root, z, color, cls = 'hl') {
  if (z.r) return el('circle', { cx: z.cx, cy: z.cy, r: z.r, fill: color, 'fill-opacity': .25, stroke: color, 'stroke-width': 3, class: cls }, root);
  return el('rect', { x: z.x, y: z.y, width: z.w, height: z.h, rx: 8, fill: color, 'fill-opacity': .25, stroke: color, 'stroke-width': 3, class: cls }, root);
}

export function toSvgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const r = pt.matrixTransform(m.inverse());
  return { x: r.x, y: r.y };
}

// Move an actor along an SVG path, rotating it to face the direction of travel.
export function driveAlong(actor, pathD, root, { duration = 2200, reduced = false } = {}) {
  const path = el('path', { d: pathD, fill: 'none', stroke: 'none' }, root);
  const len = path.getTotalLength();
  return new Promise(resolve => {
    if (reduced) {
      const end = path.getPointAtLength(len), prev = path.getPointAtLength(Math.max(0, len - 2));
      const rot = Math.atan2(end.y - prev.y, end.x - prev.x) * 180 / Math.PI + 90;
      actor.setAttribute('transform', `translate(${end.x} ${end.y}) rotate(${rot})`);
      return resolve();
    }
    const t0 = performance.now();
    const step = now => {
      if (!actor.isConnected) return resolve();
      const t = Math.min(1, (now - t0) / duration);
      const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const d = e * len;
      const a = path.getPointAtLength(d), b = path.getPointAtLength(Math.min(len, d + 1.5));
      const a2 = d + 1.5 > len ? path.getPointAtLength(Math.max(0, d - 1.5)) : a;
      const rot = (d + 1.5 > len ? Math.atan2(a.y - a2.y, a.x - a2.x) : Math.atan2(b.y - a.y, b.x - a.x)) * 180 / Math.PI + 90;
      actor.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
      if (t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

// Turn paths for the demo animations.
export function turnPath(g, from, to) {
  // from: {dir:'N', k}, to: {dir, k}
  const x0 = laneX(g, from.dir, from.k);
  const y0 = SIZE - 20;
  const yStop = g.yB + 36;
  if (to.dir === 'N') { const x1 = laneX(g, 'N', to.k); return `M${x0} ${y0} L${x0} ${yStop} C${x0} ${g.yT} ${x1} ${g.yB} ${x1} ${g.yT - 30} L${x1} 10`; }
  const y1 = laneY(g, to.dir, to.k);
  if (to.dir === 'W') return `M${x0} ${y0} L${x0} ${yStop} L${x0} ${g.yB} Q${x0} ${y1} ${g.xL - 10} ${y1} L10 ${y1}`;
  return `M${x0} ${y0} L${x0} ${yStop} L${x0} ${g.yB + 8} Q${x0} ${y1} ${g.xR + 10} ${y1} L${SIZE - 10} ${y1}`;
}

/* ---------- scene builder used by the game ---------- */

function placeActor(g, a) {
  if (a.rb) {
    const r = roundaboutGeom();
    return { x: r.cx + L / 2 + 2, y: SIZE - 24, rot: 0 };
  }
  if (a.at) {
    const [dir, k] = a.at.split(':'), n = +k;
    if (dir === 'N') return { x: laneX(g, 'N', n), y: g.yB + 50, rot: 0 };
    if (dir === 'S') return { x: laneX(g, 'S', n), y: g.yT - 50, rot: 180 };
    if (dir === 'E') return { x: g.xL - 50, y: laneY(g, 'E', n), rot: 90 };
    return { x: g.xR + 50, y: laneY(g, 'W', n), rot: -90 };
  }
  if (a.lane) {
    const [dir, k] = a.lane.split(':');
    return { x: laneX(g, dir, +k), y: a.y, rot: a.rot ?? (dir === 'S' ? 180 : 0) };
  }
  return { x: a.x, y: a.y, rot: a.rot || 0 };
}

function tapZone(layer, z, id) {
  const r = el('rect', { x: z.x, y: z.y, width: z.w, height: z.h, rx: 8, class: 'tappable zone-hit zone-outline' }, layer);
  r.dataset.id = id;
  return r;
}

export function buildScene(spec) {
  const svg = svgRoot();
  const out = { svg, kind: spec.kind, actors: {}, zones: {} };
  if (spec.kind === 'curbs') {
    out.zones = drawCurbs(svg);
    return out;
  }
  let g = null;
  if (spec.kind === 'rb') {
    const r = drawRoundabout(svg);
    out.rb = r;
    const w = L;
    Object.assign(out.zones, {
      'rb:E': { cx: r.cx + r.rLane, cy: r.cy, r: 40 },
      'rb:N': { cx: r.cx, cy: r.cy - r.rLane, r: 40 },
      'rb:exitW': { x: 0, y: r.cy - w - 4, w: r.cx - r.rOut + 2, h: w + 4 },
      'rb:exitN': { x: r.cx - 2, y: 0, w: w + 4, h: r.cy - r.rOut + 2 },
      'rb:exitE': { x: r.cx + r.rOut - 2, y: r.cy - 2, w: SIZE, h: w + 4 }
    });
  } else {
    g = drawCross(svg, spec);
    out.g = g;
    if (spec.driveway) out.zones.driveway = { x: 0, y: spec.driveway.y - 24, w: g.xL + 2, h: 48 };
    if (g.twlt) out.zones.twlt = { x: g.nsDiv + 3, y: (spec.driveway ? spec.driveway.y : 110) + 40, w: g.twlt - 6, h: 200, minSpan: 50 };
    out.zones.rightEdge = { x: g.xR - 10, y: 20, w: 30, h: 205 };
    out.zones.leftSide = { x: 0, y: 0, w: g.xL + 30, h: SIZE };
  }
  if (g && spec.signal) signalHead(svg, g.xR + 22, g.yT - 58, spec.signal);
  const layer = el('g', { class: 'actors' }, svg);
  out.layer = layer;
  if (g && spec.laneTaps) spec.laneTaps.forEach(id => { out.zones[id] = zone(g, id + ':approach'); tapZone(layer, out.zones[id], id); });
  if (g && spec.stopTaps) {
    const x = laneX(g, 'N', 1) - L / 2 + 3, w = L - 6;
    out.zones.limit = { x, y: g.yB + 30, w, h: 44 };
    out.zones.crosswalk = { x, y: g.yB + 3, w, h: 20 };
    out.zones.middle = { x, y: g.yT + 6, w, h: g.yB - g.yT - 12 };
    for (const id of ['limit', 'crosswalk', 'middle']) tapZone(layer, out.zones[id], id);
  }
  for (const a of spec.actors || []) {
    const pos = placeActor(g, a);
    const node = car(layer, { ...pos, color: a.color, kind: a.kind, id: a.id, label: a.label });
    if (a.id) out.actors[a.id] = node;
    if (a.id === 'you') out.player = { ...pos, node };
  }
  out.zoneOf = name => out.zones[name] || zone(g, name);
  return out;
}

export function demoPath(sc, demo) {
  const p = sc.player;
  if (demo.path === 'twlt') {
    const g = sc.g, tx = g.twltX, dy = sc.zones.driveway.y + 0;
    return `M${p.x} ${p.y} C${p.x} ${p.y - 40} ${tx} ${p.y - 50} ${tx} ${p.y - 90} L${tx} ${dy + 40} Q${tx} ${dy} ${g.xL - 10} ${dy} L20 ${dy}`;
  }
  if (demo.path === 'pullOver') {
    const x = sc.g.xR - 10;
    return `M${p.x} ${p.y} C${p.x} ${p.y - 40} ${x} ${p.y - 50} ${x} ${p.y - 100}`;
  }
  if (demo.path === 'rbLeft') {
    const r = sc.rb, a = 70 * Math.PI / 180, b = 200 * Math.PI / 180;
    const sx = r.cx + r.rLane * Math.cos(a), sy = r.cy + r.rLane * Math.sin(a);
    const ex = r.cx + r.rLane * Math.cos(b), ey = r.cy + r.rLane * Math.sin(b);
    return `M${p.x} ${p.y} L${p.x} ${r.cy + r.rOut + 6} L${sx.toFixed(1)} ${sy.toFixed(1)} A${r.rLane} ${r.rLane} 0 1 0 ${ex.toFixed(1)} ${ey.toFixed(1)} L${r.cx - r.rOut - 4} ${r.cy - L / 2} L10 ${r.cy - L / 2}`;
  }
  const [fd, fk] = demo.from.split(':'), [td, tk] = demo.to.split(':');
  const path = turnPath(sc.g, { dir: fd, k: +fk }, { dir: td, k: +tk });
  return path.replace(/^M[\d.]+ [\d.]+/, `M${p.x} ${p.y}`);
}

// Checks a traced path against a goal. Returns {ok, msg, retry}.
export function checkTrace(sc, pts, goal) {
  const p = sc.player;
  if (pts.length < 6) return { retry: true, msg: 'Put your finger on your car and drag.' };
  if (Math.hypot(pts[0].x - p.x, pts[0].y - p.y) > 50) return { retry: true, msg: 'Start on your pink car.' };
  const last = pts[pts.length - 1];
  const endOk = goal.end.some(n => inZone(last, sc.zoneOf(n)));
  // ordered checkpoints
  let passOk = true;
  if (goal.pass) {
    let i = 0;
    for (const name of goal.pass) {
      const z = sc.zoneOf(name);
      const hits = [];
      for (; i < pts.length; i++) {
        if (inZone(pts[i], z)) hits.push(pts[i]);
        else if (hits.length && !z.minSpan) break;
      }
      const span = hits.length ? Math.max(...hits.map(h => h.y)) - Math.min(...hits.map(h => h.y)) : 0;
      if (!hits.length || (z.minSpan && span < z.minSpan)) { passOk = false; break; }
      if (z.minSpan) i = 0;
    }
  }
  if (endOk && passOk) return { ok: true };
  if (endOk && !passOk) return { ok: false, msg: goal.wrongOrder || 'Not quite. Watch the right way.' };
  for (const [name, msg] of Object.entries(goal.wrong || {})) if (inZone(last, sc.zoneOf(name))) return { ok: false, msg };
  return { ok: false, msg: 'Not quite. Watch the right way.' };
}

// A traffic light on the far corner, facing the player. state: 'red' | 'green' | 'arrow'
export function signalHead(p, x, y, state) {
  const g = el('g', { transform: `translate(${x} ${y})` }, p);
  el('rect', { x: -12, y: 0, width: 24, height: 62, rx: 7, fill: '#11152A', stroke: '#F7EEDD', 'stroke-width': 1.5 }, g);
  const lit = { red: 0, green: 2, arrow: 2 }[state];
  ['#FF3E3E', '#FFC53D', '#2FD27A'].forEach((c, i) => el('circle', { cx: 0, cy: 11 + i * 20, r: 7.5, fill: i === lit ? c : '#2B3160' }, g));
  if (state === 'arrow') el('path', { d: 'M4 51 H-4 M-1 47 L-5 51 L-1 55', stroke: '#11152A', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }, g);
}
