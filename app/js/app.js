import { DISTRICTS, ALL_QUESTIONS, ACHIEVEMENTS, RANKS, byId, SIGN_Q } from './data.js';
import { state, save, reset, rankFor, record } from './store.js';
import * as audio from './audio.js';
import * as S from './scene.js';

const app = document.getElementById('app');
const A = p => `assets/${p}.svg`;
const reduced = () => state.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- tiny DOM helper ---------- */

function h(tag, props, ...kids) {
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
const img = (p, cls = '', alt = '') => h('img', { src: A(p), class: cls, alt, draggable: 'false' });
const money = n => '$' + n.toLocaleString('en-US');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function btn(label, onClick, cls = 'btn') {
  return h('button', { class: cls, onClick: e => { audio.sfx('tap'); onClick(e); } }, label);
}
function speakBtn(getText) {
  if (!audio.canSpeak) return null;
  return h('button', { class: 'speak', 'aria-label': 'Read out loud', onClick: () => audio.speak(getText()) }, img('icons/sound'));
}

let cleanup = [], nav = 0;
function show(node, cls = '') {
  nav++;
  cleanup.forEach(f => f()); cleanup = [];
  audio.stopSpeaking();
  app.className = 'screen ' + cls;
  app.replaceChildren(node);
  app.scrollTop = 0;
}

async function inlineSvg(path, cls) {
  const wrap = h('div', { class: cls });
  try { wrap.innerHTML = await (await fetch(A(path))).text(); } catch { wrap.append(img(path)); }
  return wrap;
}

function applySettings() {
  const s = state.settings;
  document.documentElement.classList.toggle('big-text', s.big);
  document.documentElement.classList.toggle('reduce-motion', reduced());
  audio.setSfx(s.sfx);
}

/* ---------- toasts ---------- */

function toast(badge, title, sub) {
  const t = h('div', { class: 'toast' }, badge ? img(badge) : null, h('div', {}, h('b', {}, title), sub ? h('span', {}, sub) : null));
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3200);
}

function award(id) {
  if (state.ach[id]) return;
  state.ach[id] = Date.now();
  const a = ACHIEVEMENTS.find(x => x.id === id);
  audio.sfx('win');
  toast(a.badge, 'BADGE UNLOCKED', a.name);
}

/* ---------- splash + onboarding ---------- */

async function splash() {
  const my = nav;
  const art = await inlineSvg('brand/splash-1080x1920', 'splash-art');
  const node = h('button', { class: 'splash', 'aria-label': 'Tap to start', onClick: () => {
    audio.unlock();
    audio.setMusic(state.settings.music, state.settings.musicVol);
    state.started ? home() : onboard();
  } }, art);
  if (nav === my) show(node, 'no-pad');
}

function onboard() {
  let pick = state.avatar || 1;
  const name = h('input', { class: 'input', placeholder: 'Your name (optional)', maxlength: 14, value: state.name });
  const grid = h('div', { class: 'avatar-grid' });
  const draw = () => grid.replaceChildren(...[1, 2, 3, 4, 5, 6].map(i =>
    h('button', { class: 'avatar' + (i === pick ? ' on' : ''), 'aria-label': 'Driver ' + i, onClick: () => { audio.sfx('tap'); pick = i; draw(); } }, img('avatars/avatar-' + i))));
  draw();
  show(h('div', { class: 'col center gap-l onboard' },
    h('div', { class: 'kicker' }, 'WELCOME'),
    h('h1', { class: 'title' }, 'PICK YOUR DRIVER'),
    grid, name,
    btn('LET\'S GO', () => {
      state.avatar = pick; state.name = name.value.trim(); state.started = true; save(); home();
    }, 'btn primary big')
  ));
}

/* ---------- home ---------- */

function nextDistrict() {
  for (let i = 0; i < state.unlocked; i++) if (!state.districts[i].stars) return i;
  return Math.min(state.unlocked, DISTRICTS.length) - 1;
}

function topBar() {
  const r = rankFor(state.cash);
  return h('div', { class: 'topbar' },
    h('button', { class: 'me', onClick: trophies, 'aria-label': 'My trophies' },
      img('avatars/avatar-' + state.avatar, 'me-av'),
      h('div', { class: 'col' }, h('b', {}, state.name || 'Driver'), h('span', { class: 'mono gold' }, r.name.toUpperCase()))),
    h('div', { class: 'row gap-s' },
      h('div', { class: 'cash' }, money(state.cash)),
      h('button', { class: 'icon-btn', 'aria-label': 'Settings', onClick: settings }, img('icons/settings')))
  );
}

