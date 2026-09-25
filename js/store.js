// Progress is saved on the device only (localStorage). Nothing is sent anywhere.
import { DISTRICTS, RANKS } from './data.js';

const KEY = 'permitrun.v1';

const DEFAULTS = () => ({
  started: false,
  name: '',
  avatar: 1,
  cash: 0,
  streak: 0,
  bestStreak: 0,
  signRight: 0,
  stats: {},            // qid -> { r: rightCount, w: wrongCount }
  review: [],           // qids answered wrong and not yet fixed
  districts: DISTRICTS.map(() => ({ best: 0, stars: 0, plays: 0, learned: false })),
  unlocked: 1,          // how many districts are open
  ach: {},              // achievement id -> timestamp
  test: { best: 0, passes: 0, speedBest: 0 },
  road: {},             // road test drive id -> best stars
  settings: { music: true, musicVol: 0.5, sfx: true, autoRead: false, calm: true, big: false, reduceMotion: false, perMission: 6, driveVoice: true }
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) return DEFAULTS();
    const d = DEFAULTS();
    return { ...d, ...raw, settings: { ...d.settings, ...raw.settings }, test: { ...d.test, ...raw.test }, road: { ...(raw.road || {}) }, districts: d.districts.map((x, i) => ({ ...x, ...(raw.districts || [])[i] })) };
  } catch { return DEFAULTS(); }
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: keep playing without saving */ }
}

export function reset() {
  const keepSettings = state.settings;
  Object.assign(state, DEFAULTS(), { settings: keepSettings });
  save();
}

export function rankFor(cash) {
  let r = RANKS[0], i = 0;
  RANKS.forEach((x, j) => { if (cash >= x.min) { r = x; i = j; } });
  return { ...r, index: i, next: RANKS[i + 1] || null };
}

export function record(qid, right) {
  const s = state.stats[qid] || (state.stats[qid] = { r: 0, w: 0 });
  if (right) {
    s.r++;
    state.review = state.review.filter(id => id !== qid);
  } else {
    s.w++;
    if (!state.review.includes(qid)) state.review.push(qid);
  }
}
