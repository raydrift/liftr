output "web_app_url" {
  description = "Your app URL — access this from your phone"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "api_base_url" {
  description = "API base URL"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}/api"
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.name
}
