// 3D Road Test: short behind-the-wheel drives with simple controls.
// The car follows its lane by itself ("on rails"). The player controls
// speed (GO / BRAKE), the turn signals, and one action button when a
// choice comes up (change lane, pull over, look over your shoulder).
// Each drive checks the same things a DMV examiner would. Mistakes pause
// the drive, explain what should happen, and rewind a little. No crashes.
import * as T from './vendor/three.js';

const LANE = 3.5;
const MPH = 2.237;              // m/s -> mph
const CAR_HALF = 2.1;           // centre to front bumper, metres
const C = {
  grass: 0x5B8566, walk: 0xCFC6B4, road: 0x3B4050, paint: 0xF7EEDD, yellow: 0xFFC53D,
  pink: 0xFF3E7F, teal: 0x1FC7B6, gold: 0xFFC53D, orange: 0xFF8A2A, navy: 0x11152A,
  night: 0x1B2140, purple: 0x3A2F5E, glass: 0x1B2140, white: 0xE9E4DA, red: 0xE0263B
};

/* ------------------------------------------------------------------ */
/* Drives                                                              */
/* ------------------------------------------------------------------ */

// s = metres travelled along the path. On straight drives the car starts
// at z = +20 heading toward -z, so a point at z is at s = 20 - z.
const S = z => 20 - z;

