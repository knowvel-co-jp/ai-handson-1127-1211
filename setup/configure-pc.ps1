# Prepare one Windows PC for the hands-on (run once per PC, after WSL / Docker Desktop / VS Code / Git are installed).
# Run in an administrator PowerShell from the repository folder:
#   powershell -ExecutionPolicy Bypass -File setup\configure-pc.ps1
# This file is ASCII only on purpose: Windows PowerShell 5.1 reads BOM-less files as Shift-JIS.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host 'Please run this in an administrator PowerShell.' -ForegroundColor Red
  exit 1
}

# 1. Never sleep / hibernate
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /hibernate off
Write-Host '[1/3] Sleep and hibernate: off'

# 2. VS Code user settings on the Windows side
$settingsDir = Join-Path $env:APPDATA 'Code\User'
$settingsFile = Join-Path $settingsDir 'settings.json'
New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
$settings = New-Object PSObject
if (Test-Path $settingsFile) {
  $text = [IO.File]::ReadAllText($settingsFile)
  if ($text.Trim()) {
    try {
      $settings = $text | ConvertFrom-Json
    } catch {
      Write-Host "Could not parse $settingsFile (comments or trailing commas?). Fix it by hand and run again." -ForegroundColor Red
      exit 1
    }
  }
}
$wanted = [ordered]@{
  'chat.disableAIFeatures'          = $true
  'extensions.ignoreRecommendations' = $true
  'extensions.autoUpdate'           = $false
  'update.mode'                     = 'none'
  'workbench.startupEditor'         = 'none'
  'workbench.colorTheme'            = 'Default Light+'
  'workbench.experimental.modernUI' = $false
  'claudeCode.attachOpenFile'       = $false
  'window.title'                    = 'VS Code'
}
foreach ($name in $wanted.Keys) {
  $settings | Add-Member -NotePropertyName $name -NotePropertyValue $wanted[$name] -Force
}
[IO.File]::WriteAllText($settingsFile, ($settings | ConvertTo-Json -Depth 20), (New-Object Text.UTF8Encoding($false)))
Write-Host "[2/3] VS Code settings written: $settingsFile"

code --install-extension ms-vscode-remote.remote-containers | Out-Null
code --install-extension tomoki1207.pdf@1.2.2 | Out-Null

# Japanese UI
code --install-extension MS-CEINTL.vscode-language-pack-ja | Out-Null
$argvFile = Join-Path $env:USERPROFILE '.vscode\argv.json'
New-Item -ItemType Directory -Force -Path (Split-Path $argvFile) | Out-Null
$argv = ''
if (Test-Path $argvFile) { $argv = [IO.File]::ReadAllText($argvFile) }
if ($argv -match '"locale"\s*:\s*"[^"]*"') {
  $argv = $argv -replace '"locale"\s*:\s*"[^"]*"', '"locale": "ja"'
} elseif ($argv -match '"[^"]+"\s*:') {
  $argv = ([regex]'\{').Replace($argv, "{`n`t`"locale`": `"ja`",", 1)
} else {
  $argv = "{`n`t`"locale`": `"ja`"`n}`n"
}
[IO.File]::WriteAllText($argvFile, $argv, (New-Object Text.UTF8Encoding($false)))
Write-Host "      VS Code display language: Japanese ($argvFile)"

# 3. OpenRouter key for this PC -> user environment variable ANTHROPIC_AUTH_TOKEN
$current = [Environment]::GetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', 'User')
$change = $true
if ($current) {
  $answer = Read-Host 'A key is already registered on this PC. Replace it? (y/N)'
  $change = $answer -match '^[yY]'
}
if ($change) {
  $secure = Read-Host 'Paste the OpenRouter key for this PC (input is hidden), then press Enter' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim()
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  if ($key -notmatch '^sk-or-v1-[0-9a-f]{64}$') {
    Write-Host 'That does not look like an OpenRouter key (sk-or-v1-...). Nothing was saved.' -ForegroundColor Red
    exit 1
  }
  [Environment]::SetEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', $key, 'User')
  Remove-Variable key
  Write-Host '[3/3] Key saved to the user environment variable ANTHROPIC_AUTH_TOKEN'
} else {
  Write-Host '[3/3] Key: kept the existing one'
}

Write-Host ''
Write-Host 'Done. Close every VS Code window, then open VS Code again so it picks up the key.' -ForegroundColor Green
