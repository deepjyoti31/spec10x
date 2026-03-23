# Spec10x

Spec10x is a customer intelligence app for turning raw interview, support, and survey evidence into a shared product signal layer.

Current workspace status:

- interview upload, analysis, theme synthesis, and Ask are working
- Sprint 6 of the `v0.5` alpha is implemented
- mixed-source feed, source-aware theme detail, Zendesk sync details, repeatable survey CSV import, and Impact Score v1 are in the codebase
- the priority board, trust package, and observability baseline are in the codebase; Sprint 7 smoke coverage, replay hardening, and rollout docs are next

## Current Product Surface

The repo currently supports:

- interview upload for text, document, audio, and video files
- AI extraction of insights, themes, sentiment, and cited evidence
- Ask over interview data with grounded citations
- a unified `/feed` surface for interview, Zendesk, and survey evidence
- a dedicated `/board` surface for ranked theme triage with pin and monitor states
- source-aware theme detail with supporting evidence grouped by source
- integrations for Zendesk plus repeatable survey and NPS CSV import
- Impact Score v1 for urgency sorting plus score-breakdown UI in theme detail and board cards
- public `/trust`, `/privacy`, and `/terms` pages aligned to the current trust promises

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.1, React 19, TypeScript |
| Backend | FastAPI, Python 3.12, SQLAlchemy async |
| Database | PostgreSQL 17 + pgvector |
| Cache / Queue | Redis 7 + arq |
| Storage | MinIO locally, Google Cloud Storage in deployed environments |
| Auth | Firebase Authentication with local dev fallback |
| AI | Vertex AI: Gemini, Chirp 3, `gemini-embedding-001` |
| Deployment | Cloud Run |

## Repo Layout

```text
spec10x/
|- frontend/                  # Next.js app
|  |- src/app/               # App Router pages
|  |- src/components/        # UI and product surfaces
|  |- src/lib/               # API client and auth helpers
|  `- package.json
|- backend/                   # FastAPI app
|  |- app/api/               # Route modules
|  |- app/services/          # Processing, sync, signal, and synthesis logic
|  |- app/models/            # SQLAlchemy models
|  |- app/schemas/           # Pydantic schemas
|  |- alembic/               # Migrations
|  `- tests/                 # Backend tests
|- Documentation/            # CEO, CTO, QA, and DevOps docs
|- infra/                    # Local database bootstrap
|- docker-compose.yml        # PostgreSQL, Redis, MinIO
`- .env.example              # Shared env template
```

## Local Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker Desktop

### 1. Start local infrastructure

```powershell
docker compose up -d
docker compose ps
```

Expected services:

- `spec10x-postgres` on `localhost:5432`
- `spec10x-redis` on `localhost:6379`
- `spec10x-minio` on `localhost:9000`
- MinIO console on `http://localhost:9001`

### 2. Configure environment files

From the repo root:

```powershell
copy .env.example backend\.env
copy .env.example frontend\.env.local
```

Important notes:

- local auth can run without Firebase, but real auth needs Firebase values
- interview processing, Ask, and other AI-backed flows need valid Vertex AI access
- for local GCP auth, use `gcloud auth application-default login`

### 3. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend docs:

- Swagger: `http://localhost:8000/docs`

### 4. Start the background worker

Open a second terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m arq app.workers.worker.WorkerSettings
```

Without the worker, uploads and background processing stay queued.

### 5. Start the frontend

Open a third terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend app:

- `http://localhost:3000`

## Daily Startup

After the initial setup, the normal local workflow is:

```powershell
docker compose up -d
```

Terminal 1:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m arq app.workers.worker.WorkerSettings
```

Terminal 3:

```powershell
cd frontend
npm run dev
```

## Testing

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest tests/ -v
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

There is no dedicated frontend automated test suite yet. The current release tracker keeps frontend smoke automation in Sprint 7.

## Documentation

The current source of truth for roadmap and implementation state is in `Documentation/CTO/`.

Key docs:

- release tracker: `Documentation/CTO/Product Manager/v0.5_project_tracker.md`
- planning: `Documentation/CTO/v0.5_planning.md`
- architecture: `Documentation/CTO/technical_architecture.md`
- trust promises: `Documentation/CTO/Product Manager/v0.5_trust_promises.md`
- QA strategy: `Documentation/QA/testing_strategy.md`

## Current Release Scope

`v0.5` is the active release. The implemented state in this workspace covers:

- source foundation
- Zendesk validation, backfill, sync, and shared signal normalization
- survey template, validation, confirm flow, history, and shared signal normalization
- native interview signals for mixed-source feed and scoring
- unified feed and source-aware theme detail
- Impact Score v1
- `/api/themes/board` and `/board`
- persistent theme `priority_state` for `default`, `pinned`, and `monitoring`
- trust-package pages and in-product trust copy alignment
- observability baseline for sync logs and duplicate-rate review

Still pending for later sprints:

- Playwright smoke coverage in CI
- connector contract, replay, and idempotency hardening
- pilot rollout notes, rollback plan, and go or no-go checklist
- saved views and other below-the-line work

## License

Proprietary. All rights reserved.
