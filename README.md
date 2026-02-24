# Spec10x — Interview Intelligence Platform

> Upload customer interviews → Get AI-powered insights in minutes.

Spec10x reads your raw customer interviews (transcripts, audio, video) and automatically discovers **themes, pain points, feature requests, and sentiment** — no manual tagging or organizing. Ask questions in plain English and get cited answers grounded in your actual data.

---

## ✨ Key Features (v0.1 MVP)

| Feature | Description |
|---|---|
| **Auto Theme Discovery** | AI clusters feedback across interviews into ranked themes |
| **Evidence Trails** | Every insight links to exact source quotes |
| **Sentiment Analysis** | See positive/negative/neutral breakdown per theme |
| **Ask Your Interviews** | Natural language Q&A with cited answers (RAG) |
| **Multi-Format Upload** | `.txt` `.pdf` `.docx` `.mp3` `.wav` `.mp4` |
| **Export** | Structured markdown and PDF reports |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (React 19, TypeScript, App Router) |
| **Backend** | FastAPI (Python 3.12+, async) |
| **Database** | PostgreSQL 17 + pgvector (vector search) |
| **Cache/Queue** | Redis 7 |
| **File Storage** | MinIO (local) / Google Cloud Storage (prod) |
| **Auth** | Firebase Authentication |
| **AI** | Vertex AI — Gemini (extraction + Q&A), Chirp 3 (transcription), gemini-embedding-001 (embeddings) |
| **Deployment** | Cloud Run (GCP) — *staging/prod only* |

---

## 📁 Project Structure

```
spec10x/
├── frontend/                    # Next.js app
│   └── src/
│       ├── app/(auth)/         # Login, Signup pages
│       ├── app/(app)/          # Dashboard, Interview Detail, Ask (protected)
│       ├── hooks/              # React hooks (auth context, etc.)
│       ├── lib/                # API client, Firebase auth helpers
│       └── styles/             # Design tokens CSS
│
├── backend/                     # FastAPI app
│   └── app/
│       ├── main.py             # App entry point
│       ├── api/                # Route modules (auth, interviews, themes, insights)
│       ├── models/             # SQLAlchemy ORM models (10 tables)
│       ├── schemas/            # Pydantic request/response schemas
│       ├── core/               # Config, database, auth, storage
│       ├── services/           # Business logic (AI pipeline, RAG, synthesis)
│       ├── workers/            # Background job definitions
│       └── prompts/            # Gemini prompt templates
│   ├── alembic/                # Database migrations
│   └── requirements.txt
│
├── infra/                       # Infrastructure configs
│   └── init-db.sql             # Enables pgvector extension
│
├── Documentation/               # Product & business docs
│   ├── CEO/                    # Vision, business strategy
│   └── CTO/                   # Architecture, product spec, project tracker
│
├── docker-compose.yml           # Local dev services (PostgreSQL, Redis, MinIO)
├── .env.example                 # Environment variable template
└── .gitignore
```

---

## 🚀 Local Development Setup

### Prerequisites

Install these before starting:

| Tool | Version | Install |
|---|---|---|
| **Python** | 3.12+ | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | Latest | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |

> **Windows users:** After installing Docker Desktop, make sure it's running (check the system tray icon). You may need to restart your terminal.

### Step 1 — Start Infrastructure

Start PostgreSQL (with pgvector), Redis, and MinIO:

```powershell
docker compose up -d
```

Verify all services are running:

```powershell
docker compose ps
```

You should see 3 containers in "running" state:
- `spec10x-postgres` — Database on `localhost:5432`
- `spec10x-redis` — Cache/queue on `localhost:6379`
- `spec10x-minio` — File storage on `localhost:9000` (console at `localhost:9001`)

