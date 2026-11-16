'use strict';

const APP_VERSION = '3.0.0';
const SCHEMA_VERSION = 2;
const DB_NAME = 'transform-pro-db';
const DB_STORE = 'kv';
const STATE_KEY = 'app-state';
const FALLBACK_KEY = 'transform_pro_v2';
const LEGACY_KEY = 'transformation_v1';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 1) => Number(Number(value).toFixed(digits));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const deepClone = (value) => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

function localISO(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseISO(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(value, amount) {
  const d = typeof value === 'string' ? parseISO(value) : new Date(value);
  d.setDate(d.getDate() + amount);
  return localISO(d);
}

function daysBetween(start, end) {
  const a = parseISO(start);
  const b = parseISO(end);
  return Math.round((b - a) / 86400000);
}

function formatDate(value, options = { day: 'numeric', month: 'short' }) {
  return parseISO(value).toLocaleDateString(undefined, options);
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function mergeDefaults(defaults, value) {
  if (Array.isArray(defaults)) return Array.isArray(value) ? value : deepClone(defaults);
  if (!defaults || typeof defaults !== 'object') return value === undefined ? defaults : value;
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {};
  for (const key of Object.keys(defaults)) result[key] = mergeDefaults(defaults[key], source[key]);
  for (const key of Object.keys(source)) if (!(key in result)) result[key] = source[key];
  return result;
}

function createDefaultState() {
  return {
    meta: {
      schema: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      migratedFromV1: false,
      lastBackupAt: null
    },
    profile: {
      name: 'Rakesh',
      age: 27,
      sex: 'male',
      heightCm: 178,
      startWeightKg: 95,
      goalWeightKg: 75,
      startWaistCm: 104.1,
      experience: 'Beginner',
      activityLevel: 'Mostly sitting',
      equipment: 'Two 5 kg dumbbells',
      workoutMinutes: 45,
      preferredTime: 'Evening',
      dietType: 'Non-vegetarian',
      programStart: '2026-11-17'
    },
    settings: {
      theme: 'system',
      units: 'metric',
      waterGoalMl: 3000,
      stepGoal: 7000,
      proteinServingsGoal: 4,
      vegetableServingsGoal: 3,
      fruitServingsGoal: 2,
      weekStartsMonday: true
    },
    measurements: [
      {
        id: uid(),
        date: '2026-11-16',
        weightKg: 95,
        waistCm: 104.1,
        note: 'Starting measurement',
        createdAt: new Date().toISOString()
      }
    ],
    days: {},
    achievementsSeen: [],
    ui: {
      chartMetric: 'weight',
      chartRange: '12w'
    }
  };
}

const PHASES = [
  { weeks: '1–2', label: 'Foundation', description: 'Learn technique, move comfortably and build consistency.', rpe: '5–6 / 10', rest: 90 },
  { weeks: '3–4', label: 'Build', description: 'Add one set and keep every repetition controlled.', rpe: '6 / 10', rest: 75 },
  { weeks: '5–6', label: 'Control', description: 'Use slower lowering to make the same weights more effective.', rpe: '6–7 / 10', rest: 75 },
  { weeks: '7–8', label: 'Endurance', description: 'Increase repetitions while keeping good form.', rpe: '6–7 / 10', rest: 60 },
  { weeks: '9–10', label: 'Progress', description: 'Use pauses and unilateral variations where comfortable.', rpe: '7 / 10', rest: 60 },
  { weeks: '11–12', label: 'Performance', description: 'Complete quality work with shorter, controlled rests.', rpe: '7 / 10', rest: 50 }
];

const EXERCISES = {
  chairSquat: {
    name: 'Chair squat',
    type: 'Strength',
    muscles: 'Legs and hips',
    equipment: 'Chair',
    instructions: [
      'Stand in front of a stable chair with feet about shoulder-width apart.',
      'Push your hips back, bend your knees and lightly touch the chair.',
      'Press through your whole foot and stand tall without rushing.'
    ],
    tips: 'Keep your knees tracking in the same direction as your toes. Use the chair for confidence, not momentum.',
    targets: [
      { sets: 2, target: '8–10 reps', rest: 90 },
      { sets: 3, target: '8–10 reps', rest: 75 },
      { sets: 3, target: '10–12 reps · 3 sec down', rest: 75 },
      { sets: 3, target: '12–15 reps', rest: 60 },
      { sets: 3, target: '10–12 reps · 1 sec pause', rest: 60 },
      { sets: 3, target: '12–15 reps · steady pace', rest: 50 }
    ]
  },
  inclinePushup: {
    name: 'Incline push-up',
    type: 'Strength',
    muscles: 'Chest, shoulders and arms',
    equipment: 'Wall or sturdy counter',
    instructions: [
      'Place your hands slightly wider than shoulders on a wall or sturdy counter.',
      'Keep your body in a straight line and lower your chest toward your hands.',
      'Press away while keeping your ribs and hips controlled.'
    ],
    tips: 'Use a higher surface to make it easier. Stop before your shoulders roll forward.',
    targets: [
      { sets: 2, target: '8–12 reps', rest: 90 },
      { sets: 3, target: '8–12 reps', rest: 75 },
      { sets: 3, target: '8–12 reps · slow down', rest: 75 },
      { sets: 3, target: '10–15 reps', rest: 60 },
      { sets: 3, target: '8–12 reps · lower surface', rest: 60 },
      { sets: 3, target: '12–15 reps', rest: 50 }
    ]
  },
  oneArmRow: {
    name: 'One-arm dumbbell row',
    type: 'Strength',
    muscles: 'Upper back and arms',
    equipment: 'One 5 kg dumbbell and chair',
    instructions: [
      'Support one hand on a chair and keep your back long.',
      'Pull the dumbbell toward your hip while keeping your shoulder away from your ear.',
      'Lower with control, finish the side, then switch.'
    ],
    tips: 'Avoid twisting your torso. Think about moving your elbow, not just your hand.',
    targets: [
      { sets: 2, target: '10 reps each side', rest: 75 },
      { sets: 3, target: '10 reps each side', rest: 75 },
      { sets: 3, target: '10–12 each · slow lower', rest: 70 },
      { sets: 3, target: '12–15 each side', rest: 60 },
      { sets: 3, target: '10–12 each · 1 sec squeeze', rest: 60 },
      { sets: 3, target: '12–15 each side', rest: 50 }
    ]
  },
  gluteBridge: {
    name: 'Glute bridge',
    type: 'Strength',
    muscles: 'Glutes and back of legs',
    equipment: 'Exercise mat or floor',
    instructions: [
      'Lie on your back with knees bent and feet flat.',
      'Brace gently, squeeze your glutes and lift your hips.',
      'Pause briefly, then lower without arching your lower back.'
    ],
    tips: 'Keep your ribs down and drive through the heels.',
    targets: [
      { sets: 2, target: '10–12 reps', rest: 60 },
      { sets: 3, target: '10–12 reps', rest: 60 },
      { sets: 3, target: '12 reps · 2 sec hold', rest: 60 },
      { sets: 3, target: '15 reps', rest: 50 },
      { sets: 3, target: '12–15 reps · dumbbell on hips', rest: 55 },
      { sets: 3, target: '15 reps · 2 sec hold', rest: 45 }
    ]
  },
  marchFinisher: {
    name: 'Standing march finisher',
    type: 'Conditioning',
    muscles: 'Cardio and core',
    equipment: 'None',
    instructions: [
      'Stand tall and march in place at a comfortable pace.',
      'Swing your arms naturally and keep breathing smoothly.',
      'Use short easy breaks whenever form or breathing changes.'
    ],
    tips: 'This should feel purposeful, not all-out. You should still be able to speak in short sentences.',
    targets: [
      { sets: 1, target: '6 minutes easy', rest: 0 },
      { sets: 1, target: '8 minutes easy–moderate', rest: 0 },
      { sets: 1, target: '8 minutes · 30 sec brisk / 60 sec easy', rest: 0 },
      { sets: 1, target: '10 minutes intervals', rest: 0 },
      { sets: 1, target: '10 minutes · 45 sec brisk / 45 sec easy', rest: 0 },
      { sets: 1, target: '12 minutes controlled intervals', rest: 0 }
    ]
  },
  dumbbellRDL: {
    name: 'Dumbbell Romanian deadlift',
    type: 'Strength',
    muscles: 'Hamstrings, glutes and back',
    equipment: 'Two 5 kg dumbbells',
    instructions: [
      'Hold the dumbbells in front of your thighs with soft knees.',
      'Push your hips backward while keeping your back long.',
      'Stop when you feel the back of your legs working, then stand by squeezing your glutes.'
    ],
    tips: 'The dumbbells stay close to your legs. This is a hip hinge, not a deep squat.',
    targets: [
      { sets: 2, target: '8–10 reps', rest: 90 },
      { sets: 3, target: '8–10 reps', rest: 75 },
      { sets: 3, target: '10–12 reps · slow lower', rest: 75 },
      { sets: 3, target: '12–15 reps', rest: 60 },
      { sets: 3, target: '10–12 reps · 1 sec pause', rest: 60 },
      { sets: 3, target: '12–15 reps', rest: 50 }
    ]
  },
  floorPress: {
    name: 'Dumbbell floor press',
    type: 'Strength',
    muscles: 'Chest, shoulders and arms',
    equipment: 'Two 5 kg dumbbells',
    instructions: [
      'Lie on your back with knees bent and dumbbells over your chest.',
      'Lower your upper arms until they gently touch the floor.',
      'Press the dumbbells up while keeping wrists stacked over elbows.'
    ],
    tips: 'Keep your shoulders comfortable and do not force a deep range.',
    targets: [
      { sets: 2, target: '8–10 reps', rest: 90 },
      { sets: 3, target: '8–10 reps', rest: 75 },
      { sets: 3, target: '10 reps · slow lower', rest: 75 },
      { sets: 3, target: '10–12 reps', rest: 60 },
      { sets: 3, target: '10–12 reps · 1 sec pause', rest: 60 },
      { sets: 3, target: '12–15 reps', rest: 50 }
    ]
  },
  splitSquat: {
    name: 'Supported split squat',
    type: 'Strength',
    muscles: 'Legs and balance',
    equipment: 'Chair or wall support',
    instructions: [
      'Stand in a staggered stance and lightly hold a chair or wall.',
      'Lower straight down through a comfortable range.',
      'Press through the front foot to return, then change sides.'
    ],
    tips: 'Start with a short range. Replace with sit-to-stand if your knees feel uncomfortable.',
    targets: [
      { sets: 2, target: '6 reps each side', rest: 90 },
      { sets: 2, target: '8 reps each side', rest: 80 },
      { sets: 3, target: '8 reps each · slow lower', rest: 80 },
      { sets: 3, target: '10 reps each side', rest: 70 },
      { sets: 3, target: '8–10 each · optional dumbbells', rest: 70 },
      { sets: 3, target: '10–12 each side', rest: 60 }
    ]
  },
  shoulderPress: {
    name: 'Seated dumbbell shoulder press',
    type: 'Strength',
    muscles: 'Shoulders and arms',
    equipment: 'Two 5 kg dumbbells and chair',
    instructions: [
      'Sit tall with your back supported and dumbbells near shoulder height.',
      'Press upward only through a pain-free range.',
      'Lower slowly while keeping your ribs from flaring.'
    ],
    tips: 'Use one dumbbell at a time if two feel too heavy. Skip this movement if it causes shoulder pain.',
    targets: [
      { sets: 2, target: '6–8 reps', rest: 90 },
      { sets: 2, target: '8 reps', rest: 80 },
      { sets: 3, target: '8 reps', rest: 80 },
      { sets: 3, target: '8–10 reps', rest: 70 },
      { sets: 3, target: '8–10 reps', rest: 70 },
      { sets: 3, target: '10–12 reps', rest: 60 }
    ]
  },
  deadBug: {
    name: 'Dead bug',
    type: 'Core',
    muscles: 'Core control',
    equipment: 'Exercise mat or floor',
    instructions: [
      'Lie on your back with hips and knees bent and arms above your chest.',
      'Gently brace, then lower the opposite arm and leg without arching your back.',
      'Return and alternate sides.'
    ],
    tips: 'Use a smaller range if your lower back lifts away from the floor.',
    targets: [
      { sets: 2, target: '5 reps each side', rest: 45 },
      { sets: 2, target: '6 reps each side', rest: 45 },
      { sets: 3, target: '6 reps each side', rest: 45 },
      { sets: 3, target: '8 reps each side', rest: 40 },
      { sets: 3, target: '8 reps each · slow', rest: 40 },
      { sets: 3, target: '10 reps each side', rest: 35 }
    ]
  },
  gobletSquat: {
    name: 'Goblet squat to chair',
    type: 'Strength',
    muscles: 'Legs and core',
    equipment: 'One 5 kg dumbbell and chair',
    instructions: [
      'Hold one dumbbell close to your chest and stand in front of a chair.',
      'Sit back toward the chair with your chest comfortably tall.',
      'Lightly touch the chair, then stand without rocking.'
    ],
    tips: 'Use bodyweight only if holding the dumbbell changes your form.',
    targets: [
      { sets: 2, target: '8 reps', rest: 90 },
      { sets: 3, target: '8–10 reps', rest: 75 },
      { sets: 3, target: '10 reps · slow lower', rest: 75 },
      { sets: 3, target: '12 reps', rest: 60 },
      { sets: 3, target: '10–12 reps · pause', rest: 60 },
      { sets: 3, target: '12–15 reps', rest: 50 }
    ]
  },
  bentRow: {
    name: 'Two-dumbbell bent-over row',
    type: 'Strength',
    muscles: 'Upper back and arms',
    equipment: 'Two 5 kg dumbbells',
    instructions: [
      'Hinge at the hips and hold both dumbbells below your shoulders.',
      'Pull your elbows toward your hips and squeeze your upper back.',
      'Lower slowly without changing your torso position.'
    ],
    tips: 'If your lower back tires first, use the supported one-arm row instead.',
    targets: [
      { sets: 2, target: '8–10 reps', rest: 80 },
      { sets: 3, target: '8–10 reps', rest: 75 },
      { sets: 3, target: '10–12 reps · slow lower', rest: 70 },
      { sets: 3, target: '12–15 reps', rest: 60 },
      { sets: 3, target: '10–12 reps · squeeze', rest: 60 },
      { sets: 3, target: '12–15 reps', rest: 50 }
    ]
  },
  calfRaise: {
    name: 'Standing calf raise',
    type: 'Strength',
    muscles: 'Calves and ankle strength',
    equipment: 'Chair support',
    instructions: [
      'Stand tall and lightly hold a chair.',
      'Rise onto the balls of your feet and pause briefly.',
      'Lower slowly until your heels settle.'
    ],
    tips: 'Keep your weight even across both feet and avoid bouncing.',
    targets: [
      { sets: 2, target: '12 reps', rest: 45 },
      { sets: 3, target: '12 reps', rest: 45 },
      { sets: 3, target: '15 reps · slow lower', rest: 45 },
      { sets: 3, target: '15–20 reps', rest: 40 },
      { sets: 3, target: '12 each side if comfortable', rest: 45 },
      { sets: 3, target: '15–20 reps', rest: 35 }
    ]
  },
  farmerMarch: {
    name: 'Dumbbell farmer march',
    type: 'Conditioning',
    muscles: 'Grip, posture and core',
    equipment: 'Two 5 kg dumbbells',
    instructions: [
      'Stand tall holding the dumbbells by your sides.',
      'March slowly in place while keeping your body upright.',
      'Set the weights down safely if your grip or posture changes.'
    ],
    tips: 'Keep the steps small and controlled. Do not hold your breath.',
    targets: [
      { sets: 2, target: '30 seconds', rest: 60 },
      { sets: 3, target: '30 seconds', rest: 60 },
      { sets: 3, target: '40 seconds', rest: 55 },
      { sets: 3, target: '45 seconds', rest: 50 },
      { sets: 3, target: '50 seconds', rest: 50 },
      { sets: 3, target: '60 seconds', rest: 45 }
    ]
  },
  briskWalk: {
    name: 'Brisk walk or indoor march',
    type: 'Cardio',
    muscles: 'Heart, lungs and whole body',
    equipment: 'Comfortable shoes',
    instructions: [
      'Begin with five easy minutes.',
      'Alternate purposeful and easy walking according to the target.',
      'Finish with three to five easy minutes.'
    ],
    tips: 'Use the talk test: breathing should increase, but you should still be able to speak.',
    targets: [
      { sets: 1, target: '20 minutes easy–moderate', rest: 0 },
      { sets: 1, target: '25 minutes moderate', rest: 0 },
      { sets: 1, target: '25 min · 1 brisk / 2 easy', rest: 0 },
      { sets: 1, target: '30 min · 1 brisk / 1 easy', rest: 0 },
      { sets: 1, target: '30 min · 2 brisk / 1 easy', rest: 0 },
      { sets: 1, target: '35 minutes controlled', rest: 0 }
    ]
  },
  birdDog: {
    name: 'Bird-dog',
    type: 'Core',
    muscles: 'Core and back control',
    equipment: 'Exercise mat or floor',
    instructions: [
      'Start on hands and knees with your spine comfortable.',
      'Reach the opposite arm and leg without rotating your hips.',
      'Return with control and alternate sides.'
    ],
    tips: 'A small, stable reach is better than a large unstable reach.',
    targets: [
      { sets: 2, target: '5 each side', rest: 45 },
      { sets: 2, target: '6 each side', rest: 45 },
      { sets: 3, target: '6 each side · 2 sec hold', rest: 45 },
      { sets: 3, target: '8 each side', rest: 40 },
      { sets: 3, target: '8 each side · slow', rest: 40 },
      { sets: 3, target: '10 each side', rest: 35 }
    ]
  },
  mobility: {
    name: 'Gentle mobility flow',
    type: 'Mobility',
    muscles: 'Shoulders, hips and ankles',
    equipment: 'None',
    instructions: [
      'Move through shoulder circles, hip hinges, ankle rocks and gentle trunk turns.',
      'Use slow, pain-free movements and easy breathing.',
      'Do not force any stretch.'
    ],
    tips: 'Mobility should leave you feeling better, not exhausted.',
    targets: [
      { sets: 1, target: '8 minutes', rest: 0 },
      { sets: 1, target: '10 minutes', rest: 0 },
      { sets: 1, target: '10 minutes', rest: 0 },
      { sets: 1, target: '12 minutes', rest: 0 },
      { sets: 1, target: '12 minutes', rest: 0 },
      { sets: 1, target: '15 minutes', rest: 0 }
    ]
  },
  recoveryWalk: {
    name: 'Easy recovery walk',
    type: 'Recovery',
    muscles: 'Whole body recovery',
    equipment: 'Comfortable shoes',
    instructions: [
      'Walk at an easy pace that feels restorative.',
      'Keep your breathing relaxed and shoulders loose.',
      'Shorten the walk if fatigue is higher than usual.'
    ],
    tips: 'The goal is recovery and movement, not performance.',
    targets: [
      { sets: 1, target: '20 minutes easy', rest: 0 },
      { sets: 1, target: '25 minutes easy', rest: 0 },
      { sets: 1, target: '25 minutes easy', rest: 0 },
      { sets: 1, target: '30 minutes easy', rest: 0 },
      { sets: 1, target: '30 minutes easy', rest: 0 },
      { sets: 1, target: '30–35 minutes easy', rest: 0 }
    ]
  }
};

const WEEK_SCHEDULE = [
  { key: 'strengthA', title: 'Full Body A', focus: 'Squat · Push · Pull', type: 'Strength', minutes: 42, exercises: ['chairSquat', 'inclinePushup', 'oneArmRow', 'gluteBridge', 'marchFinisher'] },
  { key: 'cardioCore', title: 'Cardio + Core', focus: 'Low-impact conditioning', type: 'Cardio', minutes: 38, exercises: ['briskWalk', 'birdDog', 'mobility'] },
  { key: 'strengthB', title: 'Full Body B', focus: 'Hinge · Press · Core', type: 'Strength', minutes: 43, exercises: ['dumbbellRDL', 'floorPress', 'splitSquat', 'shoulderPress', 'deadBug'] },
  { key: 'activeRecovery', title: 'Active Recovery', focus: 'Easy movement and mobility', type: 'Recovery', minutes: 30, exercises: ['recoveryWalk', 'mobility'] },
  { key: 'strengthC', title: 'Full Body C', focus: 'Legs · Back · Posture', type: 'Strength', minutes: 44, exercises: ['gobletSquat', 'bentRow', 'dumbbellRDL', 'calfRaise', 'farmerMarch'] },
  { key: 'conditioning', title: 'Conditioning', focus: 'Walk intervals and core', type: 'Cardio', minutes: 40, exercises: ['briskWalk', 'deadBug', 'birdDog', 'mobility'] },
  { key: 'rest', title: 'Rest & Reset', focus: 'Recovery day', type: 'Rest', minutes: 15, exercises: ['mobility'] }
];

const MEAL_GUIDE = {
  breakfast: 'Eggs or curd + oats/roti + fruit',
  lunch: 'Roti/rice + vegetables + dal + chicken/fish/eggs',
  snack: 'Fruit + curd or roasted chana',
  dinner: 'Lean protein + vegetables + moderate roti/rice'
};

let state = createDefaultState();
let storageMode = 'indexedDB';
let currentRoute = 'home';
let workoutTicker = null;
let restTicker = null;
let restTimerEnd = null;
let swRegistration = null;
let reloadForUpdate = false;
let wakeLock = null;
let toastTimer = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open database'));
  });
}

