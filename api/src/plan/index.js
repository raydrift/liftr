// src/plan/index.js
// GET /api/plan — fetch current plan
// PUT /api/plan — update plan
// POST /api/plan/generate — generate new plan via Claude (streaming SSE)

const Anthropic = require("@anthropic-ai/sdk");
const { getPlanTable, getSessionsTable, getExercisesTable, getProfileTable, authenticateUser, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");
const { computeVolumeBalance, computeStrengthCurves, detectPlateaus, computeProgressionRate, computeRpeTrend } = require("../analytics/index");
const { getLibrarySummaryForPrompt } = require("../exercises/library");

const CURRENT_ROW_KEY = "current";
const client = new Anthropic();

const VALID_DAY_TYPES = new Set([
  "PUSH", "PULL", "LEGS", "UPPER", "LOWER", "FULL",
  "FUNCTIONAL", "MOBILITY", "CONDITIONING", "YOGA", "HYBRID", "CUSTOM"
]);

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

    let version = 1;
    try {
      const current = await table.getEntity(user.userId, CURRENT_ROW_KEY);
      version = (current.version || 1) + 1;
    } catch (e) {
      // No existing plan
    }

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
    let profile = { goals: "", experience: "Beginner", limitations: "", daysPerWeek: 4, sessionLengthMins: 60, gender: "", availableEquipment: "[]", trainingPreferences: "{}" };
    try {
      const p = await profileTable.getEntity(user.userId, "profile");
      Object.assign(profile, p);
    } catch (err) { /* use defaults */ }

    const equipment = profile.availableEquipment ? JSON.parse(profile.availableEquipment) : [];
    const preferences = profile.trainingPreferences ? JSON.parse(profile.trainingPreferences) : {};

    // Parse request body options
    const {
      trainingStyle = "ppl",
      includeExercises = [],
      excludeExercises = [],
      focusMuscles = []
    } = req.body || {};

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
        rpe: s.rpe || 0,
        sessionDurationSec: s.sessionDurationSec || 0
      });
    }
    sessions.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!sessions.length) {
      context.res = jsonResponse(400, { error: "No sessions logged yet. Log some workouts first." });
      return;
    }

    // Fetch exercise history for analytics
    const exerciseHistory = {};
    const sessionExerciseSets = {};
    const exercisesTable = getExercisesTable();

    await Promise.all(sessions.slice(-20).map(async (session) => {
      let totalSets = 0;
      for await (const ex of exercisesTable.listEntities({
        queryOptions: { filter: `PartitionKey eq '${session.id}'` }
      })) {
        const sets = JSON.parse(ex.setsJson);
        totalSets += sets.length;
        if (!exerciseHistory[ex.name]) exerciseHistory[ex.name] = [];
        sets.forEach(set => {
          if (set.weight > 0 && set.reps > 0) {
            exerciseHistory[ex.name].push({ weight: set.weight, reps: set.reps, date: session.date });
          }
        });
      }
      sessionExerciseSets[session.id] = totalSets;
    }));

    const now = new Date();
    const volumeBalance = computeVolumeBalance(sessions, sessionExerciseSets, now);
    const plateaus = detectPlateaus(exerciseHistory);
    const progressionRate = computeProgressionRate(exerciseHistory);
    const rpeTrend = computeRpeTrend(sessions, now);

    // Exercise library summary for the prompt (condensed)
    const libSummary = getLibrarySummaryForPrompt();

    // Determine days per week from profile
    const daysPerWeek = Math.min(Math.max(Number(profile.daysPerWeek) || 4, 1), 7);

    const systemPrompt = `You are an expert strength and conditioning coach with deep knowledge of exercise science, periodization, and training psychology. You prescribe plans for real people with real constraints — not generic programs.

COACHING PRINCIPLES:
- Compound lifts always come first in a session
- 10-20 working sets per muscle group per week is optimal
- 48+ hours between heavy sessions for the same muscle group
- Always include a 5-8 minute warmup and 3-5 minute cooldown
- Progressive overload drives adaptation — prescribe weights based on history
- RPE tracking reveals fatigue: if RPE trend is rising, reduce intensity
- Plateaus require exercise variation or rep scheme change (not just weight)
- For female athletes: similar principles apply; typically more responsive to higher volume, shorter rest periods
- Equipment constraints are hard limits — never prescribe unavailable equipment

USER PROFILE:
- Goals: ${profile.goals || "General fitness"}
- Experience: ${profile.experience || "Beginner"}
- Limitations/Injuries: ${profile.limitations || "None"}
- Gender: ${profile.gender || "not specified"}
- Training ${daysPerWeek}x/week, ${profile.sessionLengthMins || 60} min sessions
- Available equipment: ${equipment.length ? equipment.join(", ") : "basic gym (dumbbells, bench, pull-up bar)"}
- Training style preference: ${trainingStyle}
${preferences.preferredModalities?.length ? `- Preferred modalities: ${preferences.preferredModalities.join(", ")}` : ""}
${excludeExercises.length ? `- Exercises to EXCLUDE: ${excludeExercises.join(", ")}` : ""}
${focusMuscles.length ? `- Focus muscles requested: ${focusMuscles.join(", ")}` : ""}

RECENT TRAINING ANALYTICS (last 8 weeks):
- Volume balance by type: ${JSON.stringify(volumeBalance)}
- Plateaued exercises: ${JSON.stringify(plateaus.map(p => p.exercise))}
- Progression rate per exercise: ${JSON.stringify(progressionRate)}
- RPE trend: ${JSON.stringify(rpeTrend)}

EXERCISE LIBRARY (by primary muscle, id(modality)):
${Object.entries(libSummary).map(([m, exs]) => `  ${m}: ${exs.join(", ")}`).join("\n")}

TRAINING STYLE GUIDE:
- "ppl": Push/Pull/Legs split — classic hypertrophy structure
- "upper-lower": Upper/Lower — good for 4-day frequency
- "hybrid": Mix strength + functional movements (kettlebell, carries, sled work)
- "full-body": Full-body 3x/week — best for beginners
- "athletic": Functional, power, conditioning focus`;

    // Tool definition for structured plan output
    const planTool = {
      name: "generate_workout_plan",
      description: "Generate a structured workout plan with warmup, exercises, and cooldown for each training day",
      input_schema: {
        type: "object",
        required: ["meta", "days"],
        properties: {
          meta: {
            type: "object",
            required: ["trainingStyle", "daysPerWeek", "rationale"],
            properties: {
              trainingStyle: { type: "string" },
              daysPerWeek: { type: "number" },
              rationale: { type: "string", description: "Brief explanation of the plan structure" }
            }
          },
          days: {
            type: "object",
            description: "Map of day keys to day definitions. Use slugs like push1, pull1, legs, upper1, lower1, full1, functional1, etc.",
            additionalProperties: {
              type: "object",
              required: ["name", "type", "exercises"],
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: [...VALID_DAY_TYPES] },
                sub: { type: "string" },
                estimatedDurationMin: { type: "number" },
                warmup: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["exerciseId", "duration"],
                    properties: {
                      exerciseId: { type: "string" },
                      name: { type: "string" },
                      duration: { type: "string" },
                      note: { type: "string" }
                    }
                  }
                },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["name", "sets", "reps", "w"],
                    properties: {
                      exerciseId: { type: "string" },
                      name: { type: "string" },
                      sets: { type: "number" },
                      reps: { type: "string" },
                      w: { type: "number" },
                      unit: { type: "string" },
                      restSec: { type: "number" },
                      tip: { type: "string" },
                      progressionRule: { type: "string" }
                    }
                  }
                },
                cooldown: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["exerciseId", "duration"],
                    properties: {
                      exerciseId: { type: "string" },
                      name: { type: "string" },
                      duration: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    // Send SSE response headers
    context.res = {
      status: 200,
      body: "",
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    };

    context.res.body += `data: ${JSON.stringify({ type: "status", text: "Analyzing your training data..." })}\n\n`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      tools: [planTool],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: `Generate my optimized ${daysPerWeek}-day workout plan. Training style: ${trainingStyle}. Include warmup and cooldown for each day. Base weights on my training history — don't be conservative, I need progressive overload.${includeExercises.length ? ` Try to include: ${includeExercises.join(", ")}.` : ""}`
        }
      ]
    });

    context.res.body += `data: ${JSON.stringify({ type: "status", text: "Building your plan..." })}\n\n`;

    // Extract tool use result
    const toolUse = response.content.find(b => b.type === "tool_use");
    if (!toolUse || toolUse.name !== "generate_workout_plan") {
      context.res.body += `data: ${JSON.stringify({ type: "error", text: "AI did not produce a structured plan" })}\n\n`;
      return;
    }

    const { meta, days } = toolUse.input;

    // Validate and flatten into legacy-compatible plan format
    const errors = validatePlanDays(days);
    if (errors.length) {
      context.res.body += `data: ${JSON.stringify({ type: "error", text: `Plan validation failed: ${errors[0]}` })}\n\n`;
      return;
    }

    // Build the plan object (days is already the right shape)
    const generatedPlan = days;

    // Archive existing plan
    const planTable = getPlanTable();
    try {
      const current = await planTable.getEntity(user.userId, CURRENT_ROW_KEY);
      const timestamp = Date.now();
      await planTable.upsertEntity({
        partitionKey: user.userId,
        rowKey: `plan-${timestamp}`,
        plansJson: current.plansJson,
        generatedAt: current.generatedAt,
        generatedFrom: current.generatedFrom,
        version: current.version
      }, "Replace");
    } catch (err) {
      // No previous plan to archive
    }

    // Save new plan
    await planTable.upsertEntity({
      partitionKey: user.userId,
      rowKey: CURRENT_ROW_KEY,
      plansJson: JSON.stringify(generatedPlan),
      generatedAt: new Date().toISOString(),
      generatedFrom: "ai-generated",
      notes: meta.rationale || "",
      version: 1,
      trainingStyle: meta.trainingStyle || trainingStyle
    }, "Replace");

    context.res.body += `data: ${JSON.stringify({ type: "plan", json: generatedPlan, meta })}\n\n`;
    context.log.info("plan generation: complete", { style: meta.trainingStyle, days: Object.keys(days).length });
  } catch (err) {
    context.log.error("postPlanGenerate error:", err);
    if (context.res && context.res.body !== undefined) {
      context.res.body += `data: ${JSON.stringify({ type: "error", text: "Failed to generate plan" })}\n\n`;
    } else {
      context.res = jsonResponse(500, { error: "Failed to generate plan", detail: err.message });
    }
  }
}

