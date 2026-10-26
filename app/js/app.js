import { DISTRICTS, ALL_QUESTIONS, ACHIEVEMENTS, RANKS, byId, SIGN_Q } from './data.js';
import { TOPICS, LESSONS, topicById, lessonById, lessonsOf, lessonNumber } from './content.js';
import { state, save, reset, rankFor, record, statusFor, bestFor, readiness, currentLesson, recordAttempt, PASS_MARK } from './store.js';
import { A, h, img, num, money, btn, speakBtn, header, dots, ring, pill, tabBar, ico } from './ui.js';
import * as audio from './audio.js';
import * as S from './scene.js';

const app = document.getElementById('app');
const reduced = () => state.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

// Where the four tabs lead.
const go = { learn: () => home(), practice: () => testMenu(), handbook: () => handbook(), profile: () => trophies() };

/* ---------- shared helpers ---------- */

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// The illustration a lesson shows on its card and in its reader: the lesson's
// own road scene when it has one, otherwise the picture for its topic.
const TOPIC_HERO = {
  signs: 'scenes/real-signs-street',
  rights: 'scenes/t-intersection',
  speed: 'signs/speed-limit-25',
  parking: 'scenes/blue-curb',
  alcohol: 'signs/school-zone'
};
const heroFor = lesson => lesson.scene || TOPIC_HERO[lesson.topic] || 'signs/stop';
const isScene = src => src.startsWith('scenes/');
const mmss = s => { const m = Math.floor(s / 60); return m + ':' + String(Math.round(s % 60)).padStart(2, '0'); };