async function dbGet(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const request = tx.objectStore(DB_STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function dbSet(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function migrateLegacy(legacy) {
  const migrated = createDefaultState();
  migrated.meta.migratedFromV1 = true;
  migrated.meta.createdAt = new Date().toISOString();
  if (Array.isArray(legacy.measurements) && legacy.measurements.length) {
    migrated.measurements = legacy.measurements.map((m) => ({
      id: uid(),
      date: m.date || localISO(),
      weightKg: Number(m.weight) || migrated.profile.startWeightKg,
      waistCm: m.waist ? round(Number(m.waist) * 2.54, 1) : null,
      note: 'Imported from version 1',
      createdAt: new Date().toISOString()
    }));
  }
  if (legacy.days && typeof legacy.days === 'object') {
    for (const [date, day] of Object.entries(legacy.days)) {
      migrated.days[date] = createDayRecord(date);
      migrated.days[date].waterMl = Math.max(0, Number(day.water || 0) * 250);
      migrated.days[date].workout.completedAt = day.finished ? `${date}T20:00:00` : null;
      migrated.days[date].workout.sessionKey = getSessionForDate(date, migrated.profile).key;
      migrated.days[date].legacyHabits = day.habits || {};
    }
  }
  return migrated;
}

async function loadState() {
  const defaults = createDefaultState();
  let loaded = null;
  try {
    loaded = await dbGet(STATE_KEY);
  } catch (error) {
    storageMode = 'localStorage';
    try { loaded = JSON.parse(localStorage.getItem(FALLBACK_KEY) || 'null'); } catch { loaded = null; }
  }

  if (!loaded) {
    let legacy = null;
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch { legacy = null; }
    loaded = legacy ? migrateLegacy(legacy) : defaults;
  }

  state = mergeDefaults(defaults, loaded);
  state.meta.schema = SCHEMA_VERSION;
  state.meta.appVersion = APP_VERSION;
  normalizeState();
  await persistState();
}

function normalizeState() {
  state.measurements = (Array.isArray(state.measurements) ? state.measurements : [])
    .filter((m) => m && Number.isFinite(Number(m.weightKg)) && m.date)
    .map((m) => ({ ...m, id: m.id || uid(), weightKg: Number(m.weightKg), waistCm: m.waistCm === null || m.waistCm === '' || m.waistCm === undefined ? null : Number(m.waistCm) }))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  if (!state.measurements.length) {
    state.measurements.push({ id: uid(), date: localISO(), weightKg: Number(state.profile.startWeightKg) || 95, waistCm: Number(state.profile.startWaistCm) || null, note: 'Starting measurement', createdAt: new Date().toISOString() });
  }
  if (!state.days || typeof state.days !== 'object' || Array.isArray(state.days)) state.days = {};
}

async function persistState() {
  state.meta.updatedAt = new Date().toISOString();
  state.meta.appVersion = APP_VERSION;
  try {
    if (storageMode === 'indexedDB') await dbSet(STATE_KEY, state);
    else localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
  } catch (error) {
    storageMode = 'localStorage';
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
  }
}

function createDayRecord(date = localISO()) {
  return {
    date,
    waterMl: 0,
    sleepHours: null,
    steps: null,
    energy: null,
    soreness: null,
    nutrition: {
      proteinServings: 0,
      vegetableServings: 0,
      fruitServings: 0,
      meals: { breakfast: false, lunch: false, snack: false, dinner: false },
      habits: { noSugaryDrink: false, noFastFood: false, dinnerBefore8: false }
    },
    workout: {
      sessionKey: null,
      completedSets: {},
      startedAt: null,
      elapsedSec: 0,
      completedAt: null,
      rpe: null,
      notes: ''
    }
  };
}

function getDay(date = localISO()) {
  if (!state.days[date]) state.days[date] = createDayRecord(date);
  const day = state.days[date];
  day.nutrition = mergeDefaults(createDayRecord(date).nutrition, day.nutrition);
  day.workout = mergeDefaults(createDayRecord(date).workout, day.workout);
  return day;
}

function getPhaseIndex(week) {
  return clamp(Math.floor((Math.max(1, week) - 1) / 2), 0, PHASES.length - 1);
}

function getProgramPosition(date = localISO(), profile = state.profile) {
  const delta = daysBetween(profile.programStart || date, date);
  const effectiveDelta = Math.max(0, delta);
  const rawWeek = Math.floor(effectiveDelta / 7) + 1;
  return {
    beforeStart: delta < 0,
    daysElapsed: delta,
    week: clamp(rawWeek, 1, 12),
    dayIndex: effectiveDelta % 7,
    phaseIndex: getPhaseIndex(rawWeek),
    completedProgram: rawWeek > 12
  };
}

function getSessionForDate(date = localISO(), profile = state.profile) {
  const position = getProgramPosition(date, profile);
  const base = WEEK_SCHEDULE[position.dayIndex];
  const phase = PHASES[position.phaseIndex];
  return {
    ...base,
    position,
    phase,
    exercises: base.exercises.map((id) => {
      const exercise = EXERCISES[id];
      return { id, ...exercise, prescription: exercise.targets[position.phaseIndex] || exercise.targets.at(-1) };
    })
  };
}

function getCurrentMeasurement() {
  return state.measurements.at(-1) || { weightKg: state.profile.startWeightKg, waistCm: state.profile.startWaistCm, date: localISO() };
}

function workoutElapsed(day = getDay()) {
  const running = day.workout.startedAt ? Math.floor((Date.now() - Number(day.workout.startedAt)) / 1000) : 0;
  return Math.max(0, Number(day.workout.elapsedSec || 0) + running);
}

function completedSetCount(day, session) {
  return session.exercises.reduce((sum, exercise) => {
    const values = day.workout.completedSets[exercise.id] || [];
    return sum + values.filter(Boolean).length;
  }, 0);
}

function totalSetCount(session) {
  return session.exercises.reduce((sum, exercise) => sum + Number(exercise.prescription.sets || 1), 0);
}

function workoutCompletionPercent(day, session) {
  const total = totalSetCount(session);
  if (!total) return 0;
  return clamp(Math.round(completedSetCount(day, session) / total * 100), 0, 100);
}

function getWeekDates(reference = localISO()) {
  const d = parseISO(reference);
  const currentDay = d.getDay();
  const offset = state.settings.weekStartsMonday ? (currentDay === 0 ? -6 : 1 - currentDay) : -currentDay;
  const start = addDays(reference, offset);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function workoutStreak() {
  let cursor = localISO();
  if (!getDay(cursor).workout.completedAt) cursor = addDays(cursor, -1);
  let count = 0;
  for (let i = 0; i < 365; i += 1) {
    const day = state.days[cursor];
    if (!day?.workout?.completedAt) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function dailyScore(day = getDay()) {
  const settings = state.settings;
  const workout = day.workout.completedAt ? 25 : 0;
  const water = clamp(day.waterMl / settings.waterGoalMl, 0, 1) * 25;
  const nutritionRaw = (
    clamp(day.nutrition.proteinServings / settings.proteinServingsGoal, 0, 1) +
    clamp(day.nutrition.vegetableServings / settings.vegetableServingsGoal, 0, 1) +
    clamp(day.nutrition.fruitServings / settings.fruitServingsGoal, 0, 1) +
    clamp(Object.values(day.nutrition.meals).filter(Boolean).length / 3, 0, 1)
  ) / 4;
  const nutrition = nutritionRaw * 25;
  const sleep = day.sleepHours === null ? 0 : clamp(Number(day.sleepHours) / 7, 0, 1) * 25;
  return Math.round(workout + water + nutrition + sleep);
}

function weeklySummary(reference = localISO()) {
  const dates = getWeekDates(reference);
  const days = dates.map((date) => state.days[date] || createDayRecord(date));
  const workouts = days.filter((day) => day.workout.completedAt).length;
  const waterAvg = Math.round(days.reduce((sum, day) => sum + Number(day.waterMl || 0), 0) / 7);
  const sleepValues = days.map((day) => Number(day.sleepHours)).filter((value) => Number.isFinite(value) && value > 0);
  const sleepAvg = sleepValues.length ? round(sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length, 1) : null;
  const scores = days.map((day) => dailyScore(day));
  return { dates, workouts, waterAvg, sleepAvg, score: Math.round(scores.reduce((a, b) => a + b, 0) / 7) };
}

function bmiValue() {
  const weight = Number(getCurrentMeasurement().weightKg);
  const heightM = Number(state.profile.heightCm) / 100;
  return heightM > 0 ? round(weight / (heightM * heightM), 1) : null;
}

function bmiLabel(value) {
  if (!Number.isFinite(value)) return 'Not available';
  if (value < 18.5) return 'Lower range';
  if (value < 25) return 'Healthy screening range';
  if (value < 30) return 'Above healthy range';
  return 'High screening range';
}

function achievementDefinitions() {
  const current = getCurrentMeasurement();
  const weightLost = Number(state.profile.startWeightKg) - Number(current.weightKg);
  const waistLost = state.profile.startWaistCm && current.waistCm ? Number(state.profile.startWaistCm) - Number(current.waistCm) : 0;
  const workouts = Object.values(state.days).filter((day) => day?.workout?.completedAt).length;
  const streak = workoutStreak();
  return [
    { id: 'first-workout', title: 'First Step', description: 'Complete your first workout', earned: workouts >= 1 },
    { id: 'five-workouts', title: 'Building Rhythm', description: 'Complete 5 workouts', earned: workouts >= 5 },
    { id: 'ten-workouts', title: 'Consistency', description: 'Complete 10 workouts', earned: workouts >= 10 },
    { id: 'three-streak', title: '3-Day Streak', description: 'Train 3 days in a row', earned: streak >= 3 },
    { id: 'two-kg', title: '2 kg Down', description: 'Reduce 2 kg from start', earned: weightLost >= 2 },
    { id: 'five-cm', title: '5 cm Down', description: 'Reduce waist by 5 cm', earned: waistLost >= 5 }
  ];
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function applyTheme() {
  const theme = state.settings.theme;
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#0d2f29' : '#0f3f36');
}

function updateHeader() {
  $('#headerTitle').textContent = `${greeting()}, ${state.profile.name || 'there'}`;
  const position = getProgramPosition();
  $('#headerEyebrow').textContent = position.beforeStart ? 'PROGRAM READY' : `WEEK ${position.week} · ${PHASES[position.phaseIndex].label.toUpperCase()}`;
  updateConnectionStatus();
}

function updateConnectionStatus() {
  const badge = $('#connectionBadge');
  const online = navigator.onLine;
  badge.classList.toggle('offline', !online);
  badge.innerHTML = `${icon(online ? 'wifi' : 'wifi-off')}<span>${online ? 'Online' : 'Offline'}</span>`;
}

function setRoute(route, push = true) {
  if (!['home', 'workout', 'nutrition', 'progress', 'ai', 'settings'].includes(route)) route = 'home';
  currentRoute = route;
  $$('.view').forEach((view) => view.classList.toggle('active', view.dataset.view === route));
  $$('.nav-item').forEach((button) => {
    const active = button.dataset.route === route;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  renderRoute(route);
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (push) history.replaceState(null, '', `${location.pathname}${location.search}#${route}`);
}

function renderRoute(route = currentRoute) {
  updateHeader();
  if (route === 'home') renderHome();
  if (route === 'workout') renderWorkout();
  if (route === 'nutrition') renderNutrition();
  if (route === 'progress') renderProgress();
  if (route === 'settings') renderSettings();
  if (route === 'ai' && typeof renderAICoach === 'function') renderAICoach();
}

function renderHome() {
  const view = $('#view-home');
  const current = getCurrentMeasurement();
  const start = Number(state.profile.startWeightKg);
  const goal = Number(state.profile.goalWeightKg);
  const currentWeight = Number(current.weightKg);
  const totalTarget = Math.max(0.1, start - goal);
  const weightLost = round(start - currentWeight, 1);
  const progress = clamp((start - currentWeight) / totalTarget * 100, 0, 100);
  const day = getDay();
  const session = getSessionForDate();
  const position = session.position;
  const week = weeklySummary();
  const waterPercent = clamp(day.waterMl / state.settings.waterGoalMl * 100, 0, 100);
  const proteinPercent = clamp(day.nutrition.proteinServings / state.settings.proteinServingsGoal * 100, 0, 100);
  const workoutPercent = day.workout.completedAt ? 100 : workoutCompletionPercent(day, session);
  const sleepPercent = day.sleepHours ? clamp(day.sleepHours / 7 * 100, 0, 100) : 0;
  const remaining = round(Math.max(0, currentWeight - goal), 1);
  const sessionStatus = day.workout.completedAt ? 'Completed' : day.workout.startedAt || day.workout.elapsedSec ? 'In progress' : position.beforeStart ? 'Preview' : 'Ready';
  const sessionStatusClass = day.workout.completedAt ? 'success' : day.workout.startedAt ? 'warning' : 'neutral';

  view.innerHTML = `
    <div class="card brand-card">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow" style="color:rgba(255,255,255,.68)">YOUR TRANSFORMATION</p>
          <h1>${escapeHTML(currentWeight)} kg</h1>
          <p>${remaining} kg remaining to your ${escapeHTML(goal)} kg goal. Focus on the next consistent day.</p>
        </div>
        <div class="progress-ring" style="--p:${Math.round(progress)}">
          <div><strong>${Math.round(progress)}%</strong><span>GOAL PROGRESS</span></div>
        </div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><strong>${weightLost >= 0 ? weightLost : `+${Math.abs(weightLost)}`} kg</strong><span>${weightLost >= 0 ? 'Lost from start' : 'Change from start'}</span></div>
        <div class="hero-stat"><strong>${workoutStreak()} days</strong><span>Workout streak</span></div>
        <div class="hero-stat"><strong>Week ${position.week}</strong><span>${escapeHTML(session.phase.label)}</span></div>
      </div>
    </div>

    <div class="section-title"><h2>Today</h2><span>${formatDate(localISO(), { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
    <div class="card today-card">
      <div class="today-head">
        <div>
          <p class="eyebrow">${escapeHTML(session.type)} SESSION</p>
          <h2>${escapeHTML(session.title)}</h2>
          <p>${escapeHTML(session.focus)}</p>
        </div>
        <span class="status-pill ${sessionStatusClass}">${sessionStatus}</span>
      </div>
      <div class="today-detail">
        <div><strong>${session.minutes} min</strong><span>Planned duration</span></div>
        <div><strong>${session.exercises.length}</strong><span>Movements</span></div>
        <div><strong>${session.phase.rpe}</strong><span>Target effort</span></div>
      </div>
      <div class="action-row" style="margin-top:14px">
        <button class="button" type="button" data-action="go-workout">${icon(day.workout.startedAt ? 'pause' : 'play')}${day.workout.completedAt ? 'Review workout' : day.workout.startedAt || day.workout.elapsedSec ? 'Continue workout' : 'Start workout'}</button>
        <button class="button secondary" type="button" data-action="open-checkin">${icon('edit')}Daily check-in</button>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-top">${icon('drop')}<span>Water</span></div>
        <strong>${(day.waterMl / 1000).toFixed(1)} L</strong>
        <small>${Math.round(waterPercent)}% of ${(state.settings.waterGoalMl / 1000).toFixed(1)} L goal</small>
      </div>
      <div class="metric-card">
        <div class="metric-top">${icon('moon')}<span>Sleep</span></div>
        <strong>${day.sleepHours ?? '—'}${day.sleepHours ? ' h' : ''}</strong>
        <small>${day.sleepHours ? (day.sleepHours >= 7 ? 'Goal reached' : 'Aim for 7+ hours') : 'Add daily check-in'}</small>
      </div>
      <div class="metric-card">
        <div class="metric-top">${icon('steps')}<span>Steps</span></div>
        <strong>${day.steps ? Number(day.steps).toLocaleString() : '—'}</strong>
        <small>${day.steps ? `${Math.round(clamp(day.steps / state.settings.stepGoal, 0, 1) * 100)}% of goal` : 'Optional daily entry'}</small>
      </div>
      <div class="metric-card">
        <div class="metric-top">${icon('flame')}<span>Daily score</span></div>
        <strong>${dailyScore(day)}%</strong>
        <small>Workout, food, water and sleep</small>
      </div>
    </div>

    <div class="section-title"><h2>Daily execution</h2><span>${Object.values(day.nutrition.meals).filter(Boolean).length}/4 meals logged</span></div>
    <div class="card compact">
      <div class="check-list">
        ${homeCheckRow('workout', 'Complete today’s movement', `${Math.round(workoutPercent)}% complete`, day.workout.completedAt, 'go-workout')}
        ${homeCheckRow('water', 'Reach your water goal', `${day.waterMl} / ${state.settings.waterGoalMl} mL`, day.waterMl >= state.settings.waterGoalMl, 'quick-water')}
        ${homeCheckRow('protein', 'Include protein across meals', `${day.nutrition.proteinServings} / ${state.settings.proteinServingsGoal} servings`, day.nutrition.proteinServings >= state.settings.proteinServingsGoal, 'go-nutrition')}
        ${homeCheckRow('sleep', 'Record 7+ hours of sleep', day.sleepHours ? `${day.sleepHours} hours recorded` : 'Not recorded', Number(day.sleepHours) >= 7, 'open-checkin')}
      </div>
    </div>

    <div class="section-title"><h2>This week</h2><span>${week.workouts} workouts completed</span></div>
    <div class="card">
      ${renderWeekStrip(week.dates)}
      <div style="margin-top:16px">
        <div class="score-row"><span>Workouts</span><div class="score-bar"><span style="--value:${clamp(week.workouts / 5 * 100, 0, 100)}%"></span></div><strong>${week.workouts}/5</strong></div>
        <div class="score-row"><span>Water avg.</span><div class="score-bar"><span style="--value:${clamp(week.waterAvg / state.settings.waterGoalMl * 100, 0, 100)}%"></span></div><strong>${Math.round(week.waterAvg / 100) / 10}L</strong></div>
        <div class="score-row"><span>Habit score</span><div class="score-bar"><span style="--value:${week.score}%"></span></div><strong>${week.score}%</strong></div>
      </div>
    </div>

    <div class="notice">${icon('shield')}<div>Your fitness data is stored locally on this iPhone. Create a backup regularly from <strong>More → Data & Privacy</strong>.</div></div>
  `;
}

function homeCheckRow(id, title, subtitle, checked, action) {
  return `
    <button class="check-row" type="button" data-action="${action}" style="width:100%;border-left:0;border-right:0;border-top:0;text-align:left;background:transparent;color:inherit">
      <span class="check-control ${checked ? 'checked' : ''}">${icon('check')}</span>
      <span class="check-copy"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(subtitle)}</span></span>
      ${icon('chevron')}
    </button>`;
}

function renderWeekStrip(dates) {
  const today = localISO();
  return `<div class="week-strip">${dates.map((date) => {
    const day = state.days[date];
    const done = Boolean(day?.workout?.completedAt);
    const d = parseISO(date);
    return `<div class="week-day ${date === today ? 'today' : ''} ${done ? 'done' : ''}"><span>${d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span><strong>${done && date !== today ? '✓' : d.getDate()}</strong></div>`;
  }).join('')}</div>`;
}

function renderWorkout() {
  const view = $('#view-workout');
  const day = getDay();
  const session = getSessionForDate();
  if (!day.workout.sessionKey) day.workout.sessionKey = session.key;
  const elapsed = workoutElapsed(day);
  const completion = workoutCompletionPercent(day, session);
  const running = Boolean(day.workout.startedAt);
  const completed = Boolean(day.workout.completedAt);
  const weekDates = getWeekDates();

  view.innerHTML = `
    <div class="card brand-card workout-hero">
      <div class="phase-row">
        <span class="tag">Week ${session.position.week} · ${escapeHTML(session.phase.label)}</span>
        <span class="tag">${completion}% complete</span>
      </div>
      <h1>${escapeHTML(session.title)}</h1>
      <p>${escapeHTML(session.phase.description)}</p>
      <div class="workout-meta">
        <span class="tag">${icon('clock')}${session.minutes} min</span>
        <span class="tag">${session.exercises.length} movements</span>
        <span class="tag">RPE ${escapeHTML(session.phase.rpe)}</span>
      </div>
      <div class="workout-time"><strong id="workoutClock">${formatDuration(elapsed)}</strong><span>${completed ? 'completed time' : running ? 'session running' : elapsed ? 'paused time' : 'session timer'}</span></div>
      <div class="action-row">
        ${completed
          ? `<button class="button" type="button" data-action="repeat-workout">${icon('refresh')}Repeat session</button>`
          : running
            ? `<button class="button" type="button" data-action="pause-workout">${icon('pause')}Pause</button><button class="button secondary" type="button" data-action="complete-workout">${icon('check')}Finish</button>`
            : `<button class="button" type="button" data-action="start-workout">${icon('play')}${elapsed ? 'Resume' : 'Start workout'}</button>${elapsed ? `<button class="button secondary" type="button" data-action="complete-workout">${icon('check')}Finish</button>` : ''}`
        }
      </div>
    </div>

    ${session.position.beforeStart ? `<div class="notice warning">${icon('calendar')}<div>Your program starts on <strong>${formatDate(state.profile.programStart, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>. You can preview or start this session now.</div></div>` : ''}

    <div class="section-title"><h2>Readiness</h2><span>Quick pre-workout check</span></div>
    <div class="card compact">
      <div class="readiness-grid">
        ${readinessScale('energy', 'Energy', day.energy)}
        ${readinessScale('soreness', 'Soreness', day.soreness)}
      </div>
      <p class="helper">Use 1 for very low and 5 for very high. If soreness is high or you feel unwell, choose recovery movement instead.</p>
    </div>

    <div class="section-title"><h2>Session plan</h2><span>${completedSetCount(day, session)} / ${totalSetCount(session)} sets</span></div>
    <div>${session.exercises.map((exercise, index) => renderExerciseCard(exercise, index, day, completed)).join('')}</div>

    <div class="card">
      <h2>Session notes</h2>
      <textarea class="textarea" id="workoutNotes" maxlength="500" placeholder="How did the workout feel? Any exercise to adjust next time?">${escapeHTML(day.workout.notes || '')}</textarea>
      <p class="helper">Notes save when you leave this field.</p>
    </div>

    <div class="section-title"><h2>Weekly schedule</h2><span>5 training + 2 recovery days</span></div>
    <div class="card compact"><div class="schedule-list">
      ${weekDates.map((date) => {
        const item = getSessionForDate(date);
        const isToday = date === localISO();
        const done = Boolean(state.days[date]?.workout?.completedAt);
        return `<div class="schedule-item ${isToday ? 'active' : ''}">
          <div class="schedule-day">${parseISO(date).toLocaleDateString(undefined, { weekday: 'short' })}</div>
          <div class="schedule-copy"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.focus)} · ${item.minutes} min</span></div>
          <div class="schedule-status ${done ? 'done' : ''}">${done ? icon('check') : parseISO(date).getDate()}</div>
        </div>`;
      }).join('')}
    </div></div>

    <div class="notice warning">${icon('info')}<div>Stop the session and seek medical help for chest pain, faintness, unusual shortness of breath or severe pain. Normal muscle effort is different from sharp or worsening pain.</div></div>
  `;
  syncWorkoutTicker();
}

function readinessScale(field, label, selected) {
  return `<div class="scale-input"><label>${label}</label><div class="scale-buttons">${[1, 2, 3, 4, 5].map((value) => `<button type="button" class="${Number(selected) === value ? 'active' : ''}" data-action="set-readiness" data-field="${field}" data-value="${value}" aria-label="${label} ${value} out of 5">${value}</button>`).join('')}</div></div>`;
}

function renderExerciseCard(exercise, index, day, completed) {
  const setValues = day.workout.completedSets[exercise.id] || [];
  const sets = Number(exercise.prescription.sets || 1);
  return `
    <div class="exercise-card">
      <div class="exercise-head">
        <div class="exercise-number">${index + 1}</div>
        <div class="exercise-copy"><h3>${escapeHTML(exercise.name)}</h3><p>${escapeHTML(exercise.muscles)} · ${escapeHTML(exercise.equipment)}</p></div>
        <button class="icon-button exercise-info" type="button" data-action="exercise-info" data-exercise="${exercise.id}" aria-label="Instructions for ${escapeHTML(exercise.name)}">${icon('info')}</button>
      </div>
      <div class="exercise-target"><strong>${escapeHTML(exercise.prescription.target)}</strong><span>${exercise.prescription.rest ? `${exercise.prescription.rest}s rest` : 'Continuous'}</span></div>
      <div class="set-row">
        ${Array.from({ length: sets }, (_, setIndex) => `<button type="button" class="set-chip ${setValues[setIndex] ? 'done' : ''}" data-action="toggle-set" data-exercise="${exercise.id}" data-set="${setIndex}" ${completed ? 'disabled' : ''}>${setValues[setIndex] ? '✓' : `Set ${setIndex + 1}`}</button>`).join('')}
        ${exercise.prescription.rest ? `<button type="button" class="rest-button" data-action="start-rest" data-seconds="${exercise.prescription.rest}">${icon('clock')} Rest</button>` : ''}
      </div>
    </div>`;
}

function renderNutrition() {
  const view = $('#view-nutrition');
  const day = getDay();
  const settings = state.settings;
  const nutrition = day.nutrition;
  const mealsDone = Object.values(nutrition.meals).filter(Boolean).length;
  const nutritionScore = Math.round((
    clamp(nutrition.proteinServings / settings.proteinServingsGoal, 0, 1) +
    clamp(nutrition.vegetableServings / settings.vegetableServingsGoal, 0, 1) +
    clamp(nutrition.fruitServings / settings.fruitServingsGoal, 0, 1) +
    clamp(mealsDone / 4, 0, 1)
  ) / 4 * 100);
  const nextMeal = nextMealSuggestion(nutrition.meals);

  view.innerHTML = `
    <div class="section-head"><div><h1>Nutrition & habits</h1><p>Simple execution, not extreme restriction.</p></div><span class="status-pill ${nutritionScore >= 75 ? 'success' : 'neutral'}">${nutritionScore}% today</span></div>

    <div class="card brand-card">
      <div class="hero-grid">
        <div class="hero-copy"><p class="eyebrow" style="color:rgba(255,255,255,.68)">NEXT BEST ACTION</p><h1>${escapeHTML(nextMeal.title)}</h1><p>${escapeHTML(nextMeal.text)}</p></div>
        <div class="progress-ring" style="--p:${nutritionScore}"><div><strong>${nutritionScore}%</strong><span>NUTRITION</span></div></div>
      </div>
    </div>

    <div class="section-title"><h2>Hydration</h2><span>${day.waterMl} / ${settings.waterGoalMl} mL</span></div>
    <div class="card">
      <div class="counter-row">
        <button class="counter-button" type="button" data-action="water-delta" data-delta="-250" aria-label="Remove 250 millilitres">${icon('minus')}</button>
        <div class="counter-value"><strong>${(day.waterMl / 1000).toFixed(2)} L</strong><span>${Math.round(clamp(day.waterMl / settings.waterGoalMl, 0, 1) * 100)}% of daily goal</span></div>
        <button class="counter-button" type="button" data-action="water-delta" data-delta="250" aria-label="Add 250 millilitres">${icon('plus')}</button>
      </div>
      <div class="score-bar" style="margin-top:14px"><span style="--value:${clamp(day.waterMl / settings.waterGoalMl * 100, 0, 100)}%"></span></div>
    </div>

    <div class="section-title"><h2>Meal check</h2><span>${mealsDone}/4 logged</span></div>
    <div class="meal-grid">
      ${Object.entries(MEAL_GUIDE).map(([key, text]) => `<button class="meal-card ${nutrition.meals[key] ? 'checked' : ''}" type="button" data-action="toggle-meal" data-meal="${key}" style="text-align:left;color:inherit">
        <strong>${key[0].toUpperCase() + key.slice(1)}</strong><span>${escapeHTML(text)}</span><span class="meal-check">${icon('check')}</span>
      </button>`).join('')}
    </div>

    <div class="section-title"><h2>Daily building blocks</h2><span>Tap + or −</span></div>
    <div class="card">
      ${nutritionCounter('proteinServings', 'Protein servings', nutrition.proteinServings, settings.proteinServingsGoal, 'Eggs, chicken, fish, dal, curd or paneer')}
      <div class="divider"></div>
      ${nutritionCounter('vegetableServings', 'Vegetable servings', nutrition.vegetableServings, settings.vegetableServingsGoal, 'Aim for variety across lunch and dinner')}
      <div class="divider"></div>
      ${nutritionCounter('fruitServings', 'Fruit servings', nutrition.fruitServings, settings.fruitServingsGoal, 'Whole fruit rather than juice')}
    </div>

    <div class="section-title"><h2>Quality habits</h2><span>Today</span></div>
    <div class="card compact"><div class="check-list">
      ${nutritionHabitRow('noSugaryDrink', 'No sugary drink', 'Choose water or unsweetened alternatives', nutrition.habits.noSugaryDrink)}
      ${nutritionHabitRow('noFastFood', 'No fast food', 'Keep outside food planned, not automatic', nutrition.habits.noFastFood)}
      ${nutritionHabitRow('dinnerBefore8', 'Dinner before 8 PM', 'Maintain your preferred meal timing', nutrition.habits.dinnerBefore8)}
    </div></div>

    <div class="section-title"><h2>Balanced plate guide</h2><span>Use at lunch and dinner</span></div>
    <div class="card">
      <div class="plate" aria-label="Half vegetables, one quarter protein and one quarter carbohydrates">
        <div class="plate-part veg">½ Vegetables</div>
        <div class="plate-part protein">¼ Protein</div>
        <div class="plate-part carb">¼ Roti / rice</div>
      </div>
      <p class="small muted">Keep protein and vegetables consistent, then adjust the roti or rice portion based on hunger, activity and progress. This is general guidance, not a medical diet prescription.</p>
    </div>
  `;
}

function nutritionCounter(field, label, value, goal, hint) {
  return `<div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div><strong style="font-size:13px">${escapeHTML(label)}</strong><div class="micro muted" style="margin-top:3px">${escapeHTML(hint)}</div></div>
      <div class="action-row" style="flex-wrap:nowrap">
        <button class="icon-button" type="button" data-action="nutrition-delta" data-field="${field}" data-delta="-1" aria-label="Remove one ${escapeHTML(label)}">${icon('minus')}</button>
        <div class="counter-value" style="min-width:44px"><strong style="font-size:20px">${value}</strong><span>of ${goal}</span></div>
        <button class="icon-button" type="button" data-action="nutrition-delta" data-field="${field}" data-delta="1" aria-label="Add one ${escapeHTML(label)}">${icon('plus')}</button>
      </div>
    </div>
    <div class="score-bar" style="margin-top:10px"><span style="--value:${clamp(value / goal * 100, 0, 100)}%"></span></div>
  </div>`;
}

function nutritionHabitRow(field, title, subtitle, checked) {
  return `<button class="check-row" type="button" data-action="toggle-nutrition-habit" data-field="${field}" style="width:100%;border-left:0;border-right:0;border-top:0;text-align:left;background:transparent;color:inherit">
    <span class="check-control ${checked ? 'checked' : ''}">${icon('check')}</span><span class="check-copy"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(subtitle)}</span></span>
  </button>`;
}

function nextMealSuggestion(meals) {
  const hour = new Date().getHours();
  if (!meals.breakfast && hour < 11) return { title: 'Protein-first breakfast', text: MEAL_GUIDE.breakfast };
  if (!meals.lunch && hour < 16) return { title: 'Build a balanced lunch', text: MEAL_GUIDE.lunch };
  if (!meals.snack && hour < 19) return { title: 'Plan your snack', text: MEAL_GUIDE.snack };
  if (!meals.dinner) return { title: 'Keep dinner simple', text: MEAL_GUIDE.dinner };
  return { title: 'Meals logged', text: 'Finish the day with water and prepare tomorrow’s protein source.' };
}

function renderProgress() {
  const view = $('#view-progress');
  const current = getCurrentMeasurement();
  const startWeight = Number(state.profile.startWeightKg);
  const startWaist = Number(state.profile.startWaistCm);
  const weightChange = round(Number(current.weightKg) - startWeight, 1);
  const waistChange = current.waistCm && startWaist ? round(Number(current.waistCm) - startWaist, 1) : null;
  const bmi = bmiValue();
  const week = weeklySummary();
  const achievements = achievementDefinitions();
  const chartData = getChartMeasurements();

  view.innerHTML = `
    <div class="section-head"><div><h1>Progress analytics</h1><p>Measure trends, not single-day fluctuations.</p></div><button class="icon-button" type="button" data-action="share-progress" aria-label="Share progress summary">${icon('share')}</button></div>

    <div class="metrics-grid">
      <div class="metric-card"><div class="metric-top">${icon('scale')}<span>Weight</span></div><strong>${current.weightKg} kg</strong><small>${signedChange(weightChange, 'kg')} from start</small></div>
      <div class="metric-card"><div class="metric-top">${icon('ruler')}<span>Waist</span></div><strong>${current.waistCm ? `${round(current.waistCm, 1)} cm` : '—'}</strong><small>${waistChange === null ? 'Not recorded' : `${signedChange(waistChange, 'cm')} from start`}</small></div>
      <div class="metric-card"><div class="metric-top">${icon('target')}<span>BMI</span></div><strong>${bmi ?? '—'}</strong><small>${escapeHTML(bmiLabel(bmi))}</small></div>
      <div class="metric-card"><div class="metric-top">${icon('flame')}<span>Weekly score</span></div><strong>${week.score}%</strong><small>${week.workouts} workouts this week</small></div>
    </div>

    <div class="section-title"><h2>Add measurement</h2><span>Weekly is enough</span></div>
    <form class="card" id="measurementForm">
      <div class="form-grid three">
        <div class="form-group"><label for="measureDate">Date</label><input class="input" id="measureDate" name="date" type="date" value="${localISO()}" max="${localISO()}" required></div>
        <div class="form-group"><label for="measureWeight">Weight (kg)</label><input class="input" id="measureWeight" name="weight" type="number" min="30" max="300" step="0.1" inputmode="decimal" placeholder="e.g. 94.5" required></div>
        <div class="form-group"><label for="measureWaist">Waist (cm)</label><input class="input" id="measureWaist" name="waist" type="number" min="40" max="250" step="0.1" inputmode="decimal" placeholder="e.g. 103"></div>
        <div class="form-group full"><label for="measureNote">Note (optional)</label><input class="input" id="measureNote" name="note" maxlength="100" placeholder="Energy, clothing fit or milestone"></div>
      </div>
      <button class="button full" type="submit" style="margin-top:12px">${icon('plus')}Save measurement</button>
    </form>

    <div class="section-title"><h2>Trend</h2><span>${chartData.length} entries</span></div>
    <div class="card chart-wrap">
      <div class="segmented" style="margin-bottom:14px">
        <button type="button" class="${state.ui.chartMetric === 'weight' ? 'active' : ''}" data-action="chart-metric" data-metric="weight">Weight</button>
        <button type="button" class="${state.ui.chartMetric === 'waist' ? 'active' : ''}" data-action="chart-metric" data-metric="waist">Waist</button>
        <button type="button" class="${state.ui.chartMetric === 'score' ? 'active' : ''}" data-action="chart-metric" data-metric="score">Habit score</button>
      </div>
      ${renderProgressChart(state.ui.chartMetric, chartData)}
    </div>

    <div class="section-title"><h2>This week</h2><span>${formatDate(week.dates[0])}–${formatDate(week.dates.at(-1))}</span></div>
    <div class="card">
      <div class="kpi-row"><span>Completed workouts</span><strong>${week.workouts} / 5</strong></div>
      <div class="kpi-row"><span>Average water</span><strong>${(week.waterAvg / 1000).toFixed(1)} L/day</strong></div>
      <div class="kpi-row"><span>Average sleep</span><strong>${week.sleepAvg ? `${week.sleepAvg} h/day` : 'Not enough entries'}</strong></div>
      <div class="kpi-row"><span>Execution score</span><strong>${week.score}%</strong></div>
    </div>

    <div class="section-title"><h2>Achievements</h2><span>${achievements.filter((item) => item.earned).length}/${achievements.length} unlocked</span></div>
    <div class="achievement-grid">${achievements.map((item) => `<div class="achievement ${item.earned ? '' : 'locked'}"><div class="achievement-icon">${icon('award')}</div><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.description)}</span></div>`).join('')}</div>

    <div class="section-title"><h2>Measurement history</h2><span>Latest first</span></div>
    <div class="history-list">
      ${state.measurements.slice().reverse().map((measurement) => renderHistoryRow(measurement)).join('')}
    </div>

    <div class="notice">${icon('info')}<div>BMI is only a screening measure. Track waist, energy, strength, consistency and how your clothes fit alongside body weight.</div></div>
  `;
}

function signedChange(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'No change';
  if (number === 0) return `0 ${unit}`;
  return `${number > 0 ? '+' : ''}${number} ${unit}`;
}

function getChartMeasurements() {
  const cutoff = state.ui.chartRange === '4w' ? addDays(localISO(), -28) : state.ui.chartRange === '12w' ? addDays(localISO(), -84) : '1900-01-01';
  return state.measurements.filter((item) => item.date >= cutoff);
}

function renderProgressChart(metric, measurements) {
  let data = [];
  let unit = '';
  let heading = '';
  if (metric === 'weight') {
    data = measurements.map((m) => ({ date: m.date, value: Number(m.weightKg) })).filter((item) => Number.isFinite(item.value));
    unit = 'kg'; heading = 'Body weight';
  } else if (metric === 'waist') {
    data = measurements.map((m) => ({ date: m.date, value: Number(m.waistCm) })).filter((item) => Number.isFinite(item.value) && item.value > 0);
    unit = 'cm'; heading = 'Waist measurement';
  } else {
    const dates = Array.from({ length: 28 }, (_, index) => addDays(localISO(), index - 27));
    data = dates.map((date) => ({ date, value: dailyScore(state.days[date] || createDayRecord(date)) }));
    unit = '%'; heading = 'Daily execution score';
  }

  if (!data.length) return `<div class="empty-state">${icon('chart')}<strong>No data yet</strong><span>Add a measurement to start your trend chart.</span></div>`;
  const latest = data.at(-1);
  const first = data[0];
  const delta = round(latest.value - first.value, 1);
  return `
    <div class="chart-head"><div><strong>${round(latest.value, 1)} ${unit}</strong><span>${escapeHTML(heading)} · ${signedChange(delta, unit)} in selected range</span></div><span class="status-pill neutral">${formatDate(latest.date)}</span></div>
    ${lineChartSVG(data, unit)}
  `;
}

function lineChartSVG(data, unit) {
  const width = 600;
  const height = 170;
  const pad = { left: 38, right: 14, top: 16, bottom: 27 };
  const values = data.map((item) => item.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const rangePadding = (max - min) * 0.14;
  min -= rangePadding;
  max += rangePadding;
  const x = (index) => pad.left + (data.length === 1 ? (width - pad.left - pad.right) / 2 : index / (data.length - 1) * (width - pad.left - pad.right));
  const y = (value) => pad.top + (max - value) / (max - min) * (height - pad.top - pad.bottom);
  const points = data.map((item, index) => `${x(index).toFixed(1)},${y(item.value).toFixed(1)}`).join(' ');
  const area = `${pad.left},${height - pad.bottom} ${points} ${x(data.length - 1)},${height - pad.bottom}`;
  const areaMarkup = data.length > 1 ? `<polygon class="chart-area" points="${area}"></polygon>` : '';
  const lineMarkup = data.length > 1 ? `<polyline class="chart-line" points="${points}"></polyline>` : '';
  const gridLines = [0, 0.5, 1].map((fraction) => {
    const gy = pad.top + fraction * (height - pad.top - pad.bottom);
    const label = round(max - fraction * (max - min), unit === '%' ? 0 : 1);
    return `<line class="chart-grid" x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}"></line><text class="chart-label" x="2" y="${gy + 3}">${label}</text>`;
  }).join('');
  const labelIndexes = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];
  const xLabels = labelIndexes.map((index) => `<text class="chart-label" text-anchor="${index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}" x="${x(index)}" y="${height - 5}">${formatDate(data[index].date, { day: 'numeric', month: 'short' })}</text>`).join('');
  const dots = data.length <= 20 ? data.map((item, index) => `<circle class="chart-dot" cx="${x(index)}" cy="${y(item.value)}" r="3.5"><title>${formatDate(item.date)}: ${item.value} ${unit}</title></circle>`).join('') : `<circle class="chart-dot" cx="${x(data.length - 1)}" cy="${y(data.at(-1).value)}" r="4"></circle>`;
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHTML(unit)} trend chart">${gridLines}${areaMarkup}${lineMarkup}${dots}${xLabels}</svg>`;
}

function renderHistoryRow(measurement) {
  const date = parseISO(measurement.date);
  return `<div class="history-row">
    <div class="history-date"><strong>${date.getDate()}</strong><span>${date.toLocaleDateString(undefined, { month: 'short' })}</span></div>
    <div class="history-copy"><strong>${measurement.weightKg} kg${measurement.waistCm ? ` · ${round(measurement.waistCm, 1)} cm waist` : ''}</strong><span>${escapeHTML(measurement.note || formatDate(measurement.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}</span></div>
    <button class="icon-button" type="button" data-action="delete-measurement" data-id="${measurement.id}" aria-label="Delete measurement">${icon('trash')}</button>
  </div>`;
}

function renderSettings() {
  const view = $('#view-settings');
  const installed = isStandalone();
  const current = getCurrentMeasurement();
  view.innerHTML = `
    <div class="section-head"><div><h1>More</h1><p>Profile, goals, backup and app controls.</p></div><span class="status-pill neutral">v${APP_VERSION}</span></div>

    <div class="card">
      <div style="display:flex;align-items:center;gap:13px">
        <div class="brand-mark" style="width:52px;height:52px;flex-basis:52px;border-radius:16px">${escapeHTML((state.profile.name || 'T')[0].toUpperCase())}</div>
        <div style="min-width:0;flex:1"><h2 style="margin:0 0 3px">${escapeHTML(state.profile.name)}</h2><div class="small muted">${state.profile.age} years · ${state.profile.heightCm} cm · ${escapeHTML(state.profile.experience)}</div><div class="micro muted" style="margin-top:3px">${current.weightKg} kg → ${state.profile.goalWeightKg} kg goal</div></div>
        <button class="icon-button" type="button" data-action="edit-profile" aria-label="Edit profile">${icon('edit')}</button>
      </div>
    </div>

    <div class="section-title"><h2>Appearance</h2><span>Choose your display</span></div>
    <div class="card compact">
      <div class="segmented">
        ${['system', 'light', 'dark'].map((theme) => `<button type="button" class="${state.settings.theme === theme ? 'active' : ''}" data-action="set-theme" data-theme="${theme}">${theme[0].toUpperCase() + theme.slice(1)}</button>`).join('')}
      </div>
    </div>

    <div class="section-title"><h2>Goals & program</h2><span>Editable</span></div>
    <form class="card" id="goalsForm">
      <div class="form-grid">
        <div class="form-group"><label for="goalWeight">Goal weight (kg)</label><input class="input" id="goalWeight" name="goalWeight" type="number" min="40" max="250" step="0.1" value="${state.profile.goalWeightKg}" required></div>
        <div class="form-group"><label for="programStart">Program start</label><input class="input" id="programStart" name="programStart" type="date" value="${state.profile.programStart}" required></div>
        <div class="form-group"><label for="waterGoal">Water goal (mL)</label><input class="input" id="waterGoal" name="waterGoal" type="number" min="1000" max="6000" step="250" value="${state.settings.waterGoalMl}" required></div>
        <div class="form-group"><label for="stepGoal">Step goal</label><input class="input" id="stepGoal" name="stepGoal" type="number" min="1000" max="30000" step="500" value="${state.settings.stepGoal}" required></div>
      </div>
      <button class="button full" type="submit" style="margin-top:12px">${icon('check')}Save goals</button>
    </form>

    <div class="section-title"><h2>Data & privacy</h2><span>${storageMode === 'indexedDB' ? 'IndexedDB' : 'Local storage'}</span></div>
    <div class="card settings-list">
      <button class="settings-row" type="button" data-action="export-backup"><span class="settings-icon">${icon('download')}</span><span class="settings-copy"><strong>Export full backup</strong><span>Save all local records as a JSON file</span></span>${icon('chevron')}</button>
      <button class="settings-row" type="button" data-action="restore-backup"><span class="settings-icon">${icon('upload')}</span><span class="settings-copy"><strong>Restore backup</strong><span>Replace local records from a previous backup</span></span>${icon('chevron')}</button>
      <button class="settings-row" type="button" data-action="export-csv"><span class="settings-icon">${icon('chart')}</span><span class="settings-copy"><strong>Export CSV reports</strong><span>Measurements and daily execution data</span></span>${icon('chevron')}</button>
      <button class="settings-row" type="button" data-action="protect-storage"><span class="settings-icon">${icon('lock')}</span><span class="settings-copy"><strong>Protect offline storage</strong><span>Request persistent browser storage when supported</span></span>${icon('chevron')}</button>
      <button class="settings-row" type="button" data-action="privacy-info"><span class="settings-icon">${icon('shield')}</span><span class="settings-copy"><strong>Privacy information</strong><span>What stays local and what is public on GitHub</span></span>${icon('chevron')}</button>
    </div>

    <div class="section-title"><h2>App</h2><span>${installed ? 'Installed on Home Screen' : 'Opened in browser'}</span></div>
    <div class="card settings-list">
      ${!installed ? `<button class="settings-row" type="button" data-action="install-guide"><span class="settings-icon">${icon('download')}</span><span class="settings-copy"><strong>Install on Home Screen</strong><span>Open as a standalone iPhone app</span></span>${icon('chevron')}</button>` : ''}
      <button class="settings-row" type="button" data-action="check-update"><span class="settings-icon">${icon('refresh')}</span><span class="settings-copy"><strong>Check for app update</strong><span>Refresh the offline app shell from GitHub Pages</span></span>${icon('chevron')}</button>
      <button class="settings-row" type="button" data-action="about-app"><span class="settings-icon">${icon('info')}</span><span class="settings-copy"><strong>About Transform Pro</strong><span>Version ${APP_VERSION} · Offline-first PWA</span></span>${icon('chevron')}</button>
    </div>

    <div class="section-title"><h2>Danger zone</h2><span>Irreversible without backup</span></div>
    <div class="card"><button class="button danger full" type="button" data-action="reset-app">${icon('trash')}Erase all local app data</button></div>

    <div class="notice">${icon('shield')}<div>The GitHub repository contains only the app code. Measurements, workout records and habits are saved locally in this browser profile unless you manually export and share a backup.</div></div>
  `;
}

function openModal(content) {
  const backdrop = $('#modalBackdrop');
  const panel = $('#modalPanel');
  panel.innerHTML = `<div class="modal-grabber"></div>${content}`;
  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => panel.querySelector('button, input, select, textarea')?.focus({ preventScroll: true }), 50);
}

function closeModal() {
  $('#modalBackdrop').hidden = true;
  $('#modalPanel').innerHTML = '';
  document.body.style.overflow = '';
}

function showExerciseInfo(exerciseId) {
  const exercise = EXERCISES[exerciseId];
  if (!exercise) return;
  const session = getSessionForDate();
  const prescription = exercise.targets[session.position.phaseIndex] || exercise.targets.at(-1);
  openModal(`
    <div class="modal-head"><div><h2 id="modalTitle">${escapeHTML(exercise.name)}</h2><p>${escapeHTML(exercise.muscles)} · ${escapeHTML(exercise.equipment)}</p></div><button class="icon-button" type="button" data-action="close-modal">${icon('close')}</button></div>
    <div class="exercise-target"><strong>${escapeHTML(prescription.target)}</strong><span>${prescription.rest ? `${prescription.rest}s rest` : 'Continuous'}</span></div>
    <ol class="list-clean">${exercise.instructions.map((step) => `<li>${escapeHTML(step)}</li>`).join('')}</ol>
    <div class="notice">${icon('info')}<div><strong>Technique cue:</strong> ${escapeHTML(exercise.tips)}</div></div>
    <button class="button full" type="button" data-action="close-modal" style="margin-top:14px">Got it</button>
  `);
}

function openDailyCheckin() {
  const day = getDay();
  openModal(`
    <div class="modal-head"><div><h2 id="modalTitle">Daily check-in</h2><p>Record recovery and activity for ${formatDate(localISO(), { weekday: 'long', day: 'numeric', month: 'long' })}.</p></div><button class="icon-button" type="button" data-action="close-modal">${icon('close')}</button></div>
    <form id="checkinForm">
      <div class="form-grid">
        <div class="form-group"><label for="checkinSleep">Sleep (hours)</label><input class="input" id="checkinSleep" name="sleep" type="number" min="0" max="16" step="0.1" inputmode="decimal" value="${day.sleepHours ?? ''}" placeholder="e.g. 6.5"></div>
        <div class="form-group"><label for="checkinSteps">Steps (optional)</label><input class="input" id="checkinSteps" name="steps" type="number" min="0" max="100000" step="100" inputmode="numeric" value="${day.steps ?? ''}" placeholder="e.g. 6500"></div>
      </div>
      <div style="margin-top:14px">${readinessScale('modal-energy', 'Energy', day.energy)}</div>
      <div style="margin-top:10px">${readinessScale('modal-soreness', 'Soreness', day.soreness)}</div>
      <div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">Cancel</button><button class="button" type="submit">Save check-in</button></div>
    </form>
  `);
}

function openCompleteWorkout() {
  const day = getDay();
  const session = getSessionForDate();
  openModal(`
    <div class="modal-head"><div><h2 id="modalTitle">Finish workout</h2><p>${completedSetCount(day, session)} of ${totalSetCount(session)} sets marked complete · ${formatDuration(workoutElapsed(day))}</p></div><button class="icon-button" type="button" data-action="close-modal">${icon('close')}</button></div>
    <form id="completeWorkoutForm">
      <div class="form-group"><label>Session effort (RPE 1–10)</label><div class="scale-buttons" style="grid-template-columns:repeat(10,1fr)">${Array.from({ length: 10 }, (_, i) => i + 1).map((value) => `<button type="button" class="${Number(day.workout.rpe) === value ? 'active' : ''}" data-action="select-rpe" data-value="${value}">${value}</button>`).join('')}</div><input id="selectedRpe" type="hidden" value="${day.workout.rpe ?? ''}"></div>
      <div class="form-group" style="margin-top:14px"><label for="completeNotes">Notes (optional)</label><textarea class="textarea" id="completeNotes" maxlength="500" placeholder="What went well? What should change next time?">${escapeHTML(day.workout.notes || '')}</textarea></div>
      <div class="notice warning" style="margin-top:12px">${icon('info')}<div>You can complete a partial session. Consistency matters more than forcing every set.</div></div>
      <div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">Keep training</button><button class="button" type="submit">${icon('check')}Complete</button></div>
    </form>
  `);
}

function openProfileEditor() {
  const p = state.profile;
  openModal(`
    <div class="modal-head"><div><h2 id="modalTitle">Edit profile</h2><p>These settings personalize your dashboard and program.</p></div><button class="icon-button" type="button" data-action="close-modal">${icon('close')}</button></div>
    <form id="profileForm">
      <div class="form-grid">
        <div class="form-group full"><label for="profileName">Name</label><input class="input" id="profileName" name="name" maxlength="40" value="${escapeHTML(p.name)}" required></div>
        <div class="form-group"><label for="profileAge">Age</label><input class="input" id="profileAge" name="age" type="number" min="16" max="100" value="${p.age}" required></div>
        <div class="form-group"><label for="profileHeight">Height (cm)</label><input class="input" id="profileHeight" name="height" type="number" min="120" max="230" value="${p.heightCm}" required></div>
        <div class="form-group"><label for="profileStartWeight">Starting weight (kg)</label><input class="input" id="profileStartWeight" name="startWeight" type="number" min="30" max="300" step="0.1" value="${p.startWeightKg}" required></div>
        <div class="form-group"><label for="profileStartWaist">Starting waist (cm)</label><input class="input" id="profileStartWaist" name="startWaist" type="number" min="40" max="250" step="0.1" value="${p.startWaistCm || ''}"></div>
        <div class="form-group"><label for="profileMinutes">Workout minutes</label><input class="input" id="profileMinutes" name="minutes" type="number" min="15" max="120" step="5" value="${p.workoutMinutes}" required></div>
        <div class="form-group"><label for="profileDiet">Diet preference</label><select class="select" id="profileDiet" name="diet"><option ${p.dietType === 'Non-vegetarian' ? 'selected' : ''}>Non-vegetarian</option><option ${p.dietType === 'Vegetarian' ? 'selected' : ''}>Vegetarian</option><option ${p.dietType === 'Vegan' ? 'selected' : ''}>Vegan</option></select></div>
      </div>
      <div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">Cancel</button><button class="button" type="submit">Save profile</button></div>
    </form>
  `);
}

function confirmModal(title, message, confirmText, action, danger = false) {
  openModal(`
    <div class="modal-head"><div><h2 id="modalTitle">${escapeHTML(title)}</h2><p>${escapeHTML(message)}</p></div><button class="icon-button" type="button" data-action="close-modal">${icon('close')}</button></div>
    <div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">Cancel</button><button class="button ${danger ? 'danger' : ''}" type="button" data-action="${action}">${escapeHTML(confirmText)}</button></div>
  `);
}

function showToast(message, duration = 2400) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, duration);
}

async function startWorkout() {
  const day = getDay();
  if (day.workout.completedAt) return;
  day.workout.startedAt = Date.now();
  await persistState();
  await requestWakeLock();
  renderWorkout();
  showToast('Workout timer started');
}

async function pauseWorkout() {
  const day = getDay();
  if (day.workout.startedAt) {
    day.workout.elapsedSec = workoutElapsed(day);
    day.workout.startedAt = null;
  }
  await releaseWakeLock();
  await persistState();
  renderWorkout();
  showToast('Workout paused');
}

async function finishWorkout(rpe, notes) {
  const day = getDay();
  day.workout.elapsedSec = workoutElapsed(day);
  day.workout.startedAt = null;
  day.workout.completedAt = new Date().toISOString();
  day.workout.rpe = rpe ? Number(rpe) : null;
  day.workout.notes = String(notes || '').trim();
  await releaseWakeLock();
  await persistState();
  closeModal();
  renderWorkout();
  showToast('Workout completed — excellent work!');
  maybeShowAchievement();
}

async function repeatWorkout() {
  confirmModal('Repeat this session?', 'This clears today’s completed sets and starts a new timer. The previous completion for today will be replaced.', 'Repeat workout', 'confirm-repeat');
}

async function confirmRepeatWorkout() {
  const day = getDay();
  day.workout = createDayRecord().workout;
  day.workout.sessionKey = getSessionForDate().key;
  await persistState();
  closeModal();
  await startWorkout();
}

function syncWorkoutTicker() {
  clearInterval(workoutTicker);
  const day = getDay();
  if (!day.workout.startedAt) return;
  workoutTicker = setInterval(() => {
    const clock = $('#workoutClock');
    if (clock) clock.textContent = formatDuration(workoutElapsed(getDay()));
  }, 1000);
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen');
  } catch { wakeLock = null; }
}

async function releaseWakeLock() {
  try { await wakeLock?.release(); } catch { /* no-op */ }
  wakeLock = null;
}

function startRestTimer(seconds) {
  restTimerEnd = Date.now() + Number(seconds) * 1000;
  $('#restTimer').hidden = false;
  tickRestTimer();
  clearInterval(restTicker);
  restTicker = setInterval(tickRestTimer, 250);
}

function tickRestTimer() {
  if (!restTimerEnd) return;
  const remaining = Math.max(0, Math.ceil((restTimerEnd - Date.now()) / 1000));
  $('#restTimerValue').textContent = formatDuration(remaining);
  if (remaining <= 0) {
    cancelRestTimer();
    beep();
    if ('vibrate' in navigator) navigator.vibrate([120, 80, 120]);
    showToast('Rest complete — next set');
  }
}

function cancelRestTimer() {
  clearInterval(restTicker);
  restTicker = null;
  restTimerEnd = null;
  $('#restTimer').hidden = true;
}

function beep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 720;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.26);
  } catch { /* audio optional */ }
}

