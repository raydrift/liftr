'use strict';

const express = require('express');
const path = require('path');

const sessionsHandler = require('./src/sessions/index');
const sessionHandler = require('./src/session/index');
const statsHandler = require('./src/stats/index');

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

app.all('/api/sessions', adapt(sessionsHandler));
app.all('/api/session/:id', adapt(sessionHandler));
app.all('/api/stats', adapt(statsHandler));

// Serve frontend for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
