// src/plan/index.js
// GET /api/plan — fetch current plan
// PUT /api/plan — update plan
// POST /api/plan/generate — generate new plan via Claude (streaming SSE)

const Anthropic = require("@anthropic-ai/sdk");
const { getPlanTable, getSessionsTable, getExercisesTable, getProfileTable, authenticateUser, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");
const { computeWeeklyVolume, computeVolumeBalance, computeStrengthCurves, detectPlateaus, computeProgressionRate, computeRpeTrend, getISOWeek } = require("../analytics/index");

const CURRENT_ROW_KEY = "current";
const client = new Anthropic();

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 200, body: "", headers: { "Access-Control-Allow-Origin": "*" } };
    return;
  }

  const user = await authenticateUser(req);
  if (!user) {
    context.res = unauthorizedResponse();
    return;
  }

  if (req.method === "GET") {
    return await getPlan(context, user);
  }

  if (req.method === "PUT") {
    return await putPlan(context, req, user);
  }

  if (req.method === "POST") {
    return await postPlanGenerate(context, req, user);
  }

  context.res = jsonResponse(405, { error: "Method not allowed" });
};

// ─────────────────────────────────────────
// GET /api/plan — fetch current plan
// ─────────────────────────────────────────
async function getPlan(context, user) {
  try {
    const table = getPlanTable();
    const entity = await table.getEntity(user.userId, CURRENT_ROW_KEY);
    const plan = JSON.parse(entity.plansJson);
    context.res = jsonResponse(200, {
      plan,
      generatedAt: entity.generatedAt || "",
      generatedFrom: entity.generatedFrom || "initial",
      version: entity.version || 1
    });
  } catch (err) {
    if (err.statusCode === 404) {
      context.res = jsonResponse(404, { exists: false });
      return;
    }
    context.log.error("getPlan error:", err);
    context.res = jsonResponse(500, { error: "Failed to fetch plan", detail: err.message });
  }
}

// ─────────────────────────────────────────
// PUT /api/plan — update plan
// ─────────────────────────────────────────
async function putPlan(context, req, user) {
  try {
    const { plan, notes } = req.body;
    const errors = validatePlan(plan);
    if (errors.length) {
      context.res = jsonResponse(400, { error: "Validation failed", details: errors });
      return;
    }

    const table = getPlanTable();

    // Get current version
    let version = 1;
    let previousVersionKey = null;
    try {
      const current = await table.getEntity(user.userId, CURRENT_ROW_KEY);
      version = (current.version || 1) + 1;
      previousVersionKey = CURRENT_ROW_KEY;
    } catch (e) {
      // No existing plan
    }

    // Upsert current plan
    await table.upsertEntity({
      partitionKey: user.userId,
      rowKey: CURRENT_ROW_KEY,
      plansJson: JSON.stringify(plan),
      generatedAt: new Date().toISOString(),
      generatedFrom: "user-edit",
      notes: (notes || "").trim().slice(0, 500),
      version
    }, "Replace");

    context.res = jsonResponse(200, { message: "Plan saved", version });
  } catch (err) {
    context.log.error("putPlan error:", err);
    context.res = jsonResponse(500, { error: "Failed to save plan", detail: err.message });
  }
}

