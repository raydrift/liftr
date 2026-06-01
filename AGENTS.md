# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

Liftr is a personal workout tracking app designed for mobile use at the gym.

The app currently consists of:

- `frontend/index.html`: a single-file static web app with embedded HTML, CSS, and JavaScript.
- `api/`: Node.js Azure Functions for workout session persistence and aggregate stats.
- `terraform/`: Azure infrastructure for Static Web App, Function App, Storage Account, and Table Storage.

There is also a sibling directory named `liftr-codebase` one level above this repo. Treat `liftr/` as the source repository and ignore `liftr-codebase` unless the user explicitly asks to compare or migrate from it.

## Current Repository State

This repo is early-stage. At the time this guide was written:

- The actual app folders may be untracked in Git.
- `README.md` is minimal.
- `.gitignore` may not yet be tailored to Node, Azure Functions, and Terraform.
- `api/local.settings.json` exists for local development and should not be committed with real secrets.

Before making changes, run:

```bash
git status --short
```

Do not revert or delete user changes unless the user explicitly asks.

## Tech Stack

Frontend:

- Static HTML/CSS/JavaScript.
- No build step.
- Mobile-first UI with bottom navigation, accordions, steppers, history, stats, and assessment views.

API:

- Azure Functions, Node.js 20+.
- CommonJS modules.
- `@azure/data-tables` for Azure Table Storage.
- Function routes:
  - `GET /api/sessions`
  - `POST /api/sessions`
  - `DELETE /api/session/{id}`
  - `GET /api/stats`

Infrastructure:

- Terraform.
- Azure provider.
- Existing Azure Resource Group is expected.
- Resources include Storage Account, Storage Tables, Linux Function App, Consumption Plan, and Static Web App.

## Important Files

- `frontend/index.html`: main app and UI logic.
- `api/src/shared/tableClient.js`: Table Storage clients, API-key check, JSON response helper.
- `api/src/sessions/index.js`: list and create workout sessions.
- `api/src/session/index.js`: delete a session and its exercises.
- `api/src/stats/index.js`: aggregate workout stats.
- `terraform/main.tf`: Azure resources.
- `terraform/variables.tf`: input variables.
- `terraform/outputs.tf`: deployment outputs.
- `terraform/terraform.tfvars.example`: example local Terraform variables.

## Local Development

API setup:

```bash
cd api
npm install
npm run build
npm start
```

Notes:

- `npm run build` is currently a placeholder.
- `npm start` requires Azure Functions Core Tools.
- Local storage settings use `UseDevelopmentStorage=true`, so local API testing usually requires Azurite or a real Azure Storage connection string.

Frontend setup:

- The frontend is a static file.
- It can be opened directly in a browser for UI-only review.
- API-backed features require `window.ENV_API_BASE` and `window.ENV_API_KEY` to be configured or hardcoded for local testing.

Terraform checks:

```bash
terraform fmt -recursive terraform
terraform -chdir=terraform validate
```

Terraform planning/apply requires Azure credentials and a filled `terraform.tfvars`.

## Coding Guidelines

General:

- Keep changes focused and small.
- Prefer existing patterns over introducing new architecture.
- Do not add a framework unless the user explicitly asks.
- Preserve the single-file frontend unless a broader refactor is requested.
- Avoid committing generated artifacts, local secrets, Terraform state, or OS metadata.

Frontend:

- Keep the app mobile-first and gym-friendly.
- Preserve large tap targets, sticky save behavior, and fast interactions.
- Avoid introducing dependencies unless there is a clear payoff.
- Be careful with `innerHTML`; any API-returned or user-entered text should be escaped before rendering.
- Avoid exposing secrets in the browser. Frontend-visible values are public.
- If adding AI assessment, proxy it through an Azure Function instead of calling model APIs directly from the browser.

API:

- Keep response shapes consistent with the current frontend.
- Use `jsonResponse` for API responses.
- Validate request bodies before writing to Table Storage.
- Treat all client input as untrusted.
- Do not return stack traces or sensitive connection details in production responses.
- Maintain the current Table Storage relationship:
  - Sessions table: fixed user partition, row key is session id.
  - Exercises table: partition key is session id, row key is exercise order/name.

Terraform:

- Run `terraform fmt -recursive terraform` after edits.
- Do not commit `terraform.tfvars`, `.terraform/`, `.terraform.lock.hcl` unless the user wants provider locks tracked, or any `*.tfstate` files.
- Keep resource names variable-driven where practical.
- Do not change Azure regions or resource group assumptions without calling it out.

Security:

- `X-API-Key` in a static frontend is not true security because browser code is visible to users.
- If this app remains single-user and private, consider Azure Static Web Apps auth, Function App auth, or a server-side session flow before exposing personal logs publicly.
- Never commit real API keys, Azure credentials, deployment tokens, connection strings, or Terraform state.

## Known Issues To Address

These are high-priority cleanup items for future agents:

1. Update `.gitignore` for this stack:
   - `api/node_modules/`
   - `api/local.settings.json`
   - `terraform/terraform.tfvars`
   - `terraform/.terraform/`
   - `terraform/*.tfstate`
   - `.DS_Store`

2. Fix session save filtering in `frontend/index.html`.
   - Current logic can save initialized sets with weight but zero reps.
   - Prefer saving only completed sets or sets with `reps > 0`.

3. Move AI assessment server-side.
   - Browser calls to external model APIs cannot safely include API keys.
   - Add an Azure Function such as `POST /api/assessment`.

4. Add validation and escaping.
   - API should validate `dayKey`, `dayName`, `dayType`, exercises, set weight, and reps.
   - Frontend should escape any persisted text before rendering.

5. Improve project documentation.
   - Add local dev steps.
   - Add Azure deploy steps.
   - Explain required environment variables and Terraform variables.

6. Add tests or smoke checks.
   - At minimum, add simple unit-style checks around API request validation and stats aggregation.

## Verification Checklist

After code changes, run the checks that apply:

```bash
node --check api/src/shared/tableClient.js
node --check api/src/sessions/index.js
node --check api/src/session/index.js
node --check api/src/stats/index.js
npm --prefix api run build
terraform fmt -check -recursive terraform
```

If Terraform files changed and credentials are available:

```bash
terraform -chdir=terraform validate
```

For frontend behavior changes:

- Open `frontend/index.html` in a browser.
- Test mobile viewport behavior.
- Verify plan, log, history, and assess tabs.
- Verify no empty zero-rep sets are saved.

## Agent Workflow

When starting a task:

1. Confirm the working directory is the `liftr` repo.
2. Check `git status --short`.
3. Read the relevant files before editing.
4. Keep edits scoped to the user request.
5. Use `apply_patch` for manual edits.
6. Run relevant checks.
7. Summarize changed files, verification performed, and any remaining risks.

When uncertain:

- Prefer preserving existing behavior.
- Ask only if a decision materially changes product direction, security posture, or deployment architecture.
- If the user asks for deployment, verify Azure credentials, Terraform variables, and target resource group before applying infrastructure.

