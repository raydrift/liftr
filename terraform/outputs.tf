output "api_base_url" {
  description = "Static Web Apps managed API base URL"
  value       = "https://${azurerm_static_web_app.main.default_host_name}/api"
}

output "static_web_app_url" {
  description = "Your frontend URL — access this from your phone"
  value       = "https://${azurerm_static_web_app.main.default_host_name}"
}

output "static_web_app_deployment_token" {
  description = "Token for GitHub Actions / manual deploy of frontend"
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.name
}
