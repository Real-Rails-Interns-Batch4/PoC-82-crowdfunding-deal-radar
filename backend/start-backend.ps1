$ErrorActionPreference = "Stop"

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
  throw "Python launcher 'py' was not found. Install Python 3.13 or run the backend with an existing Python 3.13 environment."
}

$VenvRoot = Join-Path $env:LOCALAPPDATA "dextere-radar\.venv313"
$PythonExe = Join-Path $VenvRoot "Scripts\python.exe"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$Port = 8000
$HealthUrl = "http://127.0.0.1:$Port/api/health"

$ExistingPort = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($ExistingPort) {
  try {
    $Health = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 3
    if ($Health.status -eq "ok") {
      Write-Host "DEXTERE backend is already running at $HealthUrl"
      exit 0
    }
  }
  catch {
    $Owners = ($ExistingPort | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
    throw "Port $Port is already in use by process id(s): $Owners. Stop that process or run uvicorn on another port."
  }
}

if (-not (Test-Path $PythonExe)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $VenvRoot) | Out-Null
  py -3.13 -m venv $VenvRoot
}

Push-Location $RepoRoot
try {
  & $PythonExe -m pip install -r backend\requirements.txt
  & $PythonExe -m uvicorn backend.main:app --reload --host 0.0.0.0 --port $Port
}
finally {
  Pop-Location
}
