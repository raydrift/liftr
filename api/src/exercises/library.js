'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Exercise Library — the canonical source for all exercise data
// Exercise names must match exactly what's stored in session history
// ─────────────────────────────────────────────────────────────────────────────

const EXERCISE_LIBRARY = {

  // ─── PUSH — Chest ───────────────────────────────────────────────────────────
  "db-flat-bench-press": {
    id: "db-flat-bench-press", name: "DB Flat Bench Press",
    category: "compound", modality: "strength",
    primaryMuscles: ["chest"], secondaryMuscles: ["triceps", "front-delts"],
    equipment: ["dumbbells", "flat-bench"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "8", defaultRestSec: 120,
    cues: ["Full ROM — touch chest at bottom", "Pause 1 sec at bottom", "Drive through palms", "Keep shoulder blades retracted"],
    contraindications: ["shoulder-impingement", "rotator-cuff"],
    svgAsset: "db-flat-bench-press.svg", tags: ["push", "chest", "upper-body"]
  },
  "db-incline-press": {
    id: "db-incline-press", name: "DB Incline Press",
    category: "compound", modality: "strength",
    primaryMuscles: ["upper-chest"], secondaryMuscles: ["front-delts", "triceps"],
    equipment: ["dumbbells", "incline-bench"], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "10", defaultRestSec: 90,
    cues: ["Set bench 30–45°", "Elbows at 45° to torso", "Upper chest drives the press", "Control the descent"],
    contraindications: ["shoulder-impingement"],
    svgAsset: "db-incline-press.svg", tags: ["push", "chest", "upper-body"]
  },
  "db-chest-squeeze-press": {
    id: "db-chest-squeeze-press", name: "DB Chest Squeeze Press",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["inner-chest"], secondaryMuscles: ["triceps"],
    equipment: ["dumbbells", "flat-bench"], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 75,
    cues: ["Press DBs together throughout", "Feel inner chest squeeze", "Slow 3-sec descent"],
    contraindications: [],
    svgAsset: "db-chest-squeeze-press.svg", tags: ["push", "chest", "inner-chest"]
  },
  "push-up": {
    id: "push-up", name: "Push-Up",
    category: "compound", modality: "strength",
    primaryMuscles: ["chest"], secondaryMuscles: ["triceps", "front-delts", "core"],
    equipment: [], difficulty: "beginner",
    defaultSets: 3, defaultReps: "15", defaultRestSec: 60,
    cues: ["Body straight — don't let hips sag", "Elbows at 45° not flared", "Full ROM — chest near floor"],
    contraindications: ["wrist-pain"],
    svgAsset: "push-up.svg", tags: ["push", "chest", "bodyweight", "functional"]
  },

  // ─── PUSH — Shoulders ───────────────────────────────────────────────────────
  "db-shoulder-press": {
    id: "db-shoulder-press", name: "DB Shoulder Press",
    category: "compound", modality: "strength",
    primaryMuscles: ["front-delts", "side-delts"], secondaryMuscles: ["triceps", "upper-traps"],
    equipment: ["dumbbells"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "8", defaultRestSec: 120,
    cues: ["Seated or standing", "Full press overhead — lock out", "Don't arch lower back", "Control on way down"],
    contraindications: ["shoulder-impingement", "rotator-cuff"],
    svgAsset: "db-shoulder-press.svg", tags: ["push", "shoulders", "upper-body"]
  },
  "db-arnold-press": {
    id: "db-arnold-press", name: "DB Arnold Press",
    category: "compound", modality: "hypertrophy",
    primaryMuscles: ["front-delts", "side-delts"], secondaryMuscles: ["rear-delts", "triceps"],
    equipment: ["dumbbells"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "8", defaultRestSec: 90,
    cues: ["Start palms facing you", "Rotate as you press — palms forward at top", "Hits all 3 deltoid heads", "Full ROM"],
    contraindications: ["shoulder-impingement"],
    svgAsset: "db-arnold-press.svg", tags: ["push", "shoulders", "upper-body"]
  },
  "lateral-raises": {
    id: "lateral-raises", name: "Lateral Raises",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["side-delts"], secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "beginner",
    defaultSets: 4, defaultReps: "12", defaultRestSec: 60,
    cues: ["Slight forward lean", "Lead with elbow not wrist", "3-sec negative", "Don't swing"],
    contraindications: [],
    svgAsset: "lateral-raises.svg", tags: ["push", "shoulders", "isolation"]
  },
  "db-lateral-raise-lean": {
    id: "db-lateral-raise-lean", name: "DB Lateral Raise (lean)",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["side-delts"], secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "15", defaultRestSec: 60,
    cues: ["Hold a fixed support with free hand", "Lean away — creates cable-like constant tension", "Full ROM"],
    contraindications: [],
    svgAsset: "lateral-raises.svg", tags: ["push", "shoulders", "isolation"]
  },
  "db-front-raise": {
    id: "db-front-raise", name: "DB Front Raise",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["front-delts"], secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 60,
    cues: ["Alternate arms", "Controlled — no swinging", "Thumb up or neutral grip", "Stop at shoulder height"],
    contraindications: [],
    svgAsset: "db-front-raise.svg", tags: ["push", "shoulders", "isolation"]
  },

  // ─── PUSH — Triceps ─────────────────────────────────────────────────────────
  "db-tricep-kickback": {
    id: "db-tricep-kickback", name: "DB Tricep Kickback",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["triceps"], secondaryMuscles: [],
    equipment: ["dumbbells", "flat-bench"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 60,
    cues: ["Elbow high and fixed", "Full extension at top", "Squeeze tricep at top", "Brace on bench"],
    contraindications: ["elbow-pain"],
    svgAsset: "db-tricep-kickback.svg", tags: ["push", "triceps", "isolation"]
  },
  "overhead-tricep-extension": {
    id: "overhead-tricep-extension", name: "Overhead Tricep Extension",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["triceps-long-head"], secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 75,
    cues: ["Hold one DB with both hands", "Full stretch at bottom — overhead position stretches long head", "Elbows stay in"],
    contraindications: ["elbow-pain", "shoulder-impingement"],
    svgAsset: "overhead-tricep-extension.svg", tags: ["push", "triceps", "isolation"]
  },
  "ez-bar-skullcrusher": {
    id: "ez-bar-skullcrusher", name: "EZ Bar Skullcrusher",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["triceps"], secondaryMuscles: [],
    equipment: ["ez-bar", "flat-bench"], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "10", defaultRestSec: 75,
    cues: ["Lower to forehead", "Elbows stay pointing at ceiling", "Don't flare elbows", "Controlled descent"],
    contraindications: ["elbow-pain"],
    svgAsset: "ez-bar-skullcrusher.svg", tags: ["push", "triceps", "isolation"]
  },

  // ─── PULL — Back ─────────────────────────────────────────────────────────────
  "weighted-pull-ups": {
    id: "weighted-pull-ups", name: "Weighted Pull-ups",
    category: "compound", modality: "strength",
    primaryMuscles: ["lats"], secondaryMuscles: ["biceps", "rear-delts", "rhomboids"],
    equipment: ["pull-up-bar", "weight-belt"], difficulty: "advanced",
    defaultSets: 4, defaultReps: "6", defaultRestSec: 180,
    cues: ["Dead hang start — full ROM", "Drive elbows to hips", "Chin clears bar", "Control descent — 3 sec"],
    contraindications: ["elbow-pain", "shoulder-impingement"],
    svgAsset: "weighted-pull-ups.svg", tags: ["pull", "back", "compound"]
  },
  "bodyweight-pull-ups": {
    id: "bodyweight-pull-ups", name: "Bodyweight Pull-ups",
    category: "compound", modality: "strength",
    primaryMuscles: ["lats"], secondaryMuscles: ["biceps", "rear-delts"],
    equipment: ["pull-up-bar"], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "8", defaultRestSec: 120,
    cues: ["Dead hang start", "Drive elbows down and back", "Full ROM", "Don't kip"],
    contraindications: ["shoulder-impingement"],
    svgAsset: "weighted-pull-ups.svg", tags: ["pull", "back", "bodyweight"]
  },
  "db-row-one-arm": {
    id: "db-row-one-arm", name: "DB Row (one arm)",
    category: "compound", modality: "strength",
    primaryMuscles: ["lats", "rhomboids"], secondaryMuscles: ["rear-delts", "biceps"],
    equipment: ["dumbbells", "flat-bench"], difficulty: "beginner",
    defaultSets: 4, defaultReps: "8", defaultRestSec: 90,
    cues: ["Brace on bench — flat back", "Elbow drives up and back", "Squeeze at top", "Full stretch at bottom"],
    contraindications: ["lower-back-pain"],
    svgAsset: "db-row-one-arm.svg", tags: ["pull", "back", "compound"]
  },
  "db-chest-supported-row": {
    id: "db-chest-supported-row", name: "DB Chest-Supported Row",
    category: "compound", modality: "hypertrophy",
    primaryMuscles: ["rhomboids", "mid-back"], secondaryMuscles: ["rear-delts", "biceps"],
    equipment: ["dumbbells", "incline-bench"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "10", defaultRestSec: 90,
    cues: ["Prone on incline bench — removes lower back", "Squeeze shoulder blades at top", "Full stretch at bottom"],
    contraindications: [],
    svgAsset: "db-chest-supported-row.svg", tags: ["pull", "back", "compound"]
  },
  "db-renegade-row": {
    id: "db-renegade-row", name: "DB Renegade Row",
    category: "compound", modality: "functional",
    primaryMuscles: ["lats", "rhomboids"], secondaryMuscles: ["core", "triceps", "biceps"],
    equipment: ["dumbbells"], difficulty: "advanced",
    defaultSets: 4, defaultReps: "8", defaultRestSec: 90,
    cues: ["Start in plank on DBs", "Alternate rows — keep hips square", "Core tight throughout", "Neutral spine"],
    contraindications: ["wrist-pain", "lower-back-pain"],
    svgAsset: "db-renegade-row.svg", tags: ["pull", "back", "functional", "core"]
  },
  "db-pullover": {
    id: "db-pullover", name: "DB Pullover",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["lats", "serratus"], secondaryMuscles: ["chest"],
    equipment: ["dumbbells", "flat-bench"], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 75,
    cues: ["Hold one DB with both hands", "Arc overhead — full lat stretch", "Keep slight elbow bend", "Core braced"],
    contraindications: ["shoulder-impingement"],
    svgAsset: "db-pullover.svg", tags: ["pull", "back", "lats"]
  },
  "db-rear-delt-fly": {
    id: "db-rear-delt-fly", name: "DB Rear Delt Fly",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["rear-delts"], secondaryMuscles: ["rhomboids"],
    equipment: ["dumbbells"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "15", defaultRestSec: 60,
    cues: ["Bent over — hinge at hips", "Elbows slightly bent throughout", "Lead with elbows not hands", "Squeeze at top"],
    contraindications: ["lower-back-pain"],
    svgAsset: "db-rear-delt-fly.svg", tags: ["pull", "shoulders", "rear-delts"]
  },

  // ─── PULL — Biceps ───────────────────────────────────────────────────────────
  "ez-bar-curl": {
    id: "ez-bar-curl", name: "EZ Bar Curl",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["biceps"], secondaryMuscles: ["brachialis"],
    equipment: ["ez-bar"], difficulty: "beginner",
    defaultSets: 4, defaultReps: "10", defaultRestSec: 75,
    cues: ["Control negative — 3 sec", "Supinate at top", "No swinging — elbows fixed", "Full ROM"],
    contraindications: ["elbow-pain", "wrist-pain"],
    svgAsset: "ez-bar-curl.svg", tags: ["pull", "biceps", "isolation"]
  },
  "db-hammer-curl": {
    id: "db-hammer-curl", name: "DB Hammer Curl",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["brachialis", "brachioradialis"], secondaryMuscles: ["biceps"],
    equipment: ["dumbbells"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 60,
    cues: ["Neutral grip throughout", "Hits brachialis — adds arm thickness", "Control negative"],
    contraindications: [],
    svgAsset: "db-hammer-curl.svg", tags: ["pull", "biceps", "forearms"]
  },
  "db-concentration-curl": {
    id: "db-concentration-curl", name: "DB Concentration Curl",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["biceps-peak"], secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 60,
    cues: ["Seated — elbow braced on inner thigh", "Peak contraction at top — squeeze hard", "Slow descent"],
    contraindications: [],
    svgAsset: "db-concentration-curl.svg", tags: ["pull", "biceps", "isolation"]
  },
  "ez-bar-reverse-curl": {
    id: "ez-bar-reverse-curl", name: "EZ Bar Reverse Curl",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["brachioradialis"], secondaryMuscles: ["biceps"],
    equipment: ["ez-bar"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 60,
    cues: ["Overhand grip", "Builds brachioradialis — wrist strength + forearm size", "Controlled throughout"],
    contraindications: ["wrist-pain"],
    svgAsset: "ez-bar-reverse-curl.svg", tags: ["pull", "biceps", "forearms"]
  },

  // ─── LEGS — Quads ───────────────────────────────────────────────────────────
  "db-goblet-squat": {
    id: "db-goblet-squat", name: "DB Goblet Squat",
    category: "compound", modality: "strength",
    primaryMuscles: ["quads"], secondaryMuscles: ["glutes", "core"],
    equipment: ["dumbbells"], difficulty: "beginner",
    defaultSets: 4, defaultReps: "8", defaultRestSec: 120,
    cues: ["Hold DB at chest", "Squat to full depth — don't stop at parallel", "Knees track over toes", "Drive through heels"],
    contraindications: ["knee-pain"],
    svgAsset: "db-goblet-squat.svg", tags: ["legs", "quads", "compound"]
  },
  "db-walking-lunges": {
    id: "db-walking-lunges", name: "DB Walking Lunges",
    category: "compound", modality: "strength",
    primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings", "core"],
    equipment: ["dumbbells"], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "12 per leg", defaultRestSec: 90,
    cues: ["Step far — knee stays behind toes", "Front knee tracks over foot", "Drive front heel to stand", "Upright torso"],
    contraindications: ["knee-pain"],
    svgAsset: "db-walking-lunges.svg", tags: ["legs", "quads", "functional"]
  },
  "db-sumo-squat": {
    id: "db-sumo-squat", name: "DB Sumo Squat",
    category: "compound", modality: "hypertrophy",
    primaryMuscles: ["inner-quads", "adductors"], secondaryMuscles: ["glutes"],
    equipment: ["dumbbells"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 90,
    cues: ["Wide stance — toes out 45°", "Knees push out over toes", "Hold DB between legs", "Full depth"],
    contraindications: ["hip-pain"],
    svgAsset: "db-sumo-squat.svg", tags: ["legs", "quads", "inner-thighs"]
  },
  "bulgarian-split-squat": {
    id: "bulgarian-split-squat", name: "Bulgarian Split Squat",
    category: "compound", modality: "strength",
    primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings", "core"],
    equipment: ["dumbbells", "flat-bench"], difficulty: "advanced",
    defaultSets: 3, defaultReps: "8 per leg", defaultRestSec: 120,
    cues: ["Rear foot elevated on bench", "Front foot far enough that shin is vertical", "Knee dips straight down", "Drive through heel"],
    contraindications: ["knee-pain", "hip-flexor-tightness"],
    svgAsset: "bulgarian-split-squat.svg", tags: ["legs", "quads", "unilateral", "functional"]
  },
  "step-up": {
    id: "step-up", name: "DB Step-Up",
    category: "compound", modality: "functional",
    primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings", "core"],
    equipment: ["dumbbells", "box"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "10 per leg", defaultRestSec: 75,
    cues: ["Full foot on box", "Drive through heel — don't push off back foot", "Stand tall at top", "Controlled descent"],
    contraindications: ["knee-pain"],
    svgAsset: "step-up.svg", tags: ["legs", "quads", "functional", "unilateral"]
  },

  // ─── LEGS — Hamstrings ───────────────────────────────────────────────────────
  "db-romanian-deadlift": {
    id: "db-romanian-deadlift", name: "DB Romanian Deadlift",
    category: "compound", modality: "strength",
    primaryMuscles: ["hamstrings"], secondaryMuscles: ["glutes", "lower-back"],
    equipment: ["dumbbells"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "10", defaultRestSec: 120,
    cues: ["Hinge at hips — not a squat", "Feel the hamstring stretch", "Slight knee bend", "Keep DBs close to legs", "Neutral spine always"],
    contraindications: ["lower-back-pain"],
    svgAsset: "db-romanian-deadlift.svg", tags: ["legs", "hamstrings", "compound"]
  },
  "single-leg-db-curl": {
    id: "single-leg-db-curl", name: "Single-leg DB Curl",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["hamstrings"], secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "12", defaultRestSec: 75,
    cues: ["Lie prone — hold DB between feet", "Slow negative 3 sec", "Squeeze hamstring at top", "Unilateral — fixes imbalances"],
    contraindications: ["knee-pain"],
    svgAsset: "single-leg-db-curl.svg", tags: ["legs", "hamstrings", "isolation"]
  },
  "nordic-hamstring-curl": {
    id: "nordic-hamstring-curl", name: "Nordic Hamstring Curl",
    category: "compound", modality: "strength",
    primaryMuscles: ["hamstrings"], secondaryMuscles: ["glutes"],
    equipment: [], difficulty: "advanced",
    defaultSets: 3, defaultReps: "5", defaultRestSec: 120,
    cues: ["Anchor feet — partner or fixed point", "Lower body as slow as possible", "Push up with hands to return", "Extreme hamstring lengthening strength"],
    contraindications: ["hamstring-injury"],
    svgAsset: "nordic-hamstring-curl.svg", tags: ["legs", "hamstrings", "bodyweight", "advanced"]
  },

  // ─── LEGS — Glutes & Calves ──────────────────────────────────────────────────
  "standing-calf-raises": {
    id: "standing-calf-raises", name: "Standing Calf Raises",
    category: "isolation", modality: "hypertrophy",
    primaryMuscles: ["calves-gastrocnemius"], secondaryMuscles: [],
    equipment: ["dumbbells"], difficulty: "beginner",
    defaultSets: 4, defaultReps: "15", defaultRestSec: 60,
    cues: ["Hold DBs — full ROM", "Rise up slowly — 2 sec up", "Pause at top", "Full stretch at bottom", "High reps — calves need volume"],
    contraindications: ["achilles-tendon"],
    svgAsset: "standing-calf-raises.svg", tags: ["legs", "calves", "isolation"]
  },
  "hip-thrust": {
    id: "hip-thrust", name: "DB Hip Thrust",
    category: "compound", modality: "hypertrophy",
    primaryMuscles: ["glutes"], secondaryMuscles: ["hamstrings"],
    equipment: ["dumbbells", "flat-bench"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "12", defaultRestSec: 90,
    cues: ["Upper back on bench", "DB on hip crease", "Drive hips up — squeeze glutes at top", "Chin tucked — neutral spine"],
    contraindications: [],
    svgAsset: "hip-thrust.svg", tags: ["legs", "glutes", "compound"]
  },

  // ─── CORE ────────────────────────────────────────────────────────────────────
  "plank": {
    id: "plank", name: "Plank",
    category: "isolation", modality: "strength",
    primaryMuscles: ["core", "transverse-abdominis"], secondaryMuscles: ["shoulders", "glutes"],
    equipment: [], difficulty: "beginner",
    defaultSets: 3, defaultReps: "45 sec", defaultRestSec: 60,
    cues: ["Forearms or hands — body rigid", "Don't let hips sag or rise", "Breathe steadily", "Squeeze glutes + abs"],
    contraindications: ["lower-back-pain", "shoulder-impingement"],
    svgAsset: "plank.svg", tags: ["core", "bodyweight", "stability"]
  },
  "dead-bug": {
    id: "dead-bug", name: "Dead Bug",
    category: "isolation", modality: "mobility",
    primaryMuscles: ["core", "transverse-abdominis"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 3, defaultReps: "10 per side", defaultRestSec: 60,
    cues: ["Lower back pressed into floor throughout", "Opposite arm and leg extend", "Exhale as you extend", "Core anti-extension — protects lower back"],
    contraindications: [],
    svgAsset: "dead-bug.svg", tags: ["core", "bodyweight", "stability", "rehab"]
  },
  "pallof-press": {
    id: "pallof-press", name: "Pallof Press (Band)",
    category: "isolation", modality: "functional",
    primaryMuscles: ["core", "obliques"], secondaryMuscles: ["shoulders"],
    equipment: ["resistance-bands"], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "12 per side", defaultRestSec: 60,
    cues: ["Anchor band at chest height", "Press arms out — resist rotation", "Core anti-rotation", "Stand perpendicular to anchor"],
    contraindications: [],
    svgAsset: "pallof-press.svg", tags: ["core", "functional", "anti-rotation"]
  },
  "ab-wheel-rollout": {
    id: "ab-wheel-rollout", name: "Ab Wheel Rollout",
    category: "compound", modality: "strength",
    primaryMuscles: ["core", "rectus-abdominis"], secondaryMuscles: ["lats", "shoulders"],
    equipment: ["ab-wheel"], difficulty: "advanced",
    defaultSets: 3, defaultReps: "8", defaultRestSec: 90,
    cues: ["Start from knees", "Roll out as far as control allows", "Pull back using abs + lats", "Don't let lower back sag"],
    contraindications: ["lower-back-pain"],
    svgAsset: "ab-wheel-rollout.svg", tags: ["core", "advanced"]
  },

  // ─── FUNCTIONAL / ATHLETIC ───────────────────────────────────────────────────
  "kettlebell-swing": {
    id: "kettlebell-swing", name: "Kettlebell Swing",
    category: "compound", modality: "conditioning",
    primaryMuscles: ["glutes", "hamstrings"], secondaryMuscles: ["core", "shoulders", "lats"],
    equipment: ["kettlebell"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "15", defaultRestSec: 60,
    cues: ["Hip hinge — not a squat", "Explosive hip drive propels the bell", "Hike back between legs", "Squeeze glutes at top — bell floats", "Lat engagement keeps back safe"],
    contraindications: ["lower-back-pain"],
    svgAsset: "kettlebell-swing.svg", tags: ["functional", "conditioning", "posterior-chain", "power"]
  },
  "turkish-getup": {
    id: "turkish-getup", name: "Turkish Get-Up",
    category: "compound", modality: "functional",
    primaryMuscles: ["shoulders", "core"], secondaryMuscles: ["glutes", "hips", "triceps"],
    equipment: ["kettlebell"], difficulty: "advanced",
    defaultSets: 3, defaultReps: "3 per side", defaultRestSec: 120,
    cues: ["Go slow — this is skill training", "Eye on the bell throughout", "Each position deliberate", "Builds total body stability"],
    contraindications: ["shoulder-impingement", "wrist-pain"],
    svgAsset: "turkish-getup.svg", tags: ["functional", "athletic", "stability", "advanced"]
  },
  "box-jump": {
    id: "box-jump", name: "Box Jump",
    category: "compound", modality: "power",
    primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["calves", "core"],
    equipment: ["box"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "5", defaultRestSec: 90,
    cues: ["Load hips before jumping", "Land softly — absorb impact through knees/hips", "Step down — don't jump down", "Full hip extension at top"],
    contraindications: ["knee-pain", "ankle-injury"],
    svgAsset: "box-jump.svg", tags: ["power", "legs", "athletic", "plyometric"]
  },
  "farmers-carry": {
    id: "farmers-carry", name: "Farmer's Carry",
    category: "compound", modality: "functional",
    primaryMuscles: ["forearms", "core", "traps"], secondaryMuscles: ["shoulders", "quads"],
    equipment: ["dumbbells", "kettlebell"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "30 meters", defaultRestSec: 90,
    cues: ["Stand tall — no tilting to one side", "Shoulders back and down", "Tight core", "Even, deliberate steps"],
    contraindications: [],
    svgAsset: "farmers-carry.svg", tags: ["functional", "grip", "conditioning", "whole-body"]
  },
  "battle-rope-waves": {
    id: "battle-rope-waves", name: "Battle Rope Waves",
    category: "compound", modality: "conditioning",
    primaryMuscles: ["shoulders", "core"], secondaryMuscles: ["biceps", "triceps", "legs"],
    equipment: ["battle-ropes"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "30 sec", defaultRestSec: 60,
    cues: ["Alternate arms creating waves", "Stay low — athletic position", "Core tight", "Drive from hips not just arms"],
    contraindications: ["shoulder-impingement"],
    svgAsset: "battle-rope-waves.svg", tags: ["conditioning", "functional", "upper-body"]
  },
  "medicine-ball-slam": {
    id: "medicine-ball-slam", name: "Medicine Ball Slam",
    category: "compound", modality: "power",
    primaryMuscles: ["core", "lats"], secondaryMuscles: ["shoulders", "legs"],
    equipment: ["medicine-ball"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "10", defaultRestSec: 60,
    cues: ["Raise overhead — full extension", "Slam with full force — exhale", "Hinge to pick up", "Full body power — not just arms"],
    contraindications: [],
    svgAsset: "medicine-ball-slam.svg", tags: ["power", "functional", "conditioning"]
  },
  "bear-crawl": {
    id: "bear-crawl", name: "Bear Crawl",
    category: "compound", modality: "functional",
    primaryMuscles: ["core", "shoulders"], secondaryMuscles: ["quads", "glutes"],
    equipment: [], difficulty: "beginner",
    defaultSets: 3, defaultReps: "20 meters", defaultRestSec: 60,
    cues: ["Knees hover 2 inches off ground", "Opposite hand and foot move together", "Neutral spine", "Slow and controlled"],
    contraindications: ["wrist-pain"],
    svgAsset: "bear-crawl.svg", tags: ["functional", "bodyweight", "core", "conditioning"]
  },
  "sled-push": {
    id: "sled-push", name: "Sled Push",
    category: "compound", modality: "conditioning",
    primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["core", "shoulders"],
    equipment: ["sled"], difficulty: "intermediate",
    defaultSets: 4, defaultReps: "20 meters", defaultRestSec: 120,
    cues: ["Low body position — forward lean", "Drive through ground", "Arms push handles", "Full hip extension"],
    contraindications: ["lower-back-pain"],
    svgAsset: "sled-push.svg", tags: ["conditioning", "legs", "athletic"]
  },

  // ─── CONDITIONING ────────────────────────────────────────────────────────────
  "burpee": {
    id: "burpee", name: "Burpee",
    category: "compound", modality: "conditioning",
    primaryMuscles: ["whole-body"], secondaryMuscles: [],
    equipment: [], difficulty: "intermediate",
    defaultSets: 3, defaultReps: "10", defaultRestSec: 60,
    cues: ["Jump → squat → plank → push-up → jump", "Keep core tight in plank phase", "Explosive jump at top", "Land softly"],
    contraindications: ["wrist-pain", "knee-pain"],
    svgAsset: "burpee.svg", tags: ["conditioning", "bodyweight", "full-body"]
  },
  "mountain-climbers": {
    id: "mountain-climbers", name: "Mountain Climbers",
    category: "compound", modality: "conditioning",
    primaryMuscles: ["core", "hip-flexors"], secondaryMuscles: ["shoulders", "quads"],
    equipment: [], difficulty: "beginner",
    defaultSets: 3, defaultReps: "30 sec", defaultRestSec: 45,
    cues: ["High plank position", "Drive knees to chest alternately", "Hips level — don't bounce", "Fast or slow for different stimuli"],
    contraindications: ["wrist-pain", "lower-back-pain"],
    svgAsset: "mountain-climbers.svg", tags: ["conditioning", "core", "bodyweight"]
  },
  "jump-rope": {
    id: "jump-rope", name: "Jump Rope",
    category: "compound", modality: "conditioning",
    primaryMuscles: ["calves", "shoulders"], secondaryMuscles: ["core", "forearms"],
    equipment: ["jump-rope"], difficulty: "beginner",
    defaultSets: 5, defaultReps: "1 min", defaultRestSec: 30,
    cues: ["Small jumps — just enough clearance", "Wrists rotate rope — not arms", "Land on balls of feet", "Eyes forward"],
    contraindications: ["ankle-injury", "knee-pain"],
    svgAsset: "jump-rope.svg", tags: ["conditioning", "cardio", "coordination"]
  },
  "sprint-intervals": {
    id: "sprint-intervals", name: "Sprint Intervals",
    category: "compound", modality: "conditioning",
    primaryMuscles: ["quads", "hamstrings", "glutes"], secondaryMuscles: ["core", "calves"],
    equipment: [], difficulty: "intermediate",
    defaultSets: 6, defaultReps: "20 sec sprint", defaultRestSec: 40,
    cues: ["Max effort for full duration", "Drive arms — arms drive legs", "Land midfoot not heel", "Full recovery between efforts"],
    contraindications: ["knee-pain", "hamstring-injury"],
    svgAsset: "sprint-intervals.svg", tags: ["conditioning", "cardio", "athletic", "legs"]
  },

  // ─── MOBILITY ────────────────────────────────────────────────────────────────
  "band-pull-apart": {
    id: "band-pull-apart", name: "Band Pull-Apart",
    category: "isolation", modality: "mobility",
    primaryMuscles: ["rear-delts", "rhomboids"], secondaryMuscles: ["external-rotators"],
    equipment: ["resistance-bands"], difficulty: "beginner",
    defaultSets: 3, defaultReps: "20", defaultRestSec: 30,
    cues: ["Arms straight throughout", "Pull band apart at chest height", "Squeeze shoulder blades together", "Great pre-workout shoulder activation"],
    contraindications: [],
    svgAsset: "band-pull-apart.svg", tags: ["mobility", "shoulders", "warmup", "rehab"]
  },
  "hip-flexor-stretch": {
    id: "hip-flexor-stretch", name: "Hip Flexor Stretch (Kneeling)",
    category: "isolation", modality: "mobility",
    primaryMuscles: ["hip-flexors", "psoas"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "45 sec per side", defaultRestSec: 15,
    cues: ["Kneeling lunge position", "Posterior pelvic tilt — tuck pelvis under", "Feel stretch in front of rear hip", "Don't arch lower back"],
    contraindications: ["knee-pain"],
    svgAsset: "hip-flexor-stretch.svg", tags: ["mobility", "hips", "cooldown", "warmup"]
  },
  "thoracic-rotation": {
    id: "thoracic-rotation", name: "Thoracic Rotation",
    category: "isolation", modality: "mobility",
    primaryMuscles: ["thoracic-spine", "obliques"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "10 per side", defaultRestSec: 15,
    cues: ["Side-lying or quadruped", "Rotate upper back — not lower", "Breathe into the rotation", "Improves overhead pressing and rowing"],
    contraindications: [],
    svgAsset: "thoracic-rotation.svg", tags: ["mobility", "spine", "warmup"]
  },
  "ankle-dorsiflexion": {
    id: "ankle-dorsiflexion", name: "Ankle Dorsiflexion Stretch",
    category: "isolation", modality: "mobility",
    primaryMuscles: ["calves", "ankle"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "30 sec per side", defaultRestSec: 15,
    cues: ["Knee to wall drill", "Heel stays flat", "Inch foot back until heel barely lifts", "Critical for squat depth"],
    contraindications: ["achilles-tendon"],
    svgAsset: "ankle-dorsiflexion.svg", tags: ["mobility", "ankles", "squat-prep", "warmup"]
  },
  "world-greatest-stretch": {
    id: "world-greatest-stretch", name: "World's Greatest Stretch",
    category: "compound", modality: "mobility",
    primaryMuscles: ["hip-flexors", "thoracic-spine", "hamstrings"], secondaryMuscles: ["glutes", "groin"],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "5 per side", defaultRestSec: 15,
    cues: ["Lunge with hand inside foot", "Rotate arm to ceiling — follow with eyes", "Hold each position 2 sec", "Full-body mobility in one movement"],
    contraindications: [],
    svgAsset: "world-greatest-stretch.svg", tags: ["mobility", "warmup", "full-body", "flexibility"]
  },
  "cat-cow": {
    id: "cat-cow", name: "Cat-Cow",
    category: "isolation", modality: "mobility",
    primaryMuscles: ["spine", "core"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "10 cycles", defaultRestSec: 0,
    cues: ["On hands and knees", "Cat: arch spine up — tuck pelvis", "Cow: arch spine down — lift chest", "Sync with breath — 2 sec each"],
    contraindications: ["wrist-pain"],
    svgAsset: "cat-cow.svg", tags: ["mobility", "warmup", "spine", "yoga"]
  },
  "arm-circles": {
    id: "arm-circles", name: "Arm Circles",
    category: "isolation", modality: "mobility",
    primaryMuscles: ["shoulders"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "15 each direction", defaultRestSec: 0,
    cues: ["Small to large circles", "Both forward and backward", "Shoulder capsule warmup", "Move through full range"],
    contraindications: [],
    svgAsset: "arm-circles.svg", tags: ["mobility", "warmup", "shoulders"]
  },
  "inchworm": {
    id: "inchworm", name: "Inchworm",
    category: "compound", modality: "mobility",
    primaryMuscles: ["hamstrings", "core", "shoulders"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "8", defaultRestSec: 30,
    cues: ["Hinge — walk hands out to plank", "Hold 2 sec in plank", "Walk feet to hands", "Full body activation"],
    contraindications: ["wrist-pain", "lower-back-pain"],
    svgAsset: "inchworm.svg", tags: ["mobility", "warmup", "full-body"]
  },
  "hip-circles": {
    id: "hip-circles", name: "Hip Circles",
    category: "isolation", modality: "mobility",
    primaryMuscles: ["hip-flexors", "glutes", "hip-external-rotators"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "10 per direction", defaultRestSec: 0,
    cues: ["Standing — draw large circles with hip", "Or on all fours — leg circles", "Both clockwise and counter-clockwise", "Opens hip capsule"],
    contraindications: ["hip-pain"],
    svgAsset: "hip-circles.svg", tags: ["mobility", "hips", "warmup"]
  },
  "glute-bridge": {
    id: "glute-bridge", name: "Glute Bridge",
    category: "compound", modality: "mobility",
    primaryMuscles: ["glutes"], secondaryMuscles: ["hamstrings", "core"],
    equipment: [], difficulty: "beginner",
    defaultSets: 3, defaultReps: "15", defaultRestSec: 45,
    cues: ["Feet flat on floor", "Drive hips up — squeeze glutes hard at top", "Pause 2 sec at top", "Great warmup or rehab exercise"],
    contraindications: [],
    svgAsset: "glute-bridge.svg", tags: ["mobility", "glutes", "warmup", "rehab"]
  },

  // ─── YOGA / RECOVERY ─────────────────────────────────────────────────────────
  "downward-dog": {
    id: "downward-dog", name: "Downward Dog",
    category: "compound", modality: "yoga",
    primaryMuscles: ["hamstrings", "calves", "shoulders"], secondaryMuscles: ["lats"],
    equipment: [], difficulty: "beginner",
    defaultSets: 1, defaultReps: "60 sec", defaultRestSec: 0,
    cues: ["Inverted V shape", "Heels press toward floor", "Straight arms and spine", "Head relaxed between arms"],
    contraindications: ["wrist-pain"],
    svgAsset: "downward-dog.svg", tags: ["yoga", "cooldown", "flexibility", "full-body"]
  },
  "pigeon-pose": {
    id: "pigeon-pose", name: "Pigeon Pose",
    category: "isolation", modality: "yoga",
    primaryMuscles: ["hip-external-rotators", "piriformis", "glutes"], secondaryMuscles: [],
    equipment: [], difficulty: "intermediate",
    defaultSets: 1, defaultReps: "60 sec per side", defaultRestSec: 0,
    cues: ["Front shin parallel to mat", "Sink hips toward floor", "Can fold forward — deepen with breath", "Hold at edge of discomfort — not pain"],
    contraindications: ["hip-pain", "knee-pain"],
    svgAsset: "pigeon-pose.svg", tags: ["yoga", "cooldown", "hips", "flexibility"]
  },
  "childs-pose": {
    id: "childs-pose", name: "Child's Pose",
    category: "isolation", modality: "yoga",
    primaryMuscles: ["lower-back", "hips", "shoulders"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 1, defaultReps: "60 sec", defaultRestSec: 0,
    cues: ["Hips back toward heels", "Arms extended forward", "Breathe into lower back", "Rest and decompress"],
    contraindications: ["knee-pain"],
    svgAsset: "childs-pose.svg", tags: ["yoga", "cooldown", "recovery", "back"]
  },
  "cobra-stretch": {
    id: "cobra-stretch", name: "Cobra Stretch",
    category: "isolation", modality: "yoga",
    primaryMuscles: ["chest", "abs", "hip-flexors"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "30 sec", defaultRestSec: 15,
    cues: ["Prone — press palms into floor", "Lift chest — keep hips on floor", "Look forward or up", "Counteracts hunching"],
    contraindications: ["lower-back-pain"],
    svgAsset: "cobra-stretch.svg", tags: ["yoga", "cooldown", "chest", "spine"]
  },
  "seated-hamstring-stretch": {
    id: "seated-hamstring-stretch", name: "Seated Hamstring Stretch",
    category: "isolation", modality: "yoga",
    primaryMuscles: ["hamstrings"], secondaryMuscles: ["calves"],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "45 sec per leg", defaultRestSec: 15,
    cues: ["Legs extended — reach for toes", "Hinge from hips not rounding back", "Hold comfortably — breathe", "Essential post-leg-day"],
    contraindications: [],
    svgAsset: "seated-hamstring-stretch.svg", tags: ["yoga", "cooldown", "hamstrings", "flexibility"]
  },
  "chest-stretch": {
    id: "chest-stretch", name: "Chest & Front Delt Stretch",
    category: "isolation", modality: "yoga",
    primaryMuscles: ["chest", "front-delts"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "30 sec per side", defaultRestSec: 0,
    cues: ["Hand on wall — arm at 90°", "Rotate body away", "Feel stretch across chest", "Essential post-push-day"],
    contraindications: [],
    svgAsset: "chest-stretch.svg", tags: ["yoga", "cooldown", "chest", "warmup"]
  },
  "lat-stretch": {
    id: "lat-stretch", name: "Lat Stretch (hanging or doorway)",
    category: "isolation", modality: "yoga",
    primaryMuscles: ["lats"], secondaryMuscles: ["shoulders"],
    equipment: ["pull-up-bar"], difficulty: "beginner",
    defaultSets: 2, defaultReps: "30 sec per side", defaultRestSec: 0,
    cues: ["Hang from bar one-handed", "Let body rotate open", "Feel full lat lengthening", "Essential post-pull-day"],
    contraindications: ["shoulder-impingement"],
    svgAsset: "lat-stretch.svg", tags: ["yoga", "cooldown", "lats", "back"]
  },
  "quad-stretch": {
    id: "quad-stretch", name: "Standing Quad Stretch",
    category: "isolation", modality: "yoga",
    primaryMuscles: ["quads", "hip-flexors"], secondaryMuscles: [],
    equipment: [], difficulty: "beginner",
    defaultSets: 2, defaultReps: "30 sec per side", defaultRestSec: 0,
    cues: ["Stand on one foot — pull other heel to glute", "Keep knees together", "Tuck pelvis for deeper stretch", "Essential post-leg-day"],
    contraindications: ["knee-pain"],
    svgAsset: "quad-stretch.svg", tags: ["yoga", "cooldown", "quads", "flexibility"]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Lookup utilities
// ─────────────────────────────────────────────────────────────────────────────

function getExerciseById(id) {
  return EXERCISE_LIBRARY[id] || null;
}

function getExerciseByName(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  return Object.values(EXERCISE_LIBRARY).find(e => e.name.toLowerCase() === lower) || null;
}

function searchExercises({ muscle, modality, equipment, category, difficulty, tag } = {}) {
  return Object.values(EXERCISE_LIBRARY).filter(ex => {
    if (muscle) {
      const allMuscles = [...ex.primaryMuscles, ...ex.secondaryMuscles];
      if (!allMuscles.some(m => m.includes(muscle.toLowerCase()))) return false;
    }
    if (modality && ex.modality !== modality) return false;
    if (category && ex.category !== category) return false;
    if (difficulty && ex.difficulty !== difficulty) return false;
    if (equipment && equipment.length) {
      if (!equipment.some(eq => ex.equipment.includes(eq))) return false;
    }
    if (tag && !ex.tags.includes(tag)) return false;
    return true;
  });
}

function getExercisesForMuscle(muscle) {
  if (!muscle) return [];
  const lower = muscle.toLowerCase();
  return Object.values(EXERCISE_LIBRARY).filter(ex =>
    ex.primaryMuscles.some(m => m.includes(lower)) ||
    ex.secondaryMuscles.some(m => m.includes(lower))
  );
}

function getCompoundFirst(exercises) {
  const ORDER = { compound: 0, functional: 1, isolation: 2, mobility: 3, conditioning: 4 };
  return [...exercises].sort((a, b) => (ORDER[a.category] ?? 5) - (ORDER[b.category] ?? 5));
}

// Return a condensed version suitable for AI prompts (reduces token count)
function getLibrarySummaryForPrompt() {
  const byMuscle = {};
  Object.values(EXERCISE_LIBRARY).forEach(ex => {
    ex.primaryMuscles.forEach(m => {
      if (!byMuscle[m]) byMuscle[m] = [];
      byMuscle[m].push(`${ex.id}(${ex.modality})`);
    });
  });
  return byMuscle;
}

module.exports = {
  EXERCISE_LIBRARY,
  getExerciseById,
  getExerciseByName,
  searchExercises,
  getExercisesForMuscle,
  getCompoundFirst,
  getLibrarySummaryForPrompt
};
