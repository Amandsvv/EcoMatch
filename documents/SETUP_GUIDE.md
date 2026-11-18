# EcoMatch Phase 1a — Local Setup Guide

**Complete step-by-step instructions to run both ms1 and ms2 locally**

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js 20+** — Check: `node --version`
- [ ] **npm 10+** — Check: `npm --version`
- [ ] **Python 3.10+** — Check: `python --version`
- [ ] **pip** — Check: `pip --version`
- [ ] **Docker & Docker Desktop** — Check: `docker --version`
- [ ] **Docker Compose** — Check: `docker-compose --version`
- [ ] **Git** — Check: `git --version`

### Install Missing Prerequisites

**Windows (if needed):**
```powershell
# Install Node.js (download from https://nodejs.org/)
# Install Python (download from https://www.python.org/)
# Install Docker Desktop (download from https://www.docker.com/products/docker-desktop)

# Verify installations
node --version    # Should be v20+
npm --version     # Should be 10+
python --version  # Should be 3.10+
pip --version     # Should work
docker --version  # Should show version
```

---

# 🔧 PART 1: Setup ms1-core-api (Express + PostgreSQL)

## Step 1: Navigate to ms1 Directory

```powershell
cd d:\Project\EcoMatch\ms1-core-api

# Verify you're in the right place
Get-ChildItem src/  # Should show: auth, businesses, submissions, etc.
```

## Step 2: Install Node Dependencies

```powershell
npm install

# This will:
# - Install all packages from package.json
# - Create node_modules/ directory
# - Generate package-lock.json
# Wait 2-3 minutes for this to complete
```

**Expected output:**
```
added 250 packages in 2m 45s
```

## Step 3: Start PostgreSQL Container

```powershell
# Start Docker Desktop first (if not already running)

# Start PostgreSQL via docker-compose
docker-compose up -d

# Verify PostgreSQL is running
docker-compose ps

# Expected: postgres should show "Up (healthy)"
```

**Check PostgreSQL is ready:**
```powershell
# Wait 5-10 seconds for DB to boot, then test connection
docker exec ms1-db pg_isready -U ecomatch

# Expected: "accepting connections"
```

## Step 4: Create Database Schema

```powershell
# Run Drizzle migrations
npm run db:migrate

# This will:
# - Generate migrations/ folder (if needed)
# - Create all 11 tables in the database
# - Set up relationships and indexes
```

**Expected output:**
```
✓ Drizzle migrations completed
✓ 11 tables created
```

## Step 5: Start ms1 Development Server

```powershell
# Start the Express server with auto-reload
npm run dev

# This will start on port 4000
```

**Expected output:**
```
[INFO] ms1-core-api server running on http://localhost:4000
[INFO] Health check: GET http://localhost:4000/health
```

## Step 6: Verify ms1 is Working

**In a NEW PowerShell terminal** (keep the dev server running):

```powershell
# Check health
curl http://localhost:4000/health

# Expected response:
# {"status":"ok","service":"ms1-core-api"}

# Check if you can signup
$body = @{
    email = "test@example.com"
    password = "password123"
    businessName = "Test Restaurant"
    businessType = "restaurant"
    address = "123 Main St"
    lat = 40.715
    lng = -74.008
    phone = "555-1234"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:4000/auth/signup `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body

# Expected: 201 status with JWT token
```

✅ **ms1 is ready when:**
- [ ] Health check responds with `{"status":"ok"}`
- [ ] Signup endpoint creates a user and returns JWT
- [ ] No errors in the console

---

# 🐍 PART 2: Setup ms2-agent-service (FastAPI + Python)

## Step 7: Open New Terminal for ms2

**In a NEW PowerShell terminal**:

```powershell
cd d:\Project\EcoMatch\ms2-agent-service

# Verify you're in the right place
Get-ChildItem app/  # Should show: agents, routers, reference_data, main.py, etc.
```

## Step 8: Create Python Virtual Environment

```powershell
# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# You should see "(venv)" in your prompt now
```

**If you get execution policy error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
# Then run Activate.ps1 again
```

## Step 9: Install Python Dependencies

```powershell
# With venv activated
pip install -r requirements.txt

# This will install all packages
# Wait 2-3 minutes
```

**Expected output:**
```
Successfully installed fastapi-0.109.0 uvicorn-0.27.0 pydantic-2.5.0 ... (and more)
```

## Step 10: Create .env File (Optional)

```powershell
# Copy template
Copy-Item .env.example .env

# Or create manually with these settings:
@"
PORT=8000
LOG_LEVEL=info
SCOUT_CONFIDENCE_THRESHOLD=0.7
ALCHEMIST_CONFIDENCE_THRESHOLD=0.7
"@ | Set-Content .env
```

