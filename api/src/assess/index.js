// src/assess/index.js
// POST /api/assess — AI coaching assessment using Claude

const Anthropic = require("@anthropic-ai/sdk");
const { getSessionsTable, getExercisesTable, getProfileTable, authenticate, unauthorizedResponse } = require("../shared/tableClient");
const { computeWeeklyVolume, computeVolumeBalance, computeStrengthCurves, detectPlateaus, computeProgressionRate, computeRpeTrend, getISOWeek } = require("../analytics/index");

const PARTITION_KEY = "rohit";
const client = new Anthropic();

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 200, body: "", headers: { "Access-Control-Allow-Origin": "*" } };
    return;
  }

  if (!authenticate(req)) {
    context.res = unauthorizedResponse();
    return;
  }

  if (req.method !== "POST") {
    context.res = { status: 405, body: JSON.stringify({ error: "Method not allowed" }), headers: { "Content-Type": "application/json" } };
    return;
  }

  try {
    // Fetch user profile
    const profileTable = getProfileTable();
    let profile = null;
    try {
      profile = await profileTable.getEntity(PARTITION_KEY, "profile");
    } catch (err) {
      if (err.statusCode !== 404) throw err;
      // Profile doesn't exist yet, use defaults
      profile = {
        goals: "",
        experience: "Beginner",
        limitations: "",
        daysPerWeek: 4,
        sessionLengthMins: 60
      };
    }

    // Fetch all sessions
    const sessionsTable = getSessionsTable();
    const sessions = [];
    for await (const s of sessionsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` }
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

    // Check if we have sessions
    if (!sessions.length) {
      context.res = {
        status: 400,
        body: JSON.stringify({ error: "No sessions logged yet. Log some workouts first to get coaching feedback." }),
        headers: { "Content-Type": "application/json" }
      };
      return;
    }

    // Fetch exercises and build analytics
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
    const weeklyVolume = computeWeeklyVolume(sessions, sessionExerciseSets, now);
    const volumeBalance = computeVolumeBalance(sessions, sessionExerciseSets, now);
    const strengthCurves = computeStrengthCurves(exerciseHistory);
    const plateaus = detectPlateaus(exerciseHistory);
    const progressionRate = computeProgressionRate(exerciseHistory);
    const rpeTrend = computeRpeTrend(sessions, now);

    // Assemble system prompt
    const systemPrompt = `You are a personal gym coach. Your user:
- Goals: ${profile.goals || "(not specified)"}
- Experience: ${profile.experience || "Beginner"}
- Limitations: ${profile.limitations || "(none reported)"}
- Training ${profile.daysPerWeek}x/week, ${profile.sessionLengthMins} minutes per session

Recent training data (last 8 weeks):
- Weekly volume (push/pull/legs breakdown): ${JSON.stringify(weeklyVolume)}
- Volume balance (last 4 weeks): ${JSON.stringify(volumeBalance)}
- Strength curves per exercise: ${JSON.stringify(strengthCurves)}
- Plateaued exercises: ${JSON.stringify(plateaus)}
- Progression rate per exercise: ${JSON.stringify(progressionRate)}
- RPE trend (effort): ${JSON.stringify(rpeTrend)}

Provide a brief coaching assessment:
1. What's working (2-3 sentences)
2. What needs adjustment (specific exercises or patterns)
3. One concrete next step
Keep response under 500 words. Be direct and actionable.`;

    // Call Claude with streaming
    const stream = await client.messages.stream({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "Based on my training data above, what's your coaching assessment and what should I focus on next?"
        }
      ]
    });

    // Send SSE response
    context.res = {
      status: 200,
      body: "",  // Will stream below
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    };

    // Stream chunks as SSE events
    let response = "";
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const text = event.delta.text;
        response += text;
        // Write SSE event directly to response
        context.res.body += `data: ${text}\n\n`;
      }
    }

    context.log.info("assess: streaming complete", { length: response.length });
  } catch (err) {
    context.log.error("assess error:", err);
    const errorMessage = err.status === 401 ? "Invalid Anthropic API key" : "Failed to generate assessment";
    context.res = {
      status: 500,
      body: JSON.stringify({ error: errorMessage, detail: err.message }),
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    };
  }
};
