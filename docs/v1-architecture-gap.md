# V1 Architecture Gap Assessment

## Context

Liftr is targeting a first production launch for one user with an Azure subscription budget of about `$20/month`.

The right V1 posture is not enterprise-grade overengineering. It is a lean personal production setup that protects workout data, avoids runaway cost, keeps deployment repeatable, and preserves a clear path to future hardening.

## Current State

The project currently has:

- A mobile-first static frontend in `frontend/index.html`.
- Azure Functions API code in `api/`.
- Azure Table Storage persistence through `@azure/data-tables`.
- Terraform infrastructure in `terraform/`.
- Design docs under `docs/`.
- Agent guidance in `AGENTS.md` and `.codex/recommended-skills.md`.

The repo is still pre-launch, but several P0 gaps have now been implemented locally:

- App folders are still untracked in Git.
- `.gitignore` is now tailored to Node, Terraform, Azure Functions, and macOS.
- `README.md` now contains local setup, Terraform, deployment, budget, and verification notes.
- Terraform formatting now passes.
- Terraform validation passes after provider initialization.
- No real tests exist.
- Some security and launch-readiness gaps remain.

## Target V1 Architecture

For a one-user app under `$20/month`, target this architecture:

```text
Mobile Browser
    |
    v
Azure Static Web Apps Free
    |
    v
Azure Functions Consumption
    |
    v
Azure Storage Account Standard LRS
    |
    +-- Azure Table: workoutsessions
    +-- Azure Table: workoutexercises
```

Optional for V1:

- Application Insights with low-volume logging and conservative retention.
- GitHub Actions for checks and deployment.

Avoid for V1:

- Cosmos DB.
- Azure SQL.
- App Service Plan beyond Consumption.
- Container Apps.
- API Management.
- Key Vault unless model/API secrets become more complex.
- Multi-user auth/authorization design.

## Budget Fit

This architecture should fit comfortably inside `$20/month` for one user if configured carefully.

Expected cost profile:

- Static Web Apps Free: near `$0`.
- Functions Consumption: likely near `$0` for personal usage.
- Table Storage: very low for workout logs.
- Storage Account: small baseline cost.
- Application Insights: can become noisy if logs are verbose.

Budget controls required before launch:

- Azure budget alert at `$10`.
- Azure budget alert at `$15`.
- Azure budget alert at `$20`.
- Avoid verbose telemetry ingestion.
- Avoid provisioning non-V1 services.

## V1 Launch Gate

V1 is launchable only when these are true:

- Source-controlled app code is clean and committed.
- No local secrets, Terraform state, or OS junk are committed.
- User can save, view, delete, and assess workout history without corrupt data.
- API rejects invalid payloads.
- Frontend does not expose third-party model API keys.
- Terraform can format and validate.
- Deployment steps are documented.
- Mobile smoke test passes on the real deployed URL.

## Gap Register

### P0: Source Control Hygiene

Current gap:

- `api/`, `frontend/`, `terraform/`, `docs/`, `.codex/`, and `AGENTS.md` are untracked.
- `.DS_Store` is untracked.
- `.gitignore` is currently not aligned to this stack.

Required V1 outcome:

- All source files needed for the app are tracked.
- Local-only files are ignored.
- Repo can be cloned and understood by another agent or developer.

Recommended changes:

- Replace or extend `.gitignore` with:
  - `.DS_Store`
  - `api/node_modules/`
  - `api/local.settings.json`
  - `terraform/.terraform/`
  - `terraform/terraform.tfvars`
  - `terraform/*.tfstate`
  - `terraform/*.tfstate.*`
  - deployment artifacts and logs

Agent/MCP:

- Use local Codex editing tools.
- GitHub connector only when pushing or opening a PR.

### P0: Workout Save Data Integrity

Original gap:

- Frontend initializes each set with a positive starting weight and `0` reps.
- Save filtering currently allows `weight > 0`, which can persist zero-rep sets.

Implemented V1 outcome:

- Saved sessions contain only meaningful performed sets.
- Stats are not polluted by unperformed sets.

Implemented changes:

- Frontend saves only sets where `done && reps > 0`.
- Frontend blocks save with a toast when no positive-rep completed sets exist.
- Backend validation rejects non-positive reps.

