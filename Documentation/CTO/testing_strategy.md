# Spec10x v0.1 — Testing Strategy

> **Owner:** CTO  
> **Last Updated:** Feb 26, 2026  
> **Status:** Day 4 complete, Day 5 pending (Sprint: Feb 24–28)

---

## Philosophy

We follow a **testing pyramid** approach: a strong base of unit tests, a middle layer of integration tests, and lightweight E2E smoke tests at the top. Given our solo-founder + AI-agents model, automated tests are critical — they're our safety net against regressions when iterating fast.

```
       ╱    E2E     ╲          ← Few: browser smoke tests
      ╱  Integration  ╲       ← Medium: API endpoint + DB round-trips
     ╱    Unit Tests    ╲      ← Many: services, utilities, pure logic
    ╱───────────────────────╲
```

---

## Test Types

### 1. Unit Tests (Backend)

**What:** Test individual functions and classes in isolation — mock all external dependencies (DB, Redis, storage, AI).

**Why:** Fast feedback loop. Catches logic errors in the processing pipeline, analysis keyword matching, text chunking, theme clustering, and billing limit calculations.

**When:** Run locally before every commit. Runs in CI on every push.

**Files:**

| Test File | Tests | Module Under Test |
|---|---|---|
| `tests/test_extraction.py` | Text extraction from .txt, .pdf, .docx; mock audio fallback | `services/extraction.py` |
| `tests/test_analysis.py` | Keyword detection, insight generation, speaker detection, title generation | `services/analysis.py` |
| `tests/test_synthesis.py` | Theme name normalization, grouping, sentiment aggregation, Signal vs Theme | `services/synthesis.py` |
| `tests/test_embeddings.py` | Transcript chunking (size, overlap, edge cases), mock embedding dimensions | `services/embeddings.py` |
| `tests/test_qa.py` | Keyword extraction, stop-word filtering, follow-up suggestion generation | `services/qa.py` |
| `tests/test_billing.py` | Plan limit calculations, usage increment logic | `api/billing.py` |

