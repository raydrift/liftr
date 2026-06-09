// src/analytics/index.js
// GET /api/analytics — rich training analytics for the AI coach and Assess page

const { getSessionsTable, getExercisesTable, authenticateUser, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");

const KEY_EXERCISES = [
  "DB Flat Bench Press", "DB Row (one arm)", "DB Goblet Squat",
  "Weighted Pull-ups", "EZ Bar Curl", "DB Romanian Deadlift",
  "DB Arnold Press", "DB Shoulder Press"
];

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = jsonResponse(200, {});
    return;
  }

  const user = await authenticateUser(req);
  if (!user) {
    context.res = unauthorizedResponse();
    return;
  }

  if (req.method !== "GET") {
    context.res = jsonResponse(405, { error: "Method not allowed" });
    return;
  }

  try {
    const sessionsTable = getSessionsTable();
    const exercisesTable = getExercisesTable();

    // Fetch all sessions
    const sessions = [];
    for await (const s of sessionsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${user.userId}'` }
    })) {
      sessions.push({
        id: s.rowKey,
        date: s.date,
        dayKey: s.dayKey,
        dayType: s.dayType || "",
        rpe: s.rpe || 0
      });
    }
    sessions.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!sessions.length) {
      context.res = jsonResponse(200, emptyAnalytics());
      return;
    }

    // Fetch all exercises for all sessions
    const exerciseHistory = {}; // { name: [{weight, reps, date, sessionId}] }
    const sessionExerciseSets = {}; // { sessionId: totalSets }

    await Promise.all(sessions.map(async (session) => {
      let totalSets = 0;
      for await (const ex of exercisesTable.listEntities({
        queryOptions: { filter: `PartitionKey eq '${session.id}'` }
      })) {
        const sets = JSON.parse(ex.setsJson);
        totalSets += sets.length;
        if (!exerciseHistory[ex.name]) exerciseHistory[ex.name] = [];
        sets.forEach(set => {
          if (set.weight > 0 && set.reps > 0) {
            exerciseHistory[ex.name].push({
              weight: set.weight,
              reps: set.reps,
              date: session.date,
              sessionId: session.id
            });
          }
        });
      }
      sessionExerciseSets[session.id] = totalSets;
    }));

    const now = new Date();
    const weeklyVolume   = computeWeeklyVolume(sessions, sessionExerciseSets, now);
    const volumeBalance  = computeVolumeBalance(sessions, sessionExerciseSets, now);
    const strengthCurves = computeStrengthCurves(exerciseHistory);
    const plateaus       = detectPlateaus(exerciseHistory);
    const progressionRate = computeProgressionRate(exerciseHistory);
    const rpeTrend       = computeRpeTrend(sessions, now);

    context.res = jsonResponse(200, {
      weeklyVolume,
      volumeBalance,
      strengthCurves,
      plateaus,
      progressionRate,
      rpeTrend
    });
  } catch (err) {
    context.log.error("analytics error:", err);
    context.res = jsonResponse(500, { error: "Failed to compute analytics", detail: err.message });
  }
};

// ─── ISO week helpers ──────────────────────────────────────────────────────────

