variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "resource_group_name" {
  description = "Existing resource group name"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus"
}

variable "app_name" {
  description = "Base name for all resources (keep short, lowercase, no special chars)"
  type        = string
  default     = "liftr"
}

variable "storage_account_name" {
  description = "Storage account name (3-24 chars, lowercase alphanumeric only, globally unique)"
  type        = string
  # Example: "liftrstore" — must be globally unique across all Azure
}

variable "api_secret_key" {
  description = "Simple secret key sent in X-API-Key header from frontend — keeps app private"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for signing JWT session tokens (if not provided, a random one will be generated)"
  type        = string
  sensitive   = true
  default     = null
}

variable "key_vault_name" {
  description = "Existing Key Vault name where Anthropic API key is stored"
  type        = string
  # Example: "liftr-kv"
}

variable "key_vault_resource_group" {
  description = "Resource group where Key Vault is located (can differ from main resource group)"
  type        = string
}

variable "container_image_tag" {
  description = "Docker image tag to deploy (set to git SHA by CI)"
  type        = string
  default     = "latest"
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default = {
    project     = "workout-tracker"
    environment = "personal"
    owner       = "rohit"
  }
}
