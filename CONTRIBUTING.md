# Contributing to Spec10x

Thanks for your interest! Spec10x is MIT-licensed and welcomes issues and pull
requests. This guide covers how to get running, how the project is organized,
and what a good PR looks like here.

## Quick start

The fastest way to a running app:

```bash
cp .env.example backend/.env
cp .env.example frontend/.env.local
docker compose --profile app up -d --build
```

- App: http://localhost:3000 · API docs: http://localhost:8000/docs
- Plain `docker compose up -d` starts infrastructure only (Postgres + pgvector,
  Redis, MinIO) for running backend/frontend from source — see the README's
  "Local Setup" for that flow.
- **AI features** (interview processing, spec generation, task breakdown) need
  Vertex AI credentials; everything else works without them. See the README's
  "AI features" section.

## Running the tests

### Backend

Backend tests are integration tests against a real Postgres. **Always run them
against a fresh database** — the suite assumes a migrated schema and a
long-lived development database makes the signal-consistency tests orders of
magnitude slower (measured: 16 tests in 17 minutes vs. seconds on a fresh DB).

```bash
# one-time: create a fresh test DB (psql into the compose postgres)
docker exec spec10x-postgres psql -U spec10x -c "CREATE DATABASE spec10x_test"
docker exec spec10x-postgres psql -U spec10x -d spec10x_test -c "CREATE EXTENSION IF NOT EXISTS vector"

cd backend
# alembic reads DATABASE_URL and needs the *sync* driver URL
DATABASE_URL="postgresql://spec10x:spec10x_local@localhost:5432/spec10x_test" alembic upgrade head
# pytest and the app need the asyncpg URL
DATABASE_URL="postgresql+asyncpg://spec10x:spec10x_local@localhost:5432/spec10x_test" \
DATABASE_URL_SYNC="postgresql://spec10x:spec10x_local@localhost:5432/spec10x_test" \
pytest tests/ -q
```

Test-suite conventions worth knowing:

- tests share one test user and never truncate — scope assertions to rows your
  test creates (unique names/ids), never to absolute counts
- Gemini calls are mocked globally in `tests/conftest.py`
- FastAPI route ordering matters: literal paths (`/outcomes`, `/trends`)
  register before `/{id}` routes

### Frontend

```bash
cd frontend
npm run lint
npm run build
npm run test:smoke   # Playwright, fully mocked — no backend needed
```

CI (`.github/workflows/ci.yml`) runs all three verdicts — backend on a fresh
pgvector Postgres, frontend lint + build, and the smoke suite — on every PR.

## How this repo plans work

The project runs a documented release train. Every release follows the same
pattern, and PRs land best when they fit it:

1. a PRD in `Documentation/engineering/Product Manager/` defines a Must-only
   cut with numbered decisions (`D-xx-yy`)
2. the tracker (`Documentation/engineering/Product Manager/v0.5_project_tracker.md`)
   carries story-level acceptance evidence
3. a release checklist in `Documentation/releases/` records gates and rollout
   notes

For small fixes, none of that ceremony applies — just open a PR. For a larger
feature, open an issue first describing the problem and the smallest honest
cut; read `Documentation/product/product_vision.md` and the most recent PRD to
see what is deliberately deferred (and why) before proposing it.

## Product principles that PRs are reviewed against

- **Evidence over assertion** — anything the product claims must link back to
  customer evidence; correlational readouts say so plainly ("supporting
  evidence, not proven impact")
- **Zero additional data entry** — derived views (roadmap, pipeline, outcomes)
  must derive from state users already maintain
- **Trust copy matches behavior** — if a change touches data handling,
  `/trust` and `/privacy` must be updated in the same PR
- **Bounded AI** — one structured-output model call per user action, with
  server-side sanitizers on everything the model returns

## Code conventions

- Backend: FastAPI + SQLAlchemy 2.0 async, migrations via alembic (every
  migration needs a clean downgrade), services hold logic and routes stay thin
- Frontend: Next.js App Router, the API client and shared types live in
  `frontend/src/lib/api.ts`
- Match the style of the file you are editing; comments explain constraints,
  not narration

## Pull requests

- keep PRs scoped to one change; include tests for backend behavior changes
- run the backend suite (fresh DB), `npm run lint`, and `npm run build` before
  opening
- describe *what breaks without this change* — evidence-first applies to PRs
  too

## License

By contributing, you agree that your contributions are licensed under the MIT
License.
