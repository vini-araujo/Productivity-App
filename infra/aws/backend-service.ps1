param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("status", "pause", "resume")]
  [string] $Action,

  [string] $Region = "us-east-1",
  [string] $Cluster = "ordyn-life",
  [string] $Service = "ordyn-life-api"
)

$ErrorActionPreference = "Stop"

$aws = "aws"
$defaultAwsPath = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
if (Test-Path -LiteralPath $defaultAwsPath) {
  $aws = $defaultAwsPath
}

function Show-ServiceStatus {
  & $aws ecs describe-services `
    --region $Region `
    --cluster $Cluster `
    --services $Service `
    --query "services[0].{Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount,TaskDefinition:taskDefinition}" `
    --output table
}

if ($Action -eq "status") {
  Show-ServiceStatus
  exit 0
}

$desiredCount = 0
if ($Action -eq "resume") {
  $desiredCount = 1
}

& $aws ecs update-service `
  --region $Region `
  --cluster $Cluster `
  --service $Service `
  --desired-count $desiredCount `
  --no-cli-pager > $null

& $aws ecs wait services-stable `
  --region $Region `
  --cluster $Cluster `
  --services $Service

Show-ServiceStatus
