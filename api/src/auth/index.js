// src/auth/index.js
// Authentication endpoints: login, register, logout, me

const bcrypt = require("bcrypt");
const { getUsersTable, getAuditTable, signJWT, verifyJWT, getCookie, jsonResponse } = require("../shared/tableClient");

module.exports = async function (context, req) {
  const path = req.path || req.url;

  if (req.method === "OPTIONS") {
    context.res = jsonResponse(200, {});
    return;
  }

  try {
    if (path.includes("/auth/register") && req.method === "POST") {
      return await register(context, req);
    }
    if (path.includes("/auth/login") && req.method === "POST") {
      return await login(context, req);
    }
    if (path.includes("/auth/logout") && req.method === "POST") {
      return await logout(context, req);
    }
    if (path.includes("/auth/me") && req.method === "GET") {
      return await getMe(context, req);
    }

    context.res = jsonResponse(404, { error: "Not found" });
  } catch (err) {
    context.log.error("auth error:", err);
    context.res = jsonResponse(500, { error: "Server error", detail: err.message });
  }
};

// ─────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────
async function register(context, req) {
  const { email, password } = req.body || {};

  // Validate input
  if (!email || !password) {
    context.res = jsonResponse(400, { error: "Email and password required" });
    return;
  }

  if (typeof email !== "string" || !email.includes("@")) {
    context.res = jsonResponse(400, { error: "Invalid email format" });
    return;
  }

  if (password.length < 8) {
    context.res = jsonResponse(400, { error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const usersTable = getUsersTable();
    const emailLower = email.toLowerCase();

    // Check if user exists
    try {
      await usersTable.getEntity(emailLower, "profile");
      context.res = jsonResponse(409, { error: "Email already registered" });
      return;
    } catch (err) {
      // User doesn't exist, proceed
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create user
    await usersTable.upsertEntity({
      partitionKey: emailLower,
      rowKey: "profile",
      userId,
      passwordHash,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isActive: true
    }, "Replace");

    // Log audit event
    await logAudit(userId, "register", "success", req);

    // Create session token
    const token = signJWT({ userId, email: emailLower });

    // Set secure cookie
    const maxAge = (process.env.SESSION_MAX_AGE || 2592000) * 1000; // Convert to ms
    context.res = {
      status: 201,
      body: JSON.stringify({ message: "Account created", userId }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Set-Cookie": `session=${token}; Path=/; Max-Age=${process.env.SESSION_MAX_AGE || 2592000}; Secure; HttpOnly; SameSite=Strict`
      }
    };
  } catch (err) {
    context.log.error("register error:", err);
    context.res = jsonResponse(500, { error: "Failed to create account", detail: err.message });
  }
}

// ─────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────
async function login(context, req) {
  const { email, password } = req.body || {};
  const ip = global.getClientIp(req);

  // Check rate limit
  if (!global.checkRateLimit(ip)) {
    context.res = jsonResponse(429, { error: "Too many failed login attempts. Try again in 15 minutes." });
    return;
  }

  if (!email || !password) {
    context.res = jsonResponse(400, { error: "Email and password required" });
    return;
  }

  try {
    const usersTable = getUsersTable();
    const emailLower = email.toLowerCase();

    // Get user
    let user;
    try {
      user = await usersTable.getEntity(emailLower, "profile");
    } catch (err) {
      global.recordFailedAuth(ip);
      await logAudit("unknown", "login", "failure", req, "User not found");
      context.res = jsonResponse(401, { error: "Invalid credentials" });
      return;
    }

    // Check if account is active
    if (!user.isActive) {
      global.recordFailedAuth(ip);
      await logAudit(user.userId, "login", "failure", req, "Account inactive");
      context.res = jsonResponse(401, { error: "Account disabled" });
      return;
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      global.recordFailedAuth(ip);
      await logAudit(user.userId, "login", "failure", req, "Invalid password");
      context.res = jsonResponse(401, { error: "Invalid credentials" });
      return;
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    await usersTable.upsertEntity(user, "Replace");

    // Reset rate limit on successful login
    const authAttempts = global.authAttempts || {};
    if (authAttempts[ip]) {
      authAttempts[ip] = { count: 0, lockedUntil: null };
    }

    // Log audit event
    await logAudit(user.userId, "login", "success", req);

    // Create session token
    const token = signJWT({ userId: user.userId, email: emailLower });

    const maxAge = process.env.SESSION_MAX_AGE || 2592000;
    context.res = {
      status: 200,
      body: JSON.stringify({ message: "Logged in", userId: user.userId }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Set-Cookie": `session=${token}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Strict`
      }
    };
  } catch (err) {
    global.recordFailedAuth(ip);
    context.log.error("login error:", err);
    context.res = jsonResponse(500, { error: "Login failed", detail: err.message });
  }
}

// ─────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────
async function logout(context, req) {
  // Clear session cookie
  context.res = {
    status: 200,
    body: JSON.stringify({ message: "Logged out" }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      "Set-Cookie": "session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict"
    }
  };
}

// ─────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────
async function getMe(context, req) {
  const token = getCookie(req, "session");
  if (!token) {
    context.res = jsonResponse(401, { error: "Not authenticated" });
    return;
  }

  const payload = verifyJWT(token);
  if (!payload) {
    context.res = jsonResponse(401, { error: "Invalid session" });
    return;
  }

  try {
    const usersTable = getUsersTable();
    const user = await usersTable.getEntity(payload.email, "profile");

    context.res = jsonResponse(200, {
      userId: user.userId,
      email: payload.email,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      isActive: user.isActive
    });
  } catch (err) {
    context.res = jsonResponse(401, { error: "User not found" });
  }
}

// ─────────────────────────────────────────
// Audit logging helper
// ─────────────────────────────────────────
async function logAudit(userId, action, status, req, reason = "") {
  try {
    const auditTable = getAuditTable();
    const timestamp = new Date().toISOString();
    const rowKey = `${timestamp}-${action}`;

    await auditTable.upsertEntity({
      partitionKey: userId,
      rowKey,
      timestamp,
      ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "",
      endpoint: req.path || req.url,
      action,
      status,
      reason
    }, "Replace");
  } catch (err) {
    console.error("audit log error:", err);
    // Don't throw, just log
  }
}
