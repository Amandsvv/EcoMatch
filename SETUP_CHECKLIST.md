# EcoMatch Phase 1a — Setup Checklist & Dashboard

Use this as your progress tracker while setting up the services.

---

## 📋 Prerequisites (5 min)

- [x] Node.js 20+ installed (`node --version`)
- [x] npm 10+ installed (`npm --version`)
- [x] Python 3.10+ installed (`python --version`)
- [x] Docker Desktop installed and running
- [x] Docker Compose available (`docker-compose --version`)

**Status: ⭕ Not Started | 🟡 In Progress | ✅ Complete**  
Current: ✅

---

## 🔧 Setup ms1-core-api (Express + PostgreSQL) — 20 min

### Step 1: Prepare Directory
- [x] Navigate: `cd d:\Project\EcoMatch\ms1-core-api`
- [x] Verify structure: See `src/`, `package.json`, `docker-compose.yml`

**Status: ✅**

### Step 2: Install Dependencies (3 min)
```powershell
npm install
```
- [x] Command runs without errors
- [x] `node_modules/` folder created
- [x] "added X packages" message shown

**Status: ✅**

### Step 3: Start Database (2 min)
```powershell
docker-compose up -d
```
- [x] Docker container starts
- [x] PostgreSQL is healthy (check with `docker-compose ps`)
- [x] Database credentials: `ecomatch` / `ecomatch`

**Status: ✅**

### Step 4: Run Migrations (2 min)
```powershell
npm run db:migrate
```
- [x] Command completes without errors
- [x] 11 database tables created
- [x] "migrations completed" message shown

**Status: ✅**

