output "web_app_url" {
  description = "Your app URL — access this from your phone"
  value       = "https://${azurerm_container_app.main.latest_revision_fqdn}"
}

output "container_registry_name" {
  description = "Container Registry name (for docker login)"
  value       = azurerm_container_registry.main.name
}

output "container_registry_login_server" {
  description = "Container Registry login server"
  value       = azurerm_container_registry.main.login_server
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.name
}
