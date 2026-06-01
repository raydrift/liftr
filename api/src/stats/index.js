// src/stats/index.js
// GET /api/stats — aggregated training stats for the Assess page

const { getSessionsTable, getExercisesTable, authenticate, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");

const PARTITION_KEY = "rohit";

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = jsonResponse(200, {});
    return;
  }

  if (!authenticate(req)) {
    context.res = unauthorizedResponse();
    return;
  }

  try {
    const sessionsTable = getSessionsTable();
    const exercisesTable = getExercisesTable();

    // Fetch all sessions
    const sessions = [];
    const sessionEntities = sessionsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` }
    });
    for await (const s of sessionEntities) {
      sessions.push({ id: s.rowKey, date: s.date, dayKey: s.dayKey, dayType: s.dayType });
    }

    sessions.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalSessions = sessions.length;
    const uniqueDays = new Set(sessions.map(s => s.date.split("T")[0])).size;

    // Streak calculation
    const dateSorted = [...new Set(sessions.map(s => s.date.split("T")[0]))].sort().reverse();
    let streak = 0;
    if (dateSorted.length) {
      const today = new Date().toISOString().split("T")[0];
      let check = today;
      for (const d of dateSorted) {
        if (d === check) {
          streak++;
          const dt = new Date(check);
          dt.setDate(dt.getDate() - 1);
          check = dt.toISOString().split("T")[0];
        } else break;
      }
    }

    // Fetch all exercises to compute volume and strength progress
    let totalSets = 0;
    const exerciseHistory = {}; // { name: [{weight, reps, date}] }

    await Promise.all(sessions.map(async (session) => {
      const exEntities = exercisesTable.listEntities({
        queryOptions: { filter: `PartitionKey eq '${session.id}'` }
      });
      for await (const ex of exEntities) {
        const sets = JSON.parse(ex.setsJson);
        totalSets += sets.length;
        if (!exerciseHistory[ex.name]) exerciseHistory[ex.name] = [];
        sets.forEach(set => {
          if (set.weight > 0) {
            exerciseHistory[ex.name].push({ weight: set.weight, reps: set.reps, date: session.date });
          }
        });
      }
    }));

    // Strength progress — first vs best weight per key exercise
    const keyExercises = [
      "DB Flat Bench Press", "DB Row (one arm)", "DB Goblet Squat",
      "Weighted Pull-ups", "EZ Bar Curl", "DB Romanian Deadlift",
      "DB Arnold Press", "DB Shoulder Press"
    ];

    const strengthProgress = keyExercises
      .filter(name => exerciseHistory[name]?.length)
      .map(name => {
        const history = exerciseHistory[name].sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstWeight = history[0].weight;
        const bestWeight = Math.max(...history.map(h => h.weight));
        const latestWeight = history[history.length - 1].weight;
        return { name, firstWeight, bestWeight, latestWeight, improvement: latestWeight - firstWeight };
      });

    context.res = jsonResponse(200, {
      totalSessions,
      totalSets,
      uniqueDays,
      streak,
      strengthProgress,
      sessionsByType: {
        push: sessions.filter(s => s.dayType === "PUSH").length,
        pull: sessions.filter(s => s.dayType === "PULL").length,
        legs: sessions.filter(s => s.dayType === "LEGS").length
      }
    });
  } catch (err) {
    context.log.error("stats error:", err);
    context.res = jsonResponse(500, { error: "Failed to compute stats", detail: err.message });
  }
};
