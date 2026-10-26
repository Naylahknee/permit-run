// Study content model: Topic → Lesson → Question.
//
// Topics and Lessons are static content (they ship with the app, nobody writes
// them at runtime). A Lesson points at the Questions defined in data.js by id,
// and records which District that material came from so the existing scene and
// question engine can be reused. Lesson progress lives in store.js.

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
    section: 7, minutes: 4, district: 0,
    questions: ['d1', 'd7', 'd8', 'd9', 'd12']
  },
  {
    id: 'signs-2', topic: 'signs', title: 'Lights, arrows and walk signals',
    section: 7, minutes: 4, district: 0,
    questions: ['d2', 'd3', 'd4', 'd5', 'd6', 'd10', 'd11']
  },
  {
    id: 'signs-3', topic: 'signs', title: 'Stopping and turning at a signal',
    section: 7, minutes: 4, district: 0,
    questions: ['d13', 'd14', 'd15']
  },
  {
    id: 'rights-1', topic: 'rights', title: 'Who goes first',
    section: 7, minutes: 5, district: 2,
    questions: ['v5', 'v7', 'v11', 'v12']
  },
  {
    id: 'rights-2', topic: 'rights', title: 'School buses and emergency vehicles',
    section: 7, minutes: 5, district: 2,
    questions: ['v1', 'v2', 'v4', 'v9', 'v10']
  },
  {
    id: 'rights-3', topic: 'rights', title: 'Sharing the road',
    section: 6, minutes: 5, district: 2,
    questions: ['v3', 'v8', 'v13', 'h12']
  },
  {
    id: 'speed-1', topic: 'speed', title: 'Room to stop',
    section: 8, minutes: 4, district: 3,
    questions: ['c1', 'c2', 'c9', 'c12']
  },
  {
    id: 'speed-2', topic: 'speed', title: 'Speed limits you must know',
    section: 8, minutes: 5, district: 3,
    questions: ['v6', 'c6', 'c7', 'c8', 'c11']
  },
  {
    id: 'speed-3', topic: 'speed', title: 'Rain, night and mountain roads',
    section: 8, minutes: 5, district: 3,
    questions: ['c3', 'c4', 'c5', 'c10']
  },
  {
    id: 'parking-1', topic: 'parking', title: 'Where you may park',
    section: 6, minutes: 4, district: 1,
    questions: ['h6', 'h7', 'h8']
  },
  {
    id: 'parking-2', topic: 'parking', title: 'Parking on a hill',
    section: 6, minutes: 4, district: 1,
    questions: ['h9', 'h10']
  },
  {
    id: 'parking-3', topic: 'parking', title: 'Lanes, turns and signals',
    section: 5, minutes: 5, district: 1,
    questions: ['h1', 'h2', 'h3', 'h4', 'h5', 'h11', 'h13']
  },
  {
    id: 'alcohol-1', topic: 'alcohol', title: 'Alcohol and drugs',
    section: 9, minutes: 5, district: 4,
    questions: ['a1', 'a2', 'a3', 'a4', 'a5']
  },
  {
    id: 'alcohol-2', topic: 'alcohol', title: 'Phones, seat belts and new drivers',
    section: 9, minutes: 5, district: 4,
    questions: ['a6', 'a7', 'a8', 'a9', 'a10']
  },
  {
    id: 'alcohol-3', topic: 'alcohol', title: 'Crashes, insurance and freeways',
    section: 10, minutes: 6, district: 5,
    questions: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11']
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
