// Progress is saved on the device only (localStorage). Nothing is sent anywhere.
//
// UserStats (points, streak) and the UserProgress / QuizAttempt history live
// here; Topics, Lessons and Questions are static content (content.js + data.js).
// A lesson's status is derived from its attempts, so it can never drift:
//   done        — best score is at or above the pass mark
//   in_progress — every lesson before it is done
//   locked      — otherwise
import { DISTRICTS, RANKS } from './data.js';
import { LESSONS } from './content.js';

const KEY = 'permitrun.v1';

// Every lesson passes at 80%, the same mark the DMV-style practice test uses.
export const PASS_MARK = 80;

const DEFAULTS = () => ({
  started: false,
  name: '',
  avatar: 1,
  cash: 0,              // UserStats.total_points
  streak: 0,            // UserStats.current_streak (right answers in a row)
  bestStreak: 0,        // UserStats.longest_streak
  signRight: 0,
  stats: {},            // qid -> { r: rightCount, w: wrongCount }
  review: [],           // qids answered wrong and not yet fixed
  districts: DISTRICTS.map(() => ({ best: 0, stars: 0, plays: 0, learned: false })),
  unlocked: 1,          // how many districts are open
  ach: {},              // achievement id -> timestamp
  test: { best: 0, passes: 0, speedBest: 0 },
  road: {},             // 3D road test: drive id -> best stars
  attempts: [],         // QuizAttempt[] — newest last, trimmed to ATTEMPT_KEEP
  settings: { music: true, musicVol: 0.5, sfx: true, autoRead: false, calm: true, big: false, reduceMotion: false, perMission: 6, driveVoice: true }
});

const ATTEMPT_KEEP = 50;

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

/* ---------- UserProgress (derived from QuizAttempt) ---------- */

export const attemptsFor = lessonId => state.attempts.filter(a => a.lesson_id === lessonId);

export function bestFor(lessonId) {
  return attemptsFor(lessonId).reduce((best, a) => Math.max(best, a.score_percent || 0), 0);
}

export const passed = lessonId => bestFor(lessonId) >= PASS_MARK;

export function statusFor(lessonId) {
  if (passed(lessonId)) return 'done';
  const i = LESSONS.findIndex(l => l.id === lessonId);
  if (i < 0) return 'locked';
  return LESSONS.slice(0, i).every(l => passed(l.id)) ? 'in_progress' : 'locked';
}

// The lesson the Continue card offers: the first one not passed yet.
export function currentLesson() {
  return LESSONS.find(l => !passed(l.id)) || LESSONS[LESSONS.length - 1];
}

export function readiness() {
  const total = LESSONS.length;
  const done = LESSONS.filter(l => passed(l.id)).length;
  return {
    total,
    passed: done,
    percent: total ? Math.round(done / total * 100) : 0,
    toGo: Math.max(0, Math.ceil(total * 0.8) - done)
  };
}

/* ---------- QuizAttempt ---------- */

export function recordAttempt({ lessonId, scorePercent, points, seconds, missedIds }) {
  const attempt = {
    id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    lesson_id: lessonId,
    score_percent: Math.round(scorePercent || 0),
    passed: (scorePercent || 0) >= PASS_MARK,
    points_earned: Math.round(points || 0),
    duration_seconds: Math.round(seconds || 0),
    missed_question_ids: missedIds || [],
    created_at: new Date().toISOString()
  };
  state.attempts.push(attempt);
  if (state.attempts.length > ATTEMPT_KEEP) state.attempts.splice(0, state.attempts.length - ATTEMPT_KEEP);
  save();
  return attempt;
}
