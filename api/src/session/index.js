// src/session/index.js
// DELETE /api/session/{id} — delete a session and its exercises

const { getSessionsTable, getExercisesTable, authenticateUser, unauthorizedResponse, jsonResponse } = require("../shared/tableClient");

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

  const sessionId = req.params.id;
  if (!sessionId) {
    context.res = jsonResponse(400, { error: "Session ID required" });
    return;
  }

  try {
    const sessionsTable = getSessionsTable();
    const exercisesTable = getExercisesTable();

    // Delete session entity
    await sessionsTable.deleteEntity(user.userId, sessionId);

    // Delete all exercise entities for this session
    const exEntities = exercisesTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${sessionId}'` }
    });

    const deleteOps = [];
    for await (const ex of exEntities) {
      deleteOps.push(exercisesTable.deleteEntity(ex.partitionKey, ex.rowKey));
    }
    await Promise.all(deleteOps);

    context.res = jsonResponse(200, { message: "Session deleted", id: sessionId });
  } catch (err) {
    context.log.error("deleteSession error:", err);
    if (err.statusCode === 404) {
      context.res = jsonResponse(404, { error: "Session not found" });
    } else {
      context.res = jsonResponse(500, { error: "Failed to delete session", detail: err.message });
    }
  }
};
