// Game content. Every fact comes from the California Driver's Handbook
// (DMV, 2025 edition, CC BY-NC 4.0). Section numbers are in `src`.
//
// Question types
//   choice : pick one text answer. `a` = answers, `c` = index of the right one.
//   pics   : pick one picture. `a` = [{img|wheels, label}], `c` = index.
//   tap    : tap a spot in a road scene. `ok` = accepted zone/actor ids.
//   trace  : drag a path from your car. `goal` says where it must end.
//
// Visuals (one per question, never more)
//   img   : 'folder/name' inside assets/, e.g. 'signs/stop'
//   big   : a large word card, e.g. { text: 'UNDER 21' }
//   scene : a top-down road drawn by scene.js

export const RANKS = [
  { min: 0, name: 'Learner', badge: 'badges/rank-1-learner' },
  { min: 1500, name: 'Permit', badge: 'badges/rank-2-permit' },
  { min: 4000, name: 'Provisional', badge: 'badges/rank-3-provisional' },
  { min: 8000, name: 'Licensed', badge: 'badges/rank-4-licensed' },
  { min: 14000, name: 'Road Pro', badge: 'badges/rank-5-road-pro' },
  { min: 22000, name: 'Golden State', badge: 'badges/rank-6-golden-state' }
];

export const ACHIEVEMENTS = [
  { id: 'streak5', name: '5 in a row', desc: 'Get 5 answers right in a row.', badge: 'badges/ach-streak-5' },
  { id: 'perfect', name: 'Perfect run', desc: 'Finish a mission with every answer right.', badge: 'badges/ach-perfect-score' },
  { id: 'district', name: 'District cleared', desc: 'Clear your first district.', badge: 'badges/ach-district-cleared' },
  { id: 'signs', name: 'Sign master', desc: 'Get 10 sign or signal questions right.', badge: 'badges/ach-sign-master' },
  { id: 'speed', name: 'Speed run', desc: 'Finish a Speed Run.', badge: 'badges/ach-speed-run' },
  { id: 'clean', name: 'Clean record', desc: 'Pass the Practice Test.', badge: 'badges/ach-clean-record' }
];