function maybeShowAchievement() {
  const earned = achievementDefinitions().filter((item) => item.earned && !state.achievementsSeen.includes(item.id));
  if (!earned.length) return;
  const item = earned[0];
  state.achievementsSeen.push(item.id);
  persistState();
  setTimeout(() => openModal(`
    <div style="text-align:center;padding:6px 4px 4px"><div class="achievement-icon" style="width:64px;height:64px">${icon('award')}</div><h2 id="modalTitle" style="margin:12px 0 4px">Achievement unlocked</h2><h3 style="margin:0">${escapeHTML(item.title)}</h3><p class="small muted">${escapeHTML(item.description)}</p><button class="button full" type="button" data-action="close-modal" style="margin-top:10px">Continue</button></div>
  `), 500);
}

async function saveMeasurement(form) {
  const data = new FormData(form);
  const date = String(data.get('date'));
  const weight = Number(data.get('weight'));
  const waistRaw = String(data.get('waist') || '').trim();
  const waist = waistRaw ? Number(waistRaw) : null;
  const note = String(data.get('note') || '').trim();
  if (!date || date > localISO() || !Number.isFinite(weight) || weight < 30 || weight > 300 || (waist !== null && (!Number.isFinite(waist) || waist < 40 || waist > 250))) {
    showToast('Please enter valid measurement values');
    return;
  }
  state.measurements.push({ id: uid(), date, weightKg: round(weight, 1), waistCm: waist === null ? null : round(waist, 1), note, createdAt: new Date().toISOString() });
  state.measurements.sort((a, b) => a.date.localeCompare(b.date) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  await persistState();
  form.reset();
  renderProgress();
  showToast('Measurement saved');
  maybeShowAchievement();
}

async function deleteMeasurement(id) {
  if (state.measurements.length <= 1) {
    showToast('Keep at least one starting measurement');
    return;
  }
  confirmModal('Delete measurement?', 'This measurement will be removed from your charts and history.', 'Delete', 'confirm-delete-measurement', true);
  $('#modalPanel').dataset.deleteId = id;
}

async function confirmDeleteMeasurement() {
  const id = $('#modalPanel').dataset.deleteId;
  state.measurements = state.measurements.filter((item) => item.id !== id);
  await persistState();
  closeModal();
  renderProgress();
  showToast('Measurement deleted');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportBackup() {
  state.meta.lastBackupAt = new Date().toISOString();
  await persistState();
  const payload = { format: 'TransformProBackup', version: APP_VERSION, schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `transform-pro-backup-${localISO()}.json`);
  showToast('Backup file created');
}

function restoreBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const candidate = parsed?.format === 'TransformProBackup' ? parsed.state : parsed;
      if (!candidate?.profile || !Array.isArray(candidate.measurements) || !candidate.days) throw new Error('Invalid backup');
      window.__pendingRestore = candidate;
      confirmModal('Restore this backup?', 'Current local data will be replaced. Export a backup first if you need the present records.', 'Restore backup', 'confirm-restore', true);
    } catch {
      showToast('The selected file is not a valid backup');
    } finally {
      $('#restoreInput').value = '';
    }
  };
  reader.readAsText(file);
}

