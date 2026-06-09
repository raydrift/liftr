# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start: Essential Commands

### API Development
```bash
# Install dependencies
cd api && npm install

# Syntax check (build script)
npm run build

# Run tests
npm test

# Start local server
npm start
```

### Frontend Development
```bash
# No build step required. Run a simple HTTP server:
cd frontend
python3 -m http.server 4173
# Then open http://127.0.0.1:4173/

# Or with Node:
cd frontend
npx http-server -p 4173
```

### Terraform / Infrastructure
```bash
# Copy example vars (fill in your Azure details)
cp terraform/terraform.tfvars.example terraform/terraform.tfvars

# Format check
terraform fmt -check -recursive terraform

# Validate
terraform -chdir=terraform validate

# Plan
terraform -chdir=terraform plan

# Apply
terraform -chdir=terraform apply
```

### CI/CD
- **CI runs on**: push to main, pull requests → runs API build/test, frontend syntax check, Terraform validation
- **Deploy runs on**: manual trigger (workflow_dispatch) → Azure auth, Terraform apply in phases, Docker build+push

---

## Architecture Overview

**Liftr** is a single-user personal gym coach app. The feedback loop is:
1. **You** (profile, goals, limitations) → **Dynamic Plan** (AI-prescribed exercises, loads, targets)
2. → **Log Session** (weight, reps, RPE, notes)
3. → **Session Storage** (Azure Table: `workoutsessions`, `workoutexercises`)
4. → **Analytics Engine** (volume trends, strength curves, plateau detection)
5. → **Claude AI Coach** (reasons over your data, prescribes adjustments)
6. → Loop repeats

### Current Status: Phases 1, 2, 5 Complete
- ✅ Data foundation (user profile, RPE tracking, session notes)
- ✅ Analytics (volume, strength curves, plateau detection)
- ✅ PWA (offline plan access, service worker)
- ⏳ Phase 3 (AI Coach) — Claude integration pending
- ⏳ Phase 4 (Dynamic Plan) — plan in database pending

---

## Codebase Structure

```
liftr/
├── api/                          # Express.js backend on Node 20
│   ├── server.js                # Entry point, route adapter, static serving
│   ├── src/
│   │   ├── shared/tableClient.js # Azure Table Storage client, auth helpers
│   │   ├── sessions/index.js    # GET /api/sessions, POST /api/sessions (create)
│   │   ├── sessions/validation.js # Input validation for session data
│   │   ├── session/index.js     # DELETE /api/session/{id}
│   │   ├── stats/index.js       # GET /api/stats (aggregate progress stats)
│   │   ├── profile/index.js     # GET/PUT /api/profile (user goals, limitations)
│   │   ├── analytics/index.js   # GET /api/analytics (volume, trends, plateaus)
│   │   └── metrics/index.js     # GET /api/metrics (performance data)
│   ├── test/                    # Node built-in test runner (.test.js files)
│   └── package.json             # Scripts: start, build, test
│
├── frontend/                     # Single-file static app (no build step)
│   ├── index.html               # All markup, CSS, JS in one file
│   ├── config.js                # Environment config (API base, key) — rendered on deploy
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker (offline caching)
│   └── icon-*.png               # App icons
│
├── terraform/                    # Azure infrastructure as code
│   ├── main.tf                  # Container Registry, Container Apps, Storage Account, Tables
│   ├── variables.tf             # Input variables
│   ├── outputs.tf               # Terraform outputs (ACR, App URL, etc.)
│   └── terraform.tfvars         # (GITIGNORED) Your Azure subscription details
│
├── docs/                         # Detailed architecture and design docs
│   ├── goal.md                  # Vision, assessment, roadmap (5 phases)
│   ├── backend-design.md        # API surface, data model, error handling
│   ├── frontend-design.md       # UI flows, state model, rendering approach
│   ├── infra-architecture-design.md # Container Apps, Storage, networking
│   └── devops-pipeline.md       # GitHub Actions workflows, OIDC setup
│
├── .github/workflows/
│   ├── ci.yml                   # Runs on PR/push: build, test, Terraform validate
│   └── deploy.yml               # Manual trigger: Terraform apply, Docker build+push
│
├── scripts/
│   └── check-frontend.js        # Syntax check for frontend inline script
│
└── README.md                     # Deployment guide, budget notes, smoke test checklist
```

