# Spec10x

Spec10x is a customer intelligence app for turning raw interview, support, and survey evidence into a shared product signal layer.

Current workspace status:

- the full `v0.5x` release family (`v0.5` through `v0.54`) is shipped and accepted: multi-source evidence, Zendesk/Fireflies/PostHog/Otter.ai connectors, Impact Score v2 with trends, priority board, saved views, collections, and theme merge
- `v0.8` (Specification Engine MVP) is shipped and accepted: evidence-cited spec generation, Spec Studio, review workflow, and the Trends page — see `Documentation/releases/v0.8_release_checklist.md`
- `v1.0` (Full Loop MVP) is implemented: task breakdown, agent-ready markdown export, ship & outcomes tracking, and the roadmap/Command Center views — see `Documentation/releases/v1.0_release_checklist.md`

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
- AI-generated, evidence-cited feature briefs (`/specs`) with a Draft → In Review → Needs Changes → Approved → In Dev → Shipped review workflow and a `Generate Spec` action on pinned board themes
- a `/trends` page showing weekly theme signal velocity with rising/declining/stable grouping
- saved feed views, interview collections, and theme merge
- AI task breakdown for approved specs plus a self-contained agent-ready markdown export, surfaced in the Spec Studio task panel and the `/tasks` delivery workbench
- a `/roadmap` Now/Next/Later/Shipped view derived from spec statuses
- an `/outcomes` page tracking post-ship voice-signal movement (improving/worsening/flat/too early/unavailable) against the original pain points
- a home-page Spec Pipeline replacing the earlier placeholder cards, plus unlocked `Tasks`, `Roadmap`, and `Outcomes` sidebar entries
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
|- Documentation/            # product, engineering, qa, and release docs
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

The current source of truth for roadmap and implementation state is in `Documentation/engineering/`.

Key docs:

- release tracker: `Documentation/engineering/Product Manager/v0.5_project_tracker.md`
- planning: `Documentation/engineering/v0.5_planning.md`
- architecture: `Documentation/engineering/technical_architecture.md`
- trust promises: `Documentation/engineering/Product Manager/v0.5_trust_promises.md`
- QA strategy: `Documentation/qa/testing_strategy.md`
- v1.0 PRD: `Documentation/engineering/Product Manager/PRD-10-01_full_loop_mvp.md`
- v1.0 release checklist: `Documentation/releases/v1.0_release_checklist.md`

## Current Release Scope

`v1.0` (Full Loop MVP) is the active release, implemented per `PRD-10-01` — see `Documentation/releases/v1.0_release_checklist.md`. It adds on top of the accepted `v0.5x` and `v0.8` families:

- task breakdown for approved specs (`tasks_json` / `tasks_generated_at` / `shipped_at` on `specs`) via `POST /api/specs/{id}/tasks`, gated on approval
- a self-contained agent-ready export bundle via `GET /api/specs/{id}/export` (brief + tasks + numbered evidence appendix)
- the Spec Studio task panel (`Break into tasks`, complexity/dependency/citation chips, `Copy for agent` and `.md` download) and the `/tasks` delivery workbench
- ship tracking (`shipped_at` stamped on first transition to Shipped) and `GET /api/specs/outcomes` — weekly voice-signal buckets before/after ship with correlational framing
- the `/outcomes` page and the `/roadmap` Now/Next/Later/Shipped view, both derived from spec statuses
- a home-page Spec Pipeline replacing the earlier "Coming Soon" placeholders

Deferred per `PRD-10-01` (below the cut line, not dropped):

- two-way PM tool sync (Linear/Jira/GitHub/Asana) and a public API/webhooks
- competitive intelligence and custom dashboards/reports
- auto-close loop notifications and task editing/reordering
- wireframe suggestions, user flow diagrams, codebase awareness, and spec collaboration (still deferred from `v0.8` per `D-08-04`, gated on spec-trust measurement)

## Contributing

Spec10x is open source. Issues and pull requests are welcome — see `Documentation/` for the product vision, architecture, and release history before proposing larger changes.

## License

MIT — see [LICENSE](LICENSE).
