// src/sessions/index.js
// GET  /api/sessions  — list all workout sessions
// POST /api/sessions  — save a new session

const { getSessionsTable, getExercisesTable, authenticate, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");
const { sanitizeRowKey, validateSessionPayload } = require("./validation");

const PARTITION_KEY = "rohit"; // Single-user, fixed partition

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
