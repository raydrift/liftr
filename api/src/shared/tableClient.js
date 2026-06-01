// src/shared/tableClient.js
const { TableClient } = require("@azure/data-tables");

const connStr = process.env.STORAGE_CONNECTION_STRING;

function getSessionsTable() {
  return TableClient.fromConnectionString(connStr, process.env.SESSIONS_TABLE_NAME);
}

function getExercisesTable() {
  return TableClient.fromConnectionString(connStr, process.env.EXERCISES_TABLE_NAME);
}

// Simple API key auth — single-user protection
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

module.exports = { getSessionsTable, getExercisesTable, authenticate, unauthorizedResponse, jsonResponse };