export const DRIVES = [
  {
    id: 'stop', name: 'Stop Sign', limit: 25,
    goal: 'Stop behind the white line at the STOP sign. Wait for the other car. Then go.',
    build(w) {
      w.road('z', 0, 40, -260, 'two', { gaps: [[-107, -93]] });
      w.road('x', -100, -160, 160, 'two', { gaps: [[-7, 7]] });
      w.stopLine(1.75, -92.4); w.crosswalk('z', -94.5);
      w.sign('signs/stop', 4.6, -91.6);
      w.city(40, -260);
      w.finish(S(-190));
      const cross = w.car(C.teal); cross.position.set(-80, 0, -98.25); cross.rotation.y = -Math.PI / 2;
      return [
        stopAt({
          id: 'stop', label: 'Full stop at the white line', line: S(-92.4), promptAt: S(-40),
          prompt: 'STOP sign ahead. Stop behind the white line.',
          fail: 'You did not stop all the way behind the white line. Brake until the car is fully stopped.',
          waitSay: 'Good stop. Look left, right, left. Wait for the teal car to pass.',
          goSay: 'All clear. Tap GO.',
          wait: ctx => ctx.t - ctx.stoppedAt > 3.2,
          waitFail: 'Wait for the teal car to pass before you go.',
          update(ctx, ev) {
            // cross traffic drives by after you stop
            if (ev.stopped) cross.position.x = Math.min(90, -40 + (ctx.t - ctx.stoppedAt) * 18);
            else cross.position.x = -80;
          }
        })
      ];
    }
  },
  {
    id: 'right', name: 'Right Turn', limit: 25,
    goal: 'Signal right early, stop at the STOP sign, then turn right slowly into the right lane.',
    path(w) {
      const p = new T.CurvePath();
      p.add(new T.LineCurve3(v(1.75, 20), v(1.75, -94)));
      p.add(new T.QuadraticBezierCurve3(v(1.75, -94), v(1.75, -98.25), v(6, -98.25)));
      p.add(new T.LineCurve3(v(6, -98.25), v(160, -98.25)));
      return p;
    },
    build(w) {
      w.road('z', 0, 40, -260, 'two', { gaps: [[-107, -93]] });
      w.road('x', -100, -160, 170, 'two', { gaps: [[-7, 7]] });
      w.stopLine(1.75, -92.4); w.crosswalk('z', -94.5);
      w.sign('signs/stop', 4.6, -91.6);
      w.city(40, -260, -100);
      w.cityX(-100, 10, 170);
      const turnS = S(-94);
      w.finishAt(80, -98.25, -Math.PI / 2);
      return [
        signalBy({ id: 'sig', label: 'Signal right 100 feet before the turn', dir: 'right', by: S(-94) - 30, promptAt: S(-30), prompt: 'You will turn right at the STOP sign. Turn on your RIGHT signal now.', fail: 'Turn on your right signal at least 100 feet before the turn.' }),
        stopAt({ id: 'stop', label: 'Full stop at the white line', line: S(-92.4), promptAt: S(-60), prompt: 'Stop behind the white line.', fail: 'Stop all the way behind the white line before you turn.', goSay: 'Good stop. Now turn right slowly. Tap GO.' }),
        slowTurn({ id: 'turn', label: 'Slow, smooth turn', from: turnS, to: turnS + 9, mph: 12 })
      ];
    }
  },
  {
    id: 'walker', name: 'Crosswalk', limit: 25,
    goal: 'A person will cross the street. Stop before the crosswalk and wait until they are all the way across.',
    build(w) {
      w.road('z', 0, 40, -260, 'two');
      const cwZ = -80;
      w.crosswalk('z', cwZ, true); w.stopLine(1.75, cwZ + 2.2);
      w.sign('signs/pedestrian-crossing', 4.6, cwZ + 14);
      w.city(40, -260);
      w.finish(S(-170));
      const ped = w.person(C.gold); ped.position.set(5.2, 0, cwZ);
      const line = S(cwZ + 2.2);
      return [
        stopAt({
          id: 'walk', label: 'Stopped for the person crossing', line, promptAt: S(cwZ + 55),
          prompt: 'Someone is at the crosswalk. Get ready to stop.',
          fail: 'People in a crosswalk always go first. Stop before the white line and wait.',
          waitSay: 'Good. Wait until they reach the other side.',
          goSay: 'They are across. Tap GO.',
          wait: () => ped.position.x < -4.6,
          waitFail: 'Wait until the person is all the way across.',
          update(ctx) {
            const started = ctx.sFront > line - 40;
            if (!started) ped.position.x = 5.2;
            else ped.position.x = Math.max(-5.2, ped.position.x - 1.7 * ctx.dt);
            ped.rotation.y = -Math.PI / 2;
            ped.children[2].rotation.x = started && ped.position.x > -5.2 ? Math.sin(ctx.t * 9) * .5 : 0;
          },
          reset() { ped.position.x = 5.2; }
        })
      ];
    }
  },
  {
    id: 'school', name: 'School Zone', limit: 35,
    goal: 'Drive through the school zone at 25 mph or slower. Watch for kids.',
    build(w) {
      w.road('z', 0, 40, -300, 'two');
      w.sign('signs/school-zone', 4.6, -40);
      w.sign('signs/speed-limit-25', 4.6, -46);
      w.school(-120);
      w.city(40, -300, null, [-60, -180]);
      [-80, -110, -140, -165].forEach((z, i) => { const k = w.person([C.teal, C.pink, C.orange, C.gold][i], .75); k.position.set(i % 2 ? 6.5 : 5.6, 0, z); });
      w.finish(S(-230));
      return [
        speedZone({ id: 'zone', label: '25 mph or less in the school zone', from: S(-46), to: S(-190), mph: 25, promptAt: S(-15), prompt: 'School zone ahead. Slow down to 25 mph.', fail: 'Too fast for a school zone. Keep it at 25 mph or less.' })
      ];
    }
  },
  {
    id: 'bus', name: 'School Bus', limit: 25,
    goal: 'A school bus is stopped with red lights flashing. Stop and stay stopped until the lights turn off.',
    build(w) {
      w.road('z', 0, 40, -260, 'two');
      w.city(40, -260);
      const bus = w.bus(); bus.position.set(-1.75, 0, -95); bus.rotation.y = Math.PI;
      const kid = w.person(C.teal, .75); kid.position.set(-3.6, 0, -88);
      w.finish(S(-180));
      const line = S(-95 + 12);
      let lightsOff = false;
      return [
        stopAt({
          id: 'bus', label: 'Stopped for the school bus', line, zone: 25, promptAt: S(-40),
          prompt: 'School bus ahead with flashing red lights. You must stop.',
          fail: 'When a school bus flashes red lights, you must stop and stay stopped.',
          waitSay: 'Good. Stay stopped while the children cross.',
          goSay: 'The red lights are off. You may go. Tap GO.',
          wait: () => lightsOff,
          waitFail: 'Stay stopped until the red lights stop flashing.',
          update(ctx, ev) {
            const since = ev.stopped ? ctx.t - ctx.stoppedAt : 0;
            if (ev.stopped) kid.position.x = Math.min(6.5, -3.6 + since * 2.2);
            lightsOff = ev.stopped && since > 5;
            const on = !lightsOff && Math.floor(ctx.t * 2.5) % 2 === 0;
            bus.userData.lights.forEach((l, i) => l.material = (i % 2 ? on : !on) && !lightsOff ? MAT.lampRed : MAT.lampOff);
            bus.userData.arm.visible = !lightsOff;
          },
          reset() { kid.position.x = -3.6; lightsOff = false; }
        })
      ];
    }
  },
  {
    id: 'lane', name: 'Lane Change', limit: 30,
    goal: 'Your lane ends. Signal left, look over your shoulder, then change lanes.',
    build(w) {
      w.road('z', 0, 40, -260, 'one2');
      w.city(40, -260);
      w.sign('signs/lane-ends', 4.6, -60);
      for (let i = 0; i < 9; i++) w.cone(1.75 + 1.6 - i * 0.4, -120 - i * 4);
      w.finish(S(-200));
      return [
        laneAction({
          id: 'lane', label: 'Signal, look, then change lanes', from: S(-20), by: S(-112), promptAt: S(-20),
          prompt: 'Your lane ends ahead. Turn on your LEFT signal.', signal: 'left', look: true, to: -LANE, button: 'CHANGE LANE',
          lookSay: 'Now tap LOOK to check over your shoulder.', readySay: 'Clear! Tap CHANGE LANE.',
          fail: 'Your lane ended. Signal left, look over your shoulder, then change lanes before the cones.'
        })
      ];
    }
  },
  {
    id: 'amb', name: 'Ambulance', limit: 30,
    goal: 'An ambulance with a siren is coming. Pull to the right edge and stop until it passes.',
    build(w, eng) {
      w.road('z', 0, 40, -320, 'two');
      w.city(40, -320);
      w.finish(S(-270));
      const amb = w.ambulance(); amb.visible = false;
      return [pullOver({ id: 'amb', label: 'Pulled right and stopped for the ambulance', at: S(-50), amb, eng })];
    }
  }
];

/* ------------------------------------------------------------------ */
/* Checks. Each returns an event object the engine runs every frame.   */
/* ------------------------------------------------------------------ */

function base(o) { return { done: false, tries: 0, said: false, ...o }; }

