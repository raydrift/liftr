// src/sessions/index.js
// GET  /api/sessions  — list all workout sessions
// POST /api/sessions  — save a new session

const { getSessionsTable, getExercisesTable, authenticate, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");

const PARTITION_KEY = "rohit"; // Single-user, fixed partition
const VALID_DAY_KEYS = new Set(["push1", "pull1", "legs", "push2", "pull2"]);
const VALID_DAY_TYPES = new Set(["PUSH", "PULL", "LEGS"]);
const MAX_EXERCISES = 20;
const MAX_SETS_PER_EXERCISE = 10;
const MAX_TEXT_LENGTH = 120;

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    context.res = jsonResponse(200, {});
    return;
  }

  if (!authenticate(req)) {
    context.res = unauthorizedResponse();
    return;
  }

  if (req.method === "GET") {
    return await getSessions(context);
  }

  if (req.method === "POST") {
    return await postSession(context, req);
  }

  context.res = jsonResponse(405, { error: "Method not allowed" });
};

async function getSessions(context) {
  try {
    const sessionsTable = getSessionsTable();
    const exercisesTable = getExercisesTable();

    // Get all sessions for this user
    const sessions = [];
    const sessionEntities = sessionsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` }
    });

    for await (const entity of sessionEntities) {
      sessions.push({
        id: entity.rowKey,
        date: entity.date,
        dayKey: entity.dayKey,
        dayName: entity.dayName,
        dayType: entity.dayType,
        notes: entity.notes || ""
      });
    }

    // Sort newest first
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Fetch exercises for each session
    const result = await Promise.all(sessions.map(async (session) => {
      const exercises = [];
      const exEntities = exercisesTable.listEntities({
        queryOptions: { filter: `PartitionKey eq '${session.id}'` }
      });

      for await (const ex of exEntities) {
        exercises.push({
          name: ex.name,
          sets: JSON.parse(ex.setsJson)
        });
      }

      exercises.sort((a, b) => (a.order || 0) - (b.order || 0));
      return { ...session, exercises };
    }));

    context.res = jsonResponse(200, result);
  } catch (err) {
    context.log.error("getSessions error:", err);
    context.res = jsonResponse(500, { error: "Failed to fetch sessions", detail: err.message });
  }
}

async function postSession(context, req) {
  try {
    const validation = validateSessionPayload(req.body);

    if (!validation.ok) {
      context.res = jsonResponse(400, { error: "Validation failed", details: validation.errors });
      return;
    }

    const body = validation.value;
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sessionsTable = getSessionsTable();
    const exercisesTable = getExercisesTable();

    // Save session entity
    await sessionsTable.createEntity({
      partitionKey: PARTITION_KEY,
      rowKey: sessionId,
      date: body.date || new Date().toISOString(),
      dayKey: body.dayKey,
      dayName: body.dayName || "",
      dayType: body.dayType || "",
      notes: body.notes || ""
    });

    // Save each exercise as a separate entity (allows future querying per exercise)
    await Promise.all(body.exercises.map((ex, idx) =>
      exercisesTable.createEntity({
        partitionKey: sessionId,
        rowKey: `${idx}-${sanitizeRowKey(ex.name)}`,
        name: ex.name,
        order: idx,
        setsJson: JSON.stringify(ex.sets)
      })
    ));

    context.res = jsonResponse(201, { id: sessionId, message: "Session saved" });
  } catch (err) {
    context.log.error("postSession error:", err);
    context.res = jsonResponse(500, { error: "Failed to save session", detail: err.message });
  }
}

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