async function confirmRestore() {
  if (!window.__pendingRestore) return;
  state = mergeDefaults(createDefaultState(), window.__pendingRestore);
  normalizeState();
  await persistState();
  window.__pendingRestore = null;
  applyTheme();
  closeModal();
  renderRoute();
  showToast('Backup restored successfully');
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCSV() {
  const measurementRows = [['Date', 'Weight_kg', 'Waist_cm', 'Note'], ...state.measurements.map((m) => [m.date, m.weightKg, m.waistCm ?? '', m.note || ''])];
  const dailyRows = [['Date', 'Workout_Completed', 'Workout_Minutes', 'RPE', 'Water_mL', 'Sleep_Hours', 'Steps', 'Protein_Servings', 'Vegetable_Servings', 'Fruit_Servings', 'Daily_Score'], ...Object.keys(state.days).sort().map((date) => {
    const day = state.days[date];
    return [date, day.workout?.completedAt ? 'Yes' : 'No', round(Number(day.workout?.elapsedSec || 0) / 60, 1), day.workout?.rpe ?? '', day.waterMl || 0, day.sleepHours ?? '', day.steps ?? '', day.nutrition?.proteinServings || 0, day.nutrition?.vegetableServings || 0, day.nutrition?.fruitServings || 0, dailyScore(day)];
  })];
  const content = `MEASUREMENTS\n${measurementRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n\nDAILY TRACKING\n${dailyRows.map((row) => row.map(csvEscape).join(',')).join('\n')}`;
  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), `transform-pro-report-${localISO()}.csv`);
  showToast('CSV report created');
}

