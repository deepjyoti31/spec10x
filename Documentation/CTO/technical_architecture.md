# Spec10x — Technical Architecture Plan

> **Principles:** Simple. Open-source first. GCP-native (Vertex AI). Scales from v0.1 to v1.0 without rewriting.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                    Next.js (React + TypeScript)                           │
│                     Deployed on Cloud Run                                │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │ HTTPS / WebSocket
┌──────────────────────────▼───────────────────────────────────────────────┐
│                              BACKEND                                     │
│                    FastAPI (Python 3.12+)                                │
│                     Deployed on Cloud Run                                │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  REST API   │  │  WebSocket  │  │  Background  │  │   Auth       │  │
│  │  Endpoints  │  │  Server     │  │  Workers     │  │   (Firebase) │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────────────┘  │
└─────────┼────────────────┼────────────────┼──────────────────────────────┘
          │                │                │
  ┌───────▼────────────────▼────────────────▼───────────────────────┐
  │                        DATA LAYER                                │
  │                                                                  │
  │  ┌──────────────┐  ┌──────────┐  ┌──────────────────────────┐  │
  │  │ PostgreSQL   │  │  Redis   │  │  Google Cloud Storage    │  │
  │  │ + pgvector   │  │  (Queue  │  │  (File uploads)          │  │
  │  │ (Cloud SQL)  │  │  + Cache)│  │                          │  │
  │  └──────────────┘  └──────────┘  └──────────────────────────┘  │
  └────────────────────────────────────────────────────────────────┘
          │
  ┌───────▼────────────────────────────────────────────────────────┐
  │                        AI LAYER                                 │
  │                                                                  │
  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
  │  │  Vertex AI       │  │  Vertex AI       │  │  FFmpeg     │  │
  │  │  Gemini 3.1      │  │  Chirp 3         │  │  (video →   │  │
  │  │  Flash + Embed   │  │  (transcription)  │  │   audio)    │  │
  │  └──────────────────┘  └──────────────────┘  └─────────────┘  │
  └────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Why Each Choice

| Layer | Technology | Why This | Open-Source? |
|---|---|---|---|
| **Frontend** | Next.js 16.1 (React 19 + TypeScript) | SSR for landing page SEO, SPA for the app, Turbopack stable, huge ecosystem | ✅ |
| **Backend** | FastAPI (Python 3.12+) | Best AI/ML ecosystem, async-native, type-safe, first-class Vertex AI SDK | ✅ |
| **Database** | PostgreSQL 17 + pgvector | One DB for relational data AND vector search. No separate vector DB needed | ✅ |
| **Cache / Queue** | Redis 7.x | Job queue (via `arq`), caching, pub/sub for WebSocket coordination | ✅ |
| **File Storage** | Google Cloud Storage | Cheap, reliable, direct upload from browser via signed URLs | GCP |
| **Video → Audio** | FFmpeg (open-source) | Extract audio track from video files before transcription | ✅ |
| **AI — Extraction / Q&A** | Gemini 3 Flash (via Vertex AI) | High quality for both extraction and user-facing answers. Ensures workflow simplicity. $0.50/1M input tokens | GCP |
| **AI — Embeddings** | gemini-embedding-001 (via Vertex AI) | Top MTEB scores, 100+ languages, default 3072 dims (scalable to 768 via MRL) | GCP |
| **AI — Transcription** | Chirp 3 (via Vertex AI STT V2) | GA (Oct 2025), speaker diarization, 85+ languages, built-in denoiser. $0.016/min | GCP |
| **Auth** | Firebase Authentication | GCP-native, email + Google OAuth, free tier generous | GCP (free) |
| **Payments** | Stripe | Industry standard for SaaS billing, great API | N/A |
| **Deployment** | Cloud Run | Serverless containers, scales to zero, no K8s to manage, native custom domains with auto-SSL | GCP |
| **Database Hosting** | Cloud SQL (PostgreSQL 17) | Managed, auto-backups, pgvector supported | GCP |
| **Redis Hosting** | Memorystore for Redis | Managed Redis on GCP | GCP |
| **Monitoring** | Cloud Logging + Sentry (errors) | GCP-native logging + open-source error tracking | Sentry: ✅ |