**How to Run:**

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest tests/ -v
```

Run a specific file:

```powershell
pytest tests/test_extraction.py -v
```

Run with coverage:

```powershell
pytest tests/ --cov=app --cov-report=term-missing
```

---

### 2. Integration Tests (Backend)

**What:** Test API endpoints with a real database and real service interactions. Verifies the full request → DB → response cycle, including auth middleware, serialization, and cascading deletes.

**Why:** Catches issues that unit tests miss — schema mismatches, foreign key constraint violations, incorrect SQL queries, middleware ordering.

**When:** Run before merging to main. Runs in CI on PR.

**Requires:** Docker services running (PostgreSQL, Redis, MinIO).

**Files:**

| Test File | Tests | Endpoint(s) Under Test |
|---|---|---|
| `tests/test_api_auth.py` | Token verification, user creation, dev-mode fallback | `/api/auth/*` |
| `tests/test_api_interviews.py` | CRUD, duplicate hash rejection, reanalyze, upload-url | `/api/interviews/*` |
| `tests/test_api_themes.py` | List, detail, rename | `/api/themes/*` |
| `tests/test_api_insights.py` | CRUD, flag toggle, soft delete | `/api/insights/*` |
| `tests/test_api_ask.py` | Ask question, list conversations, get conversation | `/api/ask/*` |
| `tests/test_api_export.py` | Markdown export (all insights, single interview) | `/api/export/*` |
| `tests/test_api_billing.py` | Usage fetch, limits, plan enforcement | `/api/billing/*` |

**How to Run:**

```powershell
# Ensure Docker services are up
docker compose up -d

cd backend
.\.venv\Scripts\Activate.ps1
pytest tests/test_api_*.py -v
```

**Test Database Strategy:** Integration tests use the same local database but wrap each test in a transaction that rolls back on teardown — no data leaks between tests.

---

### 3. Pipeline Tests (Backend)

**What:** End-to-end tests of the full processing pipeline: upload → extract → analyze → embed → synthesize → done. Uses mock AI but real DB operations.

**Why:** The processing pipeline is the core value engine. We need to verify the entire orchestration works, including status transitions and error handling.

**When:** Run before any release. Part of CI.

**Files:**

| Test File | Tests |
|---|---|
| `tests/test_processing_pipeline.py` | Full pipeline with .txt file, status transitions, insight creation, theme synthesis, error recovery |

**How to Run:**

```powershell
# Ensure Docker services are up
docker compose up -d

cd backend
.\.venv\Scripts\Activate.ps1
pytest tests/test_processing_pipeline.py -v
```

---

### 4. Frontend Tests (Day 5)

**What:** Component-level tests using React Testing Library + Jest/Vitest. Tests key UI interactions (upload flow, theme card clicks, Ask chat).

**Why:** Ensures UI components render correctly, handle loading/error states, and respond to user interactions.

**When:** Implemented during Day 5 polish phase. Frontend components are built (Day 3 complete).

**Planned:**

| Test File | Component |
|---|---|
| `__tests__/Dashboard.test.tsx` | Dashboard layout, theme rendering |
| `__tests__/UploadModal.test.tsx` | Upload flow, file validation, progress |
| `__tests__/AskPage.test.tsx` | Question submission, citation rendering |

**How to Run:**

```powershell
cd frontend
npm test
```

---

### 5. E2E Smoke Tests (Day 5)

**What:** Browser-level tests that verify the critical user path works end-to-end: Login → Upload → View Insights → Ask Question → Export.

**Why:** Final confidence check that the full stack works together. Catches integration issues between frontend, backend, and infrastructure.

**When:** Implemented during Day 5. Run manually before each deployment.

**Tool:** Playwright (if automated) or manual checklist (for beta).

**Critical Path:**

1. Open `http://localhost:3000` → Login/Signup page renders
2. Login with dev credentials → Redirected to dashboard
3. Click Upload → Modal opens → Upload a .txt file → Processing begins
4. Wait for processing → Interview appears as "done" → Click to view
5. Interview detail shows transcript + extracted insights
6. Navigate to Ask → Submit a question → Receive answer with citations
7. Navigate to Settings → View usage → Export insights as markdown

---

## Test Configuration

### `backend/pytest.ini`

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

### `backend/tests/conftest.py`

Shared fixtures:

| Fixture | Purpose |
|---|---|
| `db_session` | Async SQLAlchemy session with transaction rollback |
| `client` | `httpx.AsyncClient` with `TestClient` transport |
| `mock_user` | Pre-created User record for auth bypass |
| `sample_interview` | Interview record with transcript for testing |
| `sample_insights` | Set of Insight records linked to interview |

---

## Test Schedule

| Phase | Day | What | Who Runs |
|---|---|---|---|
| **Unit tests** | Day 2 (✅ done) | Services layer: extraction, analysis, synthesis, embeddings, QA, billing | Developer / CI |
| **Integration tests** | Day 3–4 (✅ done) | API endpoints with real DB | Developer / CI |
| **Pipeline tests** | Day 4 (✅ done) | Full processing pipeline E2E | Developer / CI |
| **Frontend tests** | Day 5 | Component tests (UI built Day 3, pages Day 4) | Developer / CI |
| **E2E smoke tests** | Day 5 | Critical path manual walk-through | Developer |
| **Beta acceptance** | Post-launch | Real users, real data, feedback loop | Beta testers |

---

## CI/CD Integration (Future)

When Cloud Build is configured:

```yaml
# cloudbuild.yaml
steps:
  - name: 'python:3.12'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd backend
        pip install -r requirements.txt
        pytest tests/ -v --tb=short
```

Tests **must pass** before any deployment to Cloud Run.

---

## Coverage Goals

| Module | Target | Rationale |
|---|---|---|
| `services/` | ≥ 80% | Core business logic — highest risk |
| `api/` | ≥ 70% | Endpoint validation, auth, error handling |
| `core/` | ≥ 60% | Config, database setup — less business logic |
| `workers/` | ≥ 50% | Job orchestration — tested via pipeline tests |
| **Overall** | **≥ 70%** | Balanced coverage for a beta product |

---

## Running All Tests (Quick Reference)

```powershell
# Prerequisite: Docker services running
docker compose up -d

# Backend: All tests
cd backend
.\.venv\Scripts\Activate.ps1
pytest tests/ -v

# Backend: With coverage
pytest tests/ --cov=app --cov-report=term-missing

# Backend: Specific category
pytest tests/test_extraction.py -v         # Unit: extraction
pytest tests/test_api_interviews.py -v     # Integration: interviews API
pytest tests/test_processing_pipeline.py -v  # Pipeline: full E2E

# Frontend: All tests (Day 5+)
cd frontend
npm test
```
