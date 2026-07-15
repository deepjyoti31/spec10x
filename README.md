# Spec10x

**Customer evidence in → evidence-cited specs and agent-ready tasks out → and
a readout on whether the pain went quiet after you shipped.**

Spec10x is an open-source (MIT) customer-intelligence platform for product
teams. It ingests interviews, support tickets, surveys, and product analytics
into one signal layer; clusters them into ranked themes; generates
evidence-cited feature briefs from those themes; breaks approved briefs into
agent-ready tasks; hands the whole bundle to your coding agent (clipboard,
GitHub Issues, or MCP); and closes the loop by tracking whether customer voice
on the underlying pain actually fell after ship.

## Quick start

Prerequisites: Docker Desktop (or compatible engine).

```bash
git clone <this-repo> && cd spec10x
cp .env.example backend/.env
cp .env.example frontend/.env.local
docker compose --profile app up -d --build
```

- **App:** http://localhost:3000
- **API docs (Swagger):** http://localhost:8000/docs
- MinIO console: http://localhost:9001 (`minioadmin` / `minioadmin`)

In development mode auth runs with a local mock user — no Firebase project
needed to try it out.

### AI features need Vertex AI

Spec10x runs without any AI credentials — every surface loads, and imported
data (Zendesk, CSV, PostHog) flows through feed, themes, and the board. These
flows additionally need Google Cloud **Vertex AI** access (Gemini):

| Needs Vertex AI | Works without it |
|---|---|
| interview transcription & insight extraction | connector sync & CSV import |
| Ask (grounded Q&A over interviews) | feed, themes, board, trends |
| spec generation & task breakdown | review workflow, roadmap, outcomes |
| product-context fingerprinting | team workspaces, GitHub Issues export, MCP reads |

To enable them: set `GCP_PROJECT_ID`/`GCP_LOCATION` in `backend/.env` and
authenticate (`gcloud auth application-default login` locally, or a service
account in deployment).

## The loop

1. **Collect** — upload interviews (text/doc/audio/video) or connect Zendesk,
   Fireflies, Otter.ai, PostHog, and survey/NPS CSV imports
2. **Understand** — AI extraction into insights and themes with sentiment,
   citations, and Impact Score v2 ranking (`/feed`, `/insights`, `/board`,
   `/trends`)
3. **Specify** — generate an evidence-cited brief from a theme; review it
   through Draft → In Review → Approved in Spec Studio (`/specs`)
4. **Deliver** — break the approved brief into agent-ready tasks; hand off via
   `Copy for agent`, `.md` download, one-way **GitHub Issues export**, or the
   **MCP server** (`/tasks`, `/roadmap`)
5. **Learn** — the first ship stamps the outcome window; `/outcomes` compares
   customer-voice volume before vs. after, honestly labeled as correlational,
   and notifies you when the readout becomes readable

## Multi-user workspaces

Invite teammates by email from the **Team** page. Members join your existing
workspace after an explicit accept and share its evidence, themes, specs,
tasks, and outcomes. Owner/member roles; members can switch between the shared
workspace and their own personal one at any time. In-app invites only — no
email delivery dependency.

## MCP server (agent handoff without copy-paste)

Any MCP client (Claude Code, for example) can pull a spec's self-contained
context bundle and report the ship back:

```bash
cd backend
SPEC10X_MCP_USER_EMAIL=you@example.com python -m app.mcp
```

Claude Code configuration (`.mcp.json` in your project):

```json
{
  "mcpServers": {
    "spec10x": {
      "command": "python",
      "args": ["-m", "app.mcp"],
      "cwd": "/path/to/spec10x/backend",
      "env": { "SPEC10X_MCP_USER_EMAIL": "you@example.com" }
    }
  }
}
```

Tools: `list_specs`, `get_spec_bundle` (byte-identical to the app's
`Copy for agent` export), `get_spec_outcome`, and `mark_spec_shipped` (the
only mutation — it stamps the same first-ship timestamp the UI does and
starts the outcome window). Access equals the configured user's own access;
the configuration lives in your environment, never in the database.

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
| Agent handoff | Markdown bundle, GitHub Issues export, MCP (stdio) |
| Deployment | Cloud Run (guides in `Documentation/releases/`) |

## Repo layout

```text
spec10x/
|- frontend/                  # Next.js app
|  |- src/app/               # App Router pages
|  |- src/components/        # UI and product surfaces
|  |- src/lib/               # API client and auth helpers
|  `- e2e/smoke/             # Playwright smoke suite (fully mocked)
|- backend/                   # FastAPI app
|  |- app/api/               # Route modules
|  |- app/services/          # Processing, sync, signal, and synthesis logic
|  |- app/models/            # SQLAlchemy models
|  |- app/mcp/               # MCP server (python -m app.mcp)
|  |- alembic/               # Migrations
|  `- tests/                 # Backend integration tests
|- Documentation/            # product, engineering, qa, and release docs
|- .github/workflows/ci.yml  # CI: backend on fresh Postgres, frontend, smoke
|- infra/                    # Local database bootstrap
|- docker-compose.yml        # infra by default; --profile app runs everything
`- .env.example              # Shared env template
```

## Local setup (from source)

Prefer the [quick start](#quick-start) unless you're changing code.

Prerequisites: Python 3.12+, Node.js 20+, Docker Desktop.

```bash
docker compose up -d          # infra only: postgres, redis, minio
cp .env.example backend/.env
cp .env.example frontend/.env.local
```

Backend (terminal 1):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Worker (terminal 2) — without it, uploads and scheduled syncs stay queued:

```bash
cd backend && source .venv/bin/activate
python -m arq app.workers.worker.WorkerSettings
```

Frontend (terminal 3):

```bash
cd frontend
npm install
npm run dev
```

## Testing

```bash
# backend — ALWAYS against a fresh database (see CONTRIBUTING.md for why)
cd backend && pytest tests/ -q

# frontend
cd frontend
npm run lint
npm run build
npm run test:smoke        # Playwright smoke suite, fully mocked
```

CI runs all three on every PR against a fresh pgvector Postgres
(`.github/workflows/ci.yml`).

## Documentation

- product vision: `Documentation/product/product_vision.md`
- release tracker (single source of truth for scope and acceptance):
  `Documentation/engineering/Product Manager/v0.5_project_tracker.md`
- architecture: `Documentation/engineering/technical_architecture.md`
- trust promises: `Documentation/engineering/Product Manager/v0.5_trust_promises.md`
- current release: `PRD-11-01` (`Documentation/engineering/Product Manager/`)
  and `Documentation/releases/`

## Release status

- `v0.5x`, `v0.8` (Specification Engine), and `v1.0` (Full Loop) are shipped
  and accepted — the product loop is feature-complete end to end
- `v1.1` (this release): open-source onboarding (this quickstart + CI),
  multi-user workspaces, the MCP server, GitHub Issues export, auto-close
  outcome notifications, and full-loop smoke coverage
- deferred deliberately: two-way PM tool sync, public REST API/webhooks, roles
  beyond owner/member, competitive intel, custom dashboards — see `PRD-11-01`
  "Out of Scope" for the reasoning

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — quick start, test conventions (fresh
database!), the release-train doc pattern, and the product principles PRs are
reviewed against.

## License

MIT — see [LICENSE](LICENSE).
