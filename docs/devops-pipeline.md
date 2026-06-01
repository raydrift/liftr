# DevOps Pipeline

## Overview

Liftr uses GitHub Actions for CI and production deployment to Azure.

The pipeline is intentionally lean for a one-user app with a `$20/month` Azure budget:

- Build and test the Azure Functions API.
- Parse-check the static frontend JavaScript.
- Format-check and validate Terraform.
- Provision Azure resources with Terraform.
- Deploy the Function App.
- Deploy the Static Web App.

## Workflows

### CI

File:

```text
.github/workflows/ci.yml
```

Runs on:

- Pull requests.
- Pushes to `main`.

Checks:

- API dependency install.
- API syntax build.
- API unit tests.
- Frontend JavaScript parse check.
- Terraform format check.
- Terraform init without backend.
- Terraform validate.

### Deploy

File:

```text
.github/workflows/deploy.yml
```

Runs on:

- Manual dispatch.

Deployment target:

- GitHub Actions environment: `production`.

Steps:

1. Build and test API.
2. Check frontend JavaScript.
3. Terraform init, validate, plan, apply.
4. Render `frontend/config.js` from Terraform output and GitHub secrets.
5. Azure login.
6. Deploy Azure Functions API.
7. Read Static Web App deployment token from Azure.
8. Deploy `frontend/` to Azure Static Web Apps.

## Required GitHub Variables

Create these under repository settings:

```text
AZURE_RESOURCE_GROUP
AZURE_LOCATION
AZURE_STATIC_WEB_APP_LOCATION
APP_NAME
STORAGE_ACCOUNT_NAME
```

Recommended values for the current Terraform defaults:

```text
AZURE_LOCATION=eastus
AZURE_STATIC_WEB_APP_LOCATION=eastus2
APP_NAME=rohitfit
```

`STORAGE_ACCOUNT_NAME` must be globally unique, lowercase, alphanumeric, and 3-24 characters.

## Required GitHub Secrets

Create these under repository secrets:

```text
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
AZURE_SUBSCRIPTION_ID
AZURE_TENANT_ID
AZURE_CREDENTIALS
API_SECRET_KEY
```

`AZURE_CREDENTIALS` is the JSON consumed by `azure/login`:

```json
{
  "clientId": "<AZURE_CLIENT_ID>",
  "clientSecret": "<AZURE_CLIENT_SECRET>",
  "subscriptionId": "<AZURE_SUBSCRIPTION_ID>",
  "tenantId": "<AZURE_TENANT_ID>"
}
```

Terraform uses the individual `AZURE_*` secrets through `ARM_*` environment variables.

## Azure Service Principal

Create a service principal scoped to the existing resource group.

Minimum practical role for V1:

```text
Contributor
```

Scope it to the resource group, not the full subscription, unless there is a specific reason.

## Production Environment Gate

The deploy workflow uses:

```yaml
environment: production
```

Recommended GitHub environment settings:

- Require manual approval before deployment.
- Restrict deployment branches to `main`.
- Store production secrets at the environment level if you want tighter control.

## Budget Controls

Production deployment is manual-only in V1. Keep it that way until cost alerts and GitHub environment approval are configured.

Before enabling automatic deployment, configure Azure budget alerts:

- `$10`
- `$15`
- `$20`

Avoid adding paid services outside the Terraform V1 architecture:

- No Cosmos DB.
- No Azure SQL.
- No containers.
- No API Management.
- No paid App Service plan.

## Notes

- Terraform uses `-backend=false` in CI/CD for the current V1 setup. For a more durable production setup, configure remote Terraform state in Azure Storage and remove `-backend=false`.
- The deploy workflow reads the Static Web App deployment token from Azure instead of storing it as a GitHub secret.
- The deploy workflow writes `frontend/config.js` at deploy time. This config includes the Function App URL and V1 API key. That key is visible to browser users; use platform auth before opening the app beyond private use.
- AI assessment remains disabled in the frontend until a backend proxy endpoint is added.
