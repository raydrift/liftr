// src/metrics/index.js
// GET  /api/metrics — retrieve all body weight entries (sorted by date)
// POST /api/metrics — log today's body weight (one entry per day, upsert)

const { getMetricsTable, authenticateUser, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");

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
    return await getMetrics(context, user);
  }

  if (req.method === "POST") {
    return await postMetric(context, req, user);
  }

  context.res = jsonResponse(405, { error: "Method not allowed" });
};

async function getMetrics(context, user) {
  try {
    const table = getMetricsTable();
    const entries = [];
    for await (const entity of table.listEntities({
      queryOptions: { filter: `PartitionKey eq '${user.userId}'` }
    })) {
      entries.push({ date: entity.rowKey, weightLb: entity.weightLb });
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    context.res = jsonResponse(200, entries);
  } catch (err) {
    context.log.error("getMetrics error:", err);
    context.res = jsonResponse(500, { error: "Failed to fetch metrics", detail: err.message });
  }
}

async function postMetric(context, req, user) {
  const weight = Number(req.body?.weightLb);
  if (!Number.isFinite(weight) || weight < 50 || weight > 999) {
    context.res = jsonResponse(400, { error: "weightLb must be a number between 50 and 999" });
    return;
  }

  try {
    const table = getMetricsTable();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    await table.upsertEntity({
      partitionKey: user.userId,
      rowKey:       today,
      weightLb:     weight,
      date:         today
    }, "Replace");
    context.res = jsonResponse(201, { message: "Metric saved", date: today, weightLb: weight });
  } catch (err) {
    context.log.error("postMetric error:", err);
    context.res = jsonResponse(500, { error: "Failed to save metric", detail: err.message });
  }
}