// Come to a full stop just behind `line`, optionally wait for `wait()`.
function stopAt(o) {
  const zone = o.zone || 12;
  return base({
    ...o, start: o.promptAt, retry: Math.max(0, o.promptAt - 10),
    run(ctx, ev) {
      if (!ev.said && ctx.s >= o.promptAt) { ev.said = true; ctx.say(o.prompt); }
      if (!ev.stopped && ctx.v < 0.2 && ctx.sFront > o.line - zone && ctx.sFront <= o.line + 0.4) {
        ev.stopped = true; ctx.stoppedAt = ctx.t; ctx.good();
        if (o.waitSay) ctx.say(o.waitSay); else if (o.goSay) ctx.say(o.goSay);
      }
      if (ev.stopped && o.wait && !ev.waited && o.wait(ctx)) { ev.waited = true; if (o.goSay) ctx.say(o.goSay); }
      o.update && o.update(ctx, ev);
      if (ctx.sFront > o.line + 0.6) {
        if (!ev.stopped) return ctx.fail(ev, o.fail);
        if (o.wait && !ev.waited) return ctx.fail(ev, o.waitFail);
      }
      if (ctx.sFront > o.line + 6) ctx.pass(ev);
    },
    reset(ev) { ev.stopped = false; ev.waited = false; o.reset && o.reset(); }
  });
}

function signalBy(o) {
  return base({
    ...o, start: o.promptAt, retry: Math.max(0, o.promptAt - 10),
    run(ctx, ev) {
      if (!ev.said && ctx.s >= o.promptAt) { ev.said = true; ctx.say(o.prompt); }
      if (ctx.signal === o.dir && !ev.on) { ev.on = true; ctx.good(); }
      if (ctx.sFront > o.by) { if (ctx.signal === o.dir || ev.on) ctx.pass(ev); else ctx.fail(ev, o.fail); }
    },
    reset(ev) { ev.on = false; }
  });
}

// The car eases off to o.mph through the corner, like a driver lifting off the gas.
function slowTurn(o) {
  return base({
    ...o, start: o.from - 30, retry: o.from - 40,
    run(ctx, ev) {
      if (ctx.s >= o.from - 4 && ctx.s <= o.to) ctx.capMph = o.mph;
      if (ctx.s > o.to) { ctx.capMph = null; ctx.pass(ev); }
    }
  });
}

function speedZone(o) {
  return base({
    ...o, start: o.promptAt, retry: Math.max(0, o.promptAt - 5),
    run(ctx, ev) {
      if (!ev.said && ctx.s >= o.promptAt) { ev.said = true; ctx.say(o.prompt); }
      ctx.zoneLimit = ctx.s >= o.from - 20 && ctx.s <= o.to ? o.mph : null;
      if (ctx.s >= o.from && ctx.s <= o.to && ctx.mph > o.mph + 2) return ctx.fail(ev, o.fail);
      if (ctx.s > o.to) { ctx.zoneLimit = null; ctx.say('You are out of the school zone. Nice driving.'); ctx.pass(ev); }
    }
  });
}

function laneAction(o) {
  return base({
    ...o, start: o.from, retry: Math.max(0, o.from - 10),
    run(ctx, ev) {
      if (!ev.said && ctx.s >= o.promptAt) { ev.said = true; ctx.say(o.prompt); }
      if (ev.moved) { if (Math.abs(ctx.offset - o.to) < .2) ctx.pass(ev); return; }
      if (ctx.signal === o.signal && !ev.sigSaid) { ev.sigSaid = true; ctx.good(); ctx.say(o.lookSay); }
      if (ctx.looked && !ev.lookSaid) { ev.lookSaid = true; ctx.say(o.readySay); }
      ctx.showLook = o.look && !ctx.looked;
      ctx.action = {
        label: o.button, press: () => {
          if (ctx.signal !== o.signal) { ctx.note('Signal first'); return ctx.say('Turn on your ' + o.signal.toUpperCase() + ' signal first.'); }
          if (o.look && !ctx.looked) { ctx.note('Look first'); return ctx.say('Check over your shoulder first. Tap LOOK.'); }
          ev.moved = true; ctx.targetOffset = o.to; ctx.action = null; ctx.good();
          ctx.say('Nice lane change. You can turn your signal off.');
        }
      };
      if (ctx.sFront > o.by) ctx.fail(ev, o.fail);
    },
    reset(ev) { ev.moved = false; ev.sigSaid = false; ev.lookSaid = false; }
  });
}

function pullOver({ id, label, at, amb }) {
  const EDGE = 1.35;
  return base({
    id, label, start: at, retry: Math.max(0, at - 15),
    run(ctx, ev) {
      const k = amb.userData;
      if (!ev.said && ctx.s >= at) {
        ev.said = true; ev.phase = 'coming'; k.s = ctx.s - 60; amb.visible = true; ctx.siren(true);
        ctx.say('Siren! An ambulance is behind you. Pull to the RIGHT edge and stop.');
      }
      if (!ev.phase) return;
      const pulled = ctx.offset > EDGE - .3;
      if (ev.phase === 'coming') {
        if (!ev.pulled) ctx.action = { label: 'PULL RIGHT', press: () => { ev.pulled = true; ctx.targetOffset = EDGE; ctx.action = null; ctx.say('Good. Now brake and stop.'); } };
        k.s += (ctx.v + 7) * ctx.dt;
        if (pulled && ctx.v < 0.2) { ev.phase = 'passing'; ctx.good(); ctx.say('Stay stopped until it passes.'); }
        else if (k.s > ctx.s - 10) { k.s = ctx.s - 10; ev.waiting = (ev.waiting || 0) + ctx.dt; if (ev.waiting > 6) return ctx.fail(ev, 'Pull to the right edge and stop so the ambulance can get by.'); }
      } else if (ev.phase === 'passing') {
        k.s += 15 * ctx.dt;
        if (ctx.v > 0.6 && k.s < ctx.s + 6) return ctx.fail(ev, 'Stay stopped until the ambulance passes you.');
        if (k.s > ctx.s + 45) { ev.phase = 'back'; ctx.siren(false); ctx.say('It passed. Signal LEFT, then go back into your lane.'); }
      } else if (ev.phase === 'back') {
        k.s += 15 * ctx.dt;
        if (!ev.back) ctx.action = { label: 'BACK TO LANE', press: () => {
          if (ctx.signal !== 'left') { ctx.note('Signal first'); return ctx.say('Turn on your LEFT signal first.'); }
          ev.back = true; ctx.targetOffset = 0; ctx.action = null; ctx.say('Great job. Tap GO.');
        } };
        if (ev.back && Math.abs(ctx.offset) < .2) { amb.visible = false; ctx.pass(ev); }
      }
      const p = ctx.pointAt(k.s, ev.phase === 'coming' ? 0 : -1.3);
      amb.position.copy(p.pos); amb.rotation.y = p.yaw;
      const on = Math.floor(ctx.t * 5) % 2 === 0;
      k.lights[0].material = on ? MAT.lampRed : MAT.lampBlue; k.lights[1].material = on ? MAT.lampBlue : MAT.lampRed;
    },
    reset(ev) { ev.phase = null; ev.pulled = false; ev.back = false; ev.waiting = 0; ev.said = false; amb.visible = false; }
  });
}

