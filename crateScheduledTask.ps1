# Variables — adjust path to your actual script
$taskName     = "PodmanSetupForJenkins"
$scriptPath   = "D:\Labs\cigna\test\ems-api-okta\PodmanSetupForJenkins.ps1"    # path to your setup script
$description  = "Ensure Podman machine and connection for Jenkins agent"
$trigger      = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = "PT1M"  # 1 minute delay in ISO 8601 duration format
$action       = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
$principal    = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings     = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $description

Write-Host "Scheduled task '$taskName' created to run as SYSTEM."