> **Model Selection Strategy:** We currently use a unified approach to simplify workflows:
> - **Gemini 3 Flash** is used for all tasks (both bulk extraction and user-facing Q&A).
> - **Future Optimization:** In the future, we may switch to a tiered model approach (using lighter models like Flash-Lite for background extraction) if cost optimization requires it, but for now, maintaining a single model reduces workflow and deployment complexity.

> **Embedding Dimensions:** gemini-embedding-001 defaults to 3072 dimensions but supports Matryoshka Representation Learning (MRL) — we can set output dimensions to 768 to reduce storage and improve pgvector query speed with minimal quality loss. This is a config parameter, not a code change.

### What We're NOT Using (and Why)

| Skipped | Why |
|---|---|
| **Cloud DNS** | Using GoDaddy DNS — just point A/CNAME records to Cloud Run. No need for a separate DNS service |
| **Cloud Load Balancer** | Not needed for beta (50-100 users). Cloud Run handles HTTPS and auto-SSL natively via custom domain mapping. Revisit when scaling past ~1K concurrent users |
| **Separate vector DB** (Pinecone, Weaviate) | pgvector handles our scale in v0.1-v0.5. Can migrate later if needed |
| **GraphQL** | REST is simpler; we don't have deeply nested data queries yet |
| **Kubernetes/GKE** | Cloud Run is enough. No need for K8s complexity until v1.0 scale |
| **Microservices** | Monolith backend with clear module boundaries. Split later if needed |
| **LangChain** | Over-abstraction for our use case. Direct Vertex AI SDK is simpler and more controllable |
| **Supabase** | Would add a dependency; we want direct control over our PostgreSQL schema |

---

## 3. Project Structure (Monorepo)

```
spec10x/
├── frontend/                    # Next.js 16.1 app
│   ├── Dockerfile               # Multi-stage production build (standalone)
│   ├── .dockerignore
│   ├── next.config.ts           # Standalone output mode enabled
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout (AuthProvider + ToastProvider)
│   │   │   ├── globals.css      # Design system tokens + global styles
│   │   │   ├── (auth)/          # Login, signup (+ metadata.ts each)
│   │   │   ├── (app)/           # Protected app pages
│   │   │   │   ├── layout.tsx   # AppLayout wrapper (NavBar + auth)
│   │   │   │   ├── dashboard/   # Insight Dashboard (+ metadata.ts)
│   │   │   │   ├── interview/[id]/ # Interview Detail (+ metadata.ts)
│   │   │   │   ├── ask/         # Ask Your Interviews (+ metadata.ts)
│   │   │   │   └── settings/    # Settings & Billing (+ metadata.ts)
│   │   │   └── page.tsx         # Root redirect
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Primitives (Button, Card, Input, Toast, etc.)
│   │   │   ├── layout/          # NavBar, AppLayout, CommandPalette
│   │   │   ├── dashboard/       # InterviewSidebar, ThemeArea, DetailPanel
│   │   │   ├── interview/       # TranscriptPanel, InsightPanel
│   │   │   └── upload/          # UploadModal, processing queue
│   │   ├── lib/                 # API client, auth helpers, utils
│   │   └── hooks/               # useAuth, useInterviews, useThemes, useAsk
│
├── backend/                     # FastAPI app
│   ├── Dockerfile               # Production build (Python 3.12-slim, uvicorn)
│   ├── Dockerfile.worker        # Worker build (+ FFmpeg, arq)
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── api/                 # API route modules
│   │   │   ├── interviews.py    # Upload, list, delete, detail
│   │   │   ├── themes.py        # List, rename, detail
│   │   │   ├── insights.py      # CRUD, manual corrections
│   │   │   ├── ask.py           # Q&A endpoint
│   │   │   ├── export.py        # Markdown export
│   │   │   ├── billing.py       # Usage tracking, plan limits
│   │   │   ├── auth.py          # Token verification
│   │   │   ├── websocket.py     # Real-time processing updates
│   │   │   └── demo.py          # Sample data loader
│   │   ├── services/            # Business logic
│   │   │   ├── processing.py    # File processing pipeline
│   │   │   ├── transcription.py # Speech-to-text
│   │   │   ├── analysis.py      # Gemini theme extraction
│   │   │   ├── embeddings.py    # Vector embedding + storage
│   │   │   ├── synthesis.py     # Cross-interview clustering
│   │   │   ├── qa.py            # RAG-based Q&A
│   │   │   └── export.py        # Export formatting
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── workers/             # Background job definitions (arq)
│   │   ├── core/                # Config, auth, database setup
│   │   └── prompts/             # Gemini prompt templates
│   ├── alembic/                 # Database migrations
│   └── tests/                   # 76 tests (unit + integration + pipeline)
│
├── infra/                       # Infrastructure configs
│   └── init-db.sql              # PostgreSQL init (pgvector extension)
│
├── Documentation/               # Project documentation
│   ├── CTO/                     # Technical docs
│   ├── CEO/                     # Business & product docs
│   └── quick_start_guide.md     # Beta tester onboarding guide
│
└── docker-compose.yml           # Local dev infra (PostgreSQL, Redis, MinIO)
```