## Step 11: Start ms2 Development Server

```powershell
# With venv activated
python run.py

# This will start on port 8000
```

**Expected output:**
```
Starting ms2-agent-service on port 8000...
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## Step 12: Verify ms2 is Working

**In a NEW PowerShell terminal** (keep ms2 server running):

```powershell
# Check health
curl http://localhost:8000/health

# Expected response:
# {"status":"ok","service":"ms2-agent-service"}

# Check API docs
# Visit: http://localhost:8000/docs in your browser
# You should see: /classify, /match, /draft, /verify endpoints
```

✅ **ms2 is ready when:**
- [ ] Health check responds with `{"status":"ok"}`
- [ ] http://localhost:8000/docs shows all 4 endpoints
- [ ] No errors in the console

---

# 🔄 PART 3: Test Integration Between ms1 and ms2

## Step 13: Verify Services Can Communicate

**In a NEW PowerShell terminal**:

```powershell
# From ms1-core-api directory
cd d:\Project\EcoMatch\ms1-core-api

# First, get a JWT token by logging in
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri http://localhost:4000/auth/login `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $loginBody

$tokenData = $loginResponse.Content | ConvertFrom-Json
$token = $tokenData.token
$businessId = $tokenData.businessId

Write-Host "Got token: $token"
Write-Host "Business ID: $businessId"
```

## Step 14: Submit Material and Trigger Classification

```powershell
# Use the token from Step 13

