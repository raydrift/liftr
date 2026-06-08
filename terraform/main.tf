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

resource "azurerm_storage_table" "profile" {
  name                 = "userprofile"
  storage_account_name = azurerm_storage_account.main.name
}

resource "azurerm_storage_table" "metrics" {
  name                 = "bodymetrics"
  storage_account_name = azurerm_storage_account.main.name
}

# ─────────────────────────────────────────
# Container Registry — stores Docker images
# ─────────────────────────────────────────
resource "azurerm_container_registry" "main" {
  name                = "${replace(var.app_name, "-", "")}registry"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Basic"
  admin_enabled       = true

  tags = var.tags
}

# ─────────────────────────────────────────
# Container Apps — serverless hosting
# No VM quota required (Consumption plan)
# ─────────────────────────────────────────
resource "azurerm_container_app_environment" "main" {
  name                = "${var.app_name}-env"
  resource_group_name = var.resource_group_name
  location            = var.location

  tags = var.tags
}

resource "azurerm_container_app" "main" {
  name                         = "${var.app_name}-app"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.main.admin_password
  }

  secret {
    name  = "storage-connection-string"
    value = azurerm_storage_account.main.primary_connection_string
  }

  secret {
    name  = "api-secret-key"
    value = var.api_secret_key
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = var.app_name
      image  = "${azurerm_container_registry.main.login_server}/${var.app_name}:${var.container_image_tag}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "STORAGE_CONNECTION_STRING"
        secret_name = "storage-connection-string"
      }

      env {
        name  = "SESSIONS_TABLE_NAME"
        value = azurerm_storage_table.sessions.name
      }

      env {
        name  = "EXERCISES_TABLE_NAME"
        value = azurerm_storage_table.exercises.name
      }

      env {
        name        = "API_SECRET_KEY"
        secret_name = "api-secret-key"
      }

      env {
        name  = "PORT"
        value = "3000"
      }

      env {
        name  = "PROFILE_TABLE_NAME"
        value = azurerm_storage_table.profile.name
      }

      env {
        name  = "METRICS_TABLE_NAME"
        value = azurerm_storage_table.metrics.name
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = var.tags
}
