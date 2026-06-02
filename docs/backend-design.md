# Backend Design

## Purpose

The Liftr backend persists workout sessions and computes aggregate progress stats for the frontend. It is intentionally small and serverless because this is a single-user personal app.

The backend is implemented with Azure Functions using Node.js.

```text
api/
├── host.json
├── local.settings.json
├── package.json
└── src/
    ├── session/
    ├── sessions/
    ├── shared/
    └── stats/
```

## Runtime

- Node.js 20 or newer.
- Azure Functions v4.
- CommonJS modules.
- `@azure/data-tables` for Azure Table Storage access.

`api/package.json` defines:

- `npm start`: runs the local Functions host.
- `npm run build`: currently a placeholder.
- `npm run deploy`: placeholder; production API deploys through the Static Web Apps workflow.

## API Surface

### `GET /api/sessions`

Returns all workout sessions for the single user, newest first.

Response shape:

```json
[
  {
    "id": "session-id",
    "date": "2026-06-01T00:00:00.000Z",
    "dayKey": "push1",
    "dayName": "Push Day 1",
    "dayType": "PUSH",
    "notes": "",
    "exercises": [
      {
        "name": "DB Flat Bench Press",
        "sets": [
          { "weight": 40, "reps": 8 }
        ]
      }
    ]
  }
]
```

Implementation:

- Query sessions table with fixed partition key.
- Sort sessions by date descending.
- For each session, query exercises table using session id as partition key.
- Attach exercises to each session.

### `POST /api/sessions`

Creates a new workout session.

Expected request shape:

```json
{
  "dayKey": "push1",
  "dayName": "Push Day 1",
  "dayType": "PUSH",
  "date": "2026-06-01T00:00:00.000Z",
  "notes": "",
  "exercises": [
    {
      "name": "DB Flat Bench Press",
      "sets": [
        { "weight": 40, "reps": 8 }
      ]
    }
  ]
}
```

Current validation:

- Requires `dayKey`.
- Requires at least one exercise.

Recommended validation:

- `dayKey` must be a known plan key.
- `dayType` must be `PUSH`, `PULL`, or `LEGS`.
- `date` must be a valid ISO date if provided.
- `exercises` must be an array with bounded length.
- Each exercise must have a non-empty bounded name.
- Each set must have numeric `weight >= 0` and integer `reps >= 0`.
- Reject or drop sets with `reps === 0`.

### `DELETE /api/session/{id}`

Deletes a session and all exercises for that session.

Implementation:

1. Delete the session entity from the sessions table.
2. Query the exercises table for `PartitionKey eq sessionId`.
3. Delete each exercise entity.

Current behavior:

- If deleting the session fails with 404, response is 404.
- If exercise cleanup fails after session deletion, the operation can become partially complete.

Recommended improvement:

- Query exercises first, then delete exercises and session with clearer error handling.
- Or tolerate missing child entities and return a best-effort cleanup result.

### `GET /api/stats`

Returns aggregate progress stats for the Assess page.

Response shape:

```json
{
  "totalSessions": 12,
  "totalSets": 250,
  "uniqueDays": 10,
  "streak": 3,
  "strengthProgress": [
    {
      "name": "DB Flat Bench Press",
      "firstWeight": 40,
      "bestWeight": 50,
      "latestWeight": 47.5,
      "improvement": 7.5
    }
  ],
  "sessionsByType": {
    "push": 5,
    "pull": 4,
    "legs": 3
  }
}
```

Stats computed:

- Total sessions.
- Total sets.
- Unique training days.
- Current streak.
- Strength progress for a fixed list of key exercises.
- Session counts by Push/Pull/Legs.

Current limitation:

- Streak calculation uses UTC dates via `toISOString()`, which may not match the user's local day.
- Strength progress only considers weight, not reps, volume, or estimated one-rep max.

Recommended improvement:

- Use user-local date keys from the frontend or configured timezone.
- Add volume metrics: `weight * reps`.
- Add per-exercise trend data.
- Add weekly consistency and monthly summary data.

## Shared Utilities

`api/src/shared/tableClient.js` provides:

- `getSessionsTable()`
- `getExercisesTable()`
- `authenticate(req)`
- `unauthorizedResponse()`
- `jsonResponse(status, body)`

Table clients are created from:

- `STORAGE_CONNECTION_STRING`
- `SESSIONS_TABLE_NAME`
- `EXERCISES_TABLE_NAME`

Auth checks:

```http
X-API-Key: <API_SECRET_KEY>
```

Important security note:

- This is only lightweight protection if the frontend exposes the API key.
- For stronger protection, use Azure Static Web Apps auth or a real server-side session/auth flow.

## Data Model

### Sessions Table

Table name:

```text
workoutsessions
```

Entity shape:

```text
PartitionKey: rohit
RowKey: sessionId
date: ISO timestamp
dayKey: plan key
dayName: display name
dayType: PUSH | PULL | LEGS
notes: optional text
```

The partition key is fixed because the app is single-user.

### Exercises Table

Table name:

```text
workoutexercises
```

Entity shape:

```text
PartitionKey: sessionId
RowKey: exercise order/name key
name: exercise name
order: exercise order in session
setsJson: JSON string of set records
```

Each exercise stores its sets as a JSON string. This keeps the schema simple and makes session retrieval easy.

Tradeoff:

- Querying individual sets across all history requires parsing JSON.
- For a personal tracker, this is acceptable.
- If analytics become more complex, consider a third table for individual set rows.

## Error Handling

Current behavior:

- API errors are logged with `context.log.error`.
- Client receives JSON with `error` and sometimes `detail`.

Recommended production behavior:

- Keep detailed errors in logs.
- Avoid returning raw internal error messages to clients.
- Add consistent error response shape:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Missing required field: dayKey"
}
```

## CORS

The API JSON helper includes broad CORS headers:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-API-Key
```

Terraform configures the Static Web Apps managed API app settings.

Recommended cleanup:

- Decide whether CORS remains useful once API calls are same-origin under Static Web Apps.
- Avoid `Access-Control-Allow-Origin: *` if API contains private personal data.

## Recommended Backend Evolution

Near-term:

1. Add robust request validation.
2. Stop returning raw error details in production.
3. Add an `assessment` Function to proxy model calls securely.
4. Add tests for validation and stats aggregation.
5. Fix CORS to only allow the deployed frontend origin.

Medium-term:

1. Introduce a data access layer for Table Storage operations.
2. Add schema versioning to session entities.
3. Add migration scripts for data model changes.
4. Add Application Insights queries/runbook for debugging.

Long-term:

1. Add auth if the app becomes multi-user or public.
2. Move from fixed partition key to user-specific partition keys.
3. Consider richer analytics tables if progress reporting grows.