/* ------------------------------------------------------------------ */
/* World building                                                      */
/* ------------------------------------------------------------------ */

const v = (x, z) => new T.Vector3(x, 0, z);
const MAT = {};
const mat = c => MAT[c] || (MAT[c] = new T.MeshLambertMaterial({ color: c }));

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function makeWorld(scene) {
  const root = new T.Group(); scene.add(root);
  const tex = new T.TextureLoader();
  MAT.lampRed = new T.MeshBasicMaterial({ color: 0xFF3030 });
  MAT.lampBlue = new T.MeshBasicMaterial({ color: 0x3E7BFF });
  MAT.lampOff = new T.MeshLambertMaterial({ color: 0x552020 });
  MAT.lampAmber = new T.MeshBasicMaterial({ color: 0xFFB020 });
  const rand = rng(7);

  const add = (m, parent = root) => { parent.add(m); return m; };
  const box = (w, h, d, c, x, y, z, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'number' ? mat(c) : c); m.position.set(x, y, z); return add(m, parent); };
  const flat = (w, d, c, x, y, z, parent) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), typeof c === 'number' ? mat(c) : c); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return add(m, parent); };
  const cyl = (r1, r2, h, c, x, y, z, seg = 10, parent) => { const m = new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg), mat(c)); m.position.set(x, y, z); return add(m, parent); };

  // ground
  flat(900, 900, C.grass, 0, 0, -100);

  // Run fn(a, b) over [from, to] minus the gap ranges.
  const spans = (from, to, gaps = []) => {
    const lo = Math.min(from, to), hi = Math.max(from, to);
    const cuts = gaps.map(g => [Math.min(...g), Math.max(...g)]).sort((a, b) => a[0] - b[0]);
    const out = []; let cur = lo;
    for (const [a, b] of cuts) { if (a > cur) out.push([cur, Math.min(a, hi)]); cur = Math.max(cur, b); }
    if (cur < hi) out.push([cur, hi]);
    return out;
  };

  const w = {
    root, box, flat, cyl,
    // A straight road. axis 'z' runs north-south at x = at; axis 'x' runs east-west at z = at.
    road(axis, at, from, to, type, { gaps = [] } = {}) {
      const len = Math.abs(to - from), mid = (from + to) / 2, W = 2 * LANE;
      const place = (m, along, across, y) => { if (axis === 'z') m.position.set(at + across, y, along); else { m.position.set(along, y, at + across); m.rotation.z = Math.PI / 2; } return m; };
      const strip = (width, length, c, along, across, y) => { const m = flat(axis === 'z' ? width : length, axis === 'z' ? length : width, c, 0, 0, 0); place(m, along, across, y); m.rotation.z = 0; return m; };
      strip(W, len, C.road, mid, 0, 0.01);
      for (const [a, b] of spans(from, to, gaps)) {
        const L = b - a, m = (a + b) / 2;
        // sidewalks
        for (const side of [-1, 1]) {
          const sw = box(axis === 'z' ? 3 : L, 0.14, axis === 'z' ? L : 3, C.walk, 0, 0.07, 0);
          if (axis === 'z') sw.position.set(at + side * (LANE + 1.5), 0.07, m); else sw.position.set(m, 0.07, at + side * (LANE + 1.5));
          strip(0.15, L, C.paint, m, side * (LANE - 0.25), 0.02);
        }
        if (type === 'two') { strip(0.12, L, C.yellow, m, -0.12, 0.02); strip(0.12, L, C.yellow, m, 0.12, 0.02); }
        else for (let d = a + 1; d < b - 3; d += 9) strip(0.14, 3, C.paint, d + 1.5, 0, 0.02);
      }
    },
    stopLine(x, z) { flat(LANE - 0.3, 0.45, C.paint, x, 0.025, z); },
    crosswalk(axis, z, big) { for (let i = -3; i <= 3; i++) flat(0.55, big ? 3.6 : 2.6, C.paint, i * 1.05, 0.025, z); },
    sign(path, x, z, rotY = 0, size = 1.2) {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; root.add(g);
      cyl(0.05, 0.05, 2.4, 0x8A8F9C, 0, 1.2, 0, 6, g);
      const t = tex.load('assets/' + path + '.svg'); t.colorSpace = T.SRGBColorSpace;
      const m = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.2 }));
      m.position.set(0, 2.4 + size / 2 - .1, 0.06); g.add(m);
      return g;
    },
    palm(x, z) {
      const h = 5 + rand() * 3;
      cyl(0.14, 0.22, h, 0x7A5B3A, x, h / 2, z, 6);
      for (let i = 0; i < 6; i++) { const f = box(2.6, 0.08, 0.5, 0x2F7A4C, x, h, z); f.rotation.y = i * Math.PI / 3; f.rotation.z = -0.35; f.translateX(1.1); }
    },
    building(x, z, side, rotY = 0) {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; root.add(g);
      const wdt = 7 + rand() * 5, hgt = 4 + rand() * 9, dep = 8;
      const cols = [C.night, C.purple, 0x2B3160, 0x46508A, 0x5B3F6E];
      box(dep, hgt, wdt, cols[Math.floor(rand() * cols.length)], side * dep / 2, hgt / 2, 0, g);
      // a strip of lit windows facing the street
      box(0.05, 0.9, wdt * 0.8, MAT.lampAmber, -side * 0.03, Math.min(hgt - 1, 2.6), 0, g);
      return g;
    },
    // houses, palms and buildings along a north-south street (skips `skip` ranges)
    city(zFrom, zTo, crossZ = null, skip = null) {
      for (let z = zFrom; z > zTo; z -= 13) {
        if (crossZ != null && Math.abs(z - crossZ) < 16) continue;
        for (const side of [-1, 1]) {
          if (skip && side === 1 && z < skip[0] && z > skip[1]) continue;
          if (rand() < .8) this.building(side * (LANE + 3.6), z, side);
          if (rand() < .5) this.palm(side * (LANE + 2.4), z - 6);
        }
      }
    },
    cityX(zAt, xFrom, xTo) {
      for (let x = xFrom + 10; x < xTo; x += 13) for (const side of [-1, 1]) {
        if (rand() < .8) this.building(x, zAt - side * (LANE + 3.6), side, Math.PI / 2);
        if (rand() < .5) this.palm(x + 5, zAt + side * (LANE + 2.4));
      }
    },
    school(z) {
      box(9, 6, 40, C.gold, LANE + 9, 3, z);
      box(9.2, 0.6, 40.2, C.orange, LANE + 9, 6.2, z);
      box(0.1, 1.2, 30, MAT.lampAmber, LANE + 4.45, 3, z).material = mat(C.navy);
      this.sign('signs/school-zone', LANE + 2, z + 22, 0, 1.4);
    },
    finish(s) { this.finishAt(1.75, 20 - s, 0); },
    finishAt(x, z, rotY) {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; root.add(g);
      w.finishPos = g.position;
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { const m = flat(0.44, 0.44, (i + j) % 2 ? C.navy : C.paint, -1.55 + i * 0.44, 0.03, j * 0.44, g); }
      cyl(0.06, 0.06, 3.2, 0x8A8F9C, 2.4, 1.6, 0, 6, g);
      box(1.1, 0.7, 0.05, C.pink, 2.95, 2.8, 0, g);
      return g;
    },
    cone(x, z) { cyl(0.02, 0.28, 0.75, C.orange, x, 0.38, z, 8); box(0.6, 0.05, 0.6, C.orange, x, 0.03, z); },
    person(c, scale = 1) {
      const g = new T.Group(); g.scale.setScalar(scale); root.add(g);
      cyl(0.25, 0.28, 1.0, c, 0, 1.05, 0, 8, g);
      const head = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), mat(0x8B5A3C)); head.position.y = 1.8; g.add(head);
      const legs = box(0.4, 0.6, 0.18, C.navy, 0, 0.3, 0, g); g.userData.legs = legs;
      return g;
    },
    car(c, parent = root) {
      const g = new T.Group(); parent.add(g);
      box(1.8, 0.6, 4.2, c, 0, 0.55, 0, g);
      box(1.5, 0.5, 2.0, C.glass, 0, 1.1, 0.25, g);
      box(1.52, 0.08, 2.1, c, 0, 1.38, 0.25, g);
      for (const [x, z] of [[-0.85, -1.3], [0.85, -1.3], [-0.85, 1.3], [0.85, 1.3]]) { const wh = cyl(0.33, 0.33, 0.26, 0x151822, x, 0.33, z, 12, g); wh.rotation.z = Math.PI / 2; }
      box(0.35, 0.12, 0.05, 0xFFF6C9, -0.6, 0.6, -2.11, g); box(0.35, 0.12, 0.05, 0xFFF6C9, 0.6, 0.6, -2.11, g);
      const tl = box(0.35, 0.12, 0.05, 0x8A1C2B, -0.6, 0.62, 2.11, g), tr = box(0.35, 0.12, 0.05, 0x8A1C2B, 0.6, 0.62, 2.11, g);
      g.userData.tail = [tl, tr];
      return g;
    },
    bus() {
      const g = new T.Group(); root.add(g);
      box(2.5, 2.6, 10, C.gold, 0, 1.6, 0, g);
      box(2.52, 0.8, 8.6, C.glass, 0, 2.2, 0.4, g);
      box(2.54, 0.12, 10.02, C.navy, 0, 1.2, 0, g);
      for (const [x, z] of [[-1.1, -3.4], [1.1, -3.4], [-1.1, 3.4], [1.1, 3.4]]) { const wh = cyl(0.5, 0.5, 0.3, 0x151822, x, 0.5, z, 12, g); wh.rotation.z = Math.PI / 2; }
      const lights = [box(0.3, 0.3, 0.1, MAT.lampRed, -0.9, 2.95, -5.03, g), box(0.3, 0.3, 0.1, MAT.lampRed, 0.9, 2.95, -5.03, g)];
      // stop arm on the driver's side (left of the bus)
      const arm = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.05, 8), mat(C.red)); arm.rotation.z = Math.PI / 2; arm.position.set(-1.7, 1.8, -3.2); g.add(arm);
      g.userData = { lights, arm };
      return g;
    },
    ambulance() {
      const g = new T.Group(); root.add(g);
      box(2.1, 2.2, 5.4, C.white, 0, 1.4, 0, g);
      box(2.12, 0.3, 5.42, C.red, 0, 1.1, 0, g);
      box(1.8, 0.6, 0.05, C.glass, 0, 1.9, -2.71, g);
      for (const [x, z] of [[-0.95, -1.8], [0.95, -1.8], [-0.95, 1.8], [0.95, 1.8]]) { const wh = cyl(0.4, 0.4, 0.28, 0x151822, x, 0.4, z, 12, g); wh.rotation.z = Math.PI / 2; }
      g.userData = { s: 0, lights: [box(0.7, 0.2, 0.3, MAT.lampRed, -0.45, 2.6, -2.2, g), box(0.7, 0.2, 0.3, MAT.lampBlue, 0.45, 2.6, -2.2, g)] };
      return g;
    }
  };
  return w;
}