export const DISTRICTS = [
  {
    id: 'downtown', name: 'Downtown Grid', topic: 'Signs & Signals', icon: 'signs/stop',
    learn: [
      { img: 'signals/signal-red', say: 'Red light means STOP.', more: 'You may turn right after a full stop, unless a sign says NO TURN ON RED.' },
      { img: 'signals/signal-flashing-red', say: 'Flashing red is like a STOP sign.', more: 'Stop all the way. Then go when it is safe.' },
      { imgs: ['signs/stop', 'signs/yield', 'signs/curve-right'], say: 'Shapes tell you what to do.', more: 'Eight sides: STOP. Triangle: YIELD. Diamond: warning ahead.' },
      { anim: 'signalCycle', say: 'Yellow means the light is about to turn red.', more: 'Stop if you can do it safely.' }
    ],
    qs: [
      { id: 'd1', type: 'choice', img: 'signs/yield', q: 'What does this sign mean?', a: ['Slow down. Be ready to stop and let others go first.', 'Always stop, even if the road is clear.', 'Speed up and merge.'], c: 0, tip: 'YIELD: slow down and let cars, bikes, and walkers go first.', src: '7' },
      { id: 'd2', type: 'choice', img: 'signals/signal-flashing-red', q: 'The red light is flashing. What do you do?', a: ['Stop. Then go when it is safe.', 'Slow down. You do not need to stop.', 'Wait until it turns green.'], c: 0, tip: 'A flashing red light works like a STOP sign.', src: '7' },
      { id: 'd3', type: 'choice', img: 'signals/signal-flashing-yellow', q: 'The yellow light is flashing. What does it mean?', a: ['Slow down and go carefully.', 'Stop and wait.', 'Speed up.'], c: 0, tip: 'Flashing yellow means go ahead with caution. You do not need to stop.', src: '7' },
      { id: 'd4', type: 'choice', img: 'signals/signal-red-arrow', q: 'You want to turn. The arrow is red. What do you do?', a: ['Stay stopped until a green light or green arrow shows.', 'Stop, then turn when it is clear.', 'Turn if no cars are coming.'], c: 0, tip: 'Never turn on a red arrow. Wait for green.', src: '7' },
      { id: 'd5', type: 'choice', img: 'signals/signal-green-arrow', q: 'What does a green arrow mean?', a: ['You can turn. Oncoming cars have a red light.', 'Let oncoming cars go first, then turn.', 'Stop first, then turn.'], c: 0, tip: 'A green arrow is a protected turn. Oncoming traffic is stopped.', src: '7' },
      { id: 'd6', type: 'choice', img: 'signals/signal-yellow', q: 'The light turns solid yellow. What does it mean?', a: ['It will turn red soon. Stop if you safely can.', 'Speed up to beat the red light.', 'Stop right away, even in the middle of the road.'], c: 0, tip: 'Yellow = the light is about to turn red.', src: '7' },
      { id: 'd7', type: 'pics', q: 'Which sign means you are near a school?', a: [{ img: 'signs/school-zone', label: 'Five sides' }, { img: 'signs/pedestrian-crossing', label: 'Diamond' }, { img: 'signs/slow-moving-vehicle', label: 'Triangle' }], c: 0, tip: 'The five-sided sign means school. Drive slowly and watch for kids.', src: '7' },
      { id: 'd8', type: 'pics', q: 'Which sign means DO NOT drive this way?', a: [{ img: 'signs/one-way', label: 'One way' }, { img: 'signs/do-not-enter', label: 'Do not enter' }, { img: 'signs/keep-right', label: 'Keep right' }], c: 1, tip: 'DO NOT ENTER: do not go onto that road or ramp.', src: '7' },
      { id: 'd9', type: 'choice', img: 'signs/railroad-crossbuck', q: 'You see this sign. What should you do?', a: ['Look, listen, slow down, and get ready to stop.', 'Speed up to cross quickly.', 'Stop on the tracks to look both ways.'], c: 0, tip: 'An X-shaped sign means a railroad crossing. Never stop on the tracks.', src: '7' },
      { id: 'd10', type: 'choice', img: 'signals/signal-red', dark: true, q: 'The traffic lights are dark. They are not working. What do you do?', a: ['Stop, like there is a STOP sign in every direction.', 'Drive through slowly without stopping.', 'Wait until the lights work again.'], c: 0, tip: 'Lights out? Treat it like an all-way STOP.', src: '7' },
      { id: 'd11', type: 'pics', q: 'Which signal means a walker may start crossing?', a: [{ img: 'signals/ped-dont-walk', label: 'Hand' }, { img: 'signals/ped-countdown', label: 'Countdown' }, { img: 'signals/ped-walk', label: 'Walking person' }], c: 2, tip: 'Walking person = you may cross. A hand or countdown means do not start.', src: '7' },
      { id: 'd12', type: 'choice', img: 'signs/slow-moving-vehicle', q: 'A vehicle has this sign on its back. What does it tell you?', a: ['It goes slowly, usually 25 mph or less.', 'It carries dangerous things.', 'It is an emergency vehicle.'], c: 0, tip: 'The orange and red triangle means a slow-moving vehicle.', src: '7' },
      {
        id: 'd14', type: 'trace', q: 'The light is red. No sign says NO TURN ON RED. You stopped. Now turn RIGHT. Draw your path.',
        scene: { kind: 'cross', ns: { n: 1, s: 1 }, ew: { e: 1, w: 1 }, signal: 'red', actors: [{ at: 'N:1:stop', id: 'you' }] },
        goal: { end: ['E:1:exit'], wrong: { 'W:1:exit': 'That was a left turn. You may NOT turn left on red here.', 'N:1:exit': 'You cannot go straight on a red light.' } },
        demo: { from: 'N:1', to: 'E:1' }, tip: 'After a full stop, you may turn right on red unless a sign says NO TURN ON RED.', src: '7'
      },
      {
        id: 'd15', type: 'trace', q: 'Green arrow! Make your LEFT turn. Draw your path.',
        scene: { kind: 'cross', ns: { n: 2, s: 2 }, ew: { e: 2, w: 2 }, signal: 'arrow', actors: [{ at: 'N:1:stop', id: 'you' }] },
        goal: { end: ['W:1:exit'], wrong: { 'W:2:exit': 'Close! Finish in the lane closest to the middle.', 'E:1:exit': 'The arrow points left. Turn left!', 'E:2:exit': 'The arrow points left. Turn left!' } },
        demo: { from: 'N:1', to: 'W:1' }, tip: 'A green arrow is a protected turn. Oncoming cars have a red light.', src: '7'
      },
      {
        id: 'd13', type: 'tap', q: 'All-way STOP. You and the teal car stopped at the same time. Tap the car that goes first.',
        scene: { kind: 'cross', ns: { n: 1, s: 1 }, ew: { e: 1, w: 1 }, stopSigns: true, actors: [{ at: 'N:1:stop', id: 'you', label: 'YOU' }, { at: 'W:1:stop', color: '#1FC7B6', id: 'teal' }] },
        ok: ['teal'], tip: 'Same time? The car on your RIGHT goes first.', src: '7'
      }
    ]
  },
  {
    id: 'harbor', name: 'Harbor Flats', topic: 'Lanes, Turns & Parking', icon: 'tiles/intersection',
    learn: [
      { anim: 'rightTurn', say: 'Right turn: stay close to the curb.', more: 'Start and finish in the lane closest to the right edge.' },
      { anim: 'leftTurn', say: 'Left turn: finish near the middle.', more: 'End in the left lane closest to the middle of the road.' },
      { img: 'icons/car', say: 'Signal 100 feet before you turn.', more: 'That is about the length of 6 cars.' },
      { anim: 'curbs', say: 'Curb colors are parking rules.', more: 'Red: never stop. White: quick drop-off. Blue: disabled placard only.' }
    ],
    qs: [
      {
        id: 'h1', type: 'trace', q: 'Turn RIGHT. Draw your path with your finger.',
        scene: { kind: 'cross', ns: { n: 2, s: 2 }, ew: { e: 2, w: 2 }, actors: [{ at: 'N:2:stop', id: 'you' }] },
        goal: { end: ['E:2:exit'], wrong: { 'E:1:exit': 'Too wide! Finish in the lane closest to the curb.' } },
        demo: { from: 'N:2', to: 'E:2' }, tip: 'Right turns start and end in the lane closest to the curb.', src: '6'
      },
      {
        id: 'h2', type: 'trace', q: 'Turn LEFT. Draw your path with your finger.',
        scene: { kind: 'cross', ns: { n: 2, s: 2 }, ew: { e: 2, w: 2 }, actors: [{ at: 'N:1:stop', id: 'you' }] },
        goal: { end: ['W:1:exit'], wrong: { 'W:2:exit': 'Close! Finish in the lane closest to the middle.', 'E:1:exit': 'That was a right turn. Go left!', 'E:2:exit': 'That was a right turn. Go left!' } },
        demo: { from: 'N:1', to: 'W:1' }, tip: 'Left turns end in the left lane closest to the middle.', src: '6'
      },
      {
        id: 'h3', type: 'trace', q: 'Turn LEFT onto a one-way street with 3 lanes. Draw your path.',
        scene: { kind: 'cross', ns: { n: 2, s: 2 }, ew: { e: 0, w: 3 }, actors: [{ at: 'N:1:stop', id: 'you' }] },
        goal: { end: ['W:1:exit', 'W:2:exit', 'W:3:exit'] },
        demo: { from: 'N:1', to: 'W:1' }, tip: 'Onto a one-way street with 3 or more lanes, you may end in any open lane.', src: '6'
      },
      {
        id: 'h4', type: 'tap', q: 'You will turn LEFT at the corner. Tap the lane you should be in.',
        scene: { kind: 'cross', ns: { n: 3, s: 2 }, ew: { e: 1, w: 1 }, laneTaps: ['N:1', 'N:2', 'N:3'] },
        ok: ['N:1'], tip: 'Get into the far-left lane (the lane closest to the middle) to turn left.', src: '6'
      },
      {
        id: 'h5', type: 'trace', q: 'Turn LEFT into the shop driveway. Use the center turn lane. Draw your path.',
        scene: { kind: 'cross', ns: { n: 1, s: 1, twlt: true }, ew: null, driveway: { y: 110, label: 'SHOP' }, actors: [{ lane: 'N:1', y: 318, id: 'you' }] },
        goal: { pass: ['twlt'], end: ['driveway'], wrongOrder: 'First move into the middle turn lane. Then turn.' },
        demo: { path: 'twlt' }, tip: 'Use the center left turn lane to get ready. You may drive in it for up to 200 feet.', src: '6'
      },
      {
        id: 'h6', type: 'tap', q: 'Tap the curb where ONLY people with a disabled placard may park.',
        scene: { kind: 'curbs' }, ok: ['blue'], tip: 'Blue curb: disabled parking with a placard or special plate.', src: '6'
      },
      {
        id: 'h7', type: 'tap', q: 'Tap the curb where you may only stop to pick up or drop off people.',
        scene: { kind: 'curbs' }, ok: ['white'], tip: 'White curb: stop just long enough to pick up or drop off.', src: '6'
      },
      {
        id: 'h8', type: 'tap', q: 'Tap the curb where you may NEVER stop or park.',
        scene: { kind: 'curbs' }, ok: ['red'], tip: 'Red curb: no stopping, standing, or parking.', src: '6'
      },
      {
        id: 'h9', type: 'pics', q: 'You park facing DOWNHILL next to a curb. How should the front wheels point?',
        a: [{ wheels: 'toward', label: 'Toward the curb' }, { wheels: 'away', label: 'Away from the curb' }, { wheels: 'straight', label: 'Straight' }], c: 0,
        tip: 'Downhill: turn wheels INTO the curb. Uphill: turn them AWAY.', src: '6'
      },
      {
        id: 'h10', type: 'pics', q: 'You park facing UPHILL next to a curb. How should the front wheels point?',
        a: [{ wheels: 'toward', label: 'Toward the curb' }, { wheels: 'straight', label: 'Straight' }, { wheels: 'away', label: 'Away from the curb' }], c: 2,
        tip: 'Uphill: turn wheels AWAY from the curb, then let the car roll back gently.', src: '6'
      },
      { id: 'h11', type: 'choice', img: 'icons/car', q: 'When should you turn on your signal before a turn?', a: ['At least 100 feet before the turn.', 'Just as you start turning.', 'Only if cars are behind you.'], c: 0, tip: 'Signal at least 100 feet before, even if you see no one.', src: '5' },
      { id: 'h12', type: 'choice', img: 'tiles/bike-lane-y', q: 'When may you drive in a bike lane?', a: ['Within 200 feet before a right turn.', 'To pass slow cars.', 'Any time no bikes are there.'], c: 0, tip: 'Only enter a bike lane within 200 feet of your right turn. Check for bikes first.', src: '6' },
      {
        id: 'h13', type: 'choice', q: 'What do two solid yellow lines in the middle mean?',
        scene: { kind: 'cross', ns: { n: 1, s: 1 }, ew: null, actors: [{ lane: 'N:1', y: 260 }, { lane: 'S:1', y: 90, color: '#FFC53D', rot: 180 }] },
        a: ['Do not pass over them.', 'You may pass if it is clear.', 'It is a bike lane.'], c: 0, tip: 'Double solid yellow: do not pass. Stay to the right.', src: '6'
      }
    ]
  },
  {
    id: 'valley', name: 'Valley Blvd', topic: 'Right-of-Way & Safety Zones', icon: 'vehicles/school-bus-front',
    learn: [
      { img: 'vehicles/school-bus-front', say: 'School bus with flashing RED lights: STOP.', more: 'Stay stopped until the lights stop flashing. Yellow lights mean slow down and get ready.' },
      { img: 'signs/school-zone', say: 'Near a school: 25 mph.', more: 'When children are outside, or lower if a sign says so.' },
      { anim: 'pullOver', say: 'Hear a siren? Pull to the right and stop.', more: 'Wait until the emergency vehicle passes.' },
      { img: 'signs/railroad-advance', say: 'Railroad: slow down and look.', more: 'If a train is coming, stop at least 15 feet from the tracks.' }
    ],
    qs: [
      { id: 'v1', type: 'choice', img: 'scenes/scene-school-bus-intersection', wide: true, q: 'A school bus ahead starts flashing YELLOW lights. What should you do?', a: ['Slow down and get ready to stop.', 'Stop right away and stay stopped.', 'Pass the bus carefully on the left.'], c: 0, tip: 'Flashing yellow: the bus is about to stop. Flashing red: you must stop.', src: '7', dmv: true },
      { id: 'v2', type: 'choice', img: 'vehicles/school-bus-rear', q: 'A school bus is flashing RED lights. What do you do?', a: ['Stop. Stay stopped until the red lights stop flashing.', 'Slow to 25 mph and pass.', 'Honk and drive around.'], c: 0, tip: 'Red lights on a school bus = STOP, from either direction on a two-lane road.', src: '7' },
      { id: 'v3', type: 'choice', img: 'signs/railroad-advance', q: 'You are near a railroad crossing with no gates. You cannot see 400 feet down the tracks. What is the speed limit?', a: ['15 mph', '10 mph', '25 mph'], c: 0, tip: 'Within 100 feet of a crossing you cannot see well: 15 mph.', src: '7', dmv: true },
      {
        id: 'v4', type: 'trace', q: 'An ambulance with a siren is behind you. Draw where you should go.',
        scene: { kind: 'cross', ns: { n: 1, s: 1 }, ew: null, actors: [{ lane: 'N:1', y: 230, id: 'you' }, { lane: 'N:1', y: 330, kind: 'ambulance' }] },
        goal: { end: ['rightEdge'], wrong: { leftSide: 'Go to the RIGHT edge of the road, not the left.' } },
        demo: { path: 'pullOver' }, tip: 'Pull over to the right edge and stop until the emergency vehicle passes.', src: '7'
      },
      {
        id: 'v5', type: 'tap', q: 'There is a STOP sign and a wide white line. Tap where you should stop.',
        scene: { kind: 'cross', ns: { n: 1, s: 1 }, ew: { e: 1, w: 1 }, stopSigns: true, stopTaps: true, actors: [{ lane: 'N:1', y: 330, id: 'you', label: 'YOU' }] },
        ok: ['limit'], tip: 'Stop behind the limit line (the wide white line). No line? Stop before the crosswalk.', src: '6'
      },
      { id: 'v6', type: 'choice', img: 'signs/speed-limit-25', q: 'What is the speed limit in a neighborhood, unless a sign says something else?', a: ['25 mph', '35 mph', '45 mph'], c: 0, tip: 'Business and residential districts: 25 mph unless posted.', src: '7' },
      { id: 'v7', type: 'choice', img: 'tiles/intersection', q: 'An intersection has no STOP signs and you cannot see around the corners. What is the speed limit?', a: ['15 mph', '25 mph', '5 mph'], c: 0, tip: 'Blind intersection: 15 mph.', src: '7' },
      { id: 'v8', type: 'choice', img: 'signs/pedestrian-crossing', q: 'A person with a white cane or a guide dog is crossing. Who has the right-of-way?', a: ['The person crossing. Always.', 'You, if your light is green.', 'Whoever gets there first.'], c: 0, tip: 'People who are blind have the right-of-way at all times. Do not honk.', src: '7' },
      { id: 'v9', type: 'choice', img: 'vehicles/police-cruiser-front', q: 'You are in an intersection. You hear a siren behind you. What do you do?', a: ['Keep going through. Then pull right and stop.', 'Stop right there in the intersection.', 'Speed up and stay in your lane.'], c: 0, tip: 'Never stop inside an intersection. Clear it, then pull to the right.', src: '7' },
      { id: 'v10', type: 'choice', img: 'vehicles/fire-truck-rear', q: 'A fire truck has its siren on. How far back must you stay?', a: ['300 feet', '100 feet', '50 feet'], c: 0, tip: 'It is against the law to follow within 300 feet.', src: '7' },
      {
        id: 'v11', type: 'trace', q: 'Roundabout! Take the exit on the LEFT side. Draw your path.',
        scene: { kind: 'rb', actors: [{ rb: 'south', id: 'you' }] },
        goal: { pass: ['rb:E', 'rb:N'], end: ['rb:exitW'], wrong: { 'rb:exitN': 'That exit goes straight. Keep going around to the left side.', 'rb:exitE': 'That exit turns right. Keep going around to the left side.' }, wrongOrder: 'Roundabouts go one way. Turn right first and go around.' },
        demo: { path: 'rbLeft' }, tip: 'Yield, enter to the right, and go around counter-clockwise to your exit.', src: '7'
      },
      {
        id: 'v12', type: 'tap', q: 'You want to turn right. Tap who goes first.',
        scene: { kind: 'cross', ns: { n: 1, s: 1 }, ew: { e: 1, w: 1 }, actors: [{ at: 'N:1:stop', id: 'you', label: 'YOU' }, { kind: 'walker', x: 226, y: 196, id: 'walker' }] },
        ok: ['walker'], tip: 'People in a crosswalk go first. Wait for them to finish crossing.', src: '7'
      },
      { id: 'v13', type: 'choice', img: 'tiles/bike-lane-y', q: 'You pass a bicyclist in your lane. How much space do you need?', a: ['At least 3 feet', '1 foot', 'No space needed'], c: 0, tip: 'Give at least 3 feet. If you cannot, wait.', src: '7' }
    ]
  },
  {
    id: 'canyon', name: 'Canyon Roads', topic: 'Safe Driving', icon: 'signs/curve-right',
    learn: [
      { anim: 'follow', say: 'Stay 3 seconds behind the car ahead.', more: 'When it passes a sign, count: one-thousand-one, two, three.' },
      { anim: 'truck', say: 'Trucks have big blind spots.', more: 'If you cannot see the truck\'s mirrors, the driver cannot see you.' },
      { img: 'vehicles/sedan-white-front', say: 'Dim your high beams.', more: 'Within 500 feet of a car coming toward you.' },
      { big: { text: 'RAIN', sub: 'slow down' }, say: 'Rain makes roads slippery.', more: 'If you start to slide on water, slow down gently. Do not slam the brakes.' }
    ],
    qs: [
      { id: 'c1', type: 'choice', img: 'vehicles/sedan-teal-rear', q: 'How far behind the car ahead should you stay?', a: ['3 seconds', '1 second', '1 car length'], c: 0, tip: 'Use the three-second rule.', src: '8' },
      {
        id: 'c2', type: 'tap', q: 'Tap the car that is hiding in the truck\'s blind spot.',
        scene: { kind: 'cross', ns: { n: 3, s: 0 }, ew: null, actors: [{ lane: 'N:2', y: 190, kind: 'truck' }, { lane: 'N:1', y: 40, color: '#FFC53D', id: 'A', label: 'A' }, { lane: 'N:3', y: 205, color: '#1FC7B6', id: 'B', label: 'B' }, { lane: 'N:1', y: 335, color: '#FF8A2A', id: 'C', label: 'C' }] },
        ok: ['B'], tip: 'Right beside a truck is a No Zone. Do not stay there.', src: '7'
      },
      { id: 'c3', type: 'choice', big: { text: 'SPLASH', sub: 'water on the road' }, q: 'Your car starts to slide on water (hydroplaning). What should you do?', a: ['Slow down gently. Do not slam the brakes.', 'Brake hard.', 'Speed up to get through it.'], c: 0, tip: 'Hydroplaning: ease off the gas, no sudden braking.', src: '8' },
      { id: 'c4', type: 'choice', img: 'vehicles/sedan-white-front', q: 'A car is coming toward you at night. When should you dim your high beams?', a: ['Within 500 feet', 'Within 100 feet', 'Never'], c: 0, tip: 'Dim within 500 feet of oncoming cars and 300 feet of a car you follow.', src: '5' },
      { id: 'c5', type: 'choice', img: 'vehicles/player-coupe-front', q: 'It is raining and your wipers are on. What else must be on?', a: ['Low-beam headlights', 'High-beam headlights', 'Hazard lights'], c: 0, tip: 'Wipers on = low-beam headlights on.', src: '5' },
      { id: 'c6', type: 'choice', big: { text: 'FOG', sub: 'can see 100 feet' }, q: 'You can only see 100 feet ahead. What is the fastest safe speed?', a: ['30 mph', '45 mph', '55 mph'], c: 0, tip: 'If you cannot see farther than 100 feet, do not go faster than 30 mph.', src: '8' },
      { id: 'c7', type: 'choice', img: 'signs/speed-limit-65', q: 'What is the top speed limit on most California highways?', a: ['65 mph', '75 mph', '55 mph'], c: 0, tip: '65 mph on most highways. 55 mph on two-lane undivided roads.', src: '8' },
      { id: 'c8', type: 'choice', img: 'signs/merge', q: 'You are getting onto the freeway. How fast should you go?', a: ['At or near the speed of freeway traffic.', 'Much slower than traffic.', 'Much faster than traffic.'], c: 0, tip: 'Merge at or near the speed of traffic.', src: '6', dmv: true },
      { id: 'c9', type: 'choice', img: 'vehicles/suv-orange-front', q: 'Someone is driving too close behind you. What should you do?', a: ['Move right when safe and let them pass.', 'Brake hard to warn them.', 'Speed up a lot.'], c: 0, tip: 'Keep your speed, then move over when it is safe.', src: '8' },
      { id: 'c10', type: 'choice', img: 'signs/curve-right', q: 'On a steep, narrow mountain road, two cars meet. Neither can pass. Who has the right-of-way?', a: ['The car facing uphill.', 'The car facing downhill.', 'The bigger car.'], c: 0, tip: 'The car facing downhill backs up. It has more control.', src: '7' },
      { id: 'c11', type: 'choice', img: 'signs/road-work-ahead', q: 'You drive through a road work zone. What should you do?', a: ['Slow down and watch for workers.', 'Speed up to get through fast.', 'Change lanes a lot.'], c: 0, tip: 'Fines in work zones can be $1,000 or more.', src: '7' },
      { id: 'c12', type: 'choice', big: { text: '10 SEC', sub: 'look ahead' }, q: 'How far ahead should your eyes scan the road?', a: ['At least 10 seconds ahead', 'Just the car in front', '2 seconds ahead'], c: 0, tip: 'Keep your eyes moving. Scan at least 10 seconds ahead.', src: '8' }
    ]
  },
  {
    id: 'coast', name: 'Coast Highway', topic: 'Alcohol, Drugs & Phones', icon: 'icons/key',
    learn: [
      { big: { text: 'UNDER 21', sub: '0.01%' }, say: 'Under 21? Basically zero alcohol.', more: 'A blood alcohol level of 0.01% or more is against the law.' },
      { big: { text: '21 +', sub: '0.08%' }, say: 'Age 21 and up: 0.08% or more is illegal.', more: 'Even less can still make you unsafe.' },
      { big: { text: 'NO PHONE', sub: 'under 18' }, say: 'Under 18: no phone while driving.', more: 'Only for an emergency call.' },
      { big: { text: 'TRUNK', sub: 'open containers' }, say: 'Opened alcohol goes in the trunk.', more: 'Not in the glove box. Not where people sit.' }
    ],
    qs: [
      { id: 'a1', type: 'choice', big: { text: 'UNDER 21' }, q: 'You are under 21. What blood alcohol level is against the law?', a: ['0.01% or more', '0.05% or more', '0.08% or more'], c: 0, tip: 'Under 21: 0.01%. That is almost nothing.', src: '9' },
      { id: 'a2', type: 'choice', big: { text: '21 +' }, q: 'You are 21 or older. What blood alcohol level is against the law?', a: ['0.08% or more', '0.10% or more', '0.01% or more'], c: 0, tip: '21 and older: 0.08% or more.', src: '9' },
      { id: 'a3', type: 'choice', big: { text: 'TRUNK' }, q: 'You carry an opened bottle of alcohol. Where must it be?', a: ['In the trunk.', 'In the glove box.', 'Under the seat.'], c: 0, tip: 'Open containers go in the trunk or where passengers do not sit.', src: '9' },
      { id: 'a4', type: 'choice', img: 'icons/handbook', q: 'Which of these can make it illegal to drive?', a: ['All of them.', 'Cold medicine or cough syrup.', 'A doctor\'s prescription drug.'], c: 0, tip: 'Any drug that affects your driving counts, even medicine.', src: '9' },
      { id: 'a5', type: 'choice', img: 'vehicles/police-cruiser-front', q: 'When you drive in California, you agree to...', a: ['A breath, blood, or urine test if police think you are impaired.', 'Let police search your phone.', 'Nothing. You can always say no.'], c: 0, tip: 'Driving means you consent to a test. Saying no can suspend your license.', src: '9' },
      { id: 'a6', type: 'choice', big: { text: 'NO PHONE' }, q: 'You are 17 and driving. When may you use your phone?', a: ['Only to call for an emergency.', 'For short texts.', 'Hands-free calls are fine.'], c: 0, tip: 'Minors may not use a phone while driving, except to call for help.', src: '8' },
      { id: 'a7', type: 'choice', big: { text: '11 PM', sub: 'to 5 AM' }, q: 'New provisional driver (first 12 months). When can you NOT drive alone?', a: ['Between 11 p.m. and 5 a.m.', 'Between 6 p.m. and 9 p.m.', 'On weekends.'], c: 0, tip: 'First year: no driving from 11 p.m. to 5 a.m. (some exceptions).', src: '2' },
      { id: 'a8', type: 'choice', img: 'avatars/avatar-3', q: 'New provisional driver. Can you drive friends who are under 20?', a: ['Not unless a driver 25 or older is with you.', 'Yes, any time.', 'Only on the freeway.'], c: 0, tip: 'No passengers under 20 in your first year unless a licensed adult (25+) is there.', src: '2' },
      { id: 'a9', type: 'choice', img: 'icons/check', q: 'Who must wear a seat belt?', a: ['You and all passengers.', 'Only the driver.', 'Only people in front.'], c: 0, tip: 'Everyone buckles up.', src: '8' },
      { id: 'a10', type: 'choice', big: { text: 'PERMIT', sub: '50 hours' }, q: 'Under 18 with a permit. How many practice hours do you need before the drive test?', a: ['50 hours (10 at night)', '10 hours', '100 hours'], c: 0, tip: '50 hours of practice, 10 of them at night, with a licensed driver 25+.', src: '2' }
    ]
  },
  {
    id: 'freeway', name: 'Freeway Interchange', topic: 'Freeways, Insurance & Crashes', icon: 'signs/freeway-entrance',
    learn: [
      { big: { text: '10 DAYS', sub: 'report it' }, say: 'Crash with an injury, or over $1,000 damage?', more: 'Report it to the DMV within 10 days.' },
      { big: { text: '30 / 60 / 15', sub: 'thousand dollars' }, say: 'Insurance has a minimum.', more: '$30,000 for one person hurt, $60,000 for more, $15,000 for damage.' },
      { img: 'tiles/hov-lane-y', say: 'The diamond means carpool lane.', more: 'Only enter and exit where the lines allow.' },
      { img: 'signs/wrong-way', say: 'WRONG WAY? Turn around safely.', more: 'At night, red reflectors mean you are going the wrong way.' }
    ],
    qs: [
      { id: 'f1', type: 'choice', big: { text: 'CRASH' }, q: 'You are in a crash and someone is hurt. When must you report it to the DMV?', a: ['Within 10 days', 'Within 30 days', 'Only if it was your fault'], c: 0, tip: 'Report within 10 days, no matter who caused it.', src: '10' },
      { id: 'f2', type: 'choice', img: 'icons/cash', q: 'No one was hurt. When must you still report a crash to the DMV?', a: ['If damage is more than $1,000.', 'Never.', 'Only on the freeway.'], c: 0, tip: 'More than $1,000 in damage: report it.', src: '10' },
      { id: 'f3', type: 'choice', img: 'icons/cash', q: 'What is the least insurance you need for property damage?', a: ['$15,000', '$5,000', '$50,000'], c: 0, tip: 'Minimum: $30,000 / $60,000 / $15,000.', src: '10' },
      { id: 'f4', type: 'choice', img: 'avatars/avatar-2', q: 'You are under 18. Who pays if you cause a crash?', a: ['Your parents or guardians.', 'The DMV.', 'No one.'], c: 0, tip: 'Parents or guardians are financially responsible for drivers under 18.', src: '10' },
      { id: 'f5', type: 'choice', img: 'vehicles/sedan-gold-rear', q: 'You hit a parked car. You cannot find the owner. What do you do?', a: ['Leave a note with your name, phone, and address. Tell the police.', 'Drive away.', 'Wait one hour, then leave.'], c: 0, tip: 'Leave a note and report it to law enforcement.', src: '10' },
      { id: 'f6', type: 'choice', img: 'signs/freeway-entrance', q: 'When should you signal before a freeway exit?', a: ['About 5 seconds before', 'Right as you exit', 'You do not need to'], c: 0, tip: 'Signal about 5 seconds (around 400 feet) before you exit.', src: '6' },
      { id: 'f7', type: 'choice', img: 'tiles/hov-lane-y', q: 'What does a diamond painted on the lane mean?', a: ['Carpool (HOV) lane', 'Bike lane', 'Bus stop'], c: 0, tip: 'The diamond marks a carpool lane.', src: '6' },
      {
        id: 'f8', type: 'choice', q: 'Can you change lanes over two solid white lines?',
        scene: { kind: 'cross', ns: { n: 2, s: 0, doubleWhite: true }, ew: null, actors: [{ lane: 'N:2', y: 250 }] },
        a: ['No. Wait for a broken white line.', 'Yes, if you signal.', 'Yes, at night.'], c: 0, tip: 'Never cross double solid white lines.', src: '6'
      },
      { id: 'f9', type: 'choice', img: 'signs/wrong-way', q: 'You see this sign ahead of you. What should you do?', a: ['You are going the wrong way. Turn around when safe.', 'Keep going slowly.', 'Speed up.'], c: 0, tip: 'WRONG WAY: back out or turn around when it is safe.', src: '7' },
      { id: 'f10', type: 'choice', img: 'vehicles/player-coupe-rear', q: 'You miss your freeway exit. What should you do?', a: ['Go to the next exit.', 'Back up on the shoulder.', 'Stop and wait.'], c: 0, tip: 'Keep going and take the next exit. Never back up on a freeway.', src: '6' },
      { id: 'f11', type: 'choice', img: 'vehicles/police-cruiser-rear', q: 'Police lights are behind you. What should you do first?', a: ['Turn on your right signal and pull onto the right shoulder.', 'Stop in your lane right away.', 'Get out of the car.'], c: 0, tip: 'Signal right, pull over, stay inside, hands where they can be seen.', src: '6' }
    ]
  }
];

export const ALL_QUESTIONS = DISTRICTS.flatMap((d, di) => d.qs.map(q => ({ ...q, district: di })));
export const byId = Object.fromEntries(ALL_QUESTIONS.map(q => [q.id, q]));
export const SIGN_Q = new Set(ALL_QUESTIONS.filter(q => (q.img || '').match(/^(signs|signals)\//) || q.type === 'pics' && q.a.some(a => a.img)).map(q => q.id));
