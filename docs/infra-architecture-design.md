# Infrastructure Architecture Design

## Purpose

Liftr is designed to run cheaply on Azure as a personal, mobile-first workout tracker. The infrastructure favors serverless services, low operational overhead, and simple Terraform-managed provisioning.

The current infrastructure lives in:

```text
terraform/
├── main.tf
├── outputs.tf
├── terraform.tfvars.example
└── variables.tf
```

## High-Level Architecture

```text
Mobile Browser
    |
    v
Azure Static Web App
    |
    v
Static Web Apps managed API
    |
    v
Azure Storage Account
    |
    +-- workoutsessions table
    +-- workoutexercises table
```

The Static Web App serves `frontend/index.html`.

The Static Web Apps managed API exposes HTTP endpoints under `/api`.

Azure Table Storage persists sessions and exercise data.

## Azure Resources

### Storage Account

Terraform resource:

```text
azurerm_storage_account.main
```

Purpose:

- Hosts the Azure Tables used by the app.
- Provides the connection string used by the managed API.

Configuration:

- Standard tier.
- Locally redundant storage.
- Name supplied by `var.storage_account_name`.

### Storage Tables

Terraform resources:

```text
azurerm_storage_table.sessions
azurerm_storage_table.exercises
```

Tables:

- `workoutsessions`
- `workoutexercises`

Responsibilities:

- `workoutsessions`: one entity per workout session.
- `workoutexercises`: one entity per exercise inside a workout session.

### Static Web App

Terraform resource:

```text
azurerm_static_web_app.main
```

Purpose:

- Hosts the static frontend.
- Hosts the managed Azure Functions API under `/api`.

Configuration:

- Free tier.
- Region supplied by `var.static_web_app_location`.
- App settings supply the API with storage connection details and `API_SECRET_KEY`.

Deployment:

- Terraform outputs `static_web_app_deployment_token`.
- GitHub Actions deploys both `frontend/` and `api/`.

## Terraform Inputs

Key variables:

```text
subscription_id
resource_group_name
location
static_web_app_location
app_name
storage_account_name
api_secret_key
tags
```

Expected deployment model:

- Azure subscription already exists.
- Azure resource group already exists.
- Terraform provisions app-specific resources into that resource group.

## Terraform Outputs

Current outputs:

- `api_base_url`
- `static_web_app_url`
- `static_web_app_deployment_token`
- `storage_account_name`

The deployment token is marked sensitive.

## Environment And Secrets

### Local Development

Local Function settings are stored in:

```text
api/local.settings.json
```

This file should remain local-only and should not contain production secrets in Git.

### Static Web Apps Managed API

Terraform sets app settings directly on the Static Web App. These settings are available to the managed API.

Sensitive setting:

```text
API_SECRET_KEY
```

Storage connection strings are also sensitive and should not be exposed outside Azure configuration or Terraform state.

### Terraform State

Terraform state will contain sensitive values, including storage keys and app settings.

Current backend:

- Azure Storage remote backend for production deploys.
- CI uses `terraform init -backend=false` only for validation.

Recommendation:

- Protect state access tightly.
- Never commit `*.tfstate` files.

## Deployment Flow

Recommended flow:

1. Fill Terraform variables.

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

2. Initialize and apply Terraform.

```bash
terraform -chdir=terraform init
terraform -chdir=terraform plan
terraform -chdir=terraform apply
```

3. Deploy Azure Functions.

```bash
cd api
npm install
func azure functionapp publish <function-app-name>
```

4. Deploy frontend to Static Web App.

Options:

- Manual deployment using Static Web Apps deployment token.
- GitHub Actions.

5. Configure frontend runtime values.

The frontend needs:

```js
window.ENV_API_BASE
window.ENV_API_KEY
```

Current implementation falls back to:

```text
https://liftr-web.azurestaticapps.net/api
```

Recommended improvement:

- Add a deployment-safe runtime config file such as `config.js`.
- Avoid hardcoding environment-specific URLs into `index.html`.

## Network And Security Design

Current security posture:

- API endpoints are anonymous at Azure Functions trigger level.
- Application code checks an `X-API-Key` header.
- Frontend is static and expected to send that key.

Risk:

- Any browser-exposed key is visible to users and is not strong authentication.
- With wildcard CORS, accidental public access becomes easier.

Recommended security posture for personal production:

1. Prefer same-origin Static Web Apps API calls under `/api`.
2. Remove wildcard CORS from application responses.
3. Move any model API calls to the backend.
4. Consider Azure Static Web Apps authentication if the app is reachable publicly.
5. Store model API keys only in Static Web Apps managed API app settings or Key Vault.

Recommended security posture for multi-user future:

1. Add identity provider-backed authentication.
2. Use user-specific partition keys.
3. Add authorization checks on every data access.
4. Stop using a single shared API key.

## Observability

Current infrastructure does not explicitly provision Application Insights.

Managed Functions can integrate with Application Insights-compatible observability for:

- Request traces.
- Function errors.
- Cold start visibility.
- Dependency failures against Table Storage.

Recommended improvement:

- Add Application Insights-compatible observability if needed.
- Add structured logs for session creation, deletion, and stats computation failures.

## Cost Profile

The architecture is intentionally low-cost:

- Static Web Apps Free tier.
- Static Web Apps managed API.
- Azure Table Storage in a Standard LRS account.

For a single user, expected cost should be very low, dominated by storage account minimums and tiny transaction volume.

## Reliability Considerations

Current reliability characteristics:

- Static frontend is highly available through Azure Static Web Apps.
- Functions may cold start on Consumption plan.
- Azure Table Storage is durable within the configured replication model.

Tradeoffs:

- LRS is cheaper but less resilient than zone-redundant or geo-redundant options.
- No backup/export workflow currently exists for workout logs.
- No retry strategy is implemented in the frontend beyond user retry.

Recommended improvement:

- Add a simple export endpoint or frontend export button.
- Consider periodic Table Storage backup if the data becomes important.
- Add clearer offline/error states in the frontend.

## Recommended Infrastructure Evolution

Near-term:

1. Format Terraform consistently.
2. Add a proper `.gitignore` for Terraform state and local variables.
3. Configure remote Terraform state.
4. Add Application Insights.
5. Add a runtime frontend config strategy.

Medium-term:

1. Add GitHub Actions for Terraform formatting and API syntax checks.
2. Add GitHub Actions deployment for frontend and API.
3. Move secrets to Key Vault if additional third-party API keys are introduced.
4. Add production/staging environment separation if needed.

Long-term:

1. Add authentication and per-user partitioning if the app expands beyond one user.
2. Add custom domain and HTTPS configuration.
3. Add backup/export automation for workout data.
