# DevOps Pipeline

## Overview

Liftr uses GitHub Actions for CI and production deployment to Azure.

The pipeline is intentionally lean for a one-user app with a `$20/month` Azure budget:

- Build and test the Azure Functions API code.
- Parse-check the static frontend JavaScript.
- Format-check and validate Terraform.
- Provision Azure resources with Terraform.
- Deploy the Static Web App and its managed API.

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
3. Authenticate to Azure with GitHub OIDC.
4. Bootstrap Azure Storage for Terraform remote state.
5. Terraform init against remote state, validate, plan, apply.
6. Render `frontend/config.js` from Terraform output and GitHub secrets.
7. Read Static Web App deployment token from Azure.
8. Deploy `frontend/` and `api/` to Azure Static Web Apps.

The frontend includes `staticwebapp.config.json` to pin the managed API runtime to Node.js 20.

## Required GitHub Variables

Create these under repository settings:

```text
AZURE_RESOURCE_GROUP
AZURE_LOCATION
AZURE_STATIC_WEB_APP_LOCATION
APP_NAME
STORAGE_ACCOUNT_NAME
TF_STATE_RESOURCE_GROUP
TF_STATE_STORAGE_ACCOUNT
TF_STATE_CONTAINER
TF_STATE_KEY
```

Recommended values for the current Terraform defaults:

```text
AZURE_RESOURCE_GROUP=liftr
AZURE_LOCATION=eastus
AZURE_STATIC_WEB_APP_LOCATION=eastus2
APP_NAME=liftr
STORAGE_ACCOUNT_NAME=liftrstore
TF_STATE_RESOURCE_GROUP=liftr
TF_STATE_STORAGE_ACCOUNT=liftrtfstate43840064
TF_STATE_CONTAINER=tfstate
TF_STATE_KEY=liftr-prod.tfstate
```

`STORAGE_ACCOUNT_NAME` and `TF_STATE_STORAGE_ACCOUNT` must be globally unique, lowercase, alphanumeric, and 3-24 characters.

## Required GitHub Secrets

Create these under repository secrets:

```text
AZURE_CLIENT_ID
AZURE_SUBSCRIPTION_ID
AZURE_TENANT_ID
API_SECRET_KEY
```

No Azure client secret is required. The deploy workflow uses GitHub OIDC through `azure/login` and Terraform `ARM_USE_OIDC=true`.

## Terraform Remote State

Production deploys store Terraform state in Azure Blob Storage:

```text
Resource group: liftr
Storage account: liftrtfstate43840064
Container: tfstate
State key: liftr-prod.tfstate
```

The deploy workflow bootstraps this storage account and container before `terraform init`.

The `liftr` resource group must already exist. The GitHub deployment identity is intentionally scoped to the resource group and should not need subscription-wide permission to create resource groups.

CI still uses:

```bash
terraform -chdir=terraform init -backend=false
```

That keeps pull-request and push validation independent of Azure credentials. Only the production deploy workflow reads and writes remote state.

## Azure OIDC Identity

The deploy workflow can use either:

- A user-assigned managed identity with a federated credential.
- A Microsoft Entra app registration with a service principal and federated credential.

Use the managed identity path if you do not have Entra app-registration access.

Minimum practical role for V1 is:

```text
Contributor
```

Scope it to the resource group, not the full subscription, unless there is a specific reason.

### Option A: User-Assigned Managed Identity

This path does not require creating an Entra app registration manually.

You still need Azure permission to:

- Create resources in the `liftr` resource group.
- Create a user-assigned managed identity.
- Assign RBAC roles, or have an Azure owner assign the role for you.
- Read storage account keys for Terraform remote state bootstrap.

Create the managed identity and federated credential:

```bash
az group create --name liftr --location eastus

az identity create \
  --name liftr-github-actions \
  --resource-group liftr \
  --location eastus

IDENTITY_CLIENT_ID=$(az identity show \
  --name liftr-github-actions \
  --resource-group liftr \
  --query clientId \
  --output tsv)

IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name liftr-github-actions \
  --resource-group liftr \
  --query principalId \
  --output tsv)

az role assignment create \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role Contributor \
  --scope "/subscriptions/<AZURE_SUBSCRIPTION_ID>/resourceGroups/liftr"

az identity federated-credential create \
  --name github-liftr-production \
  --identity-name liftr-github-actions \
  --resource-group liftr \
  --issuer https://token.actions.githubusercontent.com \
  --subject repo:raydrift/liftr:environment:production \
  --audiences api://AzureADTokenExchange
```

Use these GitHub secret values:

```text
AZURE_CLIENT_ID=<IDENTITY_CLIENT_ID>
AZURE_SUBSCRIPTION_ID=<your subscription id>
AZURE_TENANT_ID=<your tenant id>
API_SECRET_KEY=<random private API key>
```

### Option B: Entra App Registration

Use this path only if you have permission to create Entra app registrations.

```bash
az ad app create --display-name liftr-github-actions

APP_ID=$(az ad app list \
  --display-name liftr-github-actions \
  --query "[0].appId" \
  --output tsv)

az ad sp create --id "$APP_ID"

az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/<AZURE_SUBSCRIPTION_ID>/resourceGroups/liftr"

az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters '{
    "name": "github-liftr-production",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:raydrift/liftr:environment:production",
    "description": "GitHub Actions production deploy for raydrift/liftr",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

Use these GitHub secret values:

```text
AZURE_CLIENT_ID=<APP_ID>
AZURE_SUBSCRIPTION_ID=<your subscription id>
AZURE_TENANT_ID=<your tenant id>
API_SECRET_KEY=<random private API key>
```

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
- No standalone Function App.
- No App Service plan.

## Notes

- CI uses `-backend=false`; production deploy uses Azure Storage remote state.
- The deploy workflow reads the Static Web App deployment token from Azure instead of storing it as a GitHub secret.
- The deploy workflow writes `frontend/config.js` at deploy time. This config includes the Static Web Apps managed API URL and V1 API key. That key is visible to browser users; use platform auth before opening the app beyond private use.
- AI assessment remains disabled in the frontend until a backend proxy endpoint is added.