async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    showToast('Persistent storage request is not supported on this browser');
    return;
  }
  try {
    const granted = await navigator.storage.persist();
    showToast(granted ? 'Offline storage is marked persistent' : 'Browser kept the default storage policy');
  } catch {
    showToast('Could not change the storage policy');
  }
}

function showPrivacyInfo() {
  openModal(`
    <div class="modal-head"><div><h2 id="modalTitle">Privacy information</h2><p>How Transform Pro handles your data.</p></div><button class="icon-button" type="button" data-action="close-modal">${icon('close')}</button></div>
    <div class="notice">${icon('shield')}<div><strong>Local records:</strong> weight, waist, workouts, meals, water, sleep, steps and settings are stored on this device in the browser’s app storage.</div></div>
    <div class="notice" style="margin-top:10px">${icon('wifi')}<div><strong>GitHub Pages:</strong> GitHub hosts the public HTML, CSS, JavaScript and icon files. Your entries are not automatically uploaded to the repository.</div></div>
    <div class="notice warning" style="margin-top:10px">${icon('info')}<div><strong>Backups:</strong> exported files contain your personal fitness records. Keep them private and store them securely.</div></div>
    <button class="button full" type="button" data-action="close-modal" style="margin-top:14px">Close</button>
  `);
}

function installGuide() {
  openModal(`
    <div class="modal-head"><div><h2 id="modalTitle">Install on iPhone</h2><p>Use Safari for the most direct Home Screen installation.</p></div><button class="icon-button" type="button" data-action="close-modal">${icon('close')}</button></div>
    <ol class="list-clean"><li>Open this app URL in Safari.</li><li>Tap the Safari <strong>Share</strong> button.</li><li>Select <strong>Add to Home Screen</strong>.</li><li>Keep the name “Transform Pro” and tap <strong>Add</strong>.</li><li>Launch the green Transform Pro icon from your Home Screen.</li></ol>
    <button class="button full" type="button" data-action="close-modal" style="margin-top:14px">Understood</button>
  `);
}