// ─────────────────────────────────────────
// Plan validation
// ─────────────────────────────────────────
function validatePlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return ["Plan must be an object"];
  const keys = Object.keys(plan);
  if (!keys.length) return ["Plan must have at least one day"];
  if (keys.length > 7) return ["Plan cannot have more than 7 days"];
  return validatePlanDays(plan);
}

function validatePlanDays(days) {
  const errors = [];
  for (const [key, day] of Object.entries(days)) {
    if (!/^[a-z0-9-]+$/.test(key) || key.length > 50) {
      errors.push(`Day key "${key}" must be a lowercase alphanumeric slug`);
    }
    if (!day || typeof day !== "object") {
      errors.push(`Day "${key}" must be an object`);
      continue;
    }
    if (typeof day.name !== "string" || !day.name.length) {
      errors.push(`${key}: name must be a non-empty string`);
    }
    if (day.type && !VALID_DAY_TYPES.has(day.type)) {
      errors.push(`${key}: type "${day.type}" is not valid`);
    }
    if (!Array.isArray(day.exercises) || !day.exercises.length) {
      errors.push(`${key}: exercises must be a non-empty array`);
    } else {
      day.exercises.forEach((ex, idx) => {
        if (typeof ex.name !== "string" || !ex.name.length) {
          errors.push(`${key} exercise ${idx}: name required`);
        }
        const sets = Number(ex.sets);
        if (!Number.isInteger(sets) || sets < 1 || sets > 8) {
          errors.push(`${key} exercise ${idx}: sets must be 1-8`);
        }
      });
    }
  }
  return errors;
}

module.exports.validatePlan = validatePlan;
