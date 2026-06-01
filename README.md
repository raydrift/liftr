# Liftr

Liftr is a mobile-first personal workout tracker for logging Push/Pull/Legs training sessions, reviewing history, and tracking strength progress.

The V1 target is a lean one-user production deployment on Azure under a `$20/month` budget.

## Architecture

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

## Repository Layout

```text
frontend/   Static single-file app
api/        Node.js Azure Functions API
terraform/ Azure infrastructure
docs/       Architecture and launch docs
```

## Prerequisites

- Node.js 20+
- Azure Functions Core Tools v4
- Terraform
- Azure CLI authenticated to the target subscription
- Existing Azure Resource Group

## Local API

```bash
cd api
npm install
npm run build
npm start
```

`api/local.settings.json` is for local-only settings and must not be committed with real secrets.

Local storage uses `UseDevelopmentStorage=true`, so local API testing requires Azurite or a real Azure Storage connection string.

## Local Frontend

The frontend has no build step.

```bash
cd frontend
cp config.example.js config.js
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

API-backed screens require a reachable Function App and matching `config.js` values.

## Terraform

Copy the example variables file:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Fill in:

- `subscription_id`
- `resource_group_name`
- `storage_account_name`
- `api_secret_key`

Format and validate:

```bash
terraform fmt -recursive terraform
terraform -chdir=terraform init
terraform -chdir=terraform validate
terraform -chdir=terraform plan
```

Apply only after reviewing the plan:

```bash
terraform -chdir=terraform apply
```

## Deploy API

After Terraform creates the Function App:

```bash
cd api
npm install
func azure functionapp publish <function-app-name>
```

The default package script currently points at `rohitfit-func`; update it if your Function App name differs.

## Deploy Frontend

Deploy `frontend/index.html` to the Azure Static Web App.

Terraform outputs:

```bash
terraform -chdir=terraform output static_web_app_url
terraform -chdir=terraform output function_app_url
terraform -chdir=terraform output -raw static_web_app_deployment_token
```

## V1 Security Notes

- Browser-visible API keys are not strong authentication.
- CORS should be restricted to the Static Web App origin.
- The deploy workflow renders `frontend/config.js` from GitHub secrets and Terraform output. This makes V1 functional, but the API key remains visible in browser code.
- Model provider API keys must never be shipped to the browser.
- AI assessment is disabled in the frontend until a backend proxy endpoint is added.
- Do not commit `terraform.tfvars`, `*.tfstate`, `.terraform/`, `api/local.settings.json`, or real secrets.

## Budget Notes

For one user, keep the stack lean:

- Static Web Apps Free
- Functions Consumption
- Azure Table Storage
- Optional low-volume Application Insights only

Avoid Cosmos DB, SQL, containers, App Service paid tiers, and API Management for V1.

Set Azure budget alerts at:

- `$10`
- `$15`
- `$20`

## Verification

Run before launch:

```bash
node --check api/src/shared/tableClient.js
node --check api/src/sessions/index.js
node --check api/src/session/index.js
node --check api/src/stats/index.js
npm --prefix api run build
terraform fmt -check -recursive terraform
terraform -chdir=terraform validate
```

Manual smoke test:

- Plan tab renders.
- Log tab selects a workout day.
- Save blocks empty or zero-rep sessions.
- Completed positive-rep sets save.
- History loads.
- JSON export works.
- Delete works.
- Stats load.
- Deployed URL works on mobile.

## Documentation

- `docs/frontend-design.md`
- `docs/backend-design.md`
- `docs/infra-architecture-design.md`
- `docs/v1-architecture-gap.md`
- `docs/devops-pipeline.md`

## CI/CD

GitHub Actions workflows live in:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

See `docs/devops-pipeline.md` for required Azure service principal setup, GitHub secrets, GitHub variables, and deployment behavior.
