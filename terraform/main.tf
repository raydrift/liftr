terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }

  backend "azurerm" {}
}

provider "azurerm" {
  features {}
  subscription_id            = var.subscription_id
  skip_provider_registration = true
}

# ─────────────────────────────────────────
# Storage Account — Table Storage for logs
# ─────────────────────────────────────────
resource "azurerm_storage_account" "main" {
  name                     = var.storage_account_name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # Cheapest — locally redundant

  tags = var.tags
}

resource "azurerm_storage_table" "sessions" {
  name                 = "workoutsessions"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_table" "exercises" {
  name                 = "workoutexercises"
  storage_account_name = azurerm_storage_account.main.name
}

# ─────────────────────────────────────────
# Static Web App — Frontend hosting + managed API (free tier)
# ─────────────────────────────────────────
resource "azurerm_static_web_app" "main" {
  name                = "${var.app_name}-web"
  resource_group_name = var.resource_group_name
  location            = var.static_web_app_location # Limited regions for Static Web Apps
  sku_tier            = "Free"
  sku_size            = "Free"
  app_settings = {
    FUNCTIONS_WORKER_RUNTIME  = "node"
    AzureWebJobsStorage       = azurerm_storage_account.main.primary_connection_string
    STORAGE_CONNECTION_STRING = azurerm_storage_account.main.primary_connection_string
    SESSIONS_TABLE_NAME       = azurerm_storage_table.sessions.name
    EXERCISES_TABLE_NAME      = azurerm_storage_table.exercises.name
    API_SECRET_KEY            = var.api_secret_key # Simple secret header for single-user protection
  }
  tags = var.tags
}