---

## 4. Data Model (PostgreSQL)

### Core Tables

```sql
-- Users & Auth
users
├── id (UUID, PK)
├── firebase_uid (VARCHAR, unique)  -- from Firebase Auth
├── email (VARCHAR, unique)
├── name (VARCHAR)
├── avatar_url (VARCHAR)
├── plan (ENUM: free, pro, business)
├── stripe_customer_id (VARCHAR)
├── created_at, updated_at

-- Interviews (the raw source material)
interviews
├── id (UUID, PK)
├── user_id (FK → users)
├── filename (VARCHAR)              -- original uploaded filename
├── file_type (ENUM: txt, md, pdf, docx, mp3, wav, mp4)
├── file_size_bytes (BIGINT)
├── storage_path (VARCHAR)          -- GCS path
├── status (ENUM: queued, transcribing, analyzing, done, error)
├── transcript (TEXT)               -- full transcript text
├── duration_seconds (INT)          -- for audio/video
├── error_message (TEXT)
├── metadata (JSONB)                -- flexible: { speakers: [...], language: "en" }
├── file_hash (VARCHAR)             -- SHA-256 for duplicate detection
├── created_at, updated_at

-- Speakers (participant metadata, optional)
speakers
├── id (UUID, PK)
├── interview_id (FK → interviews)
├── speaker_label (VARCHAR)         -- "Speaker 1" or detected name
├── name (VARCHAR, nullable)        -- user-provided
├── role (VARCHAR, nullable)
├── company (VARCHAR, nullable)
├── is_interviewer (BOOLEAN)
├── auto_detected (BOOLEAN)

-- Themes (AI-discovered clusters)
themes
├── id (UUID, PK)
├── user_id (FK → users)
├── name (VARCHAR)                  -- AI-generated, user-renamable
├── description (TEXT)              -- AI-generated summary
├── mention_count (INT)             -- cached count
├── sentiment_positive (FLOAT)      -- 0.0-1.0
├── sentiment_neutral (FLOAT)
├── sentiment_negative (FLOAT)
├── is_new (BOOLEAN)                -- "NEW" badge flag
├── last_new_activity (TIMESTAMP)   -- when last new quote was added
├── status (ENUM: active, previous) -- active vs "Previous themes"
├── created_at, updated_at

-- Sub-themes (children of themes)
sub_themes
├── id (UUID, PK)
├── theme_id (FK → themes)
├── name (VARCHAR)

-- Insights (individual extracted observations)
insights
├── id (UUID, PK)
├── user_id (FK → users)
├── interview_id (FK → interviews)
├── theme_id (FK → themes)
├── category (ENUM: pain_point, feature_request, positive, suggestion)
├── title (VARCHAR)                 -- "Onboarding documentation is outdated"
├── quote (TEXT)                    -- exact quoted text
├── quote_start_index (INT)        -- position in transcript for highlighting
├── quote_end_index (INT)
├── speaker_id (FK → speakers)
├── confidence (FLOAT)             -- AI confidence 0.0-1.0
├── is_flagged (BOOLEAN)           -- 🚩 uncertain
├── is_dismissed (BOOLEAN)         -- user dismissed
├── is_manual (BOOLEAN)            -- user-created (not AI)
├── created_at, updated_at

-- Transcript Chunks (for RAG / vector search)
transcript_chunks
├── id (UUID, PK)
├── interview_id (FK → interviews)
├── chunk_index (INT)              -- order within interview
├── content (TEXT)                  -- chunk text (~500 tokens)
├── embedding (VECTOR(768))        -- pgvector column (768 dims via MRL, down from default 3072)
├── speaker_id (FK → speakers, nullable)
├── created_at

-- Ask Conversations (chat history)
ask_conversations
├── id (UUID, PK)
├── user_id (FK → users)
├── created_at

ask_messages
├── id (UUID, PK)
├── conversation_id (FK → ask_conversations)
├── role (ENUM: user, assistant)
├── content (TEXT)
├── citations (JSONB)              -- [{interview_id, quote, chunk_id}]
├── created_at

-- Usage Tracking
usage
├── id (UUID, PK)
├── user_id (FK → users)
├── month (DATE)                   -- 2026-02-01
├── interviews_uploaded (INT)
├── qa_queries_used (INT)
├── storage_bytes_used (BIGINT)
```

