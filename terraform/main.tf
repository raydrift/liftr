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
# Storage Account — Table Storage for data
# ─────────────────────────────────────────
resource "azurerm_storage_account" "main" {
  name                     = var.storage_account_name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

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
# App Service — Express app (free tier F1)
# ─────────────────────────────────────────
resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-plan"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "F1"

  tags = var.tags
}

resource "azurerm_linux_web_app" "main" {
  name                = "${var.app_name}-web"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = false # not supported on F1
    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    STORAGE_CONNECTION_STRING      = azurerm_storage_account.main.primary_connection_string
    SESSIONS_TABLE_NAME            = azurerm_storage_table.sessions.name
    EXERCISES_TABLE_NAME           = azurerm_storage_table.exercises.name
    API_SECRET_KEY                 = var.api_secret_key
    SCM_DO_BUILD_DURING_DEPLOYMENT = "false"
  }

  tags = var.tags
}