// All date arithmetic uses UTC to avoid timezone-dependent week boundary shifts
function getISOWeek(date) {
  const d = new Date(date);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() + 3 - ((utc.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(utc.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((utc - week1) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getPastISOWeeks(n, from) {
  const weeks = [];
  const d = new Date(from);
  const utcDay = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((utcDay + 6) % 7)); // back to Monday (UTC)
  for (let i = n - 1; i >= 0; i--) {
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() - i * 7);
    weeks.push(getISOWeek(weekStart));
  }
  return weeks;
}

// ─── Weekly volume ─────────────────────────────────────────────────────────────

function computeWeeklyVolume(sessions, sessionExerciseSets, now) {
  const weeks = getPastISOWeeks(8, now);
  const buckets = {};
  weeks.forEach(w => { buckets[w] = { week: w, push: 0, pull: 0, legs: 0, total: 0 }; });

  sessions.forEach(s => {
    const w = getISOWeek(s.date);
    if (!buckets[w]) return;
    const sets = sessionExerciseSets[s.id] || 0;
    const type = s.dayType.toLowerCase();
    if (type === "push") buckets[w].push += sets;
    else if (type === "pull") buckets[w].pull += sets;
    else if (type === "legs") buckets[w].legs += sets;
    buckets[w].total += sets;
  });

  return weeks.map(w => buckets[w]);
}

// ─── Volume balance (last 4 weeks) ────────────────────────────────────────────

function computeVolumeBalance(sessions, sessionExerciseSets, now) {
  const weeks = new Set(getPastISOWeeks(4, now));
  let push = 0, pull = 0, legs = 0;

  sessions.forEach(s => {
    if (!weeks.has(getISOWeek(s.date))) return;
    const sets = sessionExerciseSets[s.id] || 0;
    const type = s.dayType.toLowerCase();
    if (type === "push") push += sets;
    else if (type === "pull") pull += sets;
    else if (type === "legs") legs += sets;
  });

  const total = push + pull + legs;
  if (total === 0) return { push: 0, pull: 0, legs: 0 };
  const pushPct = Math.round((push / total) * 100);
  const pullPct = Math.round((pull / total) * 100);
  return {
    push: pushPct,
    pull: pullPct,
    legs: 100 - pushPct - pullPct  // ensure percentages sum to exactly 100
  };
}

// ─── Strength curves (per key exercise) ───────────────────────────────────────

function epley1RM(weight, reps) {
  return Math.round(weight * (1 + reps / 30));
}

function computeStrengthCurves(exerciseHistory) {
  const curves = {};
  KEY_EXERCISES.forEach(name => {
    const entries = exerciseHistory[name];
    if (!entries || !entries.length) return;

    // Group by sessionId to find max weight per session
    const bySession = {};
    entries.forEach(e => {
      if (!bySession[e.sessionId] || e.weight > bySession[e.sessionId].weight) {
        bySession[e.sessionId] = e;
      }
    });

    curves[name] = Object.values(bySession)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(e => ({
        date:           e.date.split("T")[0],
        maxWeight:      e.weight,
        estimatedOneRM: epley1RM(e.weight, e.reps)
      }));
  });
  return curves;
}

// ─── Plateau detection ────────────────────────────────────────────────────────

function detectPlateaus(exerciseHistory) {
  const plateaus = [];
  KEY_EXERCISES.forEach(name => {
    const entries = exerciseHistory[name];
    if (!entries || entries.length < 4) return;

    // Get max weight per session, sorted by date
    const bySession = {};
    entries.forEach(e => {
      if (!bySession[e.sessionId] || e.weight > bySession[e.sessionId].weight) {
        bySession[e.sessionId] = e;
      }
    });

    const sessionMaxes = Object.values(bySession)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(e => e.weight);

    if (sessionMaxes.length < 4) return;

    // Check last 4 sessions: no improvement
    const last4 = sessionMaxes.slice(-4);
    const baseline = last4[0];
    const stuck = last4.every(w => w <= baseline);
    if (!stuck) return;

    // Count how many consecutive sessions from the end are stuck
    let sessionsStuck = 0;
    for (let i = sessionMaxes.length - 1; i >= 0; i--) {
      if (sessionMaxes[i] <= baseline) sessionsStuck++;
      else break;
    }

    plateaus.push({ exercise: name, sessionsStuck, stuckAt: baseline });
  });
  return plateaus;
}

// ─── Progression rate ─────────────────────────────────────────────────────────

function computeProgressionRate(exerciseHistory) {
  const rates = {};
  KEY_EXERCISES.forEach(name => {
    const entries = exerciseHistory[name];
    if (!entries || entries.length < 2) return;

    const bySession = {};
    entries.forEach(e => {
      if (!bySession[e.sessionId] || e.weight > bySession[e.sessionId].weight) {
        bySession[e.sessionId] = e;
      }
    });

    const sessionMaxes = Object.values(bySession)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(e => e.weight);

    let improvements = 0;
    for (let i = 1; i < sessionMaxes.length; i++) {
      if (sessionMaxes[i] > sessionMaxes[i - 1]) improvements++;
    }
    rates[name] = Math.round((improvements / (sessionMaxes.length - 1)) * 100) / 100;
  });
  return rates;
}

// ─── RPE trend ────────────────────────────────────────────────────────────────

function computeRpeTrend(sessions, now) {
  const weeks = getPastISOWeeks(8, now);
  const buckets = {};
  weeks.forEach(w => { buckets[w] = { week: w, totalRpe: 0, count: 0 }; });

  sessions.forEach(s => {
    if (!s.rpe) return;
    const w = getISOWeek(s.date);
    if (!buckets[w]) return;
    buckets[w].totalRpe += s.rpe;
    buckets[w].count++;
  });

  return weeks.map(w => ({
    week:   w,
    avgRpe: buckets[w].count ? Math.round((buckets[w].totalRpe / buckets[w].count) * 10) / 10 : null
  }));
}

// ─── Empty response ───────────────────────────────────────────────────────────

function emptyAnalytics() {
  return {
    weeklyVolume:    [],
    volumeBalance:   { push: 0, pull: 0, legs: 0 },
    strengthCurves:  {},
    plateaus:        [],
    progressionRate: {},
    rpeTrend:        []
  };
}

// Export pure functions for unit testing
module.exports.detectPlateaus        = detectPlateaus;
module.exports.computeWeeklyVolume   = computeWeeklyVolume;
module.exports.computeVolumeBalance  = computeVolumeBalance;
module.exports.computeStrengthCurves = computeStrengthCurves;
module.exports.computeProgressionRate = computeProgressionRate;
module.exports.computeRpeTrend       = computeRpeTrend;
module.exports.epley1RM              = epley1RM;
module.exports.getISOWeek            = getISOWeek;
