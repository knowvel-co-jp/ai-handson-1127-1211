# Install everything one Windows PC needs, then prepare it (run in an administrator PowerShell).
# Run it twice: the first run installs and asks for a restart; the second run, after opening
# Docker Desktop once, clones the template and runs configure-pc.ps1.
# This file is ASCII only on purpose: Windows PowerShell 5.1 reads BOM-less files as Shift-JIS.

# Native commands write to stderr on normal failures; with 'Stop', Windows PowerShell 5.1 would abort on them.
$ErrorActionPreference = 'Continue'

$repoUrl = 'https://github.com/knowvel-co-jp/ai-handson-1127-1211.git'
$repo = Join-Path $HOME 'ai-handson'
$packages = @(
  @{ Id = 'Docker.DockerDesktop';       Version = '4.100.1'; Name = '^Docker Desktop$' },
  @{ Id = 'Git.Git';                    Version = '2.56.1';  Name = '^Git( version .*)?$' },
  @{ Id = 'Microsoft.VisualStudioCode'; Version = '1.148.0'; Name = '^Microsoft Visual Studio Code' }
)

function Stop-WithMessage($message) {
  Write-Host $message -ForegroundColor Red
  exit 1
}

function Get-InstalledVersion($name) {
  $paths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )
  $item = Get-ItemProperty $paths -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -match $name } |
    Select-Object -First 1
  if ($item) { return [string]$item.DisplayVersion }
  return $null
}

function Test-Version($current, $wanted) {
  return ($current -match ('^' + [regex]::Escape($wanted) + '(\D|$)'))
}

function Test-Wsl {
  & wsl.exe --status *> $null
  return ($LASTEXITCODE -eq 0)
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Stop-WithMessage 'Please run this in an administrator PowerShell.' }

$sac = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy' -ErrorAction SilentlyContinue).VerifiedAndReputablePolicyState
if ($null -ne $sac -and $sac -ne 0) {
  Stop-WithMessage "Smart App Control is not off (state $sac). Turn it off in Windows Security, then run this again."
}

# 1. Install what is missing
$installed = $false
if (-not (Test-Wsl)) {
  Write-Host 'Installing WSL...'
  & wsl.exe --install --no-distribution
  $installed = $true
}
foreach ($p in $packages) {
  $current = Get-InstalledVersion $p.Name
  if ($current) {
    if (-not (Test-Version $current $p.Version)) {
      Write-Host "$($p.Id) $current is installed (expected $($p.Version)). Ask the staff lead before going on." -ForegroundColor Yellow
    }
    continue
  }
  Write-Host "Installing $($p.Id) $($p.Version)..."
  & winget install -e --id $p.Id --version $p.Version --accept-source-agreements --accept-package-agreements
  if (-not (Get-InstalledVersion $p.Name)) {
    Stop-WithMessage "Could not install $($p.Id) $($p.Version). Ask the staff lead (do not install another version)."
  }
  $installed = $true
}
if ($installed) {
  Write-Host ''
  Write-Host 'Installed. Restart the PC (Restart-Computer). After the restart, open Docker Desktop once' -ForegroundColor Green
  Write-Host '(accept the terms, skip sign-in, change the settings), then run this script again.' -ForegroundColor Green
  exit 0
}
if (-not (Test-Wsl)) { Stop-WithMessage 'WSL is installed but not ready. Restart the PC, then run this again.' }

# 2. Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Stop-WithMessage 'The docker command is not found. Restart the PC, then run this again.'
}
Write-Host 'Waiting for Docker Desktop...'
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  & docker info *> $null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 3
}
if (-not $ready) {
  Stop-WithMessage 'Docker Desktop is not running. Open it, accept the terms, wait until the engine is running, then run this again.'
}
& docker run --rm hello-world
if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'docker run hello-world failed.' }

# 3. Template
if (Test-Path $repo) {
  Write-Host "$repo already exists. Not cloning again."
} else {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'The git command is not found. Restart the PC, then run this again.'
  }
  & git clone $repoUrl $repo
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'git clone failed.' }
  # Same owner as a clone made from a normal PowerShell
  & icacls $repo /setowner "$env:USERDOMAIN\$env:USERNAME" /T /C /Q | Out-Null
}

# 4. Settings and key
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'setup\configure-pc.ps1')
if ($LASTEXITCODE -ne 0) { exit 1 }

# 5. Versions
Write-Host ''
$ok = $true
foreach ($p in $packages) {
  $current = Get-InstalledVersion $p.Name
  if (Test-Version $current $p.Version) {
    Write-Host "OK  $($p.Id) $current"
  } else {
    Write-Host "NG  $($p.Id) $current (expected $($p.Version))" -ForegroundColor Red
    $ok = $false
  }
}
& wsl.exe --version
if (-not $ok) { Stop-WithMessage 'Some versions do not match. Ask the staff lead.' }

Write-Host ''
Write-Host 'All done. Close this window and every VS Code window. Then, in a new normal PowerShell:' -ForegroundColor Green
Write-Host '  code $HOME\ai-handson' -ForegroundColor Green
