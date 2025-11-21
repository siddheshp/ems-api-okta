# Adjust as needed
$machineName       = "podman-machine1"
$connectionName    = "podman-machine1"
$systemAccount     = "NT AUTHORITY\SYSTEM"    # Jenkins service running as Local System

Write-Host "Granting Podman machine/connection access to SYSTEM account..."

# 1. Ensure machine exists
$machineList = podman machine list
if ($machineList -notmatch $machineName) {
    Write-Host "Machine '$machineName' not found. Initializing..."
    podman machine init $machineName
} else {
    Write-Host "Machine '$machineName' exists."
}

# Start it
Write-Host "Starting machine '$machineName'"
podman machine start $machineName

# 2. Ensure connection exists
$connections = podman system connection ls
if ($connections -notmatch $connectionName) {
    Write-Host "Adding connection '$connectionName' using user session details..."
    # NOTE: You must provide the correct URI and identity for the connection; adjust accordingly.
    $uri = "ssh://user@127.0.0.1:57025/run/user/1000/podman/podman.sock"  # adjust to match your setup
    podman system connection add --identity "C:\Users\siddh\.local\share\containers\podman\machine\machine" --default $connectionName $uri
} else {
    Write-Host "Connection '$connectionName' already exists. Setting as default..."
    podman system connection default $connectionName
}

# 3. Verify info
Write-Host "Verifying Podman info as SYSTEM account"
podman info

Write-Host "Script completed. SYSTEM account should now be able to connect to Podman machine/connection."
