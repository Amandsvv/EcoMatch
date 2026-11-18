# Quick Start — Automated Setup Script

**Run this script to automate common setup tasks**

## For Windows PowerShell

Save as `quick-setup.ps1` in the root `d:\Project\EcoMatch\` directory:

```powershell
# EcoMatch Phase 1a — Quick Setup Script
# Usage: .\quick-setup.ps1

param(
    [string]$action = "help"
)

function Show-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║        EcoMatch Phase 1a — Quick Setup Script             ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Show-Banner
    Write-Host "Available commands:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  .\quick-setup.ps1 check-env         Check prerequisites" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 setup-ms1         Setup ms1-core-api" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 setup-ms2         Setup ms2-agent-service" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 setup-all         Setup both services" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 start-ms1         Start ms1 dev server" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 start-ms2         Start ms2 dev server" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 start-db          Start PostgreSQL" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 health-check      Check both services" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 test-ms1          Run ms1 tests" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 test-ms2          Run ms2 tests" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 clean             Stop and clean up" -ForegroundColor Green
    Write-Host ""
}

function Check-Prerequisites {
    Show-Banner
    Write-Host "Checking prerequisites..." -ForegroundColor Yellow
    Write-Host ""
    
    $checks = @(
        ("Node.js", "node --version"),
        ("npm", "npm --version"),
        ("Python", "python --version"),
        ("Docker", "docker --version"),
        ("Docker Compose", "docker-compose --version")
    )
    
    $passed = 0
    $failed = 0
    
    foreach ($check in $checks) {
        $name = $check[0]
        $cmd = $check[1]
        
        try {
            $output = Invoke-Expression $cmd 2>$null
            if ($output) {
                Write-Host "✓ $name" -ForegroundColor Green
                Write-Host "  $output" -ForegroundColor Gray
                $passed++
            } else {
                Write-Host "✗ $name — NOT FOUND" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host "✗ $name — NOT FOUND" -ForegroundColor Red
            $failed++
        }
    }
    
    Write-Host ""
    Write-Host "Summary: $passed passed, $failed failed" -ForegroundColor Yellow
    
    if ($failed -gt 0) {
        Write-Host ""
        Write-Host "Please install missing prerequisites before continuing." -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "All prerequisites are installed! ✓" -ForegroundColor Green
}

function Setup-MS1 {
    Show-Banner
    Write-Host "Setting up ms1-core-api..." -ForegroundColor Yellow
    Write-Host ""
    
    $ms1Dir = "d:\Project\EcoMatch\ms1-core-api"
    
    if (-not (Test-Path $ms1Dir)) {
        Write-Host "✗ ms1-core-api directory not found at $ms1Dir" -ForegroundColor Red
        exit 1
    }
    
    cd $ms1Dir
    
    Write-Host "1. Installing npm dependencies..." -ForegroundColor Green
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ npm install failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "2. Starting PostgreSQL..." -ForegroundColor Green
    docker-compose up -d
    
    Write-Host ""
    Write-Host "3. Waiting for database to be ready..." -ForegroundColor Green
    Start-Sleep -Seconds 10
    
    Write-Host ""
    Write-Host "4. Running database migrations..." -ForegroundColor Green
    npm run db:migrate
    
    Write-Host ""
    Write-Host "✓ ms1-core-api setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: .\quick-setup.ps1 start-ms1" -ForegroundColor Yellow
}

function Setup-MS2 {
    Show-Banner
    Write-Host "Setting up ms2-agent-service..." -ForegroundColor Yellow
    Write-Host ""
    
    $ms2Dir = "d:\Project\EcoMatch\ms2-agent-service"
    
    if (-not (Test-Path $ms2Dir)) {
        Write-Host "✗ ms2-agent-service directory not found at $ms2Dir" -ForegroundColor Red
        exit 1
    }
    
    cd $ms2Dir
    
    Write-Host "1. Creating Python virtual environment..." -ForegroundColor Green
    python -m venv venv
    
    Write-Host ""
    Write-Host "2. Activating virtual environment..." -ForegroundColor Green
    & .\venv\Scripts\Activate.ps1
    
    Write-Host ""
    Write-Host "3. Installing pip dependencies..." -ForegroundColor Green
    pip install -r requirements.txt
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ pip install failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✓ ms2-agent-service setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: .\quick-setup.ps1 start-ms2" -ForegroundColor Yellow
}

function Setup-All {
    Show-Banner
    Write-Host "Setting up both services..." -ForegroundColor Yellow
    Write-Host ""
    
    Setup-MS1
    Write-Host ""
    Setup-MS2
    
    Write-Host ""
    Write-Host "✓ Both services are ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Open 3 terminals" -ForegroundColor Gray
    Write-Host "  2. Terminal 1: .\quick-setup.ps1 start-ms1" -ForegroundColor Gray
    Write-Host "  3. Terminal 2: .\quick-setup.ps1 start-ms2" -ForegroundColor Gray
    Write-Host "  4. Terminal 3: .\quick-setup.ps1 health-check" -ForegroundColor Gray
}

function Start-MS1 {
    Show-Banner
    Write-Host "Starting ms1-core-api..." -ForegroundColor Yellow
    
    $ms1Dir = "d:\Project\EcoMatch\ms1-core-api"
    cd $ms1Dir
    
    Write-Host ""
    Write-Host "Server running on http://localhost:4000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    npm run dev
}

function Start-MS2 {
    Show-Banner
    Write-Host "Starting ms2-agent-service..." -ForegroundColor Yellow
    
    $ms2Dir = "d:\Project\EcoMatch\ms2-agent-service"
    cd $ms2Dir
    
    & .\venv\Scripts\Activate.ps1
    
    Write-Host ""
    Write-Host "Server running on http://localhost:8000" -ForegroundColor Green
    Write-Host "API docs: http://localhost:8000/docs" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    python run.py
}

function Start-DB {
    Show-Banner
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    
    $ms1Dir = "d:\Project\EcoMatch\ms1-core-api"
    cd $ms1Dir
    
    Write-Host ""
    docker-compose up -d
    
    Write-Host ""
    Write-Host "PostgreSQL is running" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verify with: docker-compose ps" -ForegroundColor Yellow
}

function Health-Check {
    Show-Banner
    Write-Host "Checking services..." -ForegroundColor Yellow
    Write-Host ""
    
    $ms1Health = $false
    $ms2Health = $false
    
    Write-Host "Checking ms1-core-api (http://localhost:4000)..." -ForegroundColor Cyan
    try {
        $resp = Invoke-WebRequest -Uri http://localhost:4000/health -TimeoutSec 5
        if ($resp.StatusCode -eq 200) {
            Write-Host "✓ ms1-core-api is running" -ForegroundColor Green
            $ms1Health = $true
        }
    } catch {
        Write-Host "✗ ms1-core-api is NOT responding" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Checking ms2-agent-service (http://localhost:8000)..." -ForegroundColor Cyan
    try {
        $resp = Invoke-WebRequest -Uri http://localhost:8000/health -TimeoutSec 5
        if ($resp.StatusCode -eq 200) {
            Write-Host "✓ ms2-agent-service is running" -ForegroundColor Green
            $ms2Health = $true
        }
    } catch {
        Write-Host "✗ ms2-agent-service is NOT responding" -ForegroundColor Red
    }
    
    Write-Host ""
    if ($ms1Health -and $ms2Health) {
        Write-Host "✓ Both services are healthy!" -ForegroundColor Green
        Write-Host ""
        Write-Host "API Documentation:" -ForegroundColor Yellow
        Write-Host "  ms2: http://localhost:8000/docs" -ForegroundColor Gray
    } else {
        Write-Host "✗ One or more services are not responding" -ForegroundColor Red
        Write-Host ""
        Write-Host "Make sure to run these in separate terminals:" -ForegroundColor Yellow
        Write-Host "  Terminal 1: .\quick-setup.ps1 start-ms1" -ForegroundColor Gray
        Write-Host "  Terminal 2: .\quick-setup.ps1 start-ms2" -ForegroundColor Gray
    }
}

function Test-MS1 {
    Show-Banner
    Write-Host "Running ms1 tests..." -ForegroundColor Yellow
    
    $ms1Dir = "d:\Project\EcoMatch\ms1-core-api"
    cd $ms1Dir
    
    Write-Host ""
    npm test
}

function Test-MS2 {
    Show-Banner
    Write-Host "Running ms2 tests..." -ForegroundColor Yellow
    
    $ms2Dir = "d:\Project\EcoMatch\ms2-agent-service"
    cd $ms2Dir
    
    & .\venv\Scripts\Activate.ps1
    
    Write-Host ""
    pytest -v
}

function Clean-Up {
    Show-Banner
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    Write-Host ""
    
    $ms1Dir = "d:\Project\EcoMatch\ms1-core-api"
    cd $ms1Dir
    
    Write-Host "Stopping PostgreSQL..." -ForegroundColor Green
    docker-compose down
    
    Write-Host ""
    Write-Host "✓ Cleanup complete" -ForegroundColor Green
    Write-Host ""
    Write-Host "To restart: .\quick-setup.ps1 setup-all" -ForegroundColor Yellow
}

# Main switch
switch ($action.ToLower()) {
    "check-env" { Check-Prerequisites }
    "setup-ms1" { Setup-MS1 }
    "setup-ms2" { Setup-MS2 }
    "setup-all" { Setup-All }
    "start-ms1" { Start-MS1 }
    "start-ms2" { Start-MS2 }
    "start-db" { Start-DB }
    "health-check" { Health-Check }
    "test-ms1" { Test-MS1 }
    "test-ms2" { Test-MS2 }
    "clean" { Clean-Up }
    default { Show-Help }
}
```

## Usage Examples

```powershell
# First time setup
.\quick-setup.ps1 check-env
.\quick-setup.ps1 setup-all

# Start services (in separate terminals)
.\quick-setup.ps1 start-ms1
.\quick-setup.ps1 start-ms2

# Verify services are running
.\quick-setup.ps1 health-check

# Run tests
.\quick-setup.ps1 test-ms1
.\quick-setup.ps1 test-ms2

# Cleanup when done
.\quick-setup.ps1 clean
```

## What This Script Does

| Command | Purpose |
|---------|---------|
| `check-env` | Verifies all prerequisites (Node, Python, Docker) |
| `setup-ms1` | Installs npm, starts DB, runs migrations |
| `setup-ms2` | Creates venv, installs pip dependencies |
| `setup-all` | Runs both setup-ms1 and setup-ms2 |
| `start-ms1` | Starts ms1 dev server on port 4000 |
| `start-ms2` | Starts ms2 dev server on port 8000 |
| `start-db` | Starts PostgreSQL container |
| `health-check` | Verifies both services are responding |
| `test-ms1` | Runs Jest tests for ms1 |
| `test-ms2` | Runs pytest tests for ms2 |
| `clean` | Stops services and removes containers |

---

## First Time (Complete Setup)

```powershell
# 1. Check prerequisites
.\quick-setup.ps1 check-env

# 2. Setup everything
.\quick-setup.ps1 setup-all

# 3. In Terminal 1 - Start ms1
.\quick-setup.ps1 start-ms1

# 4. In Terminal 2 - Start ms2
.\quick-setup.ps1 start-ms2

# 5. In Terminal 3 - Verify
.\quick-setup.ps1 health-check

# 6. Run tests
.\quick-setup.ps1 test-ms1
.\quick-setup.ps1 test-ms2
```

All done! Both services are running and ready for development.