let cleanup = [], nav = 0;
function show(node, cls = '') {
  nav++;
  cleanup.forEach(f => f()); cleanup = [];
  audio.stopSpeaking();
  app.className = 'screen ' + cls;
  app.replaceChildren(node);
  // The tab bar sits beside the screen, not inside its fade-in wrapper: a
  // transformed ancestor would drag the fixed bar into the content column.
  const tabs = node.querySelector('.tabbar');
  if (tabs) app.append(tabs);
  app.scrollTop = 0;
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

function splash() {
  const start = () => {
    try { localStorage.setItem('permitrun.design', 'modern'); } catch { /* still playable */ }
    audio.unlock();
    audio.setMusic(state.settings.music, state.settings.musicVol);
    state.started ? home() : onboard();
  };
  const node = h('div', { class: 'welcome' },
    img('brand/app-icon-1024', 'welcome-logo'),
    h('div', { class: 'col center gap-s' },
      h('div', { class: 'welcome-title' }, 'Permit Run'),
      h('div', { class: 'welcome-sub' }, 'California permit prep, one short lesson at a time.')),
    h('button', { class: 'btn dark big', onClick: start }, 'Get started'),
    h('button', { class: 'welcome-alt', onClick: () => useDesign('classic') }, 'Prefer the classic game look?'));
  show(node, 'no-pad');
}

// Switch to the other design. Both read the same saved progress.
function useDesign(which) {
  try { localStorage.setItem('permitrun.design', which); } catch { /* the link still works */ }
  location.href = which === 'classic' ? 'classic/' : './';
}

function onboard() {
  let pick = state.avatar || 1;
  const name = h('input', { class: 'input', placeholder: 'Your name (optional)', maxlength: 14, value: state.name });
  const grid = h('div', { class: 'avatar-grid' });
  const draw = () => grid.replaceChildren(...[1, 2, 3, 4, 5, 6].map(i =>
    h('button', { class: 'avatar' + (i === pick ? ' on' : ''), 'aria-label': 'Driver ' + i, onClick: () => { audio.sfx('tap'); pick = i; draw(); } }, img('avatars/avatar-' + i))));
  draw();
  show(h('div', { class: 'col gap-l onboard' },
    h('div', { class: 'col gap-xs' },
      h('span', { class: 'eyebrow' }, 'Welcome'),
      h('h1', { class: 'learn-title' }, 'Pick your driver'),
      h('p', { class: 'muted' }, 'This is you in every picture.')),
    grid, name,
    btn('Get started', () => {
      state.avatar = pick; state.name = name.value.trim(); state.started = true; save(); home();
    }, 'btn dark big')
  ));
}

/* ---------- home ---------- */

function nextDistrict() {
  for (let i = 0; i < state.unlocked; i++) if (!state.districts[i].stars) return i;
  return Math.min(state.unlocked, DISTRICTS.length) - 1;
}

// Learn — the home screen. Streak and points, the lesson to continue, test
// readiness, then every lesson in order.
function home() {
  applySettings();
  const cur = currentLesson();
  const topic = topicById(cur.topic);
  const rd = readiness();

  // The hero of the Continue card: the lesson's road scene, or its topic's sign.
  const hero = heroFor(cur);

  const row = l => {
    const s = statusFor(l.id);
    const score = bestFor(l.id);
    const name = topicById(l.topic).name;
    const sub = s === 'done' ? name + ' · ' + score + '%'
      : s === 'in_progress' ? name + ' · ' + l.minutes + ' min'
        : name;
    return h('button', {
      class: 'prow ' + s,
      disabled: s === 'locked',
      'aria-label': l.title + ' — ' + (s === 'done' ? 'done, ' + score + '%' : s === 'in_progress' ? 'up next' : 'locked'),
      onClick: () => { audio.sfx('tap'); lessonReader(l.id); }
    },
      h('span', { class: 'pico' },
        s === 'done' ? img('ui/done', 'done-ico')
          : s === 'in_progress' ? ring(score || 0, { size: 36, stroke: 5, color: 'var(--orange)' })
            : h('span', { class: 'pico-lock' }, ico.lock(18))),
      h('span', { class: 'pbody' }, h('b', {}, l.title), h('span', {}, sub)),
      s === 'locked' ? null : h('span', { class: 'chev' }, ico.chev(18)));
  };

  show(h('div', { class: 'col gap-m' },
    h('div', { class: 'learn-head' },
      h('h1', { class: 'learn-title' }, 'Learn'),
      h('div', { class: 'row gap-s' },
        pill('ui/flame', num(state.streak)),
        pill('ui/star', num(state.cash)))),
    h('button', { class: 'continue', onClick: () => { audio.sfx('tap'); lessonReader(cur.id); } },
      h('div', { class: 'continue-hero' + (isScene(hero) ? '' : ' plain') }, img(hero)),
      h('div', { class: 'continue-body' },
        h('div', { class: 'col gap-xs grow' },
          h('span', { class: 'eyebrow' }, topic.name.toUpperCase() + ' · LESSON ' + lessonNumber(cur.id)),
          h('span', { class: 'continue-title' }, cur.title)),
        h('span', { class: 'go-btn' }, ico.play(18)))),
    h('div', { class: 'card ready' },
      ring(rd.percent, { size: 56, stroke: 6, label: rd.percent + '%' }),
      h('div', { class: 'col gap-xs' },
        h('b', { class: 'ready-title' }, 'Test ready'),
        h('span', { class: 'ready-sub' }, rd.toGo + (rd.toGo === 1 ? ' lesson' : ' lessons') + ' to 80%'))),
    h('h2', { class: 'section-title', style: 'margin-top:4px' }, 'Your path'),
    h('div', { class: 'list' }, LESSONS.map(row)),
    tabBar('learn', go)
  ), 'has-tabs');
}

/* ---------- handbook ---------- */

function handbook() {
  applySettings();
  const row = l => {
    const s = statusFor(l.id);
    const locked = s === 'locked';
    return h('button', {
      class: 'prow' + (locked ? ' locked' : ''),
      disabled: locked,
      onClick: () => { audio.sfx('tap'); lessonReader(l.id, handbook); }
    },
      h('span', { class: 'pico' },
        locked ? h('span', { class: 'pico-lock' }, ico.lock(18))
          : s === 'done' ? img('ui/done', 'done-ico')
            : img(topicById(l.topic).icon, 'topic-ico')),
      h('span', { class: 'pbody' },
        h('b', {}, l.title),
        h('span', {}, 'Handbook §' + l.section + ' · ' + l.minutes + ' min' + (s === 'done' ? ' · passed' : ''))),
      locked ? null : h('span', { class: 'chev' }, ico.chev(18)));
  };
  show(h('div', { class: 'col gap-m' },
    h('h1', { class: 'learn-title' }, 'Handbook'),
    ...TOPICS.map(t => h('div', { class: 'col gap-s' },
      h('h3', { class: 'group-head' }, img(t.icon, 'topic-ico'), t.name),
      h('div', { class: 'list' }, lessonsOf(t.id).map(row)))),
    tabBar('handbook', go)
  ), 'has-tabs');
}

// The lesson itself: one short handbook page, then practice. The copy comes
// from content.js; the bar under the header tracks where the lesson sits in
// its topic.
function lessonReader(id, back = home) {
  applySettings();
  const l = lessonById(id);
  if (!l || statusFor(id) === 'locked') return home();
  const topic = topicById(l.topic);
  const read = l.read;
  const inTopic = Math.max(1, lessonsOf(l.topic).length);
  const step = Math.max(1, lessonNumber(id));
  const total = l.questions.length;
  const spoken = read.headline + '. ' + read.body + ' ' + read.points.map(p => p[1]).join(' ');

  const points = h('div', { class: 'list read-points' }, read.points.map(([dot, line], i) =>
    h('div', { class: 'read-point' },
      h('span', { class: 'num' }, String(i + 1)),
      h('span', { class: 'dot ' + dot }),
      h('span', { class: 'read-point-text' }, line))));

  show(h('div', { class: 'reader' },
    h('div', { class: 'reader-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back', onClick: () => { audio.sfx('tap'); back(); } }, ico.arrow(22)),
      h('h2', {}, topic.name),
      h('span', { class: 'icon-btn', 'aria-hidden': 'true' }, ico.flag(20))),
    h('div', { class: 'reader-bar' }, h('i', { style: `width:${Math.round(step / inTopic * 100)}%` })),
    h('div', { class: 'reader-body' },
      h('div', { class: 'hero' + (isScene(heroFor(l)) ? '' : ' plain') }, img(heroFor(l))),
      h('div', { class: 'read-copy' },
        h('span', { class: 'read-kicker' }, read.kicker),
        h('h1', { class: 'read-head' }, read.headline),
        h('p', { class: 'read-text' }, read.body)),
      points,
      h('p', { class: 'read-src' }, 'California Driver Handbook · Section ' + l.section)),
    h('div', { class: 'reader-foot' },
      h('button', { class: 'cta', onClick: () => { audio.sfx('tap'); startLesson(id); } },
        'Practice ' + total + (total === 1 ? ' question' : ' questions')))
  ), 'no-pad');
  if (state.settings.autoRead) audio.speak(spoken);
}