$submissionBody = @{
    rawDescription = "We have 5 tons of food scraps and spent coffee grounds from our restaurant. Generated monthly."
    photoRefs = @("photo1.jpg")
    disposalCostPerUnit = 50
    disposalFrequency = "monthly"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$submissionResponse = Invoke-WebRequest -Uri http://localhost:4000/submissions `
  -Method POST `
  -Headers $headers `
  -Body $submissionBody

$submissionData = $submissionResponse.Content | ConvertFrom-Json

Write-Host "Submission ID: $($submissionData.id)"
Write-Host "Status: $($submissionData.status)"
Write-Host "Classification: $($submissionData.classification.primaryCategory)"
Write-Host "Confidence: $($submissionData.classification.confidence)"
Write-Host "Hazard Flag: $($submissionData.classification.hazardFlag)"
```

**Expected output:**
```
Submission ID: sub-xxx-xxx
Status: match_proposed  (or needs_followup or no_match_found)
Classification: organic_biomass
Confidence: 0.95
Hazard Flag: False
```

## Step 15: Check Match Details

```powershell
$submissionId = "sub-xxx-xxx"  # Replace with actual ID from Step 14

$matchResponse = Invoke-WebRequest -Uri "http://localhost:4000/matches/$submissionId" `
  -Method GET `
  -Headers $headers

$matchData = $matchResponse.Content | ConvertFrom-Json

Write-Host "Match Confidence: $($matchData.matchConfidence)"
Write-Host "Target Business: $($matchData.targetBusinessId)"
Write-Host "Rationale: $($matchData.matchRationale)"
```

**Expected output:**
```
Match Confidence: 0.92
Target Business: business-target-1
Rationale: Local Compost Operations uses food scraps...
```

## Step 16: View Outreach Drafts

```powershell
$draftId = "draft-xxx-xxx"  # Get from matches response

$draftResponse = Invoke-WebRequest -Uri "http://localhost:4000/outreach/$draftId" `
  -Method GET `
  -Headers $headers

$draftData = $draftResponse.Content | ConvertFrom-Json

Write-Host "Message:"
Write-Host $draftData.message
Write-Host ""
Write-Host "Terms:"
Write-Host $draftData.terms | ConvertTo-Json
```

**Expected output:**
```
Message:
Hello Restaurant,

We've identified Compost Operations as a potential recipient for your material...

Terms:
{
  "pricePerUnit": 68.0,
  "frequency": "monthly",
  "contractLengthMonths": 12,
  ...
}
```

✅ **Integration is working when:**
- [ ] Submission triggers classification in ms2
- [ ] Classification returns confidence >= 0.7
- [ ] Match is found and shown in response
- [ ] Outreach drafts created with proposals
- [ ] No errors between ms1 and ms2

---

# ✅ PART 4: Run Tests

## Step 17: Test ms1

**In a terminal with ms1 running or in a new one**:

```powershell
cd d:\Project\EcoMatch\ms1-core-api

# Run all tests
npm test

# Or watch mode (re-runs on file changes)
npm run test:watch
```

**Expected output:**
```
PASS  tests/integration.test.ts
  ✓ Rule 4.1: hazardFlag prevents match creation
  ✓ Rule 4.7: matchConfidence < 0.7 suppresses match
  ...

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

## Step 18: Test ms2

**In a terminal with ms2 running or in a new one**:

```powershell
cd d:\Project\EcoMatch\ms2-agent-service

# Make sure venv is activated
.\venv\Scripts\Activate.ps1

# Run all tests
pytest -v

# Expected output:
# PASSED tests/test_agents.py::TestScoutAgent::test_classify_high_confidence
# PASSED tests/test_agents.py::TestScoutAgent::test_classify_low_confidence_triggers_followup
# ...
# 9 passed in 2.34s
```

✅ **Tests pass when:**
- [ ] All ms1 tests pass (8 tests covering all 8 rules)
- [ ] All ms2 tests pass (9 tests covering all agents)
- [ ] No errors or failures

---

# 🧪 PART 5: Full End-to-End Pipeline Test

## Step 19: Complete Submission Flow

This test goes through the entire happy path:

```powershell
cd d:\Project\EcoMatch\ms1-core-api

# Test script: complete pipeline
@"
# 1. Signup
Write-Host "1. SIGNUP" -ForegroundColor Green
`$signup = @{
    email = "e2e-test@example.com"
    password = "password123"
    businessName = "E2E Test Restaurant"
    businessType = "restaurant"
    address = "123 Main St"
    lat = 40.715
    lng = -74.008
    phone = "555-1234"
} | ConvertTo-Json

`$signupResp = Invoke-WebRequest -Uri http://localhost:4000/auth/signup `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body `$signup -SkipHttpErrorCheck

if (`$signupResp.StatusCode -eq 201 -or `$signupResp.StatusCode -eq 200) {
    Write-Host "✓ Signup successful" -ForegroundColor Green
    `$userData = `$signupResp.Content | ConvertFrom-Json
    `$token = `$userData.token
} else {
    Write-Host "✗ Signup failed: `$(`$signupResp.StatusCode)" -ForegroundColor Red
    exit 1
}

# 2. Submit material
Write-Host "`n2. SUBMIT MATERIAL" -ForegroundColor Green
`$submission = @{
    rawDescription = "We have 5 tons of food scraps and spent coffee grounds from our restaurant. Generated monthly."
    photoRefs = @("photo1.jpg")
    disposalCostPerUnit = 50
    disposalFrequency = "monthly"
} | ConvertTo-Json

`$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer `$token"
}

`$subResp = Invoke-WebRequest -Uri http://localhost:4000/submissions `
  -Method POST `
  -Headers `$headers `
  -Body `$submission -SkipHttpErrorCheck

if (`$subResp.StatusCode -eq 200 -or `$subResp.StatusCode -eq 201) {
    Write-Host "✓ Submission created" -ForegroundColor Green
    `$subData = `$subResp.Content | ConvertFrom-Json
    `$submissionId = `$subData.id
    `$status = `$subData.status
    Write-Host "  Status: `$status"
    Write-Host "  Category: `$(`$subData.classification.primaryCategory)"
    Write-Host "  Confidence: `$(`$subData.classification.confidence)"
} else {
    Write-Host "✗ Submission failed: `$(`$subResp.StatusCode)" -ForegroundColor Red
    Write-Host `$subResp.Content
    exit 1
}

# 3. Check match
Write-Host "`n3. CHECK MATCH" -ForegroundColor Green
`$matchResp = Invoke-WebRequest -Uri "http://localhost:4000/matches/`$submissionId" `
  -Method GET `
  -Headers `$headers -SkipHttpErrorCheck

if (`$matchResp.StatusCode -eq 200) {
    Write-Host "✓ Match retrieved" -ForegroundColor Green
    `$matchData = `$matchResp.Content | ConvertFrom-Json
    Write-Host "  Match Confidence: `$(`$matchData.matchConfidence)"
    Write-Host "  Target Business: `$(`$matchData.targetBusinessId)"
} else {
    Write-Host "✗ Match check failed" -ForegroundColor Red
}

Write-Host "`n✅ END-TO-END TEST COMPLETE" -ForegroundColor Green
"@ | Out-File e2e-test.ps1

# Run the test
.\e2e-test.ps1
```

**Expected output:**
```
1. SIGNUP
✓ Signup successful

2. SUBMIT MATERIAL
✓ Submission created
  Status: match_proposed
  Category: organic_biomass
  Confidence: 0.95

3. CHECK MATCH
✓ Match retrieved
  Match Confidence: 0.92
  Target Business: business-target-1

✅ END-TO-END TEST COMPLETE
```

---

# 🆘 Troubleshooting

## Issue: "Cannot connect to PostgreSQL"

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```powershell
# Check if Docker container is running
docker-compose ps

# If not running:
docker-compose up -d

# Wait 10 seconds for DB to boot
Start-Sleep -Seconds 10

# Test connection
docker exec ms1-db pg_isready -U ecomatch
```

## Issue: "Port 4000 already in use"

**Problem:** `Error: listen EADDRINUSE :::4000`

**Solution:**
```powershell
# Find process using port 4000
netstat -ano | findstr :4000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or use different port
$env:PORT=4001
npm run dev
```

## Issue: "Port 8000 already in use"

**Problem:** `Address already in use`

**Solution:**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <PID> /F

# Or use different port
# Edit .env: PORT=8001
python run.py
```

## Issue: "Python: command not found"

**Problem:** `python : The term 'python' is not recognized`

**Solution:**
```powershell
# Use python3
python3 run.py

# Or add to PATH:
# https://docs.python.org/3/using/windows.html
```

## Issue: "Module not found: fastapi"

**Problem:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```powershell
# Make sure venv is activated
.\venv\Scripts\Activate.ps1

# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

## Issue: "npm ERR! not ok code 1"

**Problem:** npm install fails

**Solution:**
```powershell
# Clear cache
npm cache clean --force

# Remove node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Reinstall
npm install
```

## Issue: "JWT token invalid"

**Problem:** `Unauthorized: Invalid token`

**Solution:**
```powershell
# Make sure you're using the correct token from login/signup response
# Token format: "Bearer <token>"

# Check token hasn't expired (default 7 days)
# Login again to get new token
```

---

# 📝 Quick Reference

## Running Services

### Start All Services (keep in separate terminals)

**Terminal 1 — ms1-core-api:**
```powershell
cd d:\Project\EcoMatch\ms1-core-api
npm run dev
# Runs on http://localhost:4000
```

**Terminal 2 — PostgreSQL:**
```powershell
cd d:\Project\EcoMatch\ms1-core-api
docker-compose ps  # Just to verify it's running
```

**Terminal 3 — ms2-agent-service:**
```powershell
cd d:\Project\EcoMatch\ms2-agent-service
.\venv\Scripts\Activate.ps1
python run.py
# Runs on http://localhost:8000
```

## Testing Services

```powershell
# ms1 tests
cd d:\Project\EcoMatch\ms1-core-api
npm test

# ms2 tests
cd d:\Project\EcoMatch\ms2-agent-service
.\venv\Scripts\Activate.ps1
pytest -v
```

## Health Checks

```powershell
# ms1
curl http://localhost:4000/health

# ms2
curl http://localhost:8000/health

# Both should respond with {"status":"ok"}
```

## API Documentation

```
ms1: http://localhost:4000/api/docs (if available) or use REST client
ms2: http://localhost:8000/docs (Swagger UI)
```

## Check Logs

```powershell
# ms1 logs: Check the terminal where "npm run dev" is running
# ms2 logs: Check the terminal where "python run.py" is running

# Docker logs
docker logs ms1-db
```

## Stop Services

```powershell
# Press Ctrl+C in each terminal where npm run dev / python run.py is running

# Stop PostgreSQL
docker-compose down

# Clean up Docker
docker-compose down -v  # Remove volumes too
```

---

# ✅ Final Verification Checklist

After completing all steps, verify:

**ms1-core-api:**
- [ ] npm dependencies installed
- [ ] PostgreSQL container running and healthy
- [ ] Database migrations applied
- [ ] Dev server running on port 4000
- [ ] Health check responds
- [ ] Can signup and login
- [ ] Unit tests pass

**ms2-agent-service:**
- [ ] Python venv created and activated
- [ ] pip dependencies installed
- [ ] Dev server running on port 8000
- [ ] Health check responds
- [ ] OpenAPI docs available at /docs
- [ ] Unit tests pass

**Integration:**
- [ ] ms1 can call ms2 /classify
- [ ] Material gets classified correctly
- [ ] Match is found if confidence >= 0.7
- [ ] Outreach drafts created
- [ ] End-to-end test passes

---

## 🎉 You're Ready!

When all checkboxes are marked, both services are running correctly and ready for development, testing, or Phase 1b integration.

**Next Steps:**
1. Explore the APIs using the interactive docs (ms2: http://localhost:8000/docs)
2. Review the submission pipeline in [src/submissions/routes.ts](d:\Project\EcoMatch\ms1-core-api\src\submissions\routes.ts)
3. Modify test cases to experiment with different materials/scenarios
4. Prepare for Phase 1b (frontend + LangGraph + real LLM integration)

**Questions or Issues?**
- Check README.md in each service directory
- Review PHASE_1A_COMPLETE.md for architecture overview
- Check troubleshooting section above
