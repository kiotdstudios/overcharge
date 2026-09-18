# ---------------------------------------------------------------------------
# Register / remove the overcharge:// URL protocol.
#
# ASCII ONLY - PowerShell 5.1 reads BOM-less non-ASCII as ANSI and mis-parses.
#
# Writes to HKEY_CURRENT_USER only:
#   - no administrator rights required
#   - scoped to this user, not the machine
#   - removable with -Remove, which deletes the whole key
#
# SECURITY: registering a protocol lets ANY web page invoke overcharge://push.
# The launcher accepts only the literal action "push" and never passes URL text
# to a shell, and push_overcharge.bat still asks Y/N before committing. That
# confirmation is what makes a drive-by invocation harmless.
#
# USAGE
#   powershell -ExecutionPolicy Bypass -File _kiro/install_protocol.ps1
#   powershell -ExecutionPolicy Bypass -File _kiro/install_protocol.ps1 -Remove
# ---------------------------------------------------------------------------
param(
  [switch]$Remove,
  [string]$Handler = "C:\Users\diepowel\Documents\_kiro_tools\protocol_handler.mjs"
)

$Root = "HKCU:\Software\Classes\overcharge"

if ($Remove) {
  if (Test-Path $Root) {
    Remove-Item -Path $Root -Recurse -Force
    Write-Host "Removed protocol handler: overcharge://"
  }
  else {
    Write-Host "No overcharge:// handler registered - nothing to remove."
  }
  exit 0
}

if (-not (Test-Path $Handler)) {
  Write-Error "Handler not found: $Handler"
  exit 1
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Write-Error "node not found on PATH."; exit 1 }

# Invoke node DIRECTLY, not via cmd. Routing through cmd was the original defect:
# cmd split the argument before validation could run, so malformed URLs like
# "overcharge://push;calc" arrived truncated to "overcharge://push" and were accepted.
# node receives the URL as a single properly-delimited argv entry.
$cmdLine = '"' + $node + '" "' + $Handler + '" "%1"'

New-Item -Path $Root -Force | Out-Null
Set-ItemProperty -Path $Root -Name "(Default)"    -Value "URL:OVERCHARGE Protocol"
Set-ItemProperty -Path $Root -Name "URL Protocol" -Value ""

New-Item -Path "$Root\DefaultIcon" -Force | Out-Null
Set-ItemProperty -Path "$Root\DefaultIcon" -Name "(Default)" -Value "$env:SystemRoot\System32\shell32.dll,13"

New-Item -Path "$Root\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$Root\shell\open\command" -Name "(Default)" -Value $cmdLine

Write-Host "Registered protocol handler."
Write-Host "  scheme   : overcharge://"
Write-Host "  action   : push  (only permitted action)"
Write-Host "  handler  : $Handler"
Write-Host "  command  : $cmdLine"
Write-Host "  scope    : HKEY_CURRENT_USER (no admin, this user only)"
Write-Host ""
Write-Host "Verify:"
$v = (Get-ItemProperty -Path "$Root\shell\open\command" -Name "(Default)")."(Default)"
Write-Host "  readback : $v"
Write-Host ""
Write-Host "Remove with: powershell -ExecutionPolicy Bypass -File _kiro/install_protocol.ps1 -Remove"
