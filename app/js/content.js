// Study content model: Topic → Lesson → Question.
//
// Topics and Lessons are static content (they ship with the app, nobody writes
// them at runtime). A Lesson points at the Questions defined in data.js by id,
// and records which District that material came from so the existing scene and
// question engine can be reused. Lesson progress lives in store.js.
//
// `scene` is the optional road illustration (assets/scenes) shown on the lesson
// card and at the top of its reader.
//
// `read` is the lesson itself: one short handbook page shown before practice.
// kicker is the handbook topic label, points are [dot colour, line] rows.

export const TOPICS = [
  { id: 'signs', name: 'Signs & Signals', order: 1, icon: 'signs/stop' },
  { id: 'rights', name: 'Right of Way', order: 2, icon: 'signs/yield' },
  { id: 'speed', name: 'Speed & Following', order: 3, icon: 'signs/speed-limit-25' },
  { id: 'parking', name: 'Parking', order: 4, icon: 'signs/no-parking' },
  { id: 'alcohol', name: 'Alcohol & Safety', order: 5, icon: 'icons/key' }
];

// `section` is the California Driver Handbook section the lesson comes from,
// `minutes` the estimated reading time, `district` the data.js district whose
// questions and scenes it draws on.
export const LESSONS = [
  {
    id: 'signs-1', topic: 'signs', title: 'What a sign is telling you',
    section: 7, minutes: 4, district: 0, scene: 'scenes/railroad',
    questions: ['d1', 'd7', 'd8', 'd9', 'd12'],
    read: {
      kicker: 'Signs and signals',
      headline: 'The shape and colour come first',
      body: 'You can read most signs before you can read the words. Shape and colour tell you what kind of sign it is, so you know how to react from far away.',
      points: [
        ['red', 'Red: stop, yield, or never do this'],
        ['yellow', 'Yellow: warning — something is coming up'],
        ['gray', 'White or black: a rule you must follow']
      ]
    }
  },
  {
    id: 'signs-2', topic: 'signs', title: 'Lights, arrows and walk signals',
    section: 7, minutes: 4, district: 0,
    questions: ['d2', 'd3', 'd4', 'd5', 'd6', 'd10', 'd11'],
    read: {
      kicker: 'Traffic lights',
      headline: 'Every light has one job',
      body: 'A solid red means stop and stay stopped. A flashing red is the same as a STOP sign. A red arrow means no turn, even when the road looks clear.',
      points: [
        ['red', 'Solid red: stop behind the limit line'],
        ['yellow', 'Flashing yellow: slow down and go carefully'],
        ['green', 'Green arrow: your turn is protected']
      ]
    }
  },
  {
    id: 'signs-3', topic: 'signs', title: 'Stopping and turning at a signal',
    section: 7, minutes: 4, district: 0,
    questions: ['d13', 'd14', 'd15'],
    read: {
      kicker: 'Turns at a light',
      headline: 'You may turn on red, unless a sign says no',
      body: 'After a full stop you may turn right on red, and left from a one-way street onto another one-way street, if the way is clear and no sign forbids it.',
      points: [
        ['red', 'Come to a complete stop first. No rolling'],
        ['blue', 'Look left, then right, then left again'],
        ['gray', 'A NO TURN ON RED sign cancels the rule']
      ]
    }
  },
  {
    id: 'signs-4', topic: 'signs', title: 'Warning signs',
    section: 7, minutes: 4, district: 0, scene: 'scenes/train-crossing',
    questions: ['s1','s2','s3','s4','s5','s6'],
    read: {
      kicker: 'Yellow signs',
      headline: 'Yellow diamonds warn you',
      body: 'A yellow diamond tells you something is coming up: a bump, a dip, a narrow road or a hill. Slow down before you get there.',
      points: [
        ['yellow', 'Yellow diamond: warning, slow down'],
        ['gray', 'The words or picture say what is ahead'],
        ['red', 'Railroad crossings: stop 15 to 50 feet from the track']
      ]
    }
  },
  {
    id: 'signs-5', topic: 'signs', title: 'Rule signs and lane signs',
    section: 5, minutes: 4, district: 0, scene: 'scenes/stop-sign',
    questions: ['s7','s8','s9','s10','s11','s24'],
    read: {
      kicker: 'White signs',
      headline: 'White signs are rules',
      body: 'White rectangle signs tell you what you must or must not do. Passing, turning and lane rules all use them.',
      points: [
        ['gray', 'White rectangle: a rule you must obey'],
        ['red', 'Red circle and slash: this is not allowed'],
        ['yellow', 'Yellow: only a warning, not a rule']
      ]
    }
  },
  {
    id: 'signs-6', topic: 'signs', title: 'Parking and stopping signs',
    section: 6, minutes: 4, district: 0, scene: 'scenes/bike-pass',
    questions: ['s12','s13','s14','s15','s23'],
    read: {
      kicker: 'Curb signs',
      headline: 'No parking is not no stopping',
      body: 'Red signs say what you may not do at the curb. Green signs allow parking for a limited time. Never park in a bike lane.',
      points: [
        ['red', 'No parking: you may stop briefly to load or unload'],
        ['red', 'No stopping: do not stop at all'],
        ['green', 'Green: park only for the time shown']
      ]
    }
  },
  {
    id: 'signs-7', topic: 'signs', title: 'Intersection and emergency signs',
    section: 7, minutes: 4, district: 0, scene: 'scenes/emergency-vehicle',
    questions: ['s16','s17','s18','s19','s20','s21'],
    read: {
      kicker: 'Special signs',
      headline: 'Read the sign before you act',
      body: 'Some signs ask you to wait, yield or move over. Read each one, then check the road before you move.',
      points: [
        ['blue', 'Do not block the intersection'],
        ['gray', 'Move over or slow for stopped emergency vehicles'],
        ['yellow', 'Emergency parking is only for emergencies']
      ]
    }
  },
  {
    id: 'rights-1', topic: 'rights', title: 'Who goes first',
    section: 7, minutes: 5, district: 2, scene: 'scenes/four-way-stop',
    questions: ['v5', 'v7', 'v11', 'v12'],
    read: {
      kicker: 'Four-way stop',
      headline: 'First to stop goes first',
      body: 'If two cars stop at the same time, the driver on the left yields to the driver on the right. When you are not sure, wait — never assume the other driver saw you.',
      points: [
        ['red', 'Red car stopped first, so it goes first'],
        ['gray', 'White car goes second'],
        ['blue', 'Blue car, on the right, goes before the left']
      ]
    }
  },
  {
    id: 'rights-2', topic: 'rights', title: 'School buses and emergency vehicles',
    section: 7, minutes: 5, district: 2, scene: 'scenes/school-bus',
    questions: ['v1', 'v2', 'v4', 'v9', 'v10'],
    read: {
      kicker: 'Sharing the road',
      headline: 'Flashing red on a bus means stop',
      body: 'A school bus with its red lights flashing and stop arm out means stop in both directions and stay stopped until the lights go off. Its yellow lights mean slow down and get ready.',
      points: [
        ['red', 'Flashing red: stop, both directions'],
        ['yellow', 'Flashing yellow: slow down and get ready'],
        ['blue', 'Emergency vehicle: pull right and stop, never inside an intersection']
      ]
    }
  },
  {
    id: 'rights-3', topic: 'rights', title: 'Sharing the road',
    section: 6, minutes: 5, district: 2, scene: 'scenes/t-intersection',
    questions: ['v3', 'v8', 'v13', 'h12'],
    read: {
      kicker: 'People, bikes and trucks',
      headline: 'The more fragile the road user, the more you yield',
      body: 'People walking, people on bikes, and people who are blind have the right-of-way. Around a truck, stay out of the blind spots and never pass on the right.',
      points: [
        ['blue', 'People in a crosswalk always go first'],
        ['gray', 'White cane or guide dog: yield anytime, never honk'],
        ['green', 'Passing a bike: give three feet of space']
      ]
    }
  },
  {
    id: 'rights-4', topic: 'rights', title: 'Crosswalks, rails and bikes',
    section: 7, minutes: 6, district: 0, scene: 'scenes/crosswalk',
    questions: ['b7','b8','b9','b15','b16','b19','b20'],
    read: {
      kicker: 'Crossing paths',
      headline: 'Slow down and share the road',
      body: 'Walkers in a crosswalk go first. Stay 15 feet or more from rail tracks. Give people on bikes at least three feet.',
      points: [
        ['blue', 'Walker in a crosswalk: you wait'],
        ['red', 'Never stop on railroad tracks'],
        ['green', 'Pass bikes with 3 feet of space']
      ]
    }
  },
  {
    id: 'speed-1', topic: 'speed', title: 'Room to stop',
    section: 8, minutes: 4, district: 3,
    questions: ['c1', 'c2', 'c9', 'c12'],
    read: {
      kicker: 'Following distance',
      headline: 'Leave three seconds of air',
      body: 'Pick a landmark the car ahead passes, then count three seconds before you reach it. Wet roads, night or a heavy load: count four or more.',
      points: [
        ['blue', 'Three seconds in good conditions'],
        ['gray', 'Four or more in rain, at night, or with a load'],
        ['red', 'Tailgater? Let them pass. Never brake-check']
      ]
    }
  },
  {
    id: 'speed-2', topic: 'speed', title: 'Speed limits you must know',
    section: 8, minutes: 5, district: 3,
    questions: ['v6', 'c6', 'c7', 'c8', 'c11'],
    read: {
      kicker: 'Speed limits',
      headline: 'Know the numbers when nothing is posted',
      body: 'A posted sign always wins. When nothing is posted, a few limits apply by law, and they are the ones the test asks about most.',
      points: [
        ['gray', '25 mph: business and residential districts'],
        ['red', '15 mph: blind intersections and alleys'],
        ['blue', '55 mph: two-lane roads, unless posted higher']
      ]
    }
  },
  {
    id: 'speed-3', topic: 'speed', title: 'Rain, night and mountain roads',
    section: 8, minutes: 5, district: 3,
    questions: ['c3', 'c4', 'c5', 'c10'],
    read: {
      kicker: 'Hard conditions',
      headline: 'Slow down before you need to',
      body: 'The first rain after a dry spell is the slickest. Turn your headlights on whenever your wipers are on, and never drive faster than you can see.',
      points: [
        ['blue', 'Headlights on whenever the wipers are on'],
        ['gray', 'Hydroplaning: ease off the gas, do not brake'],
        ['yellow', 'High beams off within 500 feet of another car']
      ]
    }
  },
  {
    id: 'speed-4', topic: 'speed', title: 'School zones, lights and limits',
    section: 8, minutes: 5, district: 0, scene: 'scenes/school-bus',
    questions: ['b1','b2','b5','b14'],
    read: {
      kicker: 'Speed and lights',
      headline: '25 near schools, 15 in alleys',
      body: 'Slow down near schools and in alleys. Turn on your headlights at dusk, and use low beams near other cars.',
      points: [
        ['gray', '25 mph near schools when children are out'],
        ['red', '15 mph in alleys and blind intersections'],
        ['blue', 'Low beams within 500 feet of oncoming cars']
      ]
    }
  },
  {
    id: 'parking-1', topic: 'parking', title: 'Where you may park',
    section: 6, minutes: 4, district: 1, scene: 'scenes/blue-curb',
    questions: ['h6', 'h7', 'h8'],
    read: {
      kicker: 'Curb colours',
      headline: 'The paint on the curb is the rule',
      body: 'Curb paint tells you how long you may stay and whether you may stop at all. No paint usually means you may park, if no sign says otherwise.',
      points: [
        ['red', 'Red: no stopping, no parking, ever'],
        ['gray', 'White: stop only to pick up or drop off'],
        ['blue', 'Blue: disabled placard or plate only']
      ]
    }
  },
  {
    id: 'parking-2', topic: 'parking', title: 'Parking on a hill',
    section: 6, minutes: 4, district: 1,
    questions: ['h9', 'h10'],
    read: {
      kicker: 'Hill parking',
      headline: 'Turn the wheels so a roll stops itself',
      body: 'Set the parking brake and leave the car in gear or park. Then turn the front wheels so the curb would stop the car if it rolled.',
      points: [
        ['gray', 'Downhill: wheels toward the curb'],
        ['blue', 'Uphill with a curb: wheels away from the curb'],
        ['red', 'No curb at all: wheels toward the edge of the road']
      ]
    }
  },
  {
    id: 'parking-3', topic: 'parking', title: 'Lanes, turns and signals',
    section: 5, minutes: 5, district: 1,
    questions: ['h1', 'h2', 'h3', 'h4', 'h5', 'h11', 'h13'],
    read: {
      kicker: 'Lanes and turns',
      headline: 'Signal first, then move',
      body: 'Signal at least 100 feet before a turn, check your mirrors twice, and turn from the lane closest to the direction you are going.',
      points: [
        ['blue', 'Left turn: start in the leftmost lane'],
        ['red', 'A centre left-turn lane is for turning only'],
        ['gray', 'Signal 100 feet before a turn']
      ]
    }
  },
  {
    id: 'parking-4', topic: 'parking', title: 'Curb colours and hydrants',
    section: 6, minutes: 4, district: 0, scene: 'scenes/blue-curb',
    questions: ['b3','b4','b17','b18'],
    read: {
      kicker: 'At the curb',
      headline: 'Park close, park clear',
      body: 'Park within 18 inches of the curb and 15 feet from a hydrant. Colours tell you the rule: blue for disabled, green for short time.',
      points: [
        ['blue', 'Blue: disabled placard only'],
        ['green', 'Green: short-time parking'],
        ['red', 'Hydrant: keep 15 feet clear']
      ]
    }
  },
  {
    id: 'alcohol-1', topic: 'alcohol', title: 'Alcohol and drugs',
    section: 9, minutes: 5, district: 4,
    questions: ['a1', 'a2', 'a3', 'a4', 'a5'],
    read: {
      kicker: 'Alcohol and drugs',
      headline: 'Under 21 means zero tolerance',
      body: 'Drivers under 21 may not have any alcohol in their blood. For everyone, 0.08% means too drunk to drive — the law does not care how sober you feel.',
      points: [
        ['red', 'Under 21: 0.01% is already illegal'],
        ['gray', '21 and over: 0.08% is the limit'],
        ['blue', 'Alcohol slows judgement before you notice it']
      ]
    }
  },
  {
    id: 'alcohol-2', topic: 'alcohol', title: 'Phones, seat belts and new drivers',
    section: 9, minutes: 5, district: 4,
    questions: ['a6', 'a7', 'a8', 'a9', 'a10'],
    read: {
      kicker: 'New drivers',
      headline: 'Hands off the phone, always',
      body: 'A driver under 18 may not use a phone at all, not even hands-free. Everyone in the car buckles up before the wheels move.',
      points: [
        ['red', 'Under 18: no phone, no hands-free, no texting'],
        ['gray', 'Everyone in the car buckles up, every trip'],
        ['blue', 'Provisional licence: no passengers under 20 for 12 months']
      ]
    }
  },
  {
    id: 'alcohol-3', topic: 'alcohol', title: 'Crashes, insurance and freeways',
    section: 10, minutes: 6, district: 5,
    questions: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11'],
    read: {
      kicker: 'Crashes and freeways',
      headline: 'Stop, help, then report it',
      body: 'After a crash, stop and help anyone who is hurt. A crash with an injury or more than $1,000 of damage must be reported to the DMV on form SR 1 within 10 days.',
      points: [
        ['red', 'Never leave the scene of a crash'],
        ['gray', 'Report on form SR 1 within 10 days'],
        ['blue', 'Freeway: enter at the speed of traffic, signal early']
      ]
    }
  },
  {
    id: 'alcohol-4', topic: 'alcohol', title: 'Signals, lines and kids',
    section: 5, minutes: 5, district: 0,
    questions: ['b6','b10','b11','b12','b13'],
    read: {
      kicker: 'More rules',
      headline: 'Signal, stay in lane, buckle up',
      body: 'Signal 100 feet before a turn, obey double yellow lines, and use hand signals if your lights fail. Kids under 8 ride in the back.',
      points: [
        ['blue', 'Signal 100 feet before you turn'],
        ['yellow', 'Double yellow: do not pass or cross'],
        ['gray', 'Under 8: back seat in a car or booster seat']
      ]
    }
  }
];

export const topicById = id => TOPICS.find(t => t.id === id) || TOPICS[0];
export const lessonById = id => LESSONS.find(l => l.id === id) || null;
export const lessonsOf = topicId => LESSONS.filter(l => l.topic === topicId);

// 1-based position inside its topic, used for the "LESSON 3" label.
export const lessonNumber = id => {
  const l = lessonById(id);
  return l ? lessonsOf(l.topic).findIndex(x => x.id === id) + 1 : 0;
};
