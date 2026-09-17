# ---------------------------------------------------------------------------
# Register / remove the OVERCHARGE agent-board watcher.
#
# ASCII ONLY, DELIBERATELY. Windows PowerShell 5.1 reads a BOM-less file as ANSI,
# so non-ASCII characters (box drawing, em dashes) corrupt the parse and produce
# a bogus "Missing closing '}'" error. Do not add Unicode to this file.
#
# WHAT THIS DOES
#   Every N minutes runs: node _kiro/agent_board.mjs --live --quiet
#   That git-fetches and rewrites _kiro/live/board.{md,json} + events.log.
#   _kiro/live/ is gitignored, so this NEVER dirties the tree or commits.
#
# WHAT THIS IS NOT
#   No tests, no gating, no merging, no AI. Pure git-derived state, read-only
#   against the repo. Judgment stays with Kiro in a live session.
#
# USAGE
#   powershell -ExecutionPolicy Bypass -File _kiro/install_board_watch.ps1
#   powershell -ExecutionPolicy Bypass -File _kiro/install_board_watch.ps1 -Remove
#   powershell -ExecutionPolicy Bypass -File _kiro/install_board_watch.ps1 -Minutes 5
# ---------------------------------------------------------------------------
param(
  [switch]$Remove,
  [int]$Minutes = 10,
  [string]$Repo = "C:\Users\diepowel\Documents\GitHub\overcharge"
)

$TaskName = "OVERCHARGE-AgentBoard"

if ($Remove) {
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed scheduled task '$TaskName'."
  }
  else {
    Write-Host "No scheduled task named '$TaskName' found - nothing to remove."
  }
  exit 0
}

# Resolve node rather than assuming it is on the Task Scheduler PATH, which is a
# different environment from an interactive shell. A bare "node" often fails there.
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Write-Error "node not found on PATH. Cannot register."; exit 1 }
$node = $nodeCmd.Source

$script = Join-Path $Repo "_kiro\agent_board.mjs"
if (-not (Test-Path $script)) { Write-Error "Not found: $script  (check -Repo)"; exit 1 }

Write-Host "node   : $node"
Write-Host "repo   : $Repo"
Write-Host "every  : $Minutes minute(s)"

# Verify it actually runs BEFORE registering, so a broken task is never installed.
Write-Host ""
Write-Host "Dry run..."
& $node $script --live --quiet
if ($LASTEXITCODE -ne 0) {
  Write-Error "Dry run failed (exit $LASTEXITCODE). Not registering."
  exit 1
}
Write-Host "Dry run OK."

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`" --live --quiet" -WorkingDirectory $Repo

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew

$old = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($old) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Refreshes the OVERCHARGE agent board from git every $Minutes min into _kiro/live/ (gitignored). Read-only: no tests, no merges, no AI." | Out-Null

$state = (Get-ScheduledTask -TaskName $TaskName).State
Write-Host ""
Write-Host "Registered '$TaskName' - every $Minutes minutes."
Write-Host "  state  : $state"
Write-Host "  output : $Repo\_kiro\live\board.json (+ board.md, events.log)"
Write-Host "  remove : powershell -ExecutionPolicy Bypass -File _kiro/install_board_watch.ps1 -Remove"
