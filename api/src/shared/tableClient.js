// src/shared/tableClient.js
const { TableClient } = require("@azure/data-tables");

const connStr = process.env.STORAGE_CONNECTION_STRING;

function getSessionsTable() {
  return TableClient.fromConnectionString(connStr, process.env.SESSIONS_TABLE_NAME);
}

function getExercisesTable() {
  return TableClient.fromConnectionString(connStr, process.env.EXERCISES_TABLE_NAME);
}

function getProfileTable() {
  return TableClient.fromConnectionString(connStr, process.env.PROFILE_TABLE_NAME);
}

function getMetricsTable() {
  return TableClient.fromConnectionString(connStr, process.env.METRICS_TABLE_NAME);
}

function getPlanTable() {
  return TableClient.fromConnectionString(connStr, process.env.PLAN_TABLE_NAME);
}

function getUsersTable() {
  return TableClient.fromConnectionString(connStr, process.env.USERS_TABLE_NAME);
}

function getAuditTable() {
  return TableClient.fromConnectionString(connStr, process.env.AUDIT_TABLE_NAME);
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

async function authenticateUser(req) {
  // Check JWT in cookies first (new session-based auth)
  const token = req.cookies?.session;
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
  unauthorizedResponse,
  jsonResponse
};
