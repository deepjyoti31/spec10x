# Spec10x

Spec10x is a customer intelligence app for turning raw interview, support, and survey evidence into a shared product signal layer.

Current workspace status:

- the full `v0.5x` release family (`v0.5` through `v0.54`) is shipped and founder-accepted: multi-source evidence, Zendesk/Fireflies/PostHog/Otter.ai connectors, Impact Score v2 with trends, priority board, saved views, collections, and theme merge
- `v0.8` (Specification Engine MVP) is implemented and in founder review: evidence-cited spec generation, Spec Studio, review workflow, and the Trends page — see `Documentation/DevOps/v0.8_release_checklist.md`

## Current Product Surface

The repo currently supports:

- interview upload for text, document, audio, and video files
- AI extraction of insights, themes, sentiment, and cited evidence
- Ask over interview data with grounded citations
- a unified `/feed` surface for interview, Zendesk, and survey evidence
- a dedicated `/board` surface for ranked theme triage with pin and monitor states
- source-aware theme detail with supporting evidence grouped by source
- integrations for Zendesk, Fireflies, PostHog, and Otter.ai plus repeatable survey and NPS CSV import
- Impact Score v2 for urgency sorting plus score-breakdown, trend, and score-change UI in theme detail and board cards
- AI-generated, evidence-cited feature briefs (`/specs`) with a Draft → Approved → Shipped review workflow and a `Generate Spec` action on pinned board themes
- a `/trends` page showing weekly theme signal velocity with rising/declining/stable grouping
- saved feed views, interview collections, and theme merge
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

The Playwright smoke suite lives in `frontend/e2e/smoke/` and runs with:

```powershell
cd frontend
npm run test:smoke
```

## Documentation

The current source of truth for roadmap and implementation state is in `Documentation/CTO/`.

Key docs:

- release tracker: `Documentation/CTO/Product Manager/v0.5_project_tracker.md`
- planning: `Documentation/CTO/v0.5_planning.md`
- architecture: `Documentation/CTO/technical_architecture.md`
- trust promises: `Documentation/CTO/Product Manager/v0.5_trust_promises.md`
- QA strategy: `Documentation/QA/testing_strategy.md`

## Current Release Scope

`v0.8` (Specification Engine MVP) is the active release, implemented per `PRD-08-01` and awaiting founder acceptance. It adds on top of the shipped `v0.5x` family:

- a `specs` data model with workspace ownership, theme snapshots, and evidence snapshots
- Gemini-based spec generation with a numbered-citation contract back to real signals
- `/api/specs` CRUD, regeneration, and a validated Draft → In Review → Needs Changes → Approved → In Dev → Shipped workflow
- the `/specs` Spec Studio (list + split-pane detail with inline editing and an evidence panel)
- `GET /api/themes/trends` and the `/trends` page (weekly voice-signal velocity per theme)
- a live `Generate Spec` action on pinned `/board` cards

Deferred by `D-08-04` (documented in `PRD-08-01`):

- wireframe suggestions and the `/wireframes` page
- user flow diagrams and codebase awareness (repo connectors)
- spec collaboration (comments, co-editing, team sign-offs)
- agent-ready task export and PM tool sync (`v1.0` scope)

## License

Proprietary. All rights reserved.
