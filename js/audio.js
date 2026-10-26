// All sound is generated with Web Audio, so there are no audio files to
// download and it works offline. Music is a slow, soft lo-fi loop that
// stays in the background; sound effects are short and never harsh.

let ctx = null, master = null, musicBus = null, sfxBus = null;
let musicOn = false, musicLevel = 0.45, timer = null, nextTime = 0, step = 0, noiseBuf = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

const hz = m => 440 * Math.pow(2, (m - 69) / 12);

function tone(bus, midi, t, dur, { type = 'sine', vol = 0.2, attack = 0.01, cutoff = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = hz(midi);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (cutoff) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; o.connect(f); node = f; }
  node.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
}

/* ---------- music ---------- */

// Cmaj7 - Am7 - Fmaj7 - G6, 76 bpm, 8th-note steps
const CHORDS = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 52, 59]];
const MELODY = [76, null, 74, 72, null, 67, null, null, 72, null, 71, 69, null, 64, null, null, 69, null, 67, 65, null, 64, 65, null, 67, null, 71, 74, null, 72, null, null];
const SPB = 60 / 76 / 2;

function schedule() {
  while (nextTime < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % 4, s = step % 8, chord = CHORDS[bar];
    if (s === 0) {
      chord.forEach(n => tone(musicBus, n + 12, nextTime, SPB * 8, { type: 'triangle', vol: 0.05, attack: 0.3, cutoff: 1400 }));
      tone(musicBus, chord[0] - 12, nextTime, SPB * 3, { type: 'sine', vol: 0.22, attack: 0.02 });
    }
    if (s === 4) tone(musicBus, chord[0] - 12, nextTime, SPB * 3, { type: 'sine', vol: 0.16, attack: 0.02 });
    if (s === 0 || s === 4) kick(nextTime);
    if (s % 2 === 1) hat(nextTime);
    const m = MELODY[step % MELODY.length];
    if (m) tone(musicBus, m, nextTime, SPB * 1.8, { type: 'sine', vol: 0.06, attack: 0.02 });
    nextTime += SPB; step++;
  }
}

function kick(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.25);
}
function hat(t) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000;
  g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); s.stop(t + 0.06);
}

export function setMusic(on, volume = 0.5) {
  if (!ensure()) return;
  musicOn = on; musicLevel = 0.9 * volume;
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setTargetAtTime(on ? musicLevel : 0, now, 0.4);
  if (on && !timer) { nextTime = ctx.currentTime + 0.1; timer = setInterval(schedule, 60); }
  if (!on && timer) { setTimeout(() => { if (!musicOn) { clearInterval(timer); timer = null; } }, 1500); }
}

// Duck the music while the voice is reading.
export function duck(on) {
  if (!ctx || !musicOn) return;
  musicBus.gain.setTargetAtTime(on ? musicLevel * 0.3 : musicLevel, ctx.currentTime, 0.2);
}

/* ---------- sound effects ---------- */

let sfxOn = true;
export function setSfx(on) { sfxOn = on; }

export function sfx(name) {
  if (!sfxOn || !ensure()) return;
  const t = ctx.currentTime + 0.01;
  switch (name) {
    case 'tap': tone(sfxBus, 84, t, 0.06, { vol: 0.08 }); break;
    case 'right': [72, 76, 79, 84].forEach((n, i) => tone(sfxBus, n, t + i * 0.07, 0.35, { type: 'triangle', vol: 0.18 })); break;
    case 'wrong': tone(sfxBus, 60, t, 0.25, { type: 'triangle', vol: 0.14 }); tone(sfxBus, 57, t + 0.16, 0.35, { type: 'triangle', vol: 0.12 }); break;
    case 'cash': [88, 93].forEach((n, i) => tone(sfxBus, n, t + i * 0.08, 0.25, { vol: 0.12 })); break;
    case 'win': [67, 72, 76, 79, 84, 88].forEach((n, i) => tone(sfxBus, n, t + i * 0.1, 0.5, { type: 'triangle', vol: 0.16 })); break;
    case 'whoosh': {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 1;
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2000, t + 0.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 0.65);
      break;
    }
  }
}

/* ---------- read aloud ---------- */

let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith('en'));
  voice = vs.find(v => /Samantha|Google US English|Aria|Jenny|Natural/i.test(v.name)) || vs.find(v => v.lang === 'en-US') || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

export const canSpeak = 'speechSynthesis' in window;

export function speak(text, rate = 0.95) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = rate; u.pitch = 1;
  u.onstart = () => duck(true);
  u.onend = u.onerror = () => duck(false);
  speechSynthesis.speak(u);
}
export function stopSpeaking() { if (canSpeak) speechSynthesis.cancel(); duck(false); }
