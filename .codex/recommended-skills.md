# Recommended Codex Skills, Files, and MCP Setup

This project benefits from a small set of focused Codex skills and optional connectors.

## Recommended Skills

### Browser

Use when changing or verifying the static frontend.

Best for:

- Opening `frontend/index.html`.
- Testing mobile layout.
- Checking tap targets, accordions, sticky save button, and navigation.
- Capturing screenshots after UI changes.

Suggested use:

- Use the in-app Browser plugin after meaningful frontend edits.
- Test both desktop and mobile-sized viewports.

### GitHub

Use when publishing the repo, opening pull requests, or inspecting CI.

Best for:

- Pushing the initial app code.
- Creating a pull request.
- Reviewing GitHub Actions failures if CI is added.
- Reading PR comments and addressing requested changes.

Suggested use:

- Enable the GitHub connector/plugin when the user asks to push, create PRs, inspect issues, or fix checks.

### OpenAI Docs

Use only if adding OpenAI API features or comparing current OpenAI models.

Best for:

- Adding an AI assessment endpoint using OpenAI APIs.
- Choosing current model names and request formats.
- Verifying latest API docs from official OpenAI sources.

Note:

- The current frontend mentions Anthropic/Claude. If the user specifically wants Claude, use Anthropic official docs instead of OpenAI-specific guidance.

### Skill Creator

Use if the user wants a custom reusable Codex skill for Liftr.

Best for:

- Creating a project-specific `liftr` skill.
- Encoding workout-app review/deploy conventions.
- Reusing this workflow across future threads.

### Plugin Creator

Use only if the user wants a local Codex plugin.

Best for:

- Bundling Liftr-specific skills, commands, or MCP instructions into a reusable local plugin.

## Recommended MCP / Connector Setup

### GitHub MCP / Connector

Recommended if the repo will be pushed to GitHub.

Use for:

- Repo inspection.
- PR creation.
- Issue triage.
- CI logs.

Do not use for:

- Local edits that can be done directly in the workspace.

### Browser MCP / In-App Browser

Recommended for frontend validation.

Use for:

- Visual smoke testing.
- Responsive checks.
- Confirming the app is not blank after JavaScript edits.

### Azure MCP / CLI Access

Optional but useful for deployment work.

Use for:

- Inspecting Azure resource groups.
- Checking Function App deployment status.
- Inspecting Static Web App resources.
- Reading logs after deployment failures.

If Azure MCP is unavailable, use Azure CLI only after confirming credentials and target subscription/resource group.

### Terraform CLI

Required for infrastructure work.

Use for:

- `terraform fmt`
- `terraform validate`
- `terraform plan`
- `terraform apply`

Agents should not run `terraform apply` without explicit user approval.

## Recommended `.codex` Files

The repo now includes:

- `AGENTS.md`: primary agent operating guide.
- `.codex/recommended-skills.md`: this file.

Potential future additions:

- `.codex/project-notes.md`: product decisions, deployment URLs, and Azure resource names.
- `.codex/runbook.md`: exact local dev, test, deploy, and rollback commands.
- `.codex/security-checklist.md`: secrets, auth, CORS, validation, and dependency review.

## Suggested Future Project-Specific Skill

If this app will be maintained through Codex often, create a custom skill named `liftr-maintainer`.

Recommended skill behavior:

- Read `AGENTS.md` first.
- Treat `frontend/index.html` as a single-file app unless the task asks for refactoring.
- Run `node --check` on Azure Function files after API edits.
- Run `terraform fmt -check -recursive terraform` after Terraform edits.
- Use Browser for frontend visual verification.
- Flag any browser-exposed secrets.
- Warn before deployment or Terraform apply.

## High-Value Agent Tasks For This Repo

Recommended next tasks:

1. Replace the generic `.gitignore` with one tailored to Node, Azure Functions, Terraform, and macOS.
2. Expand `README.md` into a real setup/deploy guide.
3. Fix the zero-rep session save bug.
4. Move AI assessment behind an Azure Function.
5. Add request validation and frontend escaping.
6. Add minimal API smoke tests.
7. Add GitHub Actions for syntax checks and Terraform formatting.