/* ------------------------------------------------------------------ */
/* Engine + HUD                                                        */
/* ------------------------------------------------------------------ */

// ui = { h, img, audio, voice: () => bool, setVoice(on), onExit(), onDone(result) }
export function startDrive(container, drive, ui) {
  const { h, img, audio } = ui;
  const reduced = ui.reduced();

  // --- renderer -----------------------------------------------------
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); }
  catch {
    container.append(h('div', { class: 'rt-card' }, h('b', {}, '3D is not available on this device.'), h('p', {}, 'Try the Drive Practice questions instead.'), h('button', { class: 'btn primary', onClick: ui.onExit }, 'BACK')));
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.background = new T.Color(0xBFD8E6);
  scene.fog = new T.Fog(0xD9C7B8, 60, 230);
  scene.add(new T.HemisphereLight(0xFFF1DE, 0x51795D, 1.6));
  const sun = new T.DirectionalLight(0xFFE2C0, 1.6); sun.position.set(30, 60, 20); scene.add(sun);
  const camera = new T.PerspectiveCamera(62, 1, 0.1, 400);

  const world = makeWorld(scene);
  const path = drive.path ? drive.path(world) : (() => { const p = new T.CurvePath(); p.add(new T.LineCurve3(v(1.75, 20), v(1.75, -400))); return p; })();
  const total = path.getLength();
  const player = world.car(C.pink);
  const events = drive.build(world);
  const finishS = (() => { // the path distance closest to the checkered finish line
    let best = total - 20, bestD = 1e9;
    if (world.finishPos) for (let s = 0; s < total; s += 1) { const d = path.getPointAt(s / total).distanceTo(world.finishPos); if (d < bestD) { bestD = d; best = s; } }
    return best;
  })();

  // --- state --------------------------------------------------------
  const ctx = {
    s: 0, v: 0, mph: 0, dt: 0, t: 0, sFront: CAR_HALF, offset: 0, targetOffset: 0,
    signal: null, looked: false, lookT: 0, action: null, showLook: false, zoneLimit: null, stoppedAt: 0,
    notes: [],
    pointAt(s, off) {
      const u = Math.min(1, Math.max(0, s / total));
      const p = path.getPointAt(u), t = path.getTangentAt(u);
      const right = new T.Vector3(-t.z, 0, t.x);
      return { pos: p.clone().addScaledVector(right, off), yaw: Math.atan2(-t.x, -t.z), t, right };
    },
    say(text) { banner.textContent = text; banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop'); if (ui.voice()) audio.speak(text); },
    good() { audio.sfx('right'); },
    note(n) { ctx.notes.push(n); audio.sfx('wrong'); },
    siren(on) { audio.siren && audio.siren(on); },
    pass(ev) { if (!ev.done) { ev.done = true; } },
    fail(ev, msg) { failWith(ev, msg); }
  };
  let paused = false, go = false, brake = false, raf = 0, destroyed = false, finished = false;
  const vmax = drive.limit / MPH;

  // --- HUD ----------------------------------------------------------
  const speedEl = h('b', {}, '0');
  const limitEl = h('div', { class: 'rt-limit' }, h('small', {}, 'LIMIT'), h('b', {}, String(drive.limit)));
  const banner = h('div', { class: 'rt-banner' }, drive.goal);
  const sigL = h('button', { class: 'rt-sig', 'aria-label': 'Left signal' }, '◀');
  const sigR = h('button', { class: 'rt-sig', 'aria-label': 'Right signal' }, '▶');
  const actBtn = h('button', { class: 'rt-act', hidden: true }, '');
  const lookBtn = h('button', { class: 'rt-look', hidden: true }, '👀 LOOK');
  const goBtn = h('button', { class: 'rt-pedal go' }, 'GO');
  const brBtn = h('button', { class: 'rt-pedal brake' }, 'BRAKE');
  const voiceBtn = h('button', { class: 'icon-btn', 'aria-label': 'Voice on or off' }, img('icons/sound'));
  const exitBtn = h('button', { class: 'icon-btn', 'aria-label': 'Leave the drive' }, img('icons/pause'));
  const overlay = h('div', { class: 'rt-overlay', hidden: true });
  const hud = h('div', { class: 'rt-hud' },
    h('div', { class: 'rt-top' },
      h('div', { class: 'row gap-s' }, exitBtn, h('div', { class: 'col' }, h('div', { class: 'chip pink' }, img('icons/car'), 'ROAD TEST'), h('div', { class: 'hud-sub' }, drive.name))),
      h('div', { class: 'row gap-s' }, voiceBtn, h('div', { class: 'rt-speed' }, speedEl, h('small', {}, 'MPH')), limitEl)),
    banner,
    h('div', { class: 'rt-bottom' },
      h('div', { class: 'rt-mid' }, sigL, h('div', { class: 'rt-center' }, lookBtn, actBtn), sigR),
      h('div', { class: 'rt-pedals' }, brBtn, goBtn)));
  container.append(renderer.domElement, hud, overlay);
  renderer.domElement.className = 'rt-canvas';
  const setVoiceLook = () => voiceBtn.classList.toggle('off', !ui.voice());
  setVoiceLook();

  const hold = (el, set) => {
    const on = e => { e.preventDefault(); set(true); el.classList.add('down'); audio.unlock(); };
    const off = () => { set(false); el.classList.remove('down'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', e => e.preventDefault());
  };
  hold(goBtn, x => { go = x; if (x) brake = false; });
  hold(brBtn, x => { brake = x; if (x) go = false; });
  const toggleSignal = dir => { ctx.signal = ctx.signal === dir ? null : dir; audio.sfx('tap'); };
  sigL.onclick = () => toggleSignal('left');
  sigR.onclick = () => toggleSignal('right');
  actBtn.onclick = () => { audio.sfx('tap'); ctx.action && ctx.action.press(); };
  lookBtn.onclick = () => { audio.sfx('whoosh'); ctx.lookT = 1.4; ctx.looked = true; };
  voiceBtn.onclick = () => { ui.setVoice(!ui.voice()); setVoiceLook(); if (!ui.voice()) audio.stopSpeaking(); };
  exitBtn.onclick = () => { paused = true; card('PAUSED', 'Take a breath. Your drive is waiting.', [['KEEP DRIVING', () => { hideCard(); paused = false; }, 'primary'], ['LEAVE DRIVE', ui.onExit, 'ghost']]); };

  const keys = e => {
    const down = e.type === 'keydown';
    if (['ArrowUp', 'w', 'W'].includes(e.key)) { go = down; e.preventDefault(); }
    else if (['ArrowDown', 's', 'S', ' '].includes(e.key)) { brake = down; e.preventDefault(); }
    else if (down && ['ArrowLeft', 'q', 'Q'].includes(e.key)) toggleSignal('left');
    else if (down && ['ArrowRight', 'e', 'E'].includes(e.key)) toggleSignal('right');
    else if (down && e.key === 'Enter') { if (!overlay.hidden) overlay.querySelector('.btn')?.click(); else actBtn.click(); }
    else if (down && ['l', 'L'].includes(e.key) && !lookBtn.hidden) lookBtn.click();
  };
  addEventListener('keydown', keys); addEventListener('keyup', keys);

  // --- overlay cards --------------------------------------------------
  function card(title, text, buttons, extra) {
    overlay.replaceChildren(h('div', { class: 'rt-card' },
      h('div', { class: 'big-title' }, title),
      text ? h('p', {}, text) : null,
      extra || null,
      h('div', { class: 'col gap-s' }, buttons.map(([label, fn, kind]) => h('button', { class: 'btn big ' + (kind || 'primary'), onClick: () => { audio.sfx('tap'); fn(); } }, label)))));
    overlay.hidden = false;
    go = brake = false; goBtn.classList.remove('down'); brBtn.classList.remove('down');
  }
  const hideCard = () => { overlay.hidden = true; };

  function failWith(ev, msg) {
    if (paused) return;
    ev.tries++; paused = true;
    audio.sfx('wrong'); ctx.siren(false);
    if (ui.voice()) audio.speak('Let\'s try that again. ' + msg);
    card('TRY AGAIN', msg, [['TRY AGAIN', () => { rewind(ev.retry); hideCard(); paused = false; }, 'primary']]);
  }

  function rewind(s) {
    ctx.s = s; ctx.v = 0; ctx.offset = ctx.targetOffset = 0; ctx.signal = null; ctx.looked = false; ctx.action = null; ctx.zoneLimit = null; ctx.capMph = null;
    for (const ev of events) if (ev.start >= s - 1 || !ev.done) { ev.done = false; ev.said = false; ev.reset && ev.reset(ev); }
  }

  // --- start ----------------------------------------------------------
  paused = true;
  card(drive.name.toUpperCase(), drive.goal, [['START DRIVE', () => { hideCard(); paused = false; audio.unlock(); if (ui.voice()) audio.speak(drive.goal); }, 'primary']],
    h('div', { class: 'rt-howto' }, h('span', {}, 'Hold ', h('b', {}, 'GO'), ' to drive.'), h('span', {}, 'Hold ', h('b', {}, 'BRAKE'), ' to slow and stop.'), h('span', {}, h('b', {}, '◀ ▶'), ' are your turn signals.')));

  // --- loop -----------------------------------------------------------
  const resize = () => {
    const r = container.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const camPos = new T.Vector3(), camLook = new T.Vector3();
  let last = performance.now(), blink = 0;
  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) step(dt);
    draw(dt);
  }

  function step(dt) {
    ctx.dt = dt; ctx.t += dt;
    const acc = 2.4, dec = 6.5, coast = 0.35;
    if (go) ctx.v += acc * dt; else if (brake) ctx.v -= dec * dt; else ctx.v -= coast * dt;
    ctx.v = Math.max(0, Math.min(ctx.capMph ? Math.min(vmax, ctx.capMph / MPH) : vmax, ctx.v));
    if (ctx.v < 0.05 && brake) ctx.v = 0;
    ctx.s = Math.min(total - 1, ctx.s + ctx.v * dt);
    ctx.mph = ctx.v * MPH;
    ctx.sFront = ctx.s + CAR_HALF;
    const d = ctx.targetOffset - ctx.offset;
    ctx.offset += Math.sign(d) * Math.min(Math.abs(d), 1.6 * dt);
    ctx.lookT = Math.max(0, ctx.lookT - dt);
    ctx.action = null; ctx.showLook = false;
    for (const ev of events) if (!ev.done && ctx.s >= ev.start - 1) { ev.run(ctx, ev); if (paused) return; }
    if (!finished && ctx.sFront >= finishS && events.every(e => e.done)) finish();
    else if (!finished && ctx.sFront >= finishS + 25) { const open = events.find(e => !e.done); if (open) failWith(open, 'Let\'s go back and do this part.'); }
  }

  function draw(dt) {
    const p = ctx.pointAt(ctx.s, ctx.offset);
    player.position.copy(p.pos);
    player.rotation.y = p.yaw;
    // brake lights + blinkers
    const braking = brake || ctx.v < 0.05;
    player.userData.tail.forEach(m => m.material = braking ? MAT.lampRed : mat(0x8A1C2B));
    blink += dt;
    const bOn = Math.floor(blink * 2.5) % 2 === 0;
    if (ctx.signal) {
      const i = ctx.signal === 'left' ? 0 : 1;
      player.userData.tail[i].material = bOn ? MAT.lampAmber : (braking ? MAT.lampRed : mat(0x8A1C2B));
    }
    sigL.classList.toggle('on', ctx.signal === 'left' && bOn);
    sigR.classList.toggle('on', ctx.signal === 'right' && bOn);
    // camera: behind and above, looking ahead; LOOK swings it over the left shoulder
    const lookAmt = ctx.lookT > 0 ? Math.sin(Math.min(1, (1.4 - ctx.lookT) / 0.35) * Math.PI / 2) * Math.min(1, ctx.lookT / 0.35) : 0;
    const back = p.pos.clone().addScaledVector(p.t, -9.5).add(new T.Vector3(0, 4.6, 0));
    const ahead = p.pos.clone().addScaledVector(p.t, 16).add(new T.Vector3(0, 0.6, 0));
    if (lookAmt > 0) { back.copy(p.pos).addScaledVector(p.right, 0.2).add(new T.Vector3(0, 1.6, 0)); ahead.copy(p.pos).addScaledVector(p.right, -12).addScaledVector(p.t, 6 * (1 - lookAmt)).add(new T.Vector3(0, 1.2, 0)); }
    const k = reduced || lookAmt > 0 ? 1 : 1 - Math.pow(0.001, dt);
    if (camPos.lengthSq() === 0) { camPos.copy(back); camLook.copy(ahead); }
    camPos.lerp(back, k); camLook.lerp(ahead, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    renderer.render(scene, camera);
    // HUD
    speedEl.textContent = String(Math.round(ctx.mph));
    const lim = ctx.zoneLimit || drive.limit;
    limitEl.lastChild.textContent = String(lim);
    limitEl.classList.toggle('school', !!ctx.zoneLimit);
    speedEl.parentElement.classList.toggle('over', ctx.mph > lim + 1);
    actBtn.hidden = !ctx.action; if (ctx.action) actBtn.textContent = ctx.action.label;
    lookBtn.hidden = !ctx.showLook;
  }

  function finish() {
    finished = true; paused = true; ctx.siren(false);
    const retries = events.reduce((n, e) => n + e.tries, 0) + ctx.notes.length;
    const stars = retries === 0 ? 3 : retries <= 2 ? 2 : 1;
    audio.sfx('win');
    const list = h('div', { class: 'rt-list' }, events.map(e => h('div', { class: 'rt-item' }, img(e.tries ? 'icons/strike-on' : 'icons/check'), h('span', {}, e.label), h('small', {}, e.tries ? 'after ' + (e.tries + 1) + ' tries' : 'first try'))),
      ctx.notes.length ? h('div', { class: 'rt-item' }, img('icons/handbook'), h('span', {}, 'Examiner tip'), h('small', {}, [...new Set(ctx.notes)].join(', '))) : null);
    if (ui.voice()) audio.speak(stars === 3 ? 'Perfect drive!' : 'You passed this drive!');
    card(stars === 3 ? 'PERFECT DRIVE' : 'DRIVE PASSED', null, [['NEXT', () => ui.onDone({ stars }), 'primary'], ['DRIVE AGAIN', () => ui.onDone({ stars, again: true }), 'ghost']],
      h('div', { class: 'col gap-s center' }, h('div', { class: 'stars big' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)), list));
  }

  raf = requestAnimationFrame(frame);
  window.__road = { ctx, events, get paused() { return paused; }, finishS };

  return function destroy() {
    destroyed = true; cancelAnimationFrame(raf); ro.disconnect();
    removeEventListener('keydown', keys); removeEventListener('keyup', keys);
    ctx.siren(false); audio.stopSpeaking();
    renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const k in MAT) delete MAT[k];
  };
}