### Step 5: Start Dev Server (1 min)
```powershell
npm run dev
```
- [x] Server starts on port 4000
- [x] "Express server running on http://localhost:4000" message shown
- [x] Keep this terminal open (don't press Ctrl+C)

**Status: ✅**

### Step 6: Verify ms1 Works
**In a NEW terminal:**
```powershell
curl http://localhost:4000/health
```
- [x] Returns: `{"status":"ok","service":"ms1-core-api"}`
- [x] Status code: 200

**Status: ✅**

### Step 7: Test Signup
**In the same verification terminal:**
```powershell
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
```
- [x] Returns status 200 or 201
- [x] Response includes `token` field
- [x] Response includes `businessId` field

**Status: ✅**

✅ **ms1 Complete Status:** ✅

---

## 🐍 Setup ms2-agent-service (FastAPI + Python) — 15 min

### Step 8: Prepare Directory
**In a NEW terminal:**
- [x] Navigate: `cd d:\Project\EcoMatch\ms2-agent-service`
- [x] Verify structure: See `app/`, `run.py`, `requirements.txt`

**Status: ✅**

### Step 9: Create Python Virtual Environment (1 min)
```powershell
python -m venv venv
```
- [x] `venv/` folder created
- [x] Completes without errors

**Status: ✅**

### Step 10: Activate Virtual Environment (immediate)
```powershell
.\venv\Scripts\Activate.ps1
```
- [x] Prompt changes to `(venv) PS>`
- [x] Stays activated for all following commands in this terminal

**Status: ✅**

### Step 11: Install Python Dependencies (3 min)
```powershell
pip install -r requirements.txt
```
- [x] Command runs without errors
- [x] "Successfully installed" message shown
- [x] All packages listed: fastapi, uvicorn, pydantic, langchain, etc.

**Status: ✅**

### Step 12: Start Dev Server (1 min)
```powershell
python run.py
```
- [x] Server starts on port 8000
- [x] "Uvicorn running on http://0.0.0.0:8000" message shown
- [x] Keep this terminal open (don't press Ctrl+C)

**Status: ✅**

### Step 13: Verify ms2 Works
**In a NEW terminal:**
```powershell
curl http://localhost:8000/health
```
- [x] Returns: `{"status":"ok","service":"ms2-agent-service"}`
- [x] Status code: 200

**Status: ✅**

### Step 14: Access API Documentation
**In your browser:**
- [x] Visit: `http://localhost:8000/docs`
- [x] Page loads successfully
- [x] You see: `/classify`, `/match`, `/draft`, `/verify` endpoints listed

**Status: ✅**

✅ **ms2 Complete Status:** ✅

---

## 🔄 Integration Testing — 15 min

### Step 15: Verify Service Communication
**In a NEW terminal:**
- [x] Both ms1 (terminal with `npm run dev`) and ms2 (terminal with `python run.py`) are still running
- [x] Both health checks respond (Ctrl+C to stop checks, services still running)

**Status: ✅**

### Step 16: Test Full Submission Pipeline
**Run this script in a NEW terminal:**

```powershell
cd d:\Project\EcoMatch\ms1-core-api

# Login to get token
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResp = Invoke-WebRequest -Uri http://localhost:4000/auth/login `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $loginBody

$token = ($loginResp.Content | ConvertFrom-Json).token

# Submit material
$submissionBody = @{
    rawDescription = "5 tons of food scraps and spent coffee grounds"
    photoRefs = @("photo1.jpg")
    disposalCostPerUnit = 50
    disposalFrequency = "monthly"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$subResp = Invoke-WebRequest -Uri http://localhost:4000/submissions `
  -Method POST `
  -Headers $headers `
  -Body $submissionBody

$subData = $subResp.Content | ConvertFrom-Json

Write-Host "Submission Status: $($subData.status)"
Write-Host "Category: $($subData.classification.primaryCategory)"
Write-Host "Confidence: $($subData.classification.confidence)"
```

- [x] Submission returns status: `match_proposed` (or `needs_followup` if conf < 0.7)
- [x] Category: `organic_biomass`
- [x] Confidence: `> 0.7`
- [x] No errors in response

**Status: ✅**

### Step 17: Check Match Details
**Continuing in same terminal:**

```powershell
$submissionId = ($subData.id)  # From previous response
$matchResp = Invoke-WebRequest -Uri "http://localhost:4000/matches/$submissionId" `
  -Method GET `
  -Headers $headers

$matchData = $matchResp.Content | ConvertFrom-Json

Write-Host "Match Confidence: $($matchData.matchConfidence)"
Write-Host "Target Business ID: $($matchData.targetBusinessId)"
Write-Host "Has Rationale: $(-not [string]::IsNullOrEmpty($matchData.matchRationale))"
```

- [x] Match confidence: `>= 0.7`
- [x] Target business ID: Not null
- [x] Rationale: Present (not empty)

**Status: ✅**

✅ **Integration Complete Status:** ✅

---

## 🧪 Run Tests — 10 min

### Step 18: Test ms1
**In a NEW terminal (or stop dev server first):**

```powershell
cd d:\Project\EcoMatch\ms1-core-api
npm test
```

- [x] All tests pass
- [x] Output shows: "Tests: X passed, X total"
- [x] No failures

**Status: ✅**

### Step 19: Test ms2
**In a NEW terminal:**

```powershell
cd d:\Project\EcoMatch\ms2-agent-service
.\venv\Scripts\Activate.ps1
pytest -v
```

- [x] All tests pass
- [x] Output shows: "X passed"
- [x] No failures

**Status: ✅**

✅ **Tests Complete Status:** ✅

---

## 📊 Final Verification

### All Services Running?

- [x] ms1-core-api:
  - Running: `http://localhost:4000`
  - Health: ✅
  - Can signup: ✅
  - Can submit material: ✅

- [x] ms2-agent-service:
  - Running: `http://localhost:8000`
  - Health: ✅
  - Docs available: ✅
  - Responds to requests: ✅

- [x] PostgreSQL:
  - Running: `docker-compose ps`
  - Healthy: ✅
  - Schema created: ✅

- [x] Integration:
  - ms1 calls ms2: ✅
  - Classification works: ✅
  - Matching works: ✅
  - Full pipeline works: ✅

### All Tests Passing?

- [x] ms1 tests: ✅ (4 tests)
- [x] ms2 tests: ✅ (9 tests)

---

## 🎉 Setup Complete!

When all checkboxes are checked, you have successfully:

✅ Installed all prerequisites  
✅ Set up ms1-core-api with database  
✅ Set up ms2-agent-service  
✅ Verified both services work independently  
✅ Verified integration between services  
✅ Passed all tests  

---

## 🆘 If Something Goes Wrong

### Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | See Troubleshooting section in SETUP_GUIDE.md |
| Module not found | Reinstall: `npm install` or `pip install -r requirements.txt` |
| DB connection failed | Check: `docker-compose ps` and `docker logs ms1-db` |
| venv not activating | Reinstall: `python -m venv venv` |
| Token invalid | Create new account: `npm run seed` or signup again |

### Need Help?

1. Check [SETUP_GUIDE.md](d:\Project\EcoMatch\SETUP_GUIDE.md) — Detailed troubleshooting
2. Check [PHASE_1A_COMPLETE.md](d:\Project\EcoMatch\PHASE_1A_COMPLETE.md) — Architecture overview
3. Check terminal output for error messages
4. See README.md in each service directory

---

## ⏱️ Time Estimate

- ⏱️ Prerequisites check: **5 min**
- ⏱️ ms1 setup: **20 min**
- ⏱️ ms2 setup: **15 min**
- ⏱️ Integration testing: **15 min**
- ⏱️ Run tests: **10 min**

**Total: ~65 minutes (first time)**

Subsequent runs (dev cycle):
- Start ms1: 1 min
- Start ms2: 1 min
- Total: ~2 min

---

## 📱 Quick Commands Reference

```powershell
# Check everything
.\quick-setup.ps1 check-env
.\quick-setup.ps1 health-check

# Setup everything
.\quick-setup.ps1 setup-all

# Start services (in separate terminals)
.\quick-setup.ps1 start-ms1
.\quick-setup.ps1 start-ms2

# Run tests
.\quick-setup.ps1 test-ms1
.\quick-setup.ps1 test-ms2

# Cleanup
.\quick-setup.ps1 clean
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| [SETUP_GUIDE.md](d:\Project\EcoMatch\SETUP_GUIDE.md) | Complete step-by-step guide with details |
| [QUICK_START.ps1](d:\Project\EcoMatch\QUICK_START.ps1) | Automated setup script |
| [PHASE_1A_COMPLETE.md](d:\Project\EcoMatch\PHASE_1A_COMPLETE.md) | Architecture overview |
| [ms1 README](d:\Project\EcoMatch\ms1-core-api\README.md) | ms1-specific documentation |
| [ms2 README](d:\Project\EcoMatch\ms2-agent-service\README.md) | ms2-specific documentation |

---

**Your journey from zero to running EcoMatch Phase 1a locally! 🚀**