function aboutApp() {
  openModal(`
    <div class="modal-head"><div><h2 id="modalTitle">Transform Pro</h2><p>Version ${APP_VERSION}</p></div><button class="icon-button" type="button" data-action="close-modal">${icon('close')}</button></div>
    <p class="small muted">A private, offline-first body transformation app built for your 12-week beginner home-training plan, two 5 kg dumbbells and 45-minute evening sessions.</p>
    <div class="kpi-row"><span>App storage</span><strong>${storageMode === 'indexedDB' ? 'IndexedDB' : 'Local storage fallback'}</strong></div>
    <div class="kpi-row"><span>Offline support</span><strong>Service worker cache</strong></div>
    <div class="kpi-row"><span>Installed mode</span><strong>${isStandalone() ? 'Yes' : 'No'}</strong></div>
    <div class="notice warning" style="margin-top:12px">${icon('info')}<div>This app provides general fitness support and does not diagnose or treat medical conditions.</div></div>
    <button class="button full" type="button" data-action="close-modal" style="margin-top:14px">Close</button>
  `);
}

async function shareProgress() {
  const current = getCurrentMeasurement();
  const lost = round(Number(state.profile.startWeightKg) - Number(current.weightKg), 1);
  const week = weeklySummary();
  const text = `Transform Pro update: ${current.weightKg} kg (${lost >= 0 ? lost + ' kg down' : Math.abs(lost) + ' kg above start'}), ${week.workouts} workouts this week, ${week.score}% execution score.`;
  try {
    if (navigator.share) await navigator.share({ title: 'My Transformation Progress', text });
    else {
      await navigator.clipboard.writeText(text);
      showToast('Progress summary copied');
    }
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Could not share the summary');
  }
}

