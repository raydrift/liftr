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
  subscription_id = var.subscription_id
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

  # Also used by Function App for its internal state
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
# App Service Plan — Consumption (pay-per-use, ~free for personal)
# ─────────────────────────────────────────
resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-plan"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1" # Consumption plan
  tags                = var.tags
}

# ─────────────────────────────────────────
# Function App
# ─────────────────────────────────────────
resource "azurerm_linux_function_app" "main" {
  name                       = "${var.app_name}-func"
  resource_group_name        = var.resource_group_name
  location                   = var.location
  service_plan_id            = azurerm_service_plan.main.id
  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key

  site_config {
    application_stack {
      node_version = "20"
    }
    cors {
      allowed_origins     = ["https://${azurerm_static_web_app.main.default_host_name}"]
      support_credentials = false
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME  = "node"
    WEBSITE_RUN_FROM_PACKAGE  = "1"
    AzureWebJobsStorage       = azurerm_storage_account.main.primary_connection_string
    STORAGE_CONNECTION_STRING = azurerm_storage_account.main.primary_connection_string
    SESSIONS_TABLE_NAME       = azurerm_storage_table.sessions.name
    EXERCISES_TABLE_NAME      = azurerm_storage_table.exercises.name
    API_SECRET_KEY            = var.api_secret_key # Simple secret header for single-user protection
    ALLOWED_ORIGIN            = "https://${azurerm_static_web_app.main.default_host_name}"
  }

  tags = var.tags
}

# ─────────────────────────────────────────
# Static Web App — Frontend hosting (free tier)
# ─────────────────────────────────────────
resource "azurerm_static_web_app" "main" {
  name                = "${var.app_name}-web"
  resource_group_name = var.resource_group_name
  location            = var.static_web_app_location # Limited regions for Static Web Apps
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = var.tags
}