// A lesson runs on the existing question engine with that lesson's questions;
// results() saves the attempt so the Learn path updates.
function startLesson(id) {
  const l = lessonById(id);
  if (!l || statusFor(id) === 'locked') return;
  const list = l.questions.map(q => byId[q]).filter(Boolean).map(q => ({ ...q }));
  if (!list.length) return;
  play({ mode: 'mission', lesson: id, district: l.district, list });
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
  show(h('div', { class: 'col gap-m' }, header('City map', home), h('div', { class: 'districts' }, cards)));
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
    header('Learn · ' + d.name, () => missionIntro(i)),
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
    show(h('div', { class: 'col center gap-l' }, header('Review', home), img('icons/check', 'intro-icon'),
      h('div', { class: 'big-title' }, 'ALL CLEAR'), h('p', { class: 'muted center-text' }, 'No mistakes to review right now. Nice driving!'), btn('HOME', home, 'btn primary big')));
    return;
  }
  play({ mode: 'review', list: shuffle(state.review).slice(0, 8).map(id => ({ ...byId[id] })) });
}

function testMenu() {
  const row = (iconPath, title, sub, onClick) => h('button', { class: 'mcard', onClick: () => { audio.sfx('tap'); onClick(); } },
    h('span', { class: 'mcard-ico' }, img(iconPath)),
    h('span', { class: 'col grow gap-xs' }, h('b', {}, title), h('span', { class: 'sub' }, sub)),
    h('span', { class: 'chev' }, ico.chev(18)));
  show(h('div', { class: 'col gap-m' },
    h('h1', { class: 'learn-title' }, 'Practice'),
    h('div', { class: 'list' },
      row('icons/handbook', 'Practice test', '20 questions · pass at 16 · best ' + state.test.best + '/20',
        () => play({ mode: 'test', list: shuffle(ALL_QUESTIONS).slice(0, 20).map(q => ({ ...q })) })),
      row('icons/timer', 'Speed run', '10 quick questions · 90 seconds · best ' + state.test.speedBest + '/10',
        () => play({ mode: 'speed', list: shuffle(ALL_QUESTIONS.filter(q => q.type === 'choice' || q.type === 'pics')).slice(0, 10).map(q => ({ ...q })), time: 90 })),
      row('icons/car', 'Drive practice', 'Draw your turns and tap the road', driveStart),
      row('icons/key', 'Road test · 3D', 'Drive a street. Stop, signal and yield like the DMV drive test', roadMenu)),
    h('p', { class: 'muted small' }, 'The real DMV knowledge test has 46 questions for drivers under 18. You need 38 right to pass.'),
    tabBar('practice', go)
  ), 'has-tabs');
}

