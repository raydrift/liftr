'use strict';

const express = require('express');
const path = require('path');

const authHandler      = require('./src/auth/index');
const sessionsHandler  = require('./src/sessions/index');
const sessionHandler   = require('./src/session/index');
const statsHandler     = require('./src/stats/index');
const profileHandler   = require('./src/profile/index');
const analyticsHandler = require('./src/analytics/index');
const assessHandler    = require('./src/assess/index');
const planHandler      = require('./src/plan/index');
const metricsHandler   = require('./src/metrics/index');

const app = express();

app.use(express.json());

// Rate limiting for auth endpoints
const authAttempts = {}; // { ip: { count: 0, lockedUntil: timestamp } }
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  if (!authAttempts[ip]) {
    authAttempts[ip] = { count: 0, lockedUntil: null };
  }

  const attempt = authAttempts[ip];
  if (attempt.lockedUntil && attempt.lockedUntil > now) {
    return false; // Still locked
  }

  if (attempt.lockedUntil && attempt.lockedUntil <= now) {
    attempt.count = 0;
    attempt.lockedUntil = null;
  }

  return true; // Not locked
}

function recordFailedAuth(ip) {
  const now = Date.now();
  if (!authAttempts[ip]) {
    authAttempts[ip] = { count: 0, lockedUntil: null };
  }

  authAttempts[ip].count++;
  if (authAttempts[ip].count >= RATE_LIMIT_MAX_ATTEMPTS) {
    authAttempts[ip].lockedUntil = now + RATE_LIMIT_WINDOW;
  }
}

// Expose rate limit check for auth handler
global.checkRateLimit = checkRateLimit;
global.recordFailedAuth = recordFailedAuth;
global.getClientIp = getClientIp;
global.authAttempts = authAttempts;

// CORS middleware — restrict to allowed origin
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://hesyc.com';
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && (origin === allowedOrigin || origin === 'http://127.0.0.1:4173' || origin === 'http://localhost:4173')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'");
  next();
});

app.use(express.static(path.join(__dirname, 'frontend')));

// Adapts the Azure Functions (context, req) handler signature to Express
function adapt(handler) {
  return async (req, res) => {
    const context = { log: console };
    await handler(context, req);
    const { status = 200, body = '', headers = {} } = context.res || {};
    res.status(status).set(headers).send(body);
  };
}

app.all('/api/auth',      adapt(authHandler));
app.all('/api/sessions',  adapt(sessionsHandler));
app.all('/api/session/:id', adapt(sessionHandler));
app.all('/api/stats',     adapt(statsHandler));
app.all('/api/profile',   adapt(profileHandler));
app.all('/api/analytics', adapt(analyticsHandler));
app.all('/api/assess',    adapt(assessHandler));
app.all('/api/plan',      adapt(planHandler));
app.all('/api/metrics',   adapt(metricsHandler));

// Serve frontend for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
