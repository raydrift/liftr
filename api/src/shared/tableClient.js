// src/shared/tableClient.js
const { TableClient } = require("@azure/data-tables");

function getStorageConnectionString() {
  return (
    process.env.STORAGE_CONNECTION_STRING ||
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
    process.env.AzureWebJobsStorage ||
    ""
  );
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getTable(tableNameEnvVar) {
  const connStr = getStorageConnectionString();
  if (!connStr) throw new Error("Storage connection not configured (missing connection string)");
  const tableName = requireEnv(tableNameEnvVar);
  return TableClient.fromConnectionString(connStr, tableName);
}

function getSessionsTable() {
  return getTable("SESSIONS_TABLE_NAME");
}

function getExercisesTable() {
  return getTable("EXERCISES_TABLE_NAME");
}

function getProfileTable() {
  return getTable("PROFILE_TABLE_NAME");
}

function getMetricsTable() {
  return getTable("METRICS_TABLE_NAME");
}

function getPlanTable() {
  return getTable("PLAN_TABLE_NAME");
}

function getUsersTable() {
  return getTable("USERS_TABLE_NAME");
}

function getAuditTable() {
  return getTable("AUDIT_TABLE_NAME");
}

// JWT auth — session-based protection
const jwt = require("jsonwebtoken");

function verifyJWT(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "");
  } catch (err) {
    return null;
  }
}

function signJWT(payload, expiresIn = "30d") {
  return jwt.sign(payload, process.env.JWT_SECRET || "", { expiresIn });
}

function getCookie(req, name) {
  if (req?.cookies && typeof req.cookies === "object" && req.cookies[name]) return req.cookies[name];

  const header = req?.headers?.cookie;
  if (!header || typeof header !== "string") return null;

  // Cookie header: "a=1; b=2"
  const cookies = header.split(";").map((p) => p.trim());
  for (const pair of cookies) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    if (key !== name) continue;
    return decodeURIComponent(pair.slice(eq + 1));
  }
  return null;
}

async function authenticateUser(req) {
  // Check JWT in cookies first (new session-based auth)
  const token = getCookie(req, "session");
  if (token) {
    const payload = verifyJWT(token);
    if (payload) {
      try {
        const usersTable = getUsersTable();
        const user = await usersTable.getEntity(payload.email, "profile");
        return user?.userId ? { ...user, email: payload.email } : null;
      } catch (err) {
        return null;
      }
    }
  }

  // Fall back to API key (legacy, for backward compatibility during transition)
  const key = req.headers["x-api-key"];
  if (key === process.env.API_SECRET_KEY) {
    return { userId: "legacy", email: "admin@localhost" };
  }

  return null;
}

// Old function kept for backward compatibility in non-critical endpoints
function authenticate(req) {
  const key = req.headers["x-api-key"];
  return key === process.env.API_SECRET_KEY;
}

function unauthorizedResponse() {
  return jsonResponse(401, { error: "Unauthorized" });
}

function jsonResponse(status, body) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  return {
    status,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key"
    }
  };
}

module.exports = {
  getSessionsTable,
  getExercisesTable,
  getProfileTable,
  getMetricsTable,
  getPlanTable,
  getUsersTable,
  getAuditTable,
  authenticate,
  authenticateUser,
  verifyJWT,
  signJWT,
  getCookie,
  unauthorizedResponse,
  jsonResponse
};
