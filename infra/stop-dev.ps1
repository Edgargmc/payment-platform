$ErrorActionPreference = "Stop"

$cluster = "payment-platform-cluster"

Write-Host "Stopping ECS API service..."
aws ecs update-service `
  --cluster $cluster `
  --service payment-platform-api-service `
  --desired-count 0 | Out-Null

Write-Host "Stopping ECS Worker service..."
aws ecs update-service `
  --cluster $cluster `
  --service payment-platform-worker-service `
  --desired-count 0 | Out-Null

Write-Host "Waiting for services to stop..."
aws ecs wait services-stable `
  --cluster $cluster `
  --services payment-platform-api-service payment-platform-worker-service

Write-Host "ECS services stopped successfully."