> **MinIO Console:** Open [http://localhost:9001](http://localhost:9001) and login with `minioadmin` / `minioadmin` to browse uploaded files.

### Step 2 — Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv .venv

# Activate it (PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### Step 3 — Database Migration

```powershell
# Generate the initial migration (with venv activated, in backend/)
alembic revision --autogenerate -m "initial schema"

# Apply the migration
alembic upgrade head
```

This creates all 10 tables including the pgvector-enabled `transcript_chunks` table.

### Step 4 — Start the Backend

```powershell
# With venv activated, in backend/
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open **[http://localhost:8000/docs](http://localhost:8000/docs)** — you'll see the interactive Swagger API docs with all endpoints.

### Step 5 — Frontend Setup

Open a **new terminal window**:

```powershell
cd frontend
npm install   # only needed first time
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — the app will load.

---

## 🔄 Daily Startup (After Reboot)

After restarting your computer, you only need 3 commands across 2 terminals. No reinstallation needed.

> **Pre-requisite:** Make sure Docker Desktop is running (check the system tray icon — it auto-starts with Windows, but give it ~30 seconds to fully load).

### Terminal 1 — Docker + Backend

```powershell
# From the project root (spec10x/)

# 1. Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d

# 2. Start the backend
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Frontend

```powershell
# From the project root (spec10x/)
cd frontend
npm run dev
```

### That's it! Open these in your browser:

| URL | What |
|---|---|
| [http://localhost:3000](http://localhost:3000) | Frontend app |
| [http://localhost:8000/docs](http://localhost:8000/docs) | Backend API docs (Swagger) |
| [http://localhost:9001](http://localhost:9001) | MinIO console (`minioadmin` / `minioadmin`) |

### Shutting Down

```powershell
# Stop backend: Ctrl+C in Terminal 1
# Stop frontend: Ctrl+C in Terminal 2

# Stop Docker services (from project root)
docker compose down

# To stop AND wipe all data (fresh start):
docker compose down -v
```

---

## 🔐 Authentication

### Development Mode (No Firebase Needed)

By default, the app runs in **dev mode** where Firebase is not required. The backend accepts any token and returns a mock user. This lets you develop all features without setting up Firebase first.

### Production Mode (Firebase)

To enable real authentication:

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Email/Password** and **Google** sign-in providers
3. Add your web app config to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

4. Download a service account key from Firebase → save as `backend/firebase-service-account.json`
5. Update `backend/.env` with your Firebase project ID

---

## ⚙️ Environment Variables

Copy the template and fill in values:

```powershell
# Backend
copy .env.example backend\.env

# Frontend
copy .env.example frontend\.env.local
```

See `.env.example` for all available variables and their descriptions.

| Variable | Required For | Default |
|---|---|---|
| `DATABASE_URL` | Backend | `postgresql+asyncpg://spec10x:spec10x_local@localhost:5432/spec10x` |
| `REDIS_URL` | Backend | `redis://localhost:6379/0` |
| `MINIO_*` | Backend | Pre-configured for local MinIO |
| `FIREBASE_*` | Auth (optional in dev) | Empty (dev-mode fallback) |
| `GOOGLE_API_KEY` | AI features | Required for Gemini/Chirp |

---

## 🧪 Running Tests

```powershell
# Backend
cd backend
.\.venv\Scripts\Activate.ps1
pytest

# Frontend
cd frontend
npm test
```

---

## 📚 Documentation

| Document | Location |
|---|---|
| Product Vision | `Documentation/CEO/product_vision.md` |
| Business Strategy | `Documentation/CEO/business_strategy.md` |
| Technical Architecture | `Documentation/CTO/technical_architecture.md` |
| Product Specification | `Documentation/CTO/v0.1_product_specification.md` |
| Project Tracker | `Documentation/CTO/project_tracker_v0.1.md` |

---

## 🗺️ Roadmap

| Version | Focus |
|---|---|
| **v0.1** ← *current* | Interview Intelligence — upload, extract, themes, Q&A |
| **v0.5** | Integration connectors (Zendesk, Mixpanel, Salesforce) |
| **v0.8** | Auto-generated PRDs, wireframes, acceptance criteria |
| **v1.0** | Full spec generation + PM tool sync (Jira, Linear) |

---

## 📄 License

Proprietary — All rights reserved.