function play(run) {
  run.i = 0; run.results = []; run.earned = 0; run.strikes = 0; run.started = Date.now();
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
  if (run.lesson) { const l = lessonById(run.lesson); return [topicById(l.topic).name.toUpperCase(), l.title]; }
  if (run.mode === 'mission') return ['MISSION ' + (run.district + 1), DISTRICTS[run.district].name];
  if (run.mode === 'test') return ['PRACTICE TEST', 'All districts'];
  if (run.mode === 'speed') return ['SPEED RUN', 'Beat the clock'];
  if (run.mode === 'drive') return ['DRIVE', 'Draw and tap'];
  return ['REVIEW', 'Fix your mistakes'];
}

function question(run) {
  const q = run.list[run.i];
  const [t1] = title(run);
  let answered = false, pick = null, failedNow = false, timerEl = null;

  // Top bar: pause, one progress bar per question, hearts (or the clock).
  const right = h('div', { class: 'q-right' });
  if (run.time) {
    timerEl = h('span', { class: 'time-pill' }, ico.clock(15), h('b', {}, ''));
    right.append(timerEl);
  }
  // Three lives, as in the design. Calm mode never takes one away.
  const hearts = h('div', { class: 'hearts' });
  const drawHearts = () => hearts.replaceChildren(...[0, 1, 2].map(k => ico.heart(k < 3 - run.strikes)));
  drawHearts(); right.append(hearts);

  const segs = dots(run.list.length, run.i, run.results);
  const head = h('div', { class: 'q-head' },
    h('button', { class: 'q-close', 'aria-label': 'Close', onClick: () => pause(run) }, ico.close(22)),
    segs, right);

  const body = h('div', { class: 'q-body' });
  const sheet = h('div', { class: 'sheet' });
  const fb = h('div', { class: 'fb', hidden: true });
  const mainBtn = h('button', { class: 'cta', disabled: true }, 'Check');
  mainBtn.hidden = q.type !== 'choice' && q.type !== 'pics';

  const prompt = h('div', { class: 'q-prompt' },
    h('span', { class: 'eyebrow' }, q.tag || t1),
    h('div', { class: 'q-text' }, q.q));
  const readText = () => q.q + (q.type === 'choice' ? ' ' + q.a.map((a, j) => 'ABC'[j] + '. ' + a).join(' ') : '');

  let buttons = [], refreshPicks = () => {};

  const done = (rightAnswer, msg, extra) => {
    if (answered) return; answered = true;
    run.results[run.i] = rightAnswer;
    record(q.id, rightAnswer);
    if (rightAnswer) {
      state.cash += 100; run.earned += 100; state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      if (state.streak >= 5) award('streak5');
      if (SIGN_Q.has(q.id)) { state.signRight++; if (state.signRight >= 10) award('signs'); }
      audio.sfx('right'); setTimeout(() => audio.sfx('cash'), 250);
    } else {
      state.streak = 0;
      audio.sfx('wrong');
      if (run.challenge) { run.strikes++; drawHearts(); }
    }
    save();
    const seg = segs.children[run.i];
    if (seg) seg.className = rightAnswer ? 'ok' : 'bad';
    failedNow = run.challenge && run.strikes >= 3;
    const last = run.i === run.list.length - 1;
    fb.hidden = false;
    const parts = [
      h('div', { class: 'fb-head' },
        h('div', { class: 'fb-title ' + (rightAnswer ? 'ok' : 'bad') },
          rightAnswer ? ico.checkCircle(22) : ico.xCircle(22),
          h('span', {}, rightAnswer ? 'Correct' : 'Not quite'),
          speakBtn(() => (rightAnswer ? 'Correct. ' : 'Not quite. ') + q.tip)),
        h('span', { class: 'fb-flag', 'aria-hidden': 'true' }, ico.flag(20))),
      h('div', { class: 'fb-why' }, (msg && !rightAnswer ? msg + ' ' : '') + q.tip),
      q.src ? h('div', { class: 'fb-src' }, 'Handbook · Section ' + q.src) : null,
      extra ? h('div', { class: 'fb-extra' }, extra) : null
    ];
    fb.replaceChildren(...parts.filter(Boolean));
    mainBtn.hidden = false;
    mainBtn.disabled = false;
    mainBtn.textContent = failedNow ? 'See results' : last ? 'Finish' : 'Continue';
    if (state.settings.autoRead) audio.speak((rightAnswer ? 'Correct! ' : 'Not quite. ') + q.tip);
    mainBtn.focus({ preventScroll: true });
  };

  const check = () => {
    if (answered || pick == null) return;
    buttons.forEach((b, k) => {
      b.disabled = true;
      if (q.type === 'choice') {
        b.className = 'answer' + (k === q.c ? ' ok' : k === pick ? ' bad' : '');
        if (k === q.c || k === pick) mark(b, k === q.c ? 'ok' : 'bad');
      } else {
        b.className = 'pic' + (k === q.c ? ' ok' : k === pick ? ' bad' : '');
      }
    });
    done(pick === q.c);
  };

  mainBtn.addEventListener('click', () => {
    if (answered) { next(run, failedNow); return; }
    if (q.type === 'choice' || q.type === 'pics') check();
  });

  // stage + answers per type
  if (q.type === 'choice') {
    buttons = q.a.map((text, j) => h('button', {
      class: 'answer',
      onClick: () => { if (answered) return; pick = j; refreshPicks(); }
    }, h('span', { class: 'letter' }, 'ABC'[j]), h('span', {}, text)));
    refreshPicks = () => {
      buttons.forEach((b, k) => { b.className = 'answer' + (k === pick ? ' on' : ''); });
      mainBtn.disabled = pick == null;
    };
    body.append(visualFor(q), prompt, h('div', { class: 'answers' }, buttons));
    run.keys = buttons;
  } else if (q.type === 'pics') {
    buttons = q.a.map((opt, j) => h('button', {
      class: 'pic', 'aria-label': opt.label,
      onClick: () => { if (answered) return; pick = j; refreshPicks(); }
    }, opt.img ? img(opt.img) : wheels(opt.wheels), h('span', {}, opt.label)));
    refreshPicks = () => {
      buttons.forEach((b, k) => { b.className = 'pic' + (k === pick ? ' on' : ''); });
      mainBtn.disabled = pick == null;
    };
    body.append(prompt, h('div', { class: 'pics' }, buttons));
    run.keys = buttons;
  } else if (q.type === 'tap') {
    const sc = S.buildScene(q.scene);
    body.append(h('div', { class: 'hero scene' }, h('div', { class: 'scene-wrap' }, sc.svg)), prompt);
    sheet.append(h('div', { class: 'sheet-hint' }, 'Tap your answer on the picture.'));
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
    body.append(h('div', { class: 'hero scene' }, h('div', { class: 'scene-wrap' }, sc.svg)), prompt);
    const pulse = S.el('circle', { cx: sc.player.x, cy: sc.player.y, r: 30, class: 'pulse' }, sc.svg);
    const ink = S.el('polyline', { points: '', class: 'ink' }, sc.svg);
    const msg = h('div', { class: 'sheet-hint' }, 'Put your finger on your car and draw where it goes.');
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
      if (r.retry) { msg.textContent = r.msg; ink.setAttribute('points', ''); pulse.style.display = ''; return; }
      ink.setAttribute('class', 'ink ' + (r.ok ? 'ok' : 'bad'));
      msg.remove();
      const d = S.demoPath(sc, q.demo);
      const ghost = S.el('path', { d, class: 'ghost-path' }, sc.layer);
      const watch = async () => { sc.player.node.setAttribute('transform', startPos); audio.sfx('whoosh'); await S.driveAlong(sc.player.node, d, sc.svg, { duration: 2400, reduced: reduced() }); };
      done(r.ok, r.msg, h('button', { class: 'btn ghost small', onClick: watch }, '▶ Watch'));
      ghost.getBoundingClientRect();
      await wait(300); watch();
    };
    sc.svg.addEventListener('pointerup', end);
    sc.svg.addEventListener('pointercancel', end);
    run.keys = null;
  }

  sheet.append(fb, mainBtn);
  show(h('div', { class: 'play' }, head, body, sheet), 'no-pad play-screen');
  if (state.settings.autoRead) audio.speak(readText());

  // keyboard: 1-3 to pick an answer, Enter to check / continue
  const onKey = e => {
    if (e.key >= '1' && e.key <= '3' && run.keys && !answered) run.keys[+e.key - 1]?.click();
    if (e.key === 'Enter' && !mainBtn.hidden && !mainBtn.disabled) mainBtn.click();
  };
  document.addEventListener('keydown', onKey);
  cleanup.push(() => document.removeEventListener('keydown', onKey));

  // timer
  if (run.time) {
    const tick = () => {
      const m = Math.floor(run.left / 60), s = run.left % 60;
      timerEl.querySelector('b').textContent = m + ':' + String(s).padStart(2, '0');
      timerEl.classList.toggle('low', run.left <= 10);
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
  b.querySelector('.letter')?.replaceWith(h('span', { class: 'letter-ico' }, k === 'ok' ? ico.checkCircle(24) : ico.xCircle(24)));
}

function next(run, failed) {
  if (failed || run.i === run.list.length - 1) return results(run, failed);
  run.i++;
  question(run);
}

function visualFor(q) {
  if (q.scene) { const sc = S.buildScene(q.scene); return h('div', { class: 'hero scene' }, h('div', { class: 'scene-wrap' }, sc.svg)); }
  if (q.big) return h('div', { class: 'hero plain' }, bigCard(q.big));
  if (q.wide) return h('div', { class: 'hero' }, img(q.img));
  return h('div', { class: 'hero plain' + (q.dark ? ' dark' : '') }, img(q.img));
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
  if (run.lesson) return lessonResults(run, right, total);
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

  const won = run.mode === 'test' ? right >= 16
    : run.mode === 'mission' ? !!stars
      : right >= Math.ceil(total * 0.8);
  const secs = Math.max(0, Math.round((Date.now() - (run.started || Date.now())) / 1000));

  const next = run.mode === 'mission' && stars && run.district + 1 < DISTRICTS.length
    ? btn('Next mission', () => missionIntro(run.district + 1), 'btn primary')
    : run.mode === 'mission' ? btn('Try again', () => startMission(run.district), 'btn primary')
      : btn('Home', home, 'btn primary');

  show(h('div', { class: 'results' },
    h('div', { class: 'score-ring', style: `background:conic-gradient(${won ? 'var(--blue)' : 'var(--red)'} 0 ${pct}%,var(--track) 0)` },
      h('div', { class: 'score-hole' }, right + '/' + total)),
    h('div', { class: 'col center gap-xs' },
      h('div', { class: 'res-title' }, headline),
      h('div', { class: 'res-sub' }, sub)),
    h('div', { class: 'stats3' },
      h('div', { class: 'stat' }, img('icons/star'), h('b', {}, '+' + num(run.earned + bonus)), h('span', {}, 'Points')),
      h('div', { class: 'stat' }, img('icons/flame'), h('b', {}, String(state.streak)), h('span', {}, 'Answer streak')),
      h('div', { class: 'stat' }, img('icons/timer'), h('b', {}, mmss(secs)), h('span', {}, 'Time'))),
    stars ? h('div', { class: 'stars big' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)) : null,
    h('div', { class: 'rank-card' },
      img(after.badge, rankUp ? 'pop' : ''),
      h('div', { class: 'col' },
        h('div', { class: 'rank-name' }, rankUp ? 'Rank up: ' + after.name : after.name),
        after.next
          ? h('div', { class: 'progress-bar' }, h('i', { style: `width:${Math.min(100, (state.cash - after.min) / (after.next.min - after.min) * 100)}%` }))
          : h('div', { class: 'small dim' }, 'Top rank reached'),
        after.next ? h('div', { class: 'small dim' }, money(after.next.min - state.cash) + ' to ' + after.next.name) : null)),
    h('div', { class: 'res-actions' },
      run.results.some(r => r === false) ? btn('Review', reviewStart, 'btn ghost') : btn('Map', map, 'btn ghost'),
      next)
  ));
}

/* ---------- lesson results ---------- */

// Lesson runs close the loop here: the attempt is saved, which is what the
// Learn path and the readiness ring read, then the results screen shows the
// score, the points, and a way back into the missed questions.
function lessonResults(run, right, total) {
  const pct = Math.round(right / total * 100);
  const ok = pct >= PASS_MARK;
  const missedQs = run.list.filter((q, i) => run.results[i] === false);
  const secs = Math.max(0, Math.round((Date.now() - (run.started || Date.now())) / 1000));
  const attempt = recordAttempt({
    lessonId: run.lesson,
    scorePercent: pct,
    points: run.earned,
    seconds: secs,
    missedIds: missedQs.map(q => q.id)
  });
  const lesson = lessonById(run.lesson);
  const nextLesson = LESSONS[LESSONS.findIndex(l => l.id === lesson.id) + 1];
  audio.sfx(ok ? 'win' : 'cash');
  show(h('div', { class: 'results' },
    h('div', { class: 'res-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'Close', onClick: () => { audio.sfx('tap'); home(); } }, ico.close(22))),
    h('div', { class: 'score-ring', style: `background:conic-gradient(${ok ? 'var(--blue)' : 'var(--red)'} 0 ${pct}%,var(--track) 0)` },
      h('div', { class: 'score-hole' }, right + '/' + total)),
    h('div', { class: 'col center gap-xs' },
      h('div', { class: 'res-title' }, ok ? 'Passed' : 'Not passed'),
      h('div', { class: 'res-sub' }, topicById(lesson.topic).name + ' · Lesson ' + lessonNumber(lesson.id))),
    h('div', { class: 'stats3' },
      h('div', { class: 'stat' }, ico.star(26), h('b', {}, '+' + num(attempt.points_earned)), h('span', {}, 'XP')),
      h('div', { class: 'stat' }, ico.flame(26), h('b', {}, String(state.streak)), h('span', {}, 'Day streak')),
      h('div', { class: 'stat' }, ico.timer(26), h('b', {}, mmss(secs)), h('span', {}, 'Time'))),
    missedQs.length
      ? h('button', {
        class: 'review-row',
        onClick: () => { audio.sfx('tap'); play({ mode: 'review', list: missedQs.map(q => ({ ...q })) }); }
      },
        ico.xCircle(24),
        h('b', {}, 'Review ' + missedQs.length + (missedQs.length === 1 ? ' mistake' : ' mistakes')),
        h('span', { class: 'chev' }, ico.chev(18)))
      : null,
    h('button', {
      class: 'cta blue',
      onClick: () => { audio.sfx('tap'); ok && nextLesson ? startLesson(nextLesson.id) : startLesson(run.lesson); }
    }, ok && nextLesson ? 'Next lesson' : 'Try again')
  ));
}

/* ---------- trophies ---------- */

function trophies() {
  const r = rankFor(state.cash);
  show(h('div', { class: 'col gap-m' },
    h('div', { class: 'learn-head' },
      h('h1', { class: 'learn-title' }, 'Me'),
      h('button', { class: 'round-btn', 'aria-label': 'Settings', onClick: settings }, ico.gear(20))),
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
      stat('Districts cleared', state.districts.filter(d => d.stars).length + ' / ' + DISTRICTS.length),
      stat('Lessons passed', readiness().passed + ' / ' + LESSONS.length)),
    tabBar('profile', go)
  ), 'has-tabs');
}
const stat = (k, v) => h('div', { class: 'row between' }, h('span', { class: 'muted' }, k), h('b', {}, String(v)));

/* ---------- 3D road test ---------- */

// Loaded on demand: the 3D engine (and its Three.js build) is only fetched
// when someone opens the road test.
let roadMod = null;
const loadRoad = async () => roadMod || (roadMod = await import('./roadtest.js'));

async function roadMenu() {
  const my = nav;
  let mod;
  try { mod = await loadRoad(); }
  catch { show(h('div', { class: 'col gap-m' }, header('Road test', testMenu), h('p', { class: 'muted' }, 'The 3D road test could not load. Check your connection and try again.'))); return; }
  if (nav !== my) return;
  const passed = mod.DRIVES.filter(d => state.road[d.id]).length;
  const next = mod.DRIVES.findIndex(d => !state.road[d.id]);
  show(h('div', { class: 'col gap-m' }, header('Road test', testMenu),
    h('p', { class: 'muted' }, 'Short 3D drives that practise what the DMV examiner checks. Hold Go to drive and Brake to stop. The car steers itself.'),
    h('div', { class: 'eyebrow' }, passed + ' of ' + mod.DRIVES.length + ' drives passed'),
    h('div', { class: 'list' }, mod.DRIVES.map((d, i) => {
      const st = state.road[d.id] || 0;
      return h('button', { class: 'mcard' + (i === next ? ' next' : ''), onClick: () => { audio.sfx('tap'); roadDrive(i); } },
        h('span', { class: 'mcard-ico rt-num' + (st ? ' done' : '') }, st ? ico.check(18) : String(i + 1)),
        h('span', { class: 'col grow gap-xs' }, h('b', {}, d.name), h('span', { class: 'sub' }, d.goal)),
        st ? h('span', { class: 'stars' }, '★'.repeat(st) + '☆'.repeat(3 - st)) : h('span', { class: 'chev' }, ico.chev(18)));
    })),
    tabBar('practice', go)
  ), 'has-tabs');
}

async function roadDrive(i) {
  const mod = await loadRoad();
  const drive = mod.DRIVES[i];
  const box = h('div', { class: 'rt' });
  show(box, 'no-pad road-screen');
  audio.setMusic(false);
  const destroy = mod.startDrive(box, drive, {
    h, img, ico, audio, reduced,
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

  const design = h('div', { class: 'seg design-seg' },
    h('button', { class: 'on' }, 'New'),
    h('button', { onClick: () => useDesign('classic') }, 'Classic'));

  show(h('div', { class: 'col gap-m' }, header('Settings', trophies),
    h('div', { class: 'setting' }, h('div', { class: 'col' }, h('b', {}, 'Design'), h('span', { class: 'muted small' }, 'Classic is the original dark game look. Your progress stays the same.')), design),
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
window.__permitRun = { state, DISTRICTS, TOPICS, LESSONS, go: { home, handbook, map, trophies, settings, testMenu, missionIntro, learn, startMission, startLesson, play, results, roadMenu, roadDrive } };