async function home() {
  applySettings();
  const di = nextDistrict(), d = DISTRICTS[di], my = nav;
  const logo = await inlineSvg('brand/logo-wordmark', 'wordmark');
  if (nav !== my) return; // the player already moved on
  const tile = (icon, label, fn, badge) => h('button', { class: 'tile', onClick: () => { audio.sfx('tap'); fn(); } },
    img(icon), h('span', {}, label), badge ? h('i', { class: 'count' }, badge) : null);
  show(h('div', { class: 'col gap-l home' },
    topBar(),
    logo,
    h('button', { class: 'mission-card', onClick: () => { audio.sfx('tap'); missionIntro(di); } },
      h('div', { class: 'row between' },
        h('span', { class: 'chip pink' }, img('icons/mission-flag'), 'MISSION ' + (di + 1)),
        h('span', { class: 'mono gold' }, state.districts[di].stars ? 'PLAY AGAIN' : 'UP NEXT')),
      h('div', { class: 'mission-name' }, d.name.toUpperCase()),
      h('div', { class: 'muted' }, d.topic),
      h('div', { class: 'play-pill' }, '▶  PLAY')),
    h('button', { class: 'drive-card', onClick: () => { audio.sfx('tap'); driveStart(); } },
      img('icons/car'),
      h('div', { class: 'col' }, h('b', {}, 'DRIVE PRACTICE'), h('span', {}, 'Draw your turns and tap the road. No reading lists.')),
      h('span', { class: 'go' }, '▶')),
    h('button', { class: 'drive-card road', onClick: () => { audio.sfx('tap'); roadMenu(); } },
      img('icons/key'),
      h('div', { class: 'col' }, h('b', {}, 'ROAD TEST · 3D'), h('span', {}, 'Drive a real street. Stop, signal, and yield like on the DMV drive test.')),
      h('span', { class: 'go' }, '▶')),
    h('div', { class: 'tiles' },
      tile('icons/district-map', 'MAP', map),
      tile('icons/timer', 'TEST', testMenu),
      tile('icons/handbook', 'REVIEW', reviewStart, state.review.length || null),
      tile('icons/trophy', 'TROPHIES', trophies))
  ), 'home-screen');
}

/* ---------- map ---------- */

function map() {
  const cards = DISTRICTS.map((d, i) => {
    const st = state.districts[i], locked = i >= state.unlocked;
    const status = locked ? 'LOCKED · CLEAR MISSION ' + i : st.stars ? 'CLEARED · BEST ' + st.best + '%' : 'READY';
    return h('button', { class: 'district' + (locked ? ' locked' : '') + (i === nextDistrict() ? ' active' : ''), disabled: locked, onClick: () => { audio.sfx('tap'); missionIntro(i); } },
      h('div', { class: 'row between' }, h('span', { class: 'mono gold' }, 'MISSION ' + (i + 1)), img(locked ? 'icons/lock' : st.stars ? 'icons/check' : 'icons/map-pin', 'ico')),
      h('div', { class: 'district-name' }, d.name.toUpperCase()),
      h('div', { class: 'muted' }, d.topic),
      h('div', { class: 'row between' },
        h('span', { class: 'mono small ' + (locked ? 'dim' : st.stars ? 'teal' : 'gold') }, status),
        h('span', { class: 'stars' }, '★'.repeat(st.stars) + '☆'.repeat(3 - st.stars))));
  });
  show(h('div', { class: 'col gap-m' }, header('CITY MAP', home), h('div', { class: 'districts' }, cards)));
}

function header(title, back) {
  return h('div', { class: 'screen-head' }, h('button', { class: 'icon-btn back', 'aria-label': 'Back', onClick: () => { audio.sfx('tap'); back(); } }, '‹'), h('h2', {}, title));
}

/* ---------- mission intro + learn cards ---------- */

function missionIntro(i) {
  const d = DISTRICTS[i], st = state.districts[i];
  const learnFirst = !st.learned;
  show(h('div', { class: 'col center gap-l intro' },
    header('', map),
    img(d.icon, 'intro-icon'),
    h('div', { class: 'title-card' },
      h('div', { class: 'kicker gold' }, 'MISSION ' + (i + 1)),
      h('div', { class: 'big-title' }, d.name.toUpperCase()),
      h('div', { class: 'sub' }, d.topic)),
    h('div', { class: 'col gap-s wide' },
      btn(learnFirst ? 'LEARN FIRST  ·  4 CARDS' : 'LEARN AGAIN', () => learn(i, 0), learnFirst ? 'btn primary big' : 'btn ghost big'),
      btn('START MISSION', () => startMission(i), learnFirst ? 'btn ghost big' : 'btn primary big'))
  ));
}

function learn(i, k) {
  const d = DISTRICTS[i], card = d.learn[k], last = k === d.learn.length - 1;
  const visual = h('div', { class: 'learn-visual' });
  if (card.img) visual.append(img(card.img, 'learn-img'));
  if (card.imgs) visual.append(h('div', { class: 'row gap-m center' }, card.imgs.map(p => img(p, 'learn-img small'))));
  if (card.big) visual.append(bigCard(card.big));
  if (card.anim) visual.append(animCard(card.anim));
  const text = card.say + ' ' + card.more;
  const node = h('div', { class: 'col gap-m learn' },
    header('LEARN · ' + d.name.toUpperCase(), () => missionIntro(i)),
    dots(d.learn.length, k),
    visual,
    h('div', { class: 'learn-text' }, h('div', { class: 'row gap-s' }, h('b', {}, card.say), speakBtn(() => text)), h('p', {}, card.more)),
    h('div', { class: 'row gap-s' },
      k > 0 ? btn('BACK', () => learn(i, k - 1), 'btn ghost') : null,
      btn(last ? 'START MISSION' : 'NEXT', () => {
        if (last) { state.districts[i].learned = true; save(); startMission(i); } else learn(i, k + 1);
      }, 'btn primary grow'))
  );
  show(node);
  if (state.settings.autoRead) audio.speak(text);
}

function dots(n, k, results) {
  return h('div', { class: 'dots' }, Array.from({ length: n }, (_, j) =>
    h('i', { class: results && results[j] != null ? (results[j] ? 'ok' : 'bad') : j === k ? 'on' : j < k ? 'done' : '' })));
}

function bigCard(b) {
  return h('div', { class: 'big-card' }, h('div', { class: 'big-word' }, b.text), b.sub ? h('div', { class: 'big-sub' }, b.sub) : null);
}