---

## Key Architectural Patterns

### Backend: Azure Functions Adapter
The API uses **Node.js Express** but is designed to deploy as **Azure Functions** (via Static Web Apps managed API or Container Apps). The `adapt()` function in `server.js` bridges Azure Functions' `(context, req)` signature to Express' `(req, res)`.

**Key design:**
- Handler functions set `context.res = { status, body, headers }` instead of calling `res.json()` / `res.send()`
- This allows the same handler code to run on Azure Functions or plain Express
- See `api/src/sessions/index.js` for an example

### Data Model: Fixed Partition Key
The app is **single-user**, so:
- **Sessions table** (`workoutsessions`) uses fixed partition key `"rohit"`
- **Exercises table** (`workoutexercises`) uses `sessionId` as partition key, enabling efficient queries per session
- Sets are stored as JSON strings (`setsJson`) to keep the schema flat

### Frontend: Single-File Static App
- All HTML, CSS, and JS in **one `index.html`** file
- No build step, no framework, no node_modules on frontend
- Config is injected at deploy time into `frontend/config.js`
- State is in-memory JavaScript (no localStorage persistence yet)
- Rendering uses template strings + `innerHTML` (no XSS mitigation yet — TODO)

### Authentication: Simple Header + CORS
- Each API request sends `X-API-Key: <value>` header
- **⚠️ This is NOT secure** — the key is visible in browser code. Only acceptable for single-user friction.
- If the app becomes multi-user, move to Azure AD or a real session/token backend

---

## API Endpoints (All Require `X-API-Key` Header)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/sessions` | List all sessions (newest first) |
| POST | `/api/sessions` | Create a new session |
| DELETE | `/api/session/{id}` | Delete a session (cascades to exercises) |
| GET | `/api/stats` | Aggregate stats (total sessions, streak, strength progress) |
| GET | `/api/profile` | Get user profile (goals, injuries, experience) |
| PUT | `/api/profile` | Update user profile |
| GET | `/api/analytics` | Volume trends, plateau flags, push/pull/legs balance |
| GET | `/api/metrics` | Performance data (RPE, volume per muscle group) |

**Session payload shape:**
```json
{
  "dayKey": "push1",
  "dayName": "Push Day 1",
  "dayType": "PUSH",
  "date": "2026-06-01T00:00:00.000Z",
  "notes": "optional text",
  "exercises": [
    {
      "name": "DB Flat Bench Press",
      "sets": [
        { "weight": 40, "reps": 8, "rpe": 7 }
      ]
    }
  ]
}
```

---

## Frontend State Model

Key variables in `index.html`:
```js
let activePlanKey = "push1";       // Selected plan day in Plan tab
let selectedDay = null;             // Selected day in Log tab
let setData = {};                   // Unsaved set data: { dayKey: { exerciseName: { setIndex: { weight, reps, rpe } } } }
let sessions = [];                  // Fetched from GET /api/sessions
let statsData = null;               // Fetched from GET /api/stats
let profileData = null;             // Fetched from GET /api/profile
let analyticsData = null;           // Fetched from GET /api/analytics
```

**Main UI flows:**
1. **Plan tab**: Browse hardcoded `PLANS` object, see exercise details, starting weight, progression targets
2. **Log tab**: Select a day, adjust weight/reps with steppers, mark sets complete, save session
3. **History tab**: View previous sessions, expand to see sets, delete, export as JSON
4. **Assess tab**: View stats tiles, strength progress bars, run AI assessment (currently stubbed)

---

## Development Workflow

### Making an API Change
1. Edit `api/src/<endpoint>/index.js`
2. Run `npm run build` (syntax check)
3. Run `npm test` to ensure tests pass
4. Test locally: `npm start`, then `curl -H "X-API-Key: test" http://localhost:3000/api/sessions`

### Making a Frontend Change
1. Edit `frontend/index.html`
2. Reload the browser (local server at `http://127.0.0.1:4173`)
3. Frontend changes are instant (no build step)
4. Check the browser console for JS errors

### Adding a Test
- Create a file matching `api/test/*.test.js`
- Use Node's built-in `test()` function
- Run `npm test` to execute all tests
- Example: `api/test/sessionValidation.test.js`

