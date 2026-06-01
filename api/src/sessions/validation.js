const VALID_DAY_KEYS = new Set(["push1", "pull1", "legs", "push2", "pull2"]);
const VALID_DAY_TYPES = new Set(["PUSH", "PULL", "LEGS"]);
const MAX_EXERCISES = 20;
const MAX_SETS_PER_EXERCISE = 10;
const MAX_TEXT_LENGTH = 120;

function validateSessionPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Request body must be an object"] };
  }

  if (!VALID_DAY_KEYS.has(body.dayKey)) {
    errors.push("dayKey must be one of: push1, pull1, legs, push2, pull2");
  }

  if (body.dayType !== undefined && !VALID_DAY_TYPES.has(body.dayType)) {
    errors.push("dayType must be one of: PUSH, PULL, LEGS");
  }

  if (body.date !== undefined && Number.isNaN(Date.parse(body.date))) {
    errors.push("date must be a valid ISO date string");
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

        if (Number.isFinite(weight) && Number.isInteger(reps) && reps > 0) {
          sets.push({ weight, reps });
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

  return {
    ok: true,
    value: {
      dayKey: body.dayKey,
      dayName: cleanText(body.dayName),
      dayType: body.dayType || "",
      date: body.date || new Date().toISOString(),
      notes: cleanText(body.notes || ""),
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