// Short looping "video" clips built from the scene engine.
function animCard(name) {
  const box = h('div', { class: 'anim-box' });
  let alive = true;
  cleanup.push(() => { alive = false; });
  const replay = h('button', { class: 'replay' }, '▶ WATCH AGAIN');
  const loop = async (run) => { do { await run(); await wait(900); } while (alive && !reduced()); };

  if (name === 'rightTurn' || name === 'leftTurn') {
    const right = name === 'rightTurn';
    const sc = S.buildScene({ kind: 'cross', ns: { n: 2, s: 2 }, ew: { e: 2, w: 2 }, actors: [{ at: right ? 'N:2:stop' : 'N:1:stop', id: 'you' }] });
    const d = S.demoPath(sc, right ? { from: 'N:2', to: 'E:2' } : { from: 'N:1', to: 'W:1' });
    S.el('path', { d, class: 'ghost-path' }, sc.layer);
    const start = sc.player.node.getAttribute('transform');
    const run = async () => { sc.player.node.setAttribute('transform', start); await wait(400); await S.driveAlong(sc.player.node, d, sc.svg, { duration: 2600, reduced: reduced() }); };
    box.append(sc.svg); loop(run); replay.onclick = run;
  } else if (name === 'pullOver') {
    const sc = S.buildScene({ kind: 'cross', ns: { n: 1, s: 1 }, ew: null, actors: [{ lane: 'N:1', y: 230, id: 'you' }, { lane: 'N:1', y: 340, kind: 'ambulance', id: 'amb' }] });
    const d = S.demoPath(sc, { path: 'pullOver' });
    const x = S.laneX(sc.g, 'N', 1);
    const start = sc.player.node.getAttribute('transform'), aStart = sc.actors.amb.getAttribute('transform');
    const run = async () => {
      sc.player.node.setAttribute('transform', start); sc.actors.amb.setAttribute('transform', aStart);
      await S.driveAlong(sc.player.node, d, sc.svg, { duration: 1600, reduced: reduced() });
      await S.driveAlong(sc.actors.amb, `M${x} 340 L${x} -60`, sc.svg, { duration: 1800, reduced: reduced() });
    };
    box.append(sc.svg); loop(run); replay.onclick = run;
  } else if (name === 'follow') {
    const sc = S.buildScene({ kind: 'cross', ns: { n: 1, s: 1 }, ew: null, actors: [{ lane: 'N:1', y: 150, color: '#1FC7B6', id: 'lead' }, { lane: 'N:1', y: 330, id: 'you' }] });
    const x = S.laneX(sc.g, 'N', 1);
    S.el('line', { x1: sc.g.xR + 4, x2: sc.g.xR + 30, y1: 120, y2: 120, stroke: '#FFC53D', 'stroke-width': 6 }, sc.layer);
    const count = S.el('text', { x: 70, y: 190, class: 'scene-count', 'text-anchor': 'middle' }, sc.layer);
    const run = async () => {
      count.textContent = '';
      const a = S.driveAlong(sc.actors.lead, `M${x} 150 L${x} -40`, sc.svg, { duration: 2600 });
      const b = S.driveAlong(sc.player.node, `M${x} 330 L${x} 110`, sc.svg, { duration: 4400 });
      await wait(250);
      for (const n of ['1', '2', '3']) { count.textContent = n; audio.sfx('tap'); await wait(1250); }
      count.textContent = '✓'; await Promise.all([a, b]);
    };
    box.append(sc.svg); if (reduced()) count.textContent = '3 sec'; else loop(run); replay.onclick = run;
  } else if (name === 'truck') {
    const sc = S.buildScene({ kind: 'cross', ns: { n: 3, s: 0 }, ew: null, actors: [{ lane: 'N:2', y: 190, kind: 'truck' }] });
    const g = sc.g, x2 = S.laneX(g, 'N', 2);
    const zones = [{ x: x2 - 17, y: 245, w: 34, h: 110 }, { x: S.laneX(g, 'N', 3) - 17, y: 140, w: 34, h: 150 }, { x: S.laneX(g, 'N', 1) - 17, y: 150, w: 34, h: 50 }, { x: x2 - 17, y: 108, w: 34, h: 26 }];
    zones.forEach(z => S.highlight(sc.svg, z, '#FF3E7F', 'hl blink'));
    box.append(sc.svg); replay.hidden = true;
  } else if (name === 'curbs') {
    const sc = S.buildScene({ kind: 'curbs' });
    box.append(sc.svg); replay.hidden = true;
  } else if (name === 'signalCycle') {
    const pic = img('signals/signal-green', 'learn-img');
    box.classList.add('plain'); box.append(pic);
    const seq = ['signal-green', 'signal-yellow', 'signal-red'];
    const run = async () => { for (const s of seq) { pic.src = A('signals/' + s); await wait(1300); } };
    loop(run); replay.onclick = run;
  }
  return h('div', { class: 'col center gap-s' }, box, replay);
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- play ---------- */

function pickForMission(i) {
  const pool = DISTRICTS[i].qs;
  const n = Math.min(state.settings.perMission, pool.length);
  const score = q => { const s = state.stats[q.id]; if (!s) return 0; if (state.review.includes(q.id)) return 1; return 2 + s.r; };
  const ranked = shuffle(pool).sort((a, b) => score(a) - score(b));
  // Every mission mixes game types: at least 2 drawing/tapping questions and 1 picture question when the district has them.
  const want = [...ranked.filter(q => q.type === 'trace' || q.type === 'tap').slice(0, 2), ...ranked.filter(q => q.type === 'pics').slice(0, 1)];
  const pick = [...want, ...ranked.filter(q => !want.includes(q))].slice(0, n);
  return shuffle(pick).map(q => ({ ...byId[q.id] }));
}

function driveStart() {
  const list = shuffle(ALL_QUESTIONS.filter(q => q.type === 'trace' || q.type === 'tap')).slice(0, 8);
  play({ mode: 'drive', list: list.map(q => ({ ...q })) });
}

function startMission(i) {
  state.districts[i].plays++; save();
  play({ mode: 'mission', district: i, list: pickForMission(i) });
}

function reviewStart() {
  if (!state.review.length) {
    show(h('div', { class: 'col center gap-l' }, header('REVIEW', home), img('icons/check', 'intro-icon'),
      h('div', { class: 'big-title' }, 'ALL CLEAR'), h('p', { class: 'muted center-text' }, 'No mistakes to review right now. Nice driving!'), btn('HOME', home, 'btn primary big')));
    return;
  }
  play({ mode: 'review', list: shuffle(state.review).slice(0, 8).map(id => ({ ...byId[id] })) });
}

function testMenu() {
  show(h('div', { class: 'col gap-m' }, header('PRACTICE', home),
    h('button', { class: 'mode-card', onClick: () => { audio.sfx('tap'); play({ mode: 'test', list: shuffle(ALL_QUESTIONS).slice(0, 20).map(q => ({ ...q })) }); } },
      img('icons/handbook'), h('div', { class: 'col' }, h('b', {}, 'PRACTICE TEST'), h('span', {}, '20 questions from every district. Get 16 right to pass.'), h('span', { class: 'mono gold small' }, 'BEST ' + state.test.best + ' / 20'))),
    h('button', { class: 'mode-card', onClick: () => { audio.sfx('tap'); play({ mode: 'speed', list: shuffle(ALL_QUESTIONS.filter(q => q.type === 'choice' || q.type === 'pics')).slice(0, 10).map(q => ({ ...q })), time: 90 }); } },
      img('icons/timer'), h('div', { class: 'col' }, h('b', {}, 'SPEED RUN'), h('span', {}, '10 quick questions. 90 seconds. Optional!'), h('span', { class: 'mono gold small' }, 'BEST ' + state.test.speedBest + ' / 10'))),
    h('p', { class: 'muted small' }, 'The real DMV knowledge test has 46 questions for drivers under 18. You need 38 right to pass.')
  ));
}

function play(run) {
  run.i = 0; run.results = []; run.earned = 0; run.strikes = 0;
  run.challenge = !state.settings.calm;
  run.list.forEach(q => {
    if (q.type === 'choice' || q.type === 'pics') {
      const order = shuffle(q.a.map((_, j) => j));
      q.a = order.map(j => q.a[j]); q.c = order.indexOf(q.c);
    }
  });
  if (run.time) { run.left = run.time; }
  question(run);
}

function title(run) {
  if (run.mode === 'mission') return ['MISSION ' + (run.district + 1), DISTRICTS[run.district].name];
  if (run.mode === 'test') return ['PRACTICE TEST', 'All districts'];
  if (run.mode === 'speed') return ['SPEED RUN', 'Beat the clock'];
  if (run.mode === 'drive') return ['DRIVE', 'Draw and tap'];
  return ['REVIEW', 'Fix your mistakes'];
}

function question(run) {
  const q = run.list[run.i];
  const [t1, t2] = title(run);
  let answered = false;

  // HUD
  const timerEl = run.time ? h('div', { class: 'hud-timer' }) : null;
  const strikeEl = run.challenge ? h('div', { class: 'strikes' }, [0, 1, 2, 3, 4].map(k => img(k < run.strikes ? 'icons/strike-on' : 'icons/strike-off'))) : null;
  const cashEl = h('div', { class: 'hud-cash' }, money(state.cash));
  const hud = h('div', { class: 'hud' },
    h('div', { class: 'row gap-s' },
      h('button', { class: 'icon-btn', 'aria-label': 'Pause', onClick: () => pause(run) }, img('icons/pause')),
      h('div', { class: 'col' }, h('div', { class: 'chip pink' }, img('icons/mission-flag'), t1), h('div', { class: 'hud-sub' }, t2))),
    h('div', { class: 'col end gap-xs' }, cashEl, strikeEl, timerEl));

  const stage = h('div', { class: 'stage' });
  const sheet = h('div', { class: 'sheet' });
  const flash = h('div', { class: 'flash' });
  const fb = h('div', { class: 'feedback', hidden: true });
  const qText = h('div', { class: 'q-text' }, q.q);
  const readText = () => q.q + (q.type === 'choice' ? ' ' + q.a.map((a, j) => 'ABC'[j] + '. ' + a).join(' ') : '');

  sheet.append(
    h('div', { class: 'row between mono gold small' }, h('span', {}, 'QUESTION ' + (run.i + 1) + ' OF ' + run.list.length), h('span', {}, '+$100')),
    h('div', { class: 'row gap-s top' }, qText, speakBtn(readText)));

  const done = (right, msg, extra) => {
    if (answered) return; answered = true;
    run.results[run.i] = right;
    record(q.id, right);
    if (right) {
      state.cash += 100; run.earned += 100; state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      if (state.streak >= 5) award('streak5');
      if (SIGN_Q.has(q.id)) { state.signRight++; if (state.signRight >= 10) award('signs'); }
      audio.sfx('right'); setTimeout(() => audio.sfx('cash'), 250);
      cashEl.textContent = money(state.cash); cashEl.classList.add('bump');
    } else {
      state.streak = 0;
      audio.sfx('wrong');
      if (run.challenge) { run.strikes++; strikeEl.replaceChildren(...[0, 1, 2, 3, 4].map(k => img(k < run.strikes ? 'icons/strike-on' : 'icons/strike-off'))); }
    }
    save();
    flash.textContent = right ? '+$100' : run.challenge ? 'STRIKE!' : 'ALMOST!';
    flash.className = 'flash show ' + (right ? 'ok' : 'bad');
    const failed = run.challenge && run.strikes >= 5;
    const last = run.i === run.list.length - 1;
    fb.hidden = false;
    sheet.querySelector('.hint')?.remove();
    fb.replaceChildren(
      h('div', { class: 'col grow gap-xs' },
        msg && !right ? h('b', { class: 'pink-text' }, msg) : null,
        h('div', { class: 'tip' }, q.tip),
        q.src ? h('div', { class: 'mono dim small' }, 'HANDBOOK · SECTION ' + q.src) : null),
      ...(extra ? [extra] : []),
      btn(failed ? 'RESULTS' : last ? 'FINISH' : 'NEXT', () => next(run, failed), 'btn gold'));
    if (state.settings.autoRead) audio.speak((right ? 'Correct! ' : 'Not quite. ') + q.tip);
    const nextBtn = fb.querySelector('.btn.gold');
    nextBtn.focus({ preventScroll: true });
    nextBtn.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  };

  // stage + answers per type
  if (q.type === 'choice') {
    stage.append(visualFor(q));
    const list = h('div', { class: 'answers' });
    const buttons = q.a.map((text, j) => h('button', { class: 'answer', onClick: () => {
      if (answered) return;
      buttons.forEach((b, k) => { b.disabled = true; if (k === q.c) mark(b, 'ok'); else if (k === j) mark(b, 'bad'); });
      done(j === q.c);
    } }, h('span', { class: 'letter' }, 'ABC'[j]), h('span', {}, text)));
    list.append(...buttons); sheet.append(list);
    run.keys = buttons;
  } else if (q.type === 'pics') {
    stage.classList.add('pics-stage');
    const buttons = q.a.map((opt, j) => h('button', { class: 'pic', 'aria-label': opt.label, onClick: () => {
      if (answered) return;
      buttons.forEach((b, k) => { b.disabled = true; if (k === q.c) b.classList.add('ok'); else if (k === j) b.classList.add('bad'); });
      done(j === q.c);
    } }, opt.img ? img(opt.img) : wheels(opt.wheels), h('span', {}, opt.label)));
    stage.append(h('div', { class: 'pics' }, buttons));
    run.keys = buttons;
  } else if (q.type === 'tap') {
    const sc = S.buildScene(q.scene);
    stage.append(h('div', { class: 'scene-wrap' }, sc.svg));
    sheet.append(h('div', { class: 'hint' }, '👆  Tap your answer on the picture.'));
    sc.svg.addEventListener('click', e => {
      if (answered) return;
      const t = e.target.closest('.tappable');
      if (!t || t.dataset.id === 'you' && !q.ok.includes('you')) return;
      const id = t.dataset.id, right = q.ok.includes(id);
      for (const okId of q.ok) {
        const z = sc.zones[okId];
        if (z) S.highlight(sc.svg, z, '#1FC7B6'); else sc.actors[okId]?.classList.add('ring-ok');
      }
      if (!right) { const z = sc.zones[id]; if (z) S.highlight(sc.svg, z, '#FF3E7F'); else t.classList.add('ring-bad'); }
      done(right);
    });
    run.keys = null;
  } else if (q.type === 'trace') {
    const sc = S.buildScene(q.scene);
    const wrap = h('div', { class: 'scene-wrap' }, sc.svg);
    stage.append(wrap);
    const pulse = S.el('circle', { cx: sc.player.x, cy: sc.player.y, r: 30, class: 'pulse' }, sc.svg);
    const ink = S.el('polyline', { points: '', class: 'ink' }, sc.svg);
    const msg = h('div', { class: 'hint' }, '✍️  Put your finger on your car and draw where it goes.');
    sheet.append(msg);
    let pts = [], drawing = false;
    const startPos = sc.player.node.getAttribute('transform');
    sc.svg.addEventListener('pointerdown', e => {
      if (answered) return;
      drawing = true; pts = [S.toSvgPoint(sc.svg, e)];
      sc.svg.setPointerCapture(e.pointerId);
      ink.setAttribute('points', ''); ink.setAttribute('class', 'ink');
      pulse.style.display = 'none';
    });
    sc.svg.addEventListener('pointermove', e => {
      if (!drawing) return;
      const p = S.toSvgPoint(sc.svg, e), l = pts[pts.length - 1];
      if (Math.hypot(p.x - l.x, p.y - l.y) > 3) { pts.push(p); ink.setAttribute('points', pts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')); }
    });
    const end = async () => {
      if (!drawing) return; drawing = false;
      const r = S.checkTrace(sc, pts, q.goal);
      if (r.retry) { msg.textContent = '👉  ' + r.msg; msg.classList.add('nudge'); ink.setAttribute('points', ''); pulse.style.display = ''; setTimeout(() => msg.classList.remove('nudge'), 500); return; }
      ink.setAttribute('class', 'ink ' + (r.ok ? 'ok' : 'bad'));
      msg.remove();
      const d = S.demoPath(sc, q.demo);
      const ghost = S.el('path', { d, class: 'ghost-path' }, sc.layer);
      const watch = async () => { sc.player.node.setAttribute('transform', startPos); audio.sfx('whoosh'); await S.driveAlong(sc.player.node, d, sc.svg, { duration: 2400, reduced: reduced() }); };
      done(r.ok, r.msg, h('button', { class: 'btn ghost small', onClick: watch }, '▶ WATCH'));
      ghost.getBoundingClientRect();
      await wait(300); watch();
    };
    sc.svg.addEventListener('pointerup', end);
    sc.svg.addEventListener('pointercancel', end);
    run.keys = null;
  }

  sheet.append(fb);
  show(h('div', { class: 'play' }, hud, dots(run.list.length, run.i, run.results), h('div', { class: 'stage-wrap' }, stage, flash), sheet), 'no-pad play-screen');
  if (state.settings.autoRead) audio.speak(readText());

  // keyboard: 1-3 to answer, Enter for next
  const onKey = e => {
    if (e.key >= '1' && e.key <= '3' && run.keys && !answered) run.keys[+e.key - 1]?.click();
  };
  document.addEventListener('keydown', onKey);
  cleanup.push(() => document.removeEventListener('keydown', onKey));

  // timer
  if (run.time) {
    const tick = () => {
      const m = Math.floor(run.left / 60), s = run.left % 60, pct = run.left / run.time * 100;
      timerEl.replaceChildren(h('div', { class: 'ring', style: `background:conic-gradient(#FFC53D 0 ${pct}%,#2B3160 ${pct}% 100%)` }, h('span', {}, m + ':' + String(s).padStart(2, '0'))));
    };
    tick();
    const iv = setInterval(() => {
      if (run.paused) return;
      run.left--; tick();
      if (run.left <= 0) { clearInterval(iv); results(run, false, true); }
    }, 1000);
    cleanup.push(() => clearInterval(iv));
  }
}

function mark(b, k) {
  b.classList.add(k);
  b.querySelector('.letter').replaceWith(img(k === 'ok' ? 'icons/check' : 'icons/wrong', 'letter-ico'));
}

function next(run, failed) {
  if (failed || run.i === run.list.length - 1) return results(run, failed);
  run.i++;
  question(run);
}

function visualFor(q) {
  if (q.scene) { const sc = S.buildScene(q.scene); return h('div', { class: 'scene-wrap' }, sc.svg); }
  if (q.big) return h('div', { class: 'backdrop' }, bigCard(q.big));
  if (q.wide) return h('div', { class: 'wide-img' }, img(q.img));
  return h('div', { class: 'backdrop' }, h('div', { class: 'sign-card' + (q.dark ? ' dark' : '') }, img(q.img)));
}

// Top-down front wheels next to a curb, for hill-parking questions.
function wheels(kind) {
  const svg = S.el('svg', { viewBox: '0 0 120 140', class: 'wheels' });
  S.el('rect', { x: 0, y: 0, width: 120, height: 140, fill: '#3B4050' }, svg);
  S.el('rect', { x: 100, y: 0, width: 20, height: 140, fill: '#CFC6B4' }, svg);
  S.el('rect', { x: 36, y: 20, width: 48, height: 100, rx: 12, fill: '#FF3E7F' }, svg);
  S.el('rect', { x: 42, y: 40, width: 36, height: 16, rx: 4, fill: '#1B2140' }, svg);
  const a = kind === 'toward' ? 28 : kind === 'away' ? -28 : 0;
  for (const x of [32, 88]) S.el('rect', { x: x - 5, y: 26, width: 10, height: 22, rx: 3, fill: '#11152A', stroke: '#F7EEDD', 'stroke-width': 1.5, transform: `rotate(${a} ${x} 37)` }, svg);
  for (const x of [32, 88]) S.el('rect', { x: x - 5, y: 92, width: 10, height: 22, rx: 3, fill: '#11152A' }, svg);
  const t = S.el('text', { x: 110, y: 74, 'text-anchor': 'middle', class: 'scene-label dark', transform: 'rotate(90 110 74)' }, svg);
  t.textContent = 'CURB';
  return svg;
}

/* ---------- 3D road test ---------- */

let roadMod = null;
async function loadRoad() { return roadMod || (roadMod = await import('./roadtest.js')); }

async function roadMenu() {
  const my = nav;
  let mod;
  try { mod = await loadRoad(); } catch { show(h('div', { class: 'col gap-m' }, header('ROAD TEST', home), h('p', { class: 'muted' }, 'The 3D road test could not load. Check your connection and try again.'))); return; }
  if (nav !== my) return;
  const done = mod.DRIVES.filter(d => state.road[d.id]).length;
  show(h('div', { class: 'col gap-m' }, header('ROAD TEST · 3D', home),
    h('p', { class: 'muted' }, 'Short drives that practice what the DMV examiner checks. Hold GO to drive and BRAKE to stop. The car steers itself.'),
    h('div', { class: 'mono gold small' }, done + ' OF ' + mod.DRIVES.length + ' DRIVES PASSED'),
    h('div', { class: 'districts' }, mod.DRIVES.map((d, i) => {
      const st = state.road[d.id] || 0;
      return h('button', { class: 'district' + (!st && i === mod.DRIVES.findIndex(x => !state.road[x.id]) ? ' active' : ''), onClick: () => { audio.sfx('tap'); roadDrive(i); } },
        h('div', { class: 'row between' }, h('span', { class: 'mono gold' }, 'DRIVE ' + (i + 1)), img(st ? 'icons/check' : 'icons/car', 'ico')),
        h('div', { class: 'district-name' }, d.name.toUpperCase()),
        h('div', { class: 'muted' }, d.goal),
        h('div', { class: 'row between' }, h('span', { class: 'mono small ' + (st ? 'teal' : 'gold') }, st ? 'PASSED' : 'READY'), h('span', { class: 'stars' }, '★'.repeat(st) + '☆'.repeat(3 - st))));
    }))));
}

async function roadDrive(i) {
  const mod = await loadRoad();
  const drive = mod.DRIVES[i];
  const box = h('div', { class: 'rt' });
  show(box, 'no-pad road-screen');
  audio.setMusic(false);
  const destroy = mod.startDrive(box, drive, {
    h, img, audio,
    reduced,
    voice: () => state.settings.driveVoice,
    setVoice: on => { state.settings.driveVoice = on; save(); },
    onExit: () => roadMenu(),
    onDone: ({ stars, again }) => {
      const first = !state.road[drive.id];
      state.road[drive.id] = Math.max(state.road[drive.id] || 0, stars);
      const earned = (first ? 300 : 100) + (stars === 3 ? 100 : 0);
      state.cash += earned; save();
      toast('icons/cash', '+' + money(earned), drive.name + ' passed');
      if (again) roadDrive(i); else if (i + 1 < mod.DRIVES.length) roadDrive(i + 1); else roadMenu();
    }
  });
  cleanup.push(() => { destroy(); audio.setMusic(state.settings.music, state.settings.musicVol); });
}

/* ---------- pause ---------- */

function pause(run) {
  run.paused = true;
  audio.stopSpeaking();
  const close = () => { run.paused = false; ov.remove(); };
  const ov = h('div', { class: 'overlay' },
    h('div', { class: 'col center gap-l' },
      h('div', { class: 'breathe' }),
      h('div', { class: 'big-title' }, 'TAKE A BREAK'),
      h('p', { class: 'muted center-text' }, 'Breathe in as the circle grows. Breathe out as it shrinks.'),
      btn('KEEP PLAYING', close, 'btn primary big'),
      btn('QUIT TO HOME', () => { ov.remove(); home(); }, 'btn ghost big')));
  document.body.append(ov);
  cleanup.push(() => ov.remove());
}

/* ---------- results ---------- */

function results(run, failed, timeUp) {
  const right = run.results.filter(Boolean).length, total = run.list.length;
  const before = rankFor(state.cash - run.earned);
  let bonus = 0, headline, sub, stars = 0;
  const pct = Math.round(right / total * 100);

  if (run.mode === 'mission') {
    const d = state.districts[run.district];
    const cleared = !failed && right >= Math.ceil(total * 2 / 3);
    stars = cleared ? (right === total ? 3 : pct >= 80 ? 2 : 1) : 0;
    if (cleared) {
      bonus = 200 + (right === total ? 300 : 0);
      d.stars = Math.max(d.stars, stars); d.best = Math.max(d.best, pct);
      state.unlocked = Math.max(state.unlocked, Math.min(DISTRICTS.length, run.district + 2));
      award('district');
      if (right === total) award('perfect');
    }
    headline = cleared ? 'MISSION PASSED' : 'SO CLOSE';
    sub = cleared ? DISTRICTS[run.district].topic : 'Get ' + Math.ceil(total * 2 / 3) + ' right to clear it. You can do it!';
  } else if (run.mode === 'test') {
    const pass = right >= 16;
    state.test.best = Math.max(state.test.best, right);
    if (pass) { state.test.passes++; bonus = 500; award('clean'); }
    headline = pass ? 'TEST PASSED' : 'KEEP PRACTICING';
    sub = pass ? 'You are getting ready for the real test!' : 'You need 16 right. Review your mistakes and try again.';
  } else if (run.mode === 'speed') {
    state.test.speedBest = Math.max(state.test.speedBest, right);
    award('speed');
    headline = timeUp ? 'TIME!' : 'FINISHED';
    sub = 'Speed run score';
  } else if (run.mode === 'drive') {
    headline = right === total ? 'PERFECT DRIVE' : 'NICE DRIVING';
    sub = 'Drive practice';
  } else {
    headline = 'REVIEW DONE';
    sub = state.review.length ? state.review.length + ' left to fix' : 'All mistakes fixed!';
  }
  state.cash += bonus;
  save();
  const after = rankFor(state.cash);
  const rankUp = after.index > before.index;
  audio.sfx(headline.includes('PASSED') || rankUp ? 'win' : 'cash');

  const next = run.mode === 'mission' && stars && run.district + 1 < DISTRICTS.length
    ? btn('NEXT MISSION', () => missionIntro(run.district + 1), 'btn primary grow')
    : run.mode === 'mission' ? btn('TRY AGAIN', () => startMission(run.district), 'btn primary grow')
      : btn('HOME', home, 'btn primary grow');

  show(h('div', { class: 'col center gap-m results' },
    h('div', { class: 'banner' }, h('div', { class: 'banner-title' + (headline.includes('PASSED') ? ' gold' : '') }, headline), h('div', { class: 'banner-sub' }, sub)),
    img(after.badge, 'rank-badge' + (rankUp ? ' pop' : '')),
    rankUp ? h('div', { class: 'teal big-line' }, 'RANK UP: ' + after.name.toUpperCase() + '!') : h('div', { class: 'muted' }, 'Rank: ' + after.name),
    h('div', { class: 'score' }, right + ' / ' + total),
    stars ? h('div', { class: 'stars big' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)) : null,
    h('div', { class: 'gold big-line' }, '+' + money(run.earned + bonus)),
    after.next ? h('div', { class: 'progress-bar' }, h('i', { style: `width:${Math.min(100, (state.cash - after.min) / (after.next.min - after.min) * 100)}%` })) : null,
    after.next ? h('div', { class: 'mono small dim' }, money(after.next.min - state.cash) + ' TO ' + after.next.name.toUpperCase()) : null,
    h('div', { class: 'row gap-s wide' },
      run.results.some(r => r === false) ? btn('REVIEW', reviewStart, 'btn ghost grow') : btn('MAP', map, 'btn ghost grow'),
      next)
  ));
}

/* ---------- trophies ---------- */

function trophies() {
  const r = rankFor(state.cash);
  show(h('div', { class: 'col gap-m' }, header('TROPHIES', home),
    h('div', { class: 'panel col center gap-s' },
      img(r.badge, 'rank-badge'),
      h('div', { class: 'big-title' }, r.name.toUpperCase()),
      h('div', { class: 'gold big-line' }, money(state.cash)),
      r.next ? h('div', { class: 'progress-bar' }, h('i', { style: `width:${Math.min(100, (state.cash - r.min) / (r.next.min - r.min) * 100)}%` })) : null,
      r.next ? h('div', { class: 'mono small dim' }, 'NEXT: ' + r.next.name.toUpperCase() + ' AT ' + money(r.next.min)) : h('div', { class: 'teal' }, 'Top rank!')),
    h('h3', { class: 'section' }, 'RANKS'),
    h('div', { class: 'badge-row' }, RANKS.map((x, i) => h('div', { class: 'badge-cell' + (i > r.index ? ' locked' : '') }, img(x.badge), h('span', {}, x.name)))),
    h('h3', { class: 'section' }, 'BADGES'),
    h('div', { class: 'badge-row' }, ACHIEVEMENTS.map(a => h('div', { class: 'badge-cell' + (state.ach[a.id] ? '' : ' locked') }, img(a.badge), h('span', {}, a.name), h('small', {}, a.desc)))),
    h('h3', { class: 'section' }, 'MY BEST'),
    h('div', { class: 'panel stats' },
      stat('Best streak', state.bestStreak), stat('Practice test', state.test.best + ' / 20'), stat('Speed run', state.test.speedBest + ' / 10'),
      stat('Districts cleared', state.districts.filter(d => d.stars).length + ' / ' + DISTRICTS.length))
  ));
}
const stat = (k, v) => h('div', { class: 'row between' }, h('span', { class: 'muted' }, k), h('b', {}, String(v)));

/* ---------- settings ---------- */

function settings() {
  const s = state.settings;
  const toggle = (key, label, help, after) => {
    const input = h('input', { type: 'checkbox', checked: s[key] });
    input.addEventListener('change', () => { s[key] = input.checked; save(); applySettings(); after && after(); });
    return h('label', { class: 'setting' }, h('div', { class: 'col' }, h('b', {}, label), help ? h('span', { class: 'muted small' }, help) : null), h('span', { class: 'switch' }, input, h('i')));
  };
  const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.musicVol, class: 'range', 'aria-label': 'Music volume' });
  vol.addEventListener('input', () => { s.musicVol = +vol.value; audio.setMusic(s.music, s.musicVol); save(); });
  const per = h('div', { class: 'seg' }, [4, 6, 8].map(n => h('button', { class: s.perMission === n ? 'on' : '', onClick: () => { s.perMission = n; save(); settings(); } }, String(n))));

  show(h('div', { class: 'col gap-m' }, header('SETTINGS', home),
    toggle('music', 'Music', 'Calm background beats.', () => audio.setMusic(s.music, s.musicVol)),
    h('div', { class: 'setting' }, h('b', {}, 'Music volume'), vol),
    toggle('sfx', 'Sound effects', 'Dings for right answers.'),
    audio.canSpeak ? toggle('autoRead', 'Read questions out loud', 'You can always tap the speaker button.') : null,
    toggle('calm', 'Calm mode', 'No strikes. Missions never fail. Recommended.'),
    toggle('big', 'Bigger text'),
    toggle('reduceMotion', 'Less motion', 'Stops moving animations.'),
    h('div', { class: 'setting' }, h('div', { class: 'col' }, h('b', {}, 'Questions per mission'), h('span', { class: 'muted small' }, 'Fewer = shorter missions.')), per),
    resetBtn(),
    h('p', { class: 'muted small' }, 'Questions are based on the California Driver\'s Handbook (California DMV, 2025), licensed under CC BY-NC 4.0. Practice only. This app is not made by the DMV.')
  ));
}

// Two taps to erase progress, so it can't happen by accident.
function resetBtn() {
  let armed = false;
  const b = btn('RESET MY PROGRESS', () => {
    if (armed) { reset(); home(); return; }
    armed = true; b.textContent = 'TAP AGAIN TO ERASE EVERYTHING';
    setTimeout(() => { armed = false; b.textContent = 'RESET MY PROGRESS'; }, 4000);
  }, 'btn ghost danger');
  return b;
}

/* ---------- boot ---------- */

applySettings();
splash();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
// Pause music when the app is hidden (phone locked, switched apps).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { audio.setMusic(false); audio.stopSpeaking(); } else if (state.started) audio.setMusic(state.settings.music, state.settings.musicVol);
});

// For automated checks.
window.__permitRun = { state, DISTRICTS, go: { home, map, trophies, settings, testMenu, missionIntro, learn, startMission, play, results, roadMenu, roadDrive } };
