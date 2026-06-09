'use strict';

const express = require('express');
const path = require('path');

const sessionsHandler  = require('./src/sessions/index');
const sessionHandler   = require('./src/session/index');
const statsHandler     = require('./src/stats/index');
const profileHandler   = require('./src/profile/index');
const analyticsHandler = require('./src/analytics/index');
const assessHandler    = require('./src/assess/index');
const metricsHandler   = require('./src/metrics/index');

const app = express();

app.use(express.json());
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

app.all('/api/sessions',  adapt(sessionsHandler));
app.all('/api/session/:id', adapt(sessionHandler));
app.all('/api/stats',     adapt(statsHandler));
app.all('/api/profile',   adapt(profileHandler));
app.all('/api/analytics', adapt(analyticsHandler));
app.all('/api/assess',    adapt(assessHandler));
app.all('/api/metrics',   adapt(metricsHandler));

// Serve frontend for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