### Environment Variables (Local Development)
Create `api/local.settings.json` (gitignored):
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "SESSIONS_TABLE_NAME": "workoutsessions",
    "EXERCISES_TABLE_NAME": "workoutexercises",
    "STORAGE_CONNECTION_STRING": "<your-connection-string>",
    "API_SECRET_KEY": "test-key"
  }
}
```

---

## Common Pitfalls & Notes

1. **Streak calculation uses UTC dates** — The `GET /api/stats` endpoint calculates streak via `toISOString()`, which may not match the user's local timezone. See `stats/index.js` for the logic.

2. **Zero-rep sets are rejected** — The frontend and backend both reject sets with `reps === 0` to prevent default plan weights from polluting history.

3. **Single-file frontend limits scale** — `index.html` is getting large. Once it exceeds ~2000 lines, consider splitting into `index.html`, `styles.css`, and `app.js`.

4. **AI assessment is stubbed** — `runAssessment()` in the frontend currently does nothing. When implementing Phase 3, create a new `POST /api/assess` endpoint that calls Claude securely (never expose model API keys to the browser).

5. **CORS is permissive** — The API allows `Access-Control-Allow-Origin: *`. This is fine for a personal app, but should be restricted if it ever becomes public.

6. **No persistent draft storage** — If a user refreshes the page mid-workout, unsaved set data is lost. Recommended: use localStorage to persist `setData` per day.

---

## Testing Locally

### Quick Smoke Test
1. Start the API: `cd api && npm start`
2. In another terminal, start the frontend: `cd frontend && python3 -m http.server 4173`
3. Open `http://127.0.0.1:4173` in a browser
4. Try the Plan tab, Log tab, and Assess tab to ensure no console errors

### With Real Azure Storage
- Set `STORAGE_CONNECTION_STRING` in `api/local.settings.json` to a real Azure Storage connection string
- Sessions will persist in actual Azure Table Storage

### With Azurite (Local Emulation)
- Install Azurite: `npm install -g azurite`
- Run: `azurite` (listens on `127.0.0.1:10000` for blob, table, queue)
- In `local.settings.json`, set: `"AzureWebJobsStorage": "UseDevelopmentStorage=true"`

---

## Important Files to Know

| File | Purpose |
|------|---------|
| `docs/goal.md` | Vision and 5-phase roadmap — read this first |
| `api/src/shared/tableClient.js` | All Azure Table Storage interaction lives here |
| `api/src/sessions/validation.js` | Request validation rules (what makes a valid session/exercise/set) |
| `frontend/index.html` | Entire frontend app |
| `terraform/main.tf` | All Azure resources (Container Apps, Storage, Tables, Registry) |
| `scripts/check-frontend.js` | Used by CI to syntax-check the inline script |
| `README.md` | Deployment, budget notes, manual smoke test checklist |

---

## Deployment Checklist

**Before pushing to main or triggering deploy:**

1. ✅ API builds: `cd api && npm run build`
2. ✅ API tests pass: `cd api && npm test`
3. ✅ Frontend syntax: `node scripts/check-frontend.js`
4. ✅ Terraform validates: `terraform -chdir=terraform validate`
5. ✅ Manual smoke test (see README.md)
6. ✅ No hardcoded secrets in code

**To deploy:**
1. Push to `main` (this triggers CI)
2. Go to GitHub Actions → Deploy workflow → "Run workflow" (manual dispatch)
3. Terraform applies in three phases:
   - Phase 1: Storage Account + Registry
   - Phase 2: Docker build & push
   - Phase 3: Container App

---

## Key Documentation References

For deeper understanding, read these in order:
1. **docs/goal.md** — What the app does and the 5-phase plan
2. **docs/backend-design.md** — API endpoints, data model, error handling strategy
3. **docs/frontend-design.md** — UI flows, state model, rendering patterns
4. **docs/infra-architecture-design.md** — Azure Container Apps, Storage, networking
5. **docs/devops-pipeline.md** — GitHub Actions, OIDC, deployment flow

---

## Current Development Focus

As of June 2026:
- **Phases 1, 2, 5 complete** — user profile, analytics, PWA
- **Phase 3 pending** — AI Coach (Claude integration via `/api/assess` endpoint)
- **Phase 4 pending** — Dynamic Plan storage (move from hardcoded JS to database)

Next priority: implement `/api/assess` endpoint with Claude streaming and context assembly (profile + 8 weeks of sessions + analytics).