### Key Indexes

```sql
-- Vector similarity search (the core of "Ask Your Interviews")
CREATE INDEX ON transcript_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Fast lookups
CREATE INDEX ON insights (user_id, theme_id);
CREATE INDEX ON insights (interview_id);
CREATE INDEX ON interviews (user_id, status);
CREATE INDEX ON interviews (file_hash);  -- duplicate detection
CREATE INDEX ON themes (user_id, status);
```

---

## 5. Processing Pipeline (The Core Engine)

When a user uploads files, here's exactly what happens:

```
User drops files
       │
       ▼
┌──────────────────┐  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐
│  1. UPLOAD   │─▶│ 2. EXTRACT     │─▶│ 3. TRANSCRIBE│─▶│ 4. ANALYZE   │
│              │  │  AUDIO         │  │              │  │              │
│ Browser →    │  │ FFmpeg: video  │  │ Vertex AI    │  │ Vertex AI    │
│ Signed URL → │  │ → audio (.wav) │  │ Chirp 3      │  │ Gemini 3     │
│ GCS          │  │ (skip for text)│  │ (skip: text) │  │ Flash        │
└──────────────┘  └────────────────┘  └──────────────┘  └──────┬───────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐     ┌─────────────────┐     ┌────────────────┐
│  5. EMBED        │────▶│  6. CLUSTER     │────▶│  7. NOTIFY     │
│                  │     │                 │     │                │
│ Chunk transcript │     │ Cross-interview │     │ WebSocket →    │
│ → gemini-embed   │     │ theme synthesis │     │ Update UI      │
│ → pgvector       │     │ + merge themes  │     │                │
└──────────────────┘     └─────────────────┘     └────────────────┘
```

### Step-by-Step Detail

**Step 1 — Upload** (frontend-driven, fast)
- Frontend requests a signed upload URL from backend
- Frontend uploads directly to GCS (avoids backend bottleneck)
- Backend creates an `interviews` row with status `queued`
- A background job is enqueued in Redis