function resetApp() {
  confirmModal('Erase all app data?', 'This removes every local measurement, workout and setting. Create a backup before continuing.', 'Erase everything', 'confirm-reset', true);
}

async function confirmReset() {
  state = createDefaultState();
  await persistState();
  applyTheme();
  closeModal();
  setRoute('home');
  showToast('Local app data reset');
}

function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function checkForUpdate() {
  if (!swRegistration) {
    showToast('Service worker is not ready yet');
    return;
  }
  try {
    await swRegistration.update();
    if (swRegistration.waiting) showUpdateBanner();
    else showToast('Update check completed');
  } catch {
    showToast('Could not check for updates while offline');
  }
}

function showUpdateBanner() {
  $('#updateBanner').hidden = false;
}

function applyUpdate() {
  if (!swRegistration?.waiting) {
    location.reload();
    return;
  }
  reloadForUpdate = true;
  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js');
    if (swRegistration.waiting) showUpdateBanner();
    swRegistration.addEventListener('updatefound', () => {
      const worker = swRegistration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadForUpdate) location.reload();
    });
  } catch { /* app still works online without service worker */ }
}

function bindEvents() {
  document.addEventListener('click', async (event) => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      setRoute(routeButton.dataset.route);
      return;
    }
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'go-workout') setRoute('workout');
    else if (action === 'go-nutrition') setRoute('nutrition');
    else if (action === 'open-checkin') openDailyCheckin();
    else if (action === 'quick-water') { const day = getDay(); day.waterMl = clamp(day.waterMl + 250, 0, 10000); await persistState(); renderHome(); showToast('+250 mL water'); }
    else if (action === 'show-connection') showToast(navigator.onLine ? 'Online — app updates can download' : 'Offline — cached app and local records remain available');
    else if (action === 'start-workout') await startWorkout();
    else if (action === 'pause-workout') await pauseWorkout();
    else if (action === 'complete-workout') openCompleteWorkout();
    else if (action === 'repeat-workout') await repeatWorkout();
    else if (action === 'confirm-repeat') await confirmRepeatWorkout();
    else if (action === 'toggle-set') {
      const day = getDay();
      const exerciseId = target.dataset.exercise;
      const setIndex = Number(target.dataset.set);
      if (!Array.isArray(day.workout.completedSets[exerciseId])) day.workout.completedSets[exerciseId] = [];
      day.workout.completedSets[exerciseId][setIndex] = !day.workout.completedSets[exerciseId][setIndex];
      await persistState();
      renderWorkout();
    }
    else if (action === 'exercise-info') showExerciseInfo(target.dataset.exercise);
    else if (action === 'start-rest') startRestTimer(Number(target.dataset.seconds));
    else if (action === 'cancel-rest') cancelRestTimer();
    else if (action === 'set-readiness') {
      const field = target.dataset.field;
      if (field.startsWith('modal-')) {
        const group = target.closest('.scale-buttons');
        $$('button', group).forEach((button) => button.classList.toggle('active', button === target));
      } else {
        const day = getDay();
        day[field] = Number(target.dataset.value);
        await persistState();
        renderWorkout();
      }
    }
    else if (action === 'select-rpe') {
      $$('#completeWorkoutForm .scale-buttons button').forEach((button) => button.classList.toggle('active', button === target));
      $('#selectedRpe').value = target.dataset.value;
    }
    else if (action === 'water-delta') {
      const day = getDay();
      day.waterMl = clamp(day.waterMl + Number(target.dataset.delta), 0, 10000);
      await persistState();
      renderNutrition();
    }
    else if (action === 'nutrition-delta') {
      const day = getDay();
      const field = target.dataset.field;
      day.nutrition[field] = clamp(Number(day.nutrition[field] || 0) + Number(target.dataset.delta), 0, 20);
      await persistState();
      renderNutrition();
    }
    else if (action === 'toggle-meal') {
      const day = getDay();
      const meal = target.dataset.meal;
      day.nutrition.meals[meal] = !day.nutrition.meals[meal];
      await persistState();
      renderNutrition();
    }
    else if (action === 'toggle-nutrition-habit') {
      const day = getDay();
      const field = target.dataset.field;
      day.nutrition.habits[field] = !day.nutrition.habits[field];
      await persistState();
      renderNutrition();
    }
    else if (action === 'chart-metric') {
      state.ui.chartMetric = target.dataset.metric;
      await persistState();
      renderProgress();
    }
    else if (action === 'delete-measurement') await deleteMeasurement(target.dataset.id);
    else if (action === 'confirm-delete-measurement') await confirmDeleteMeasurement();
    else if (action === 'share-progress') await shareProgress();
    else if (action === 'edit-profile') openProfileEditor();
    else if (action === 'set-theme') { state.settings.theme = target.dataset.theme; await persistState(); applyTheme(); renderSettings(); }
    else if (action === 'export-backup') await exportBackup();
    else if (action === 'restore-backup') $('#restoreInput').click();
    else if (action === 'confirm-restore') await confirmRestore();
    else if (action === 'export-csv') exportCSV();
    else if (action === 'protect-storage') await requestPersistentStorage();
    else if (action === 'privacy-info') showPrivacyInfo();
    else if (action === 'install-guide') installGuide();
    else if (action === 'check-update') await checkForUpdate();
    else if (action === 'about-app') aboutApp();
    else if (action === 'reset-app') resetApp();
    else if (action === 'confirm-reset') await confirmReset();
    else if (action === 'close-modal') closeModal();
    else if (action === 'apply-update') applyUpdate();
  });

  document.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === 'measurementForm') await saveMeasurement(form);
    else if (form.id === 'checkinForm') {
      const day = getDay();
      const data = new FormData(form);
      const sleepRaw = String(data.get('sleep') || '').trim();
      const stepsRaw = String(data.get('steps') || '').trim();
      const sleep = sleepRaw ? Number(sleepRaw) : null;
      const steps = stepsRaw ? Number(stepsRaw) : null;
      if ((sleep !== null && (!Number.isFinite(sleep) || sleep < 0 || sleep > 16)) || (steps !== null && (!Number.isFinite(steps) || steps < 0 || steps > 100000))) {
        showToast('Enter valid sleep and step values'); return;
      }
      day.sleepHours = sleep === null ? null : round(sleep, 1);
      day.steps = steps === null ? null : Math.round(steps);
      const energyActive = $('[data-field="modal-energy"].active', form);
      const sorenessActive = $('[data-field="modal-soreness"].active', form);
      if (energyActive) day.energy = Number(energyActive.dataset.value);
      if (sorenessActive) day.soreness = Number(sorenessActive.dataset.value);
      await persistState(); closeModal(); renderRoute(); showToast('Daily check-in saved');
    }
    else if (form.id === 'completeWorkoutForm') await finishWorkout($('#selectedRpe').value, $('#completeNotes').value);
    else if (form.id === 'profileForm') {
      const data = new FormData(form);
      const age = Number(data.get('age'));
      const height = Number(data.get('height'));
      const startWeight = Number(data.get('startWeight'));
      const startWaistRaw = String(data.get('startWaist') || '').trim();
      const startWaist = startWaistRaw ? Number(startWaistRaw) : null;
      const minutes = Number(data.get('minutes'));
      if (!String(data.get('name')).trim() || !Number.isFinite(age) || !Number.isFinite(height) || !Number.isFinite(startWeight) || !Number.isFinite(minutes)) { showToast('Complete all required profile fields'); return; }
      state.profile.name = String(data.get('name')).trim();
      state.profile.age = age;
      state.profile.heightCm = height;
      state.profile.startWeightKg = round(startWeight, 1);
      state.profile.startWaistCm = startWaist === null ? null : round(startWaist, 1);
      state.profile.workoutMinutes = minutes;
      state.profile.dietType = String(data.get('diet'));
      await persistState(); closeModal(); updateHeader(); renderSettings(); showToast('Profile updated');
    }
    else if (form.id === 'goalsForm') {
      const data = new FormData(form);
      const goalWeight = Number(data.get('goalWeight'));
      const waterGoal = Number(data.get('waterGoal'));
      const stepGoal = Number(data.get('stepGoal'));
      const programStart = String(data.get('programStart'));
      if (!Number.isFinite(goalWeight) || !Number.isFinite(waterGoal) || !Number.isFinite(stepGoal) || !programStart) { showToast('Enter valid goal settings'); return; }
      state.profile.goalWeightKg = round(goalWeight, 1);
      state.profile.programStart = programStart;
      state.settings.waterGoalMl = Math.round(waterGoal);
      state.settings.stepGoal = Math.round(stepGoal);
      await persistState(); renderSettings(); updateHeader(); showToast('Goals and program updated');
    }
  });

  document.addEventListener('change', async (event) => {
    if (event.target.id === 'restoreInput') restoreBackupFile(event.target.files?.[0]);
    if (event.target.id === 'workoutNotes') {
      getDay().workout.notes = event.target.value.trim();
      await persistState();
      showToast('Workout note saved');
    }
  });

  $('#modalBackdrop').addEventListener('click', (event) => { if (event.target === $('#modalBackdrop')) closeModal(); });
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  window.addEventListener('hashchange', () => setRoute(location.hash.replace('#', '') || 'home', false));
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && getDay().workout.startedAt) await requestWakeLock();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (state.settings.theme === 'system') applyTheme(); });
}

async function init() {
  bindEvents();
  await loadState();
  applyTheme();
  const route = location.hash.replace('#', '') || new URLSearchParams(location.search).get('view') || 'home';
  setRoute(route, false);
  await registerServiceWorker();
  setTimeout(() => $('#splash').classList.add('is-hidden'), 250);
}

init().catch((error) => {
  console.error(error);
  $('#splash').classList.add('is-hidden');
  showToast('The app could not initialize. Reload and try again.', 5000);
});