// ─────────────────────────────────────────
// POST /api/plan/generate — generate via Claude (streaming)
// ─────────────────────────────────────────
async function postPlanGenerate(context, req, user) {
  try {
    // Fetch profile
    const profileTable = getProfileTable();
    let profile = null;
    try {
      profile = await profileTable.getEntity(user.userId, "profile");
    } catch (err) {
      profile = { goals: "", experience: "Beginner", limitations: "", daysPerWeek: 4, sessionLengthMins: 60 };
    }

    // Fetch sessions
    const sessionsTable = getSessionsTable();
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
      context.res = jsonResponse(400, { error: "No sessions logged yet. Log some workouts first." });
      return;
    }

    // Fetch exercises and compute analytics
    const exerciseHistory = {};
    const sessionExerciseSets = {};
    const exercisesTable = getExercisesTable();

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

    // Compute analytics
    const now = new Date();
    const volumeBalance = computeVolumeBalance(sessions, sessionExerciseSets, now);
    const plateaus = detectPlateaus(exerciseHistory);
    const progressionRate = computeProgressionRate(exerciseHistory);

    // Assemble plan generation prompt
    const systemPrompt = `You are an expert gym coach. Based on the user's profile and recent training analytics, generate an optimized 5-day workout plan.

User Profile:
- Goals: ${profile.goals || "(not specified)"}
- Experience: ${profile.experience || "Beginner"}
- Limitations: ${profile.limitations || "(none)"}
- Training ${profile.daysPerWeek}x/week, ${profile.sessionLengthMins} minutes/session

Recent Analytics (last 8 weeks):
- Volume balance: ${JSON.stringify(volumeBalance)}
- Plateaued exercises: ${JSON.stringify(plateaus)}
- Progression rate: ${JSON.stringify(progressionRate)}

Generate a 5-day plan with this exact JSON structure. Think through step-by-step:
1. Identify weak muscle groups (low volume balance)
2. Find plateaued exercises that need change
3. Adjust weights: +5-10% for good progression, -10-15% for plateaus
4. Plan exercise order (compound first)

Return ONLY valid JSON (no markdown, no explanation):
{
  "push1": {
    "name": "Push Day 1",
    "sub": "Chest Focus",
    "type": "PUSH",
    "c": "push",
    "exercises": [
      {
        "name": "DB Flat Bench Press",
        "target": "4×8",
        "w": 45,
        "unit": "lb each",
        "sets": 4,
        "tip": "Full ROM · pause at bottom"
      }
    ]
  },
  "pull1": { ... },
  "legs": { ... },
  "push2": { ... },
  "pull2": { ... }
}`;

    // Send SSE response headers
    context.res = {
      status: 200,
      body: "",
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    };

    // Send initial status
    context.res.body += `data: ${JSON.stringify({ type: "status", text: "Analyzing your training data..." })}\n\n`;

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "Generate my optimized 5-day workout plan based on my data and analytics."
        }
      ]
    });

    let fullResponse = "";
    let statusCount = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const text = event.delta.text;
        fullResponse += text;

        // Stream chunk as text event
        context.res.body += `data: ${JSON.stringify({ type: "text", text })}\n\n`;

        // Periodically update status
        statusCount++;
        if (statusCount % 20 === 0) {
          if (statusCount < 100) {
            context.res.body += `data: ${JSON.stringify({ type: "status", text: "Generating exercises..." })}\n\n`;
          } else {
            context.res.body += `data: ${JSON.stringify({ type: "status", text: "Finalizing plan..." })}\n\n`;
          }
        }
      }
    }

    // Parse final response
    let generatedPlan = null;
    try {
      // Extract JSON from response (may have thinking text before)
      const jsonMatch = fullResponse.match(/\{[\s\S]*"push1"[\s\S]*\}/);
      if (jsonMatch) {
        generatedPlan = JSON.parse(jsonMatch[0]);
        const errors = validatePlan(generatedPlan);
        if (errors.length) {
          context.res.body += `data: ${JSON.stringify({ type: "error", text: "Generated plan has validation errors" })}\n\n`;
          return;
        }
      }
    } catch (parseErr) {
      context.log.error("Plan JSON parse error:", parseErr);
      context.res.body += `data: ${JSON.stringify({ type: "error", text: "Failed to parse generated plan" })}\n\n`;
      return;
    }

    if (!generatedPlan) {
      context.res.body += `data: ${JSON.stringify({ type: "error", text: "No valid plan in response" })}\n\n`;
      return;
    }

    // Save historical version (if current exists)
    const planTable = getPlanTable();
    try {
      const current = await planTable.getEntity(PARTITION_KEY, CURRENT_ROW_KEY);
      const timestamp = Date.now();
      await planTable.upsertEntity({
        partitionKey: PARTITION_KEY,
        rowKey: `plan-${timestamp}`,
        plansJson: current.plansJson,
        generatedAt: current.generatedAt,
        generatedFrom: current.generatedFrom,
        version: current.version
      }, "Replace");
    } catch (err) {
      // No previous plan, skip history
    }

    // Save new current plan
    await planTable.upsertEntity({
      partitionKey: PARTITION_KEY,
      rowKey: CURRENT_ROW_KEY,
      plansJson: JSON.stringify(generatedPlan),
      generatedAt: new Date().toISOString(),
      generatedFrom: "assessment",
      notes: "Generated from training analytics",
      version: 2
    }, "Replace");

    // Send final plan event
    context.res.body += `data: ${JSON.stringify({ type: "plan", json: generatedPlan })}\n\n`;

    context.log.info("plan generation: complete", { version: 2 });
  } catch (err) {
    context.log.error("postPlanGenerate error:", err);
    context.res.body += `data: ${JSON.stringify({ type: "error", text: "Failed to generate plan" })}\n\n`;
  }
}

// ─────────────────────────────────────────
// Plan validation
// ─────────────────────────────────────────
function validatePlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object") return ["Plan must be an object"];

  const requiredKeys = ["push1", "pull1", "legs", "push2", "pull2"];
  for (const key of requiredKeys) {
    if (!plan[key]) errors.push(`Missing plan day: ${key}`);
    else validatePlanDay(plan[key], key, errors);
  }

  return errors;
}

function validatePlanDay(day, key, errors) {
  if (typeof day.name !== "string" || !day.name.length) {
    errors.push(`${key}: name must be a non-empty string`);
  }
  if (typeof day.type !== "string" || !["PUSH", "PULL", "LEGS"].includes(day.type)) {
    errors.push(`${key}: type must be PUSH, PULL, or LEGS`);
  }
  if (!Array.isArray(day.exercises)) {
    errors.push(`${key}: exercises must be an array`);
    return;
  }

  day.exercises.forEach((ex, idx) => {
    if (typeof ex.name !== "string" || !ex.name.length) {
      errors.push(`${key} exercise ${idx}: name required`);
    }
    const weight = Number(ex.w);
    if (!Number.isFinite(weight) || weight < 5 || weight > 200) {
      errors.push(`${key} exercise ${idx}: weight must be 5-200`);
    }
    const sets = Number(ex.sets);
    if (!Number.isInteger(sets) || sets < 2 || sets > 6) {
      errors.push(`${key} exercise ${idx}: sets must be 2-6`);
    }
  });
}

module.exports.validatePlan = validatePlan;