**Step 2 — Extract Audio** (background worker, video only)
- Worker picks up the job from Redis
- If text file (.txt, .md, .pdf, .docx): extract text directly → skip to Step 4
- If audio file (.mp3, .wav): skip this step → proceed to Step 3
- If video file (.mp4):
  - Use **FFmpeg** (open-source, installed in the worker container) to extract the audio track:
    ```bash
    ffmpeg -i input_video.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
    ```
    - `-vn` = discard video stream
    - `-acodec pcm_s16le` = uncompressed WAV (best for STT)
    - `-ar 16000` = 16kHz sample rate (optimal for Chirp 3)
    - `-ac 1` = mono (speech doesn't need stereo)
  - Upload extracted `.wav` to GCS (temp path), delete original video from GCS
  - This reduces storage costs significantly (a 100MB video → ~10MB audio)
- WebSocket push: "File X: Audio extracted"

**Step 3 — Transcribe** (background worker, audio only)
- Send the audio file (original or extracted) to **Vertex AI Chirp 3**
  - Use Chirp 3 via the `google.cloud.speech_v2` SDK
  - Enable speaker diarization (auto-detect number of speakers)
  - Chirp 3 supports 100+ languages natively — no language detection needed
  - For long files: use `BatchRecognize` API for async processing
  - For short files (<1 min): use `Recognize` API for sync processing
- Save full transcript to DB
- Update interview status: `transcribing` → `analyzing`
- WebSocket push: "File X: Transcription complete"

**Step 4 — Analyze** (background worker, Gemini call)
- Send full transcript to **Gemini 3 Flash** via Vertex AI with a structured extraction prompt
- We use the same high-quality model here as in the Q&A step to avoid workflow fragmentation.
- Prompt asks for JSON output:

```json
{
  "insights": [
    {
      "category": "pain_point",
      "title": "Onboarding documentation is outdated",
      "quote": "The setup process took me almost an hour...",
      "quote_start": 245,
      "quote_end": 312,
      "speaker": "Speaker 1",
      "theme_suggestion": "Onboarding Friction",
      "sub_themes": ["Documentation", "Setup time"],
      "sentiment": "negative",
      "confidence": 0.92
    }
  ],
  "detected_speakers": [
    { "label": "Speaker 1", "likely_name": "Sarah Chen", "likely_role": "Product Manager" }
  ],
  "language": "en",
  "summary": "..."
}
```
- Gemini's structured output mode ensures valid JSON
- Save insights to DB, update speakers
- WebSocket push: "File X: 5 insights extracted"

**Step 5 — Embed** (background worker)
- Split transcript into ~500-token chunks with 50-token overlap
- Generate embeddings via **gemini-embedding-001** model on Vertex AI (output dim = 768 via MRL for optimal pgvector performance)
- Store in `transcript_chunks` table with pgvector
- This enables semantic search for the "Ask" feature

**Step 6 — Cluster/Synthesize** (background worker)
- After each new interview, re-run cross-interview synthesis
- Algorithm:
  1. Get all `theme_suggestion` values from all insights for this user
  2. Embed theme suggestions
  3. Cluster by cosine similarity (threshold: 0.85)
  4. For each cluster: create or update a `themes` row
  5. Link insights to themes
  6. Calculate sentiment aggregation per theme
  7. Mark new/emerging themes with `is_new = true`
- This is lightweight — runs in seconds for dozens of interviews

**Step 7 — Notify** (WebSocket)
- Push real-time updates to the frontend at every step
- Frontend updates the upload modal's live insight preview and processing queue
- When all files are done, enable the "View Insights" button

---

## 6. RAG Pipeline ("Ask Your Interviews")

```
User question: "What do users think about onboarding?"
       │
       ▼
┌──────────────────┐
│ 1. Embed query   │  → Vertex AI gemini-embedding-001 (768 dims) → vector
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. Vector search │  → pgvector: SELECT * FROM transcript_chunks
│                  │    ORDER BY embedding <=> query_embedding
│                  │    LIMIT 20
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Re-rank       │  → Optional: Gemini re-ranks by relevance
│    (optional)    │    Keeps top 10 most relevant chunks
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. Generate      │  → Vertex AI Gemini 3 Flash (higher quality for user-facing answers):
│    answer        │    System: "You are an interview analyst..."
│                  │    Context: [10 transcript chunks with sources]
│                  │    User: "What do users think about onboarding?"
│                  │    → Structured output with citations
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. Stream to UI  │  → Server-Sent Events (SSE)
│                  │    Token-by-token streaming
└──────────────────┘
```

### Answer Format (Gemini output)

```json
{
  "answer": "Based on 12 interviews, **onboarding** was the most...",
  "citations": [
    {
      "interview_id": "uuid-1",
      "speaker_name": "Sarah Chen",
      "quote": "The setup process took me almost an hour...",
      "chunk_id": "uuid-chunk-5"
    }
  ],
  "suggested_followups": [
    "What specific solutions did users suggest?",
    "How does this compare across segments?"
  ]
}
```

---

## 7. API Design (Key Endpoints)

### Interviews
```
POST   /api/interviews/upload-url     → Get signed GCS upload URL
POST   /api/interviews                → Register uploaded file, start processing
GET    /api/interviews                → List all interviews (with filters, pagination)
GET    /api/interviews/:id            → Interview detail + transcript + insights
DELETE /api/interviews/:id            → Delete interview + recalculate themes
POST   /api/interviews/:id/reanalyze  → Re-run AI extraction
```

### Demo Data
```
POST   /api/demo/load-sample-data     → Populates DB with 3 sample interviews and themes
```

### Themes
```
GET    /api/themes                    → List themes (sorted, paginated, top 10 + show more)
GET    /api/themes/:id                → Theme detail (quotes, sources, segments)
PATCH  /api/themes/:id                → Rename theme
```

### Insights
```
POST   /api/insights                  → Manually add insight (user-created)
PATCH  /api/insights/:id              → Edit category, title, theme assignment
DELETE /api/insights/:id              → Dismiss insight (soft delete)
POST   /api/insights/:id/flag         → Flag as uncertain
```

### Ask (Q&A)
```
POST   /api/ask                       → Send question, get JSON response (SSE streaming deferred)
GET    /api/ask/conversations         → List past conversations
GET    /api/ask/conversations/:id     → Get conversation history
```

### Export
```
GET    /api/export/insights           → Export all insights (markdown)
GET    /api/export/interview/:id      → Export single interview + insights (markdown)
```

### Auth & Billing
```
POST   /api/auth/verify               → Verify Firebase token, create/get user
GET    /api/billing/usage             → Current usage stats
POST   /api/billing/create-checkout   → Stripe checkout session
POST   /api/billing/webhook           → Stripe webhook handler
```

### WebSocket
```
WS     /ws/processing                 → Real-time processing status updates
```

---

## 8. Deployment Architecture (GCP)

> **Simplified for beta (50-100 users).** No Cloud DNS, no Load Balancer.
> Cloud Run handles HTTPS and custom domains natively.

```
                    ┌─────────────────────┐
                    │  GoDaddy DNS          │
                    │  spec10x.com           │
                    │  CNAME → Cloud Run     │
                    └──────────┬──────────┘
                               │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼────┐ ┌───────▼──────┐
     │  Cloud Run      │ │Cloud Run│ │  Cloud Run      │
     │  (Frontend)     │ │(Backend │ │  (Workers)      │
     │  Next.js SSR    │ │ API)    │ │  Processing     │
     │  + auto-SSL     │ │ FastAPI │ │  jobs           │
     └─────────────────┘ └────┬────┘ └──────┬───────┘
                            │             │
         ┌──────────────────┼─────────────┘
         │                  │
  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────────────┐
  │  Cloud SQL  │   │ Memorystore │   │  GCS         │
  │  PostgreSQL │   │ Redis       │   │  File uploads│
  │  + pgvector │   │             │   │              │
  └─────────────┘   └─────────────┘   └──────────────┘
```

### DNS & Domain Setup (Simplified)

1. **Domain:** Buy `spec10x.com` on GoDaddy
2. **DNS:** In GoDaddy DNS, add a CNAME record pointing to Cloud Run's auto-generated URL
3. **SSL:** Cloud Run automatically provisions and renews Google-managed SSL certificates
4. **No Cloud DNS needed** — GoDaddy's DNS is sufficient
5. **No Load Balancer needed** — Cloud Run handles HTTPS termination natively

> **When to add a Load Balancer:** If we exceed ~1K concurrent users, need Cloud CDN caching, Cloud Armor DDoS protection, or static IP addresses. This is a v0.5+ concern, not v0.1.

### Cloud Run Configuration

| Service | vCPU | Memory | Min Instances | Max Instances | Timeout |
|---|---|---|---|---|---|
| Frontend (Next.js) | 1 | 512MB | 0 (scales to zero) | 3 | 300s |
| Backend (FastAPI) | 1 | 512MB | 1 (always warm) | 5 | 300s |
| Workers (Processing) | 2 | 2GB | 0 | 10 | 3600s (1 hour, for long transcriptions) |

**WebSocket support:** Cloud Run supports WebSockets natively (no special config). Max timeout 60 min per connection, up to 1000 concurrent connections per instance. For our beta (50-100 users), this is more than sufficient.

### Environment Setup

| Environment | Purpose | Cost Profile |
|---|---|---|
| **Development** | Local Docker Compose (PostgreSQL + pgvector, Redis, MinIO for GCS) | $0 |
| **Staging** | Cloud Run (min instances: 0), Cloud SQL (smallest instance) | ~$30/month |
| **Production** | Cloud Run (min instances: 1 for API), Cloud SQL, Memorystore | ~$80-180/month |

### CI/CD Pipeline (Cloud Build)

```
git push to main
  → Cloud Build triggers
  → Run tests (pytest backend, jest frontend)
  → Build Docker images
  → Push to Artifact Registry
  → Deploy to Cloud Run (rolling update)
  → Run health checks
  → Notify Slack
```

---

## 9. Cost Estimates (v0.1, first 6 months)

### Fixed Infrastructure Costs (Beta: 50-100 users)

| Service | Spec | Monthly Cost |
|---|---|---|
| Cloud SQL (PostgreSQL 17) | db-f1-micro (1 vCPU shared, 614MB RAM) | ~$10 |
| Memorystore (Redis) | Basic, 1GB | $35 |
| Cloud Run (Backend API) | 1 vCPU, 512MB, min 1 instance | ~$15-25 |
| Cloud Run (Frontend) | 1 vCPU, 512MB, scales to zero | ~$5-15 |
| Cloud Run (Workers) | 2 vCPU, 2GB, scales to zero | ~$5-20 |
| Cloud Storage | First 5GB free, then $0.02/GB | ~$2 |
| **Total infrastructure** | | **~$72-107/month** |

> **Savings vs. original plan:** ~$80-100/month by removing Cloud DNS ($0.20/zone + queries) and Cloud Load Balancer ($18/month fixed + per-rule charges).

### Variable AI Costs (per-user activity, Vertex AI pricing)

| Service | Per Unit | Example (100 interviews/month) |
|---|---|---|
| Chirp 3 (transcription) | $0.016/min (60 min/month free) | 100 interviews × 30 min avg = $48 |
| Gemini 3 Flash (extraction) | $0.50/1M input, $3.00/1M output | 100 interviews × ~5K tokens = ~$0.25 input + ~$1.50 output |
| gemini-embedding-001 | $0.15/1M input tokens | 100 interviews × ~10K tokens = ~$0.15 |
| Gemini 3 Flash (Q&A) | $0.50/1M input, $3.00/1M output | 500 queries × ~10K tokens = ~$5 input + ~$15 output |
| **Total AI per 100 interviews** | | **~$70/month** |

> **Cost note:** The transcription cost ($48) is the biggest driver. Encouraging users to upload existing transcripts from Otter/Fireflies instead of raw audio reduces this to near-zero.

### Break-Even Analysis

| Customers | Revenue (mix of tiers) | Infrastructure | AI Costs | Profit |
|---|---|---|---|---|
| 10 (mostly free) | ~$150/month | $90 | $15 | **+$45** |
| 50 (20 paid) | ~$800/month | $120 | $120 | **+$560** |
| 200 (80 paid) | ~$3,200/month | $200 | $500 | **+$2,500** |

> Spec10x is profitable from **day one** with the simplified architecture. Even 10 customers with a few paid subscriptions covers costs.

---

## 10. v0.1 → v1.0 Evolution Path

| Version | What Changes in the Stack |
|---|---|
| **v0.1** | Full stack as described above. Monolith backend, single DB |
| **v0.5** | Add integration connectors (Zendesk, Mixpanel) as new `services/connectors/` modules. Add `data_sources` table. Same DB, same infra |
| **v0.8** | Add spec generation service (new Gemini prompts). Add `specs`, `wireframes` tables. May need a dedicated worker pool for heavier AI tasks |
| **v1.0** | Add PM tool sync (webhook endpoints), task export, roadmap data. Consider splitting workers into a separate service. May migrate pgvector to dedicated vector DB (Qdrant) if scale demands. Consider GKE if Cloud Run limits hit |

### What WON'T Need to Change

- **Frontend framework** (Next.js) — just add pages and components
- **Backend framework** (FastAPI) — just add route modules and services
- **Database** (PostgreSQL) — just add tables via Alembic migrations
- **Auth** (Firebase) — stays the same
- **AI provider** (Vertex AI) — same SDK, new prompts, models auto-upgraded
- **Deployment** (Cloud Run) — scales automatically

### What MIGHT Change

- **Vector DB** — pgvector → Qdrant/Weaviate if queries slow down at scale (>1M vectors)
- **Queue** — Redis/arq → Cloud Tasks or Pub/Sub for more complex workflows
- **Deployment** — Cloud Run → GKE if we need long-running WebSocket connections or GPU workers
- **Search** — Add Elasticsearch if full-text search across all data sources gets complex

---

## 11. Local Development Setup

```bash
# Prerequisites: Python 3.12+, Node 20+, Docker

# Clone and setup
git clone https://github.com/spec10x/spec10x.git
cd spec10x

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head              # run migrations
uvicorn app.main:app --reload     # start API server

# Frontend
cd frontend
npm install
npm run dev                        # start Next.js dev server

# Environment variables needed:
# GEMINI_API_KEY, GCS_BUCKET, FIREBASE_PROJECT_ID,
# DATABASE_URL, REDIS_URL, STRIPE_SECRET_KEY
```

---

## 12. Security Considerations

| Area | Approach |
|---|---|
| **Authentication** | Firebase Auth JWT tokens verified on every API request |
| **Authorization** | Row-level: every query filtered by `user_id`. Users can ONLY see their own data |
| **File uploads** | Signed URLs with 15-min expiry, max file size enforced server-side |
| **API rate limiting** | Redis-based rate limiting per user (tied to plan limits) |
| **Data encryption** | At rest: Cloud SQL encryption (default). In transit: HTTPS everywhere |
| **PII** | Interview data stored in user-scoped rows. Full data deletion on account delete |
| **Secrets** | GCP Secret Manager for API keys. Never in code or env files |
| **CORS** | Strict: only `spec10x.com` and `localhost` in dev |