Agent/MCP:

- Use Browser skill for mobile flow verification.
- Use local syntax checks after edits.

### P0: Browser-Exposed AI Assessment

Current gap:

- Frontend attempts to call Anthropic directly from browser code.
- This cannot safely protect API keys.
- Current headers are incomplete for a real Anthropic API call.

Required V1 outcome:

- No model provider key exists in browser code.
- Assessment either works through backend proxy or is disabled for V1.

Recommended V1 options:

1. Disable AI assessment button for first launch and label it `Coming soon`.
2. Or add `POST /api/assessment` Azure Function.

Preferred path:

- Add `POST /api/assessment`.
- Store model API key in Function App app settings.
- Frontend sends workout stats/session summary to the Function.
- Function calls model provider and returns text response.
- Add basic rate limiting or cooldown for one-user budget control.

Agent/MCP:

- Use official provider docs if implementing model API.
- Use OpenAI Docs skill only if switching to OpenAI.
- For Anthropic, use official Anthropic docs via browser/web lookup if exact API details are needed.
- Use Azure MCP or CLI only for setting app settings during deployment.

### P0: Backend Validation

Current gap:

- `POST /api/sessions` only checks for `dayKey` and non-empty `exercises`.
- API trusts client data too much.

Required V1 outcome:

- Malformed or malicious payloads are rejected before Table Storage writes.

Recommended validation:

- `dayKey` must be one of `push1`, `pull1`, `legs`, `push2`, `pull2`.
- `dayType` must be one of `PUSH`, `PULL`, `LEGS`.
- `date` must be valid ISO if supplied.
- Exercise names must be non-empty and bounded length.
- Sets must be arrays with bounded length.
- `weight` must be a finite number `>= 0`.
- `reps` must be a positive integer for saved sets.

Agent/MCP:

- Use local Codex tools.
- Add small pure JS validation helpers.
- Add API unit-style smoke tests if introducing test framework.

### P0: Frontend Stored XSS Protection

Current gap:

- The frontend renders API-returned values with template strings and `innerHTML`.
- Persisted strings can become executable HTML if data is malformed or compromised.

Required V1 outcome:

- Persisted text is escaped before rendering.

Recommended changes:

- Add `escapeHtml(value)`.
- Use it for:
  - session day names
  - day types
  - exercise names
  - set display values if not strictly numeric
  - notes if added later

Agent/MCP:

- Use Browser skill to verify UI still renders correctly.

### P0: Terraform Readiness

Current gap:

- `terraform fmt -check -recursive terraform` reports `terraform/main.tf`.
- No confirmed `terraform validate` or `plan` has been run against real credentials/vars.

Required V1 outcome:

- Terraform is formatted.
- Terraform validates.
- Terraform plan is reviewed before apply.
- Terraform state is protected from Git.

Recommended changes:

- Run `terraform fmt -recursive terraform`.
- Fill local `terraform.tfvars`.
- Run `terraform -chdir=terraform validate`.
- Run `terraform -chdir=terraform plan`.
- For V1 solo launch, local state is acceptable only if backed up privately and never committed.
- Remote state is better if budget and setup effort are acceptable.

Agent/MCP:

- Use Terraform CLI.
- Use Azure MCP/CLI only when inspecting real Azure resources.
- Never run `terraform apply` without explicit user approval.

### P1: README And Runbook

Original gap:

- README is only a placeholder.

Implemented V1 outcome:

- A developer can deploy and operate the app from documentation.

Implemented README sections:

- What Liftr is.
- Architecture summary.
- Local frontend run.
- Local API run.
- Required tools.
- Environment variables.
- Terraform setup.
- Deploy API.
- Deploy frontend.
- Monthly budget notes.
- Troubleshooting.

Agent/MCP:

- Local Codex editing.
- No external MCP required.

### P1: Runtime Frontend Configuration

Current gap:

- API base URL is hardcoded to a specific Function App URL fallback.
- `window.ENV_API_KEY` has no clear deployment mechanism.

Required V1 outcome:

- Environment-specific values are not hardcoded in core app source.

Recommended changes:

- Add `frontend/config.js` loaded before app script.
- Define:

```js
window.LIFTR_CONFIG = {
  API_BASE: "https://<function-app>.azurewebsites.net/api"
};
```

- Remove browser API key if using platform auth.
- If retaining API key for V1, understand it is visible and only light friction.

Agent/MCP:

- Browser skill for verification.

### P1: Observability

Current gap:

- No explicit Application Insights resource in Terraform.
- Logs exist only through Function runtime defaults.

Required V1 outcome:

- Failures are diagnosable without blowing budget.

Recommended changes:

- Add Application Insights only if retention/sampling is controlled.
- Log:
  - validation failures
  - storage failures
  - assessment failures
  - delete failures
- Avoid logging full workout payloads unless debugging locally.

Agent/MCP:

- Azure MCP/CLI useful after deployment.
- Terraform CLI for provisioning.

### P1: Backup And Export

Original gap:

- Workout data lives only in Table Storage.
- No user-facing export.

Implemented V1 outcome:

- User can recover or export workout history.

Implemented V1 option:

- Add frontend `Export JSON` button using `GET /api/sessions`.
- Optional `Export CSV` remains a later improvement.

Agent/MCP:

- Browser skill for UI verification.

### P1: CI Checks

Current gap:

- No GitHub Actions.
- No automated syntax or Terraform checks.

Required V1 outcome:

- Basic checks run before merge/deploy.

Recommended GitHub Actions:

- Node syntax checks.
- `npm --prefix api run build`.
- `terraform fmt -check -recursive terraform`.

Agent/MCP:

- GitHub connector for PR/CI management.

## Recommended V1 Workstreams

### Workstream 1: Repo Hygiene

Owner agent profile:

- Local coding agent.

Skills/MCP:

- No external MCP required.
- GitHub connector when ready to push.

Deliverables:

- Clean `.gitignore`.
- Remove `.DS_Store` from working tree.
- Track app source files.
- Updated README skeleton.

### Workstream 2: Data Correctness

Owner agent profile:

- Frontend/backend coding agent.

Skills/MCP:

- Browser skill for UI smoke test.

Deliverables:

- Fixed save filtering.
- Backend validation.
- Frontend escaping.
- Syntax checks pass.

### Workstream 3: Secure Assessment

Owner agent profile:

- Backend/API agent.

Skills/MCP:

- Official model provider docs.
- Azure MCP/CLI for app settings if deploying.

Deliverables:

- Either disabled V1 assessment or backend `POST /api/assessment`.
- No model key in frontend.
- Basic cooldown/rate control.

### Workstream 4: Azure Launch

Owner agent profile:

- Infra/deployment agent.

Skills/MCP:

- Terraform CLI.
- Azure MCP/CLI.
- GitHub connector if using Actions.

Deliverables:

- Formatted Terraform.
- Validated Terraform.
- Reviewed plan.
- Budget alerts.
- Deployment runbook.

### Workstream 5: Mobile Production Smoke Test

Owner agent profile:

- Browser/UI validation agent plus manual phone check.

Skills/MCP:

- Browser skill.

Deliverables:

- Plan tab works.
- Log/save flow works.
- History loads.
- Delete works.
- Stats load.
- Deployed URL works on mobile.

## V1 Acceptance Checklist

Before calling V1 production-ready:

- [ ] `.gitignore` is correct.
- [ ] No secrets or state files are tracked.
- [ ] App source is committed.
- [ ] README has setup and deploy instructions.
- [ ] Zero-rep save bug is fixed.
- [ ] Backend validates session payloads.
- [ ] Frontend escapes persisted values.
- [ ] AI call is backend-proxied or disabled.
- [ ] CORS is restricted to the frontend origin.
- [ ] Terraform formatting passes.
- [ ] Terraform validation passes.
- [ ] Terraform plan has been reviewed.
- [ ] Azure budget alerts are configured.
- [ ] API deploy succeeds.
- [ ] Frontend deploy succeeds.
- [ ] Mobile smoke test passes.
- [ ] Export or backup path exists, even if simple JSON export.

## Go / No-Go Decision

Current status:

```text
NO-GO for production.
GO for local demo and continued hardening.
```

Expected status after P0 completion:

```text
GO for private one-user V1 production.
```

Expected status after P1 completion:

```text
GO for stable personal production with low operational risk.
```
