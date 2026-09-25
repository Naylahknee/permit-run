# Permit Run: California

A calm, game-style study app for the California Class C knowledge (permit) test.
It is built for a learner who does better with pictures, motion, and sound, and who
can be overwhelmed by too much at once.

It is a PWA (progressive web app). Open the site on a phone, then "Add to Home Screen".
After the first visit, it works offline.

## What's in it

- **6 missions (districts)**, one per handbook topic: signs and signals; lanes, turns and parking;
  right-of-way; safe driving; alcohol, drugs and phones; freeways, insurance and crashes.
  Clearing a mission unlocks the next one.
- **Learn cards** before each mission: 4 cards, each with one picture or short animation and one sentence.
- **74 questions** in 4 kinds:
  - pick an answer (every question has a picture)
  - pick a picture (signs, signals, wheel direction for hill parking)
  - **trace your path**: drag from your car to show a turn (right turn, left turn, onto a one-way street,
    center turn lane, roundabout, pulling over for an ambulance). After you answer, the car drives the correct path.
  - **tap the spot**: tap the right lane, curb colour, stop position, or car
- **Drive Practice** (home screen): only draw-your-path and tap-the-road questions, open from the start.
- **Road Test · 3D** (home screen): 7 short behind-the-wheel drives in a 3D town: STOP sign, right turn,
  crosswalk, school zone, school bus, lane change, and pulling over for an ambulance. Simple controls: hold GO or
  BRAKE, tap the turn signals, and tap the one action button when a choice comes up (LOOK, CHANGE LANE, PULL RIGHT).
  The car stays in its lane by itself. A mistake pauses the drive, explains what to do, and rewinds a little.
  Keyboard: arrow keys or W/S to drive and brake, Q/E for signals, Enter for the action, L to look.
- **Practice Test** (20 questions, pass at 16) and an optional **Speed Run**.
- **Review**: questions you missed come back until you get them right.
- Cash, 6 ranks, 6 badges, streaks.

### Made to be calm
- One question per screen, one picture, 3 answers at most.
- **Calm mode** (on by default): no strikes, no timer, a mission never fails. Wrong answers say "Almost!" and show the right answer.
- Pause button opens a breathing break.
- Settings: music, sound effects, read questions out loud, bigger text, less motion, 4/6/8 questions per mission.
- Music and sounds are generated in the browser (soft lo-fi loop). Read-aloud uses the phone's built-in voice.

## Run it locally

```sh
cd app
npx http-server -p 8080 -c-1   # any static server works
```

Open http://localhost:8080. (A service worker needs `http://localhost` or `https://`, not `file://`.)

## Install on a phone

The app is a PWA, so there is no app store step.
- **iPhone / iPad (Safari):** open the site, tap **Share**, then **Add to Home Screen**.
- **Android (Chrome):** open the site, then tap **Install app** (or menu ⋮ → **Add to Home screen**).

It then opens full screen like an app and works offline.

## Deploy

Upload the `app/` folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).
It must be served over HTTPS so it can be installed as an app.

## Changing content

- Questions and learn cards: `js/data.js`. Each question lists the handbook section it came from.
- Road scenes for trace/tap questions are described in data and drawn by `js/scene.js`.
- The 3D drives live in `js/roadtest.js` (each drive lists its checks at the top of the file).
  `js/vendor/three.js` is a trimmed build of [Three.js](https://threejs.org) r186 (MIT license) containing only the parts the game uses.
- After changing any file, run `node tools/build.mjs` from the repo root. It refreshes the
  offline file list (`precache.js`) so installed phones pick up the update. Add `--no-icons`
  to skip re-rendering the PNG icons (which needs Playwright).
- `tools/copy-assets.mjs` re-copies the SVGs from the design kit (`project/assets`) and strips their metadata.

## Sources

Questions are written from the *California Driver's Handbook* (California DMV, 2025 edition),
licensed CC BY-NC 4.0. They follow the style of the DMV sample tests; three of them match
DMV Sample Test 1 questions used in the design kit. This is a practice tool and is not made by the DMV.
Fonts: Big Shoulders Display, Barlow, JetBrains Mono (SIL Open Font License).
