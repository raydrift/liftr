const DAY_KEY_PATTERN = /^[a-z0-9-]+$/;
const DAY_KEY_MAX_LEN = 50;

const VALID_DAY_TYPES = new Set([
  "PUSH", "PULL", "LEGS", "UPPER", "LOWER", "FULL",
  "FUNCTIONAL", "MOBILITY", "CONDITIONING", "YOGA", "HYBRID", "CUSTOM"
]);

const MAX_EXERCISES = 20;
const MAX_SETS_PER_EXERCISE = 10;
const MAX_TEXT_LENGTH = 120;

function validateSessionPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Request body must be an object"] };
  }

  // dayKey: flexible slug (no longer locked to push1/pull1/legs/push2/pull2)
  if (typeof body.dayKey !== "string" || !DAY_KEY_PATTERN.test(body.dayKey) || body.dayKey.length > DAY_KEY_MAX_LEN) {
    errors.push("dayKey must be a lowercase alphanumeric slug (max 50 chars)");
  }

  if (body.dayType !== undefined && !VALID_DAY_TYPES.has(body.dayType)) {
    errors.push(`dayType must be one of: ${[...VALID_DAY_TYPES].join(", ")}`);
  }

  if (body.date !== undefined && Number.isNaN(Date.parse(body.date))) {
    errors.push("date must be a valid ISO date string");
  }

  // Session timing fields (optional)
  if (body.sessionStartedAt !== undefined && Number.isNaN(Date.parse(body.sessionStartedAt))) {
    errors.push("sessionStartedAt must be a valid ISO date string");
  }
  if (body.sessionEndedAt !== undefined && Number.isNaN(Date.parse(body.sessionEndedAt))) {
    errors.push("sessionEndedAt must be a valid ISO date string");
  }
  if (body.sessionDurationSec !== undefined) {
    const d = Number(body.sessionDurationSec);
    if (!Number.isFinite(d) || d < 0 || d > 86400) {
      errors.push("sessionDurationSec must be a number between 0 and 86400");
    }
  }

  // Skipped exercises (optional array of strings)
  if (body.skippedExercises !== undefined) {
    if (!Array.isArray(body.skippedExercises)) {
      errors.push("skippedExercises must be an array");
    } else if (body.skippedExercises.some(s => typeof s !== "string")) {
      errors.push("skippedExercises entries must be strings");
    }
  }

  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    errors.push("exercises must be a non-empty array");
  } else if (body.exercises.length > MAX_EXERCISES) {
    errors.push(`exercises cannot exceed ${MAX_EXERCISES} items`);
  }

  const exercises = [];
  if (Array.isArray(body.exercises)) {
    body.exercises.forEach((exercise, exerciseIndex) => {
      if (!exercise || typeof exercise !== "object") {
        errors.push(`exercises[${exerciseIndex}] must be an object`);
        return;
      }

      const name = cleanText(exercise.name);
      if (!name) {
        errors.push(`exercises[${exerciseIndex}].name is required`);
      }

      if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
        errors.push(`exercises[${exerciseIndex}].sets must be a non-empty array`);
        return;
      }

      if (exercise.sets.length > MAX_SETS_PER_EXERCISE) {
        errors.push(`exercises[${exerciseIndex}].sets cannot exceed ${MAX_SETS_PER_EXERCISE} items`);
      }

      const sets = [];
      exercise.sets.forEach((set, setIndex) => {
        if (!set || typeof set !== "object") {
          errors.push(`exercises[${exerciseIndex}].sets[${setIndex}] must be an object`);
          return;
        }

        const weight = Number(set.weight);
        const reps = Number(set.reps);

        if (!Number.isFinite(weight) || weight < 0 || weight > 1000) {
          errors.push(`exercises[${exerciseIndex}].sets[${setIndex}].weight must be a number between 0 and 1000`);
        }

        if (!Number.isInteger(reps) || reps <= 0 || reps > 100) {
          errors.push(`exercises[${exerciseIndex}].sets[${setIndex}].reps must be an integer between 1 and 100`);
        }

        // Optional per-set fields
        if (set.rpe !== undefined) {
          const rpe = Number(set.rpe);
          if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) {
            errors.push(`exercises[${exerciseIndex}].sets[${setIndex}].rpe must be 1-10`);
          }
        }
        if (set.restActualSec !== undefined) {
          const rest = Number(set.restActualSec);
          if (!Number.isFinite(rest) || rest < 0 || rest > 3600) {
            errors.push(`exercises[${exerciseIndex}].sets[${setIndex}].restActualSec must be 0-3600`);
          }
        }

        if (Number.isFinite(weight) && Number.isInteger(reps) && reps > 0) {
          const setData = { weight, reps };
          if (set.rpe !== undefined) setData.rpe = Number(set.rpe);
          if (set.restActualSec !== undefined) setData.restActualSec = Number(set.restActualSec);
          if (set.completedAt !== undefined) setData.completedAt = String(set.completedAt);
          sets.push(setData);
        }
      });

      if (name && sets.length) {
        exercises.push({ name, sets });
      }
    });
  }

  if (!exercises.length) {
    errors.push("At least one exercise with one positive-rep set is required");
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  if (body.rpe !== undefined) {
    const rpe = Number(body.rpe);
    if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) {
      errors.push("rpe must be an integer between 1 and 10");
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      dayKey: body.dayKey,
      dayName: cleanText(body.dayName),
      dayType: body.dayType || "",
      date: body.date || new Date().toISOString(),
      notes: cleanText(body.notes || ""),
      rpe: body.rpe ? Number(body.rpe) : 0,
      sessionStartedAt: body.sessionStartedAt || "",
      sessionEndedAt: body.sessionEndedAt || "",
      sessionDurationSec: body.sessionDurationSec ? Number(body.sessionDurationSec) : 0,
      skippedExercises: Array.isArray(body.skippedExercises) ? body.skippedExercises : [],
      exercises
    }
  };
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

function sanitizeRowKey(value) {
  const base = cleanText(value)
    .toLowerCase()
    .replace(/[\\/#?]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return base || "exercise";
}

module.exports = { cleanText, sanitizeRowKey, validateSessionPayload };
