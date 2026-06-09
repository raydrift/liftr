# Key Vault Setup Guide

This document explains how to set up Azure Key Vault to securely store the Anthropic API key for the Liftr app.

## Prerequisites

- Azure CLI installed (`az`)
- Access to Azure subscription
- Terraform variables configured

## One-Time Setup

### 1. Create Key Vault (if not exists)
```bash
az keyvault create \
  --resource-group YOUR_RESOURCE_GROUP \
  --name liftr-kv \
  --location eastus \
  --enable-purge-protection false \
  --enable-soft-delete true
```

### 2. Store Anthropic API Key
```bash
az keyvault secret set \
  --vault-name liftr-kv \
  --name anthropic-api-key \
  --value 'sk-ant-api03-...'
```

### 3. Grant Container App Managed Identity Access
This is done automatically by Terraform, but for manual verification:
```bash
# Get Container App identity
IDENTITY_ID=$(az containerapp identity show \
  --name liftr-app \
  --resource-group YOUR_RESOURCE_GROUP \
  --query principalId -o tsv)

# Assign "Key Vault Secrets User" role (minimal permission: get, list only)
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $IDENTITY_ID \
  --scope /subscriptions/SUBSCRIPTION_ID/resourcegroups/YOUR_RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/liftr-kv
```

## Terraform Variables

Add to `terraform.tfvars`:
```hcl
key_vault_name              = "liftr-kv"
key_vault_resource_group    = "YOUR_RESOURCE_GROUP"
```

## GitHub Actions Setup

Add to GitHub organization/repository secrets:
```
ANTHROPIC_API_KEY = sk-ant-api03-...
```

Add to GitHub organization/repository variables:
```
KEY_VAULT_NAME = liftr-kv
KEY_VAULT_RESOURCE_GROUP = YOUR_RESOURCE_GROUP
```

## How It Works

1. **GitHub Actions** runs deploy workflow
2. **Azure CLI** stores/updates the secret in Key Vault
3. **Terraform**:
   - References Key Vault (data source)
   - Creates managed identity for Container App
   - Assigns "Key Vault Secrets User" RBAC role (least privilege)
   - Configures Container App to use the identity
4. **Container App** at runtime:
   - Uses managed identity (no credentials in code)
   - Retrieves secret from Key Vault
   - Sets `ANTHROPIC_API_KEY` environment variable
5. **API code** reads `process.env.ANTHROPIC_API_KEY` (same as before)

## Security Benefits

✅ **Zero credentials in code** — Key never stored in Git, Terraform state, or code
✅ **RBAC scoped** — Container App can only read this one secret
✅ **Auto-rotation** — Update Key Vault secret, container restarts automatically
✅ **Audit trail** — All access logged in Azure Activity Log
✅ **Least privilege** — "Key Vault Secrets User" role (get, list only)

## Troubleshooting

### Container App can't read secret
```bash
# Check identity has access
az role assignment list --assignee $IDENTITY_ID

# Verify secret exists
az keyvault secret show --vault-name liftr-kv --name anthropic-api-key
```

### Update secret without redeploying
```bash
az keyvault secret set \
  --vault-name liftr-kv \
  --name anthropic-api-key \
  --value 'NEW_KEY_HERE'

# Container App will pick it up automatically
```

### Verify running container has the key
```bash
# SSH into container
az containerapp exec \
  --name liftr-app \
  --resource-group YOUR_RESOURCE_GROUP

# Check env var is set
echo $ANTHROPIC_API_KEY
```
