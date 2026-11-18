# EcoMatch Phase 1a — Setup Overview & Architecture

Visual reference for understanding the system and setup process.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  User's Computer (Windows)                                             │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  Browser (Optional)                                             │  │
│  │  http://localhost:8000/docs  ← View API documentation          │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Terminal 1: ms1 (Express)              Terminal 2: ms2 (FastAPI)      │
│  ┌──────────────────────────┐           ┌──────────────────────────┐   │
│  │                          │           │                          │   │
│  │  PORT: 4000              │           │  PORT: 8000              │   │
│  │  npm run dev             │           │  python run.py           │   │
│  │                          │           │                          │   │
│  │  Routes:                 │           │  Endpoints:              │   │
│  │  ✓ POST /auth/signup     │           │  ✓ POST /classify       │   │
│  │  ✓ POST /submissions     │──HTTP────▶│  ✓ POST /match          │   │
│  │  ✓ GET /matches          │◀──JSON───│  ✓ POST /draft          │   │
│  │  ✓ POST /outreach/:id/*  │           │  ✓ POST /verify         │   │
│  │  ✓ POST /certificates/*  │           │                          │   │
│  │  + 20+ more              │           │  All Agents:             │   │
│  │                          │           │  ✓ Scout (classify)      │   │
│  │                          │           │  ✓ Alchemist (match)     │   │
│  │                          │           │  ✓ Negotiator (draft)    │   │
│  │                          │           │  ✓ Verification (verify) │   │
│  │                          │           │                          │   │
│  └──────────────────────────┘           └──────────────────────────┘   │
│            ▲                                       ▲                     │
│            │                                       │                     │
│  Terminal 3: PostgreSQL (Docker)                  │                     │
│  ┌──────────────────────────┐                     │                     │
│  │                          │                     │                     │
│  │  PORT: 5432              │                     │                     │
│  │  docker-compose up -d    │                     │                     │
│  │                          │                     │                     │
│  │  Database: ecomatch      │◀──Queries──────────┘                      │
│  │  User: ecomatch                                                      │
│  │  Pass: ecomatch                                                      │
│  │                          │                                           │
│  │  Tables: 11              │                                           │
│  │  ✓ users                 │                                           │
│  │  ✓ businesses            │                                           │
│  │  ✓ submissions           │                                           │
│  │  ✓ matches              │                                           │
│  │  ✓ outreach_drafts      │                                           │
│  │  ✓ verification_records │                                           │
│  │  ✓ certificates         │                                           │
│  │  + 4 more                │                                           │
│  │                          │                                           │
│  └──────────────────────────┘                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Setup Flow (Step by Step)

```
START
  ↓
[1] Check Prerequisites
  ├─ Node.js 20+? ✓
  ├─ Python 3.10+? ✓
  ├─ Docker? ✓
  └─ Continue ✓
  ↓
[2] Setup ms1-core-api
  ├─ npm install (3 min)
  ├─ docker-compose up -d (2 min)
  ├─ npm run db:migrate (2 min)
  └─ npm run dev (starts server)
  ↓
[3] Setup ms2-agent-service
  ├─ python -m venv venv (1 min)
  ├─ Activate venv
  ├─ pip install -r requirements.txt (3 min)
  └─ python run.py (starts server)
  ↓
[4] Verify Services
  ├─ curl http://localhost:4000/health ✓
  ├─ curl http://localhost:8000/health ✓
  └─ http://localhost:8000/docs shows endpoints ✓
  ↓
[5] Test Integration
  ├─ POST /auth/signup (ms1)
  ├─ POST /submissions (ms1 calls ms2 /classify)
  ├─ GET /matches (ms1 calls ms2 /match)
  └─ All respond correctly ✓
  ↓
[6] Run Tests
  ├─ npm test (ms1: 8 tests) ✓
  └─ pytest -v (ms2: 9 tests) ✓
  ↓
COMPLETE ✓
```

---

## 🎯 What Each Terminal Does

### Terminal 1: ms1-core-api

```powershell
cd d:\Project\EcoMatch\ms1-core-api
npm run dev
```

**Purpose:** Express REST API server

**What it does:**
- Accepts HTTP requests from users
- Manages business accounts and submissions
- Calls ms2 agents (via HTTP) for reasoning
- Stores everything in PostgreSQL
- Returns JSON responses

**Ports:**
- 4000: Express server

**Keep this running** while developing

---

### Terminal 2: ms2-agent-service

```powershell
cd d:\Project\EcoMatch\ms2-agent-service
.\venv\Scripts\Activate.ps1
python run.py
```

**Purpose:** FastAPI agent service

**What it does:**
- Receives requests from ms1 (HTTP POST)
- Runs agents (Scout, Alchemist, Negotiator, Verification)
- Returns reasoning results (JSON)
- No database calls, purely stateless
- Can be restarted anytime without side effects

**Ports:**
- 8000: FastAPI server
- 8000/docs: Interactive API documentation

**Keep this running** while developing

---

### Terminal 3: PostgreSQL (Docker)

```powershell
cd d:\Project\EcoMatch\ms1-core-api
docker-compose up -d  # Starts once, runs in background
```

**Purpose:** Database for ms1

**What it does:**
- Stores all persistent data
- Runs in Docker container
- Persists data even after restart
- No terminal output needed

**Ports:**
- 5432: PostgreSQL

**Verify with:**
```powershell
docker-compose ps          # Check status
docker exec ms1-db pg_isready -U ecomatch  # Test connection
docker logs ms1-db         # View logs if issues
docker-compose down        # Stop it
```

---

## 🔄 Data Flow Example: Submit Material

```
User Browser
    ↓
[POST /submissions]
    ↓
ms1-core-api (Express)
├─ Receive submission
├─ Generate submissionId
├─ HTTP POST to ms2
│   ↓
│   ms2-agent-service (FastAPI)
│   ├─ Receive POST /classify request
│   ├─ Scout Agent classifies material
│   ├─ Return classification + confidence
│   ↓
├─ Receive response from ms2
├─ If hazardFlag=false and confidence >= 0.7:
│   └─ HTTP POST to ms2
│       ↓
│       ms2-agent-service
│       ├─ Receive POST /match request
│       ├─ Alchemist Agent finds compatible business
│       ├─ Return match + rationale
│       ↓
├─ Receive match response
├─ Create outreach_drafts (2 rows)
├─ HTTP POST to ms2
│   ↓
│   ms2-agent-service
│   ├─ Receive POST /draft request
│   ├─ Negotiator Agent drafts proposals
│   ├─ Return sourceDraft + targetDraft
│   ↓
├─ Receive drafts
├─ Save everything to PostgreSQL
├─ Return to user: submission status, match, drafts
│
└─ User response
```

---

## 📊 Database Schema (ms1)

```
users
├─ id (PK)
├─ email (unique)
├─ password (bcrypt hash)
├─ role (user, admin)
└─ createdAt

businesses
├─ id (PK)
├─ userId (FK → users)
├─ name
├─ type
├─ lat/lng
├─ address
└─ phone

submissions
├─ id (PK)
├─ businessId (FK → businesses)
├─ description
├─ disposalCostPerUnit
├─ status (needs_classification, match_proposed, ...)
└─ createdAt

classifications
├─ submissionId (FK → submissions)
├─ primaryCategory (6 options)
├─ confidence (0-1)
├─ hazardFlag
└─ followupQuestion (optional)

matches
├─ id (PK)
├─ submissionId (FK → submissions)
├─ sourceBusinessId (FK → businesses)
├─ targetBusinessId (FK → businesses)
├─ matchConfidence
├─ status (proposed, source_accepted, ...)
└─ createdAt

outreach_drafts
├─ id (PK)
├─ matchId (FK → matches)
├─ businessId (FK → businesses)  ← Which side (source or target)
├─ message
├─ status (pending, accepted, rejected)
└─ createdAt

verification_records
├─ id (PK)
├─ matchId (FK → matches)
├─ businessId (FK → businesses)
├─ evidence (JSON)
├─ confirmed (boolean)
└─ createdAt

certificates
├─ id (PK)
├─ matchId (FK → matches)
├─ co2eAvoidedKg
├─ dollarsSaved
├─ issueDate
└─ pdfUrl
```

---

## 🔐 API Authentication (ms1 only, ms2 is open)

```
1. Signup
   POST /auth/signup
   Body: { email, password, businessName, ... }
   Response: { token, businessId, ... }

2. Login
   POST /auth/login
   Body: { email, password }
   Response: { token, businessId, ... }

3. Use Token
   GET /businesses/:id
   Header: Authorization: Bearer <token>
   Response: { id, name, ... }

4. Token expires after 7 days
   → Login again to get new token
```

---

## 🎯 Troubleshooting Quick Ref

| Problem | Check | Solution |
|---------|-------|----------|
| "Cannot connect to ms2" | Port 8000 open? | `netstat -ano \| findstr :8000` |
| "Cannot connect to DB" | Docker running? | `docker-compose ps` |
| "Port 4000 in use" | Kill existing process | `taskkill /PID <PID> /F` |
| "venv not activating" | Right path? | Check: `ls venv/Scripts/` |
| "Import error: fastapi" | venv activated? | `.\venv\Scripts\Activate.ps1` |
| "Login fails" | Token expired? | Create new user or login again |

---

## 📚 Key Files You'll Edit

| Path | Purpose | When to Edit |
|------|---------|--------------|
| ms1: `src/submissions/routes.ts` | Submission pipeline | Add new rules or validations |
| ms1: `src/db/schema.ts` | Database schema | Add new fields to tables |
| ms2: `app/agents/scout.py` | Classification logic | Improve classification |
| ms2: `app/reference_data/categories.py` | Categories + emission factors | Update material categories |
| ms2: `app/agents/alchemist.py` | Matching logic | Improve matching algorithm |

---

## ⚡ Quick Commands

```powershell
# One-time setup
.\quick-setup.ps1 setup-all

# Start services
.\quick-setup.ps1 start-ms1    # Terminal 1
.\quick-setup.ps1 start-ms2    # Terminal 2

# Verify
.\quick-setup.ps1 health-check # Terminal 3

# Test
.\quick-setup.ps1 test-ms1
.\quick-setup.ps1 test-ms2

# Cleanup
.\quick-setup.ps1 clean
```

---

## 🚀 First 5 Minutes After Setup Complete

1. **View API Docs** (60 sec)
   - Open browser: `http://localhost:8000/docs`
   - See all 4 endpoints with interactive testing

2. **Create Test Account** (30 sec)
   ```powershell
   curl -X POST http://localhost:4000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"pass123",...}'
   ```

3. **Submit Material** (60 sec)
   - Use token from account creation
   - POST /submissions with "food scraps" description
   - See classification, match, and drafts returned

4. **Check Logs** (60 sec)
   - Look at ms1 terminal: See request/response logs
   - Look at ms2 terminal: See agent execution logs
   - Look for latency metrics (ms)

5. **Run Tests** (120 sec)
   ```powershell
   npm test          # ms1
   pytest -v         # ms2
   ```

---

## 📖 Documentation Structure

```
d:\Project\EcoMatch\
├─ SETUP_GUIDE.md              ← You are here (step by step)
├─ SETUP_CHECKLIST.md          ← Track your progress
├─ QUICK_START.ps1            ← Automated commands
├─ PHASE_1A_COMPLETE.md       ← Architecture overview
│
├─ ms1-core-api/
│  ├─ README.md               ← ms1 development guide
│  ├─ PHASE_1A_SUMMARY.md     ← ms1 build summary
│  └─ REQUIREMENTS_MAPPING.md ← Requirement traceability
│
└─ ms2-agent-service/
   ├─ README.md               ← ms2 development guide
   ├─ PHASE_1A_COMPLETE.md    ← ms2 build summary
   └─ FILE_INVENTORY.md       ← File listing
```

---

## 🎓 Learning Path

**Beginner (Just want to run it):**
1. Read this file (2 min)
2. Follow SETUP_GUIDE.md Part 1-2 (30 min)
3. Follow SETUP_CHECKLIST.md (verify everything works) (10 min)
4. Done!

**Intermediate (Want to understand it):**
1. Follow all above
2. Read PHASE_1A_COMPLETE.md (architecture) (10 min)
3. Look at ms1/README.md and ms2/README.md (10 min)
4. Explore the code: `src/submissions/routes.ts` and `app/agents/scout.py`
5. Done!

**Advanced (Want to modify it):**
1. Follow all above
2. Read agents.md (full agent specifications) (15 min)
3. Read schema.md (data model) (10 min)
4. Read rules.md (constraints) (5 min)
5. Modify agents, schemas, or routes
6. Run tests: `npm test` and `pytest -v`
7. Done!

---

**Ready to start? Go to [SETUP_GUIDE.md](d:\Project\EcoMatch\SETUP_GUIDE.md)!**

Questions? Check [SETUP_CHECKLIST.md](d:\Project\EcoMatch\SETUP_CHECKLIST.md) or the troubleshooting sections in README files.
