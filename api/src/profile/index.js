// src/profile/index.js
// GET /api/profile  — retrieve user profile (404 if not yet created)
// PUT /api/profile  — create or update user profile

const { getProfileTable, authenticateUser, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");

const ROW_KEY = "profile";
const VALID_EXPERIENCE = new Set(["Beginner", "Intermediate", "Advanced"]);

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

  if (req.method === "GET") {
    return await getProfile(context, user);
  }

  if (req.method === "PUT") {
    return await putProfile(context, req, user);
  }

  context.res = jsonResponse(405, { error: "Method not allowed" });
};

async function getProfile(context, user) {
  try {
    const table = getProfileTable();
    const entity = await table.getEntity(user.userId, ROW_KEY);
    context.res = jsonResponse(200, {
      goals:             entity.goals || "",
      experience:        entity.experience || "",
      limitations:       entity.limitations || "",
      daysPerWeek:       entity.daysPerWeek || 4,
      sessionLengthMins: entity.sessionLengthMins || 60,
      updatedAt:         entity.updatedAt || ""
    });
  } catch (err) {
    if (err.statusCode === 404) {
      context.res = jsonResponse(404, { exists: false });
      return;
    }
    context.log.error("getProfile error:", err);
    context.res = jsonResponse(500, { error: "Failed to fetch profile", detail: err.message });
  }
}

async function putProfile(context, req, user) {
  const errors = validateProfile(req.body);
  if (errors.length) {
    context.res = jsonResponse(400, { error: "Validation failed", details: errors });
    return;
  }

  try {
    const body = req.body;
    const table = getProfileTable();
    await table.upsertEntity({
      partitionKey:      user.userId,
      rowKey:            ROW_KEY,
      goals:             (body.goals || "").trim().slice(0, 500),
      experience:        body.experience,
      limitations:       (body.limitations || "").trim().slice(0, 500),
      daysPerWeek:       Number(body.daysPerWeek),
      sessionLengthMins: Number(body.sessionLengthMins),
      updatedAt:         new Date().toISOString()
    }, "Replace");
    context.res = jsonResponse(200, { message: "Profile saved" });
  } catch (err) {
    context.log.error("putProfile error:", err);
    context.res = jsonResponse(500, { error: "Failed to save profile", detail: err.message });
  }
}

function validateProfile(body) {
  const errors = [];
  if (!body || typeof body !== "object") return ["Request body must be an object"];

  if (typeof body.goals === "string" && body.goals.length > 500) {
    errors.push("goals must be 500 characters or fewer");
  }
  if (typeof body.limitations === "string" && body.limitations.length > 500) {
    errors.push("limitations must be 500 characters or fewer");
  }
  if (body.experience !== undefined && !VALID_EXPERIENCE.has(body.experience)) {
    errors.push("experience must be one of: Beginner, Intermediate, Advanced");
  }
  const days = Number(body.daysPerWeek);
  if (!Number.isInteger(days) || days < 1 || days > 7) {
    errors.push("daysPerWeek must be an integer between 1 and 7");
  }
  const mins = Number(body.sessionLengthMins);
  if (!Number.isFinite(mins) || mins < 15 || mins > 180) {
    errors.push("sessionLengthMins must be a number between 15 and 180");
  }
  return errors;
}

module.exports.validateProfile = validateProfile;
