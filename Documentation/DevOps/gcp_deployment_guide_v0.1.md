# Spec10x — GCP Deployment Guide (Beta v0.1)

This guide provides step-by-step instructions for deploying Spec10x to Google Cloud Platform (GCP) using the **Google Cloud Console (GUI)**. We have optimized this for a small user base (~10 concurrent users) while maintaining a premium, scalable foundation.

---

## 🏗️ Architecture Summary
*   **Frontend & Backend**: Cloud Run (Serverless)
*   **Database**: Cloud SQL (PostgreSQL 17 + pgvector)
*   **Queue**: Memorystore (Redis)
*   **Storage**: Google Cloud Storage (GCS)
*   **Domain**: GoDaddy DNS → Cloud Run Custom Domain Mapping

---

## 1. Preparation: GCP Project & APIs

1.  **Create Project**: Go to [GCP Console](https://console.cloud.google.com/) and create a new project named `spec10x`.
2.  **Enable Billing**: Ensure a billing account is linked to the project.
3.  **Local Tools Needed (The "Standard CLI")**:
    To build and push your application, you need two tools installed on your Windows machine:
    *   **Google Cloud SDK (gcloud)**: [Download & Install here](https://cloud.google.com/sdk/docs/install). After installing, run `gcloud init` in your terminal to login and select your `spec10x` project.
    *   **Docker Desktop**: [Download & Install here](https://www.docker.com/products/docker-desktop/). Ensure Docker is running (v4.0+) before building images.
4.  **Enable APIs**: Search for and enable the following APIs in the **API & Services** dashboard:
    *   **Cloud Run API**
    *   **Cloud SQL Admin API**
    *   **Memorystore for Redis API**
    *   **Vertex AI API**
    *   **Artifact Registry API**

---

## 2. Infrastructure Setup (GUI)

### A. Cloud SQL (PostgreSQL)
1.  Go to **SQL** → **Create Instance**.
2.  Choose **PostgreSQL**.
3.  **Instance ID**: `spec10x-db`.
4.  **Password**: Generate and save this safely.
5.  **Database Version**: PostgreSQL 17.
6.  **Configuration**: Choose **Cloud SQL Edition: Enterprise** (formerly "Standard") and select **Zonal availability** (cheaper for beta).
7.  **Machine Type**: `db-f1-micro` (1 vCPU shared, 0.6 GB RAM) is sufficient for ~10 users.
8.  **Enable Public IP**: Keep this enabled but restricted via IAM/Cloud Run service account (default).
9.  **Create Instance**. Once created, go to the **Databases** tab and create a database named `spec10x`.

### B. Memorystore (Redis)
1.  Go to **Memorystore** → **Redis** → **Create Instance**.
2.  **Instance ID**: `spec10x-redis`.
3.  **Tier**: **Basic** (Single-zone).
4.  **Capacity**: 1 GB.
5.  **Network**: Select `default`.
6.  **Create**. Note down the **Primary Endpoint IP Address**.

### C. Cloud Storage (GCS)
1.  Go to **Cloud Storage** → **Buckets** → **Create**.
2.  **Name**: `spec10x-uploads`.
3.  **Location**: Region (e.g., `us-central1`).
4.  **Storage Class**: Standard.
5.  **Access Control**: Uniform.
6.  **Uncheck** "Enforce public access prevention" (we will use signed URLs, but this allows flexibility later).

#### C.1 GCS CORS Configuration (CRITICAL for Uploads)
Since the browser uploads directly to Google Cloud Storage, you must tell the bucket to allow requests from your domain.
1.  Open your local PowerShell in the project root.
2.  Run this command to apply the CORS policy:
    ```powershell
    gcloud storage buckets update gs://spec10x-uploads --cors-file=backend/cors.json
    ```

---

## 3. Image Registry & Build (Cloud Build)

Instead of building images on your local machine (which can be slow and fail due to internet issues), we will use **Google Cloud Build**. This builds your images inside Google's infrastructure and stores them directly in the Artifact Registry.

### Step 1: Optimize Uploads (CRITICAL)
To prevent `gcloud` from uploading massive local folders (like `.venv` or `node_modules`), ensure you have a [.gcloudignore](file:///c:/Users/Deep/.gemini/antigravity/scratch/spec10x/.gcloudignore) file in the root, `backend`, and `frontend` folders. I have automatically created these for you. This will reduce your upload from ~500MB+ to just a few KB.

### Step 2: Create Registry
1.  Go to **Artifact Registry** → **Repositories** → **Create**.
    *   **Name**: `spec10x-repo`.
    *   **Format**: Docker.
    *   **Location**: `us-central1`.

### Step 3: Build Images
Run these commands from your local PowerShell in the project root:
    ```powershell
    # Build Backend
    gcloud builds submit --tag us-central1-docker.pkg.dev/spec10x/spec10x-repo/backend:v1 ./backend

    # Build Worker (Uses a config file to specify Dockerfile.worker)
    gcloud builds submit --config ./backend/cloudbuild.worker.yaml --substitutions=_IMAGE_TAG=us-central1-docker.pkg.dev/spec10x/spec10x-repo/worker:v1 ./backend

    # Build Frontend (Uses substitutions to bake in Firebase variables)
    gcloud builds submit --config ./frontend/cloudbuild.frontend.yaml `
      --substitutions=_IMAGE_TAG="us-central1-docker.pkg.dev/spec10x/spec10x-repo/frontend:v1",`
      _API_URL="https://spec10x-backend-xxxxxx.a.run.app",`
      _FB_API_KEY="your_api_key",`
      _FB_AUTH_DOMAIN="spec10x.firebaseapp.com",`
      _FB_PROJECT_ID="spec10x",`
      _FB_STORAGE_BUCKET="spec10x.appspot.com",`
      _FB_MESSAGING_SENDER_ID="your_sender_id",`
      _FB_APP_ID="your_app_id" `
      ./frontend
    ```

    > [!IMPORTANT]
    > For the Frontend, Next.js "bakes in" all `NEXT_PUBLIC_` variables at build time. You **must** pass them during the build (not just in Cloud Run) for them to work.

---

## 4. Deploying to Cloud Run (GUI)

Repeat these steps for **Backend**, **Worker**, and **Frontend**.

### Service 1: Backend (API)
1.  Go to **Cloud Run** → **Create Service**.
2.  Select the **Backend** image from your Artifact Registry.
3.  **Service Name**: `spec10x-backend`.
4.  **Authentication**: Allow unauthenticated invocations (since it's a public API).
5.  **Container Port**: 8000.
6.  **Scaling (Min Instances)**: Set to **1**.
    > [!TIP]
    > For the Backend API, setting min instances to 1 ensures the app stays "warm" and responds instantly. For the Frontend and Worker, you can keep them at **0** to save money.
7.  **Variables & Secrets**: Add these required environment variables.
    > [!IMPORTANT]
    > For Cloud Run, use the **IP Addresses** (or connection strings) provided by your Cloud SQL and Memorystore instances.

    | Variable | Production Value |
    |---|---|
    | `APP_ENV` | `production` |
    | `APP_SECRET_KEY` | [See Step 4.2 Below] |
    | `DATABASE_URL` | `postgresql+asyncpg://postgres:PASSWORD@/spec10x?host=/cloudsql/CONNECTION_NAME` |
    | `REDIS_URL` | `redis://[PRIMARY_ENDPOINT]:6379/0` |
    | *(Note: If your Primary Endpoint already has :6379, do not add it again! Correct: `redis://10.x.x.x:6379/0`)* | |
    | `STORAGE_BACKEND` | [gcs](file:///c:/Users/Deep/.gemini/antigravity/scratch/spec10x/backend/app/core/storage.py#35-59) |
    | `GCS_BUCKET` | `spec10x-uploads` |
    | `GCP_PROJECT_ID` | `spec10x` |
    | `GCP_LOCATION` | `us-central1` |
    | `FIREBASE_PROJECT_ID` | Your Firebase Project ID |
    | `BACKEND_URL` | [See Step 4.4 Below] |
    | `FRONTEND_URL` | `https://spec10x.com` |
    | `CORS_ORIGINS` | `https://spec10x.com` |

### 4.1 How to generate `APP_SECRET_KEY`
Run this in your local PowerShell to get a secure random key:
```powershell
# Using Python (one-liner)
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Copy the output and paste it as the `APP_SECRET_KEY` value.

### 4.2 How to find Database User & IP
1.  Go to **SQL** → Click on your instance `spec10x-db`.
2.  **IP Address**: On the **Overview** page, look for **Primary IP address** (under "Connect to this instance").
3.  **User**: Click the **Users** tab. By default, there is a `postgres` user. You can use this or create a new one.

### 4.3 How to find Redis IP
1.  Go to **Memorystore** → **Redis**.
2.  Click on your instance `spec10x-redis`.
3.  On the **Overview** page, look for **Primary Endpoint**. It will look like an IP address (e.g., `10.x.x.x`).

### 4.4 How to find your Cloud Run URL
1.  Once you click **Create Service** for the first time, look at the top of the service details page.
2.  GCP will display a URL like `https://spec10x-backend-xxxxxx.a.run.app`.
3.  **Note**: This is the URL you use for `BACKEND_URL` and for the Frontend's `NEXT_PUBLIC_API_URL`.

8.  **VPC & SQL Connections**:
    *   Click **Edit & Deploy New Revision**.
    *   Scroll down to the **Networking** tab (often next to 'Container', 'Variables', 'Security').
    *   Under **Cloud SQL connections**, select your `spec10x-db`.
    *   Under **VPC**, select **Connect to a VPC for outbound traffic**.
    *   Select **Serverless VPC Access connector**.
    *   Choose your `spec10x-vpc-connector`.
    *   Select **Route only requests to private IPs to the VPC** (Required for Firebase to work).

### Service 2: Worker (Processing)
1.  **Image**: `worker:v1`.
2.  **Service Name**: `spec10x-worker`.
3.  **Authentication**: Select **Require authentication**.
    > [!IMPORTANT]
    > Do **NOT** check "Allow unauthenticated invocations". This ensures your worker's health shim is not public.
4.  **Ingress Control**: Select **Internal** (only allow traffic from within GCP).
5.  **Container Port**: 8080 (I have added a shim to the Dockerfile to handle this).
6.  **CPU Allocation**: **Always allocated** (Since workers need to be ready to process jobs).
7.  **VPC & SQL Connections**: 
    *   Repeat the same networking steps as the Backend (Select **Networking** tab → **VPC** → **Connect to a VPC for outbound traffic** → Choose `spec10x-vpc-connector` → **Route only requests to private IPs to the VPC**).
    *   Ensure the `spec10x-db` is also added under **Cloud SQL connections**.
8.  **Variables**: **Exactly the same as the Backend**. You can copy-paste the table from Section 4 above.

### Service 3: Frontend
1.  **Image**: `frontend:v1`.
2.  **Service Name**: `spec10x-frontend`.
3.  **Authentication**: Select **Allow unauthenticated invocations** (since this is your public website).
4.  **Container Port**: 3000.
5.  **Scaling (Min Instances)**: Set to **0** (Optional: Set to 1 if you want to avoid cold starts for users).
6.  **Variables**: Add ALL variables from your local [frontend/.env.local](file:///c:/Users/Deep/.gemini/antigravity/scratch/spec10x/frontend/.env.local). 

    | Variable | Value |
    |---|---|
    | `NEXT_PUBLIC_API_URL` | Use your **Backend Cloud Run URL** |
    | `NEXT_PUBLIC_FIREBASE_API_KEY` | [From your .env.local] |
    | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | [From your .env.local] |
    | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | [From your .env.local] |
    | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | [From your .env.local] |
    | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | [From your .env.local] |
    | `NEXT_PUBLIC_FIREBASE_APP_ID` | [From your .env.local] |

    > [!NOTE]
    > These `NEXT_PUBLIC_` variables are baked into the frontend code during build time. Since we already built the image with the local values, you **must** set them here in Cloud Run to override them for production.

---

## 5. Database Migrations

Once your Backend and Cloud SQL instances are running, you must apply the database schema.

### Step 1: Enable pgvector (CRITICAL)
Your database uses `pgvector` for AI-powered searches, which must be enabled manually in production.
1.  In the GCP Console, go to **SQL** → click on `spec10x-db`.
2.  Click on the **Cloud Shell** icon (the `>_` icon at the top right of the GCP header) or use the **Query Studio** tab on the left.
3.  Run this SQL command:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```
4.  Verify it says "Query executed successfully".

### Step 2: Format the Connection String
Your password contains special characters like `*` and `@`. In a database URL, these **must** be URL-encoded.
*   The `@` in your password should be written as `%40`.
*   Alembic requires a **synchronous** driver (not `asyncpg`), so use `postgresql://` (instead of `postgresql+asyncpg://`).

### Step 2: Run the Command
Run this exact command in your project root to apply migrations to production:

```powershell
# 1. Set the production URL (notice the %40 for the @ in the password)
$env:DATABASE_URL="postgresql://postgres:[PASSWORD]@[ip]:5432/spec10x"

# 2. Go to backend and activate your virtual environment
cd backend
.\.venv\Scripts\activate

# 3. Run migrations
alembic upgrade head
```

> [!NOTE]
> I have updated [backend/alembic/env.py](file:///c:/Users/Deep/.gemini/antigravity/scratch/spec10x/backend/alembic/env.py) to automatically handle the `%` sign in your password. You don't need to change anything else!

---

## 6. Final Verification & 404 Troubleshooting

If you see a **404 (Not Found)** error when visiting `spec10x.com`, it means the domain is reaching Google, but the mapping is incomplete.

### How to Fix 404:
1.  **Check Mapping Status**:
    *   Go to **Cloud Run** → **Manage Custom Domains**.
    *   Look at the listing for `spec10x.com`. It should have a green checkmark.
    *   If it says "Waiting for certificate" or "DNS records required", follow the on-screen instructions.
2.  **Verify GoDaddy DNS**:
    *   Ensure you have added the **A** and **AAAA** records provided by Cloud Run to your GoDaddy DNS settings.
    *   **Crucial**: If you turned off "Forwarding", ensure you didn't accidentally delete the `A` record pointing to Google.
3.  **Try the 'www' Version**:
    *   Try visiting `https://www.spec10x.com`. If that works but the root doesn't, you need to add a mapping for the root domain as well.

### 4. Fix for "Firebase Auth is not initialized"
If you see this error while logging in, it means your frontend was built without your Firebase keys.
*   **The Fix**: You must re-run the `Build Frontend` command in Section 3, ensuring all `--substitutions` match your [.env.local](file:///c:/Users/Deep/.gemini/antigravity/scratch/spec10x/frontend/.env.local) values.
*   **Why?**: Next.js requires these variables to be present **during the build process** in Google Cloud Build, not just as environment variables in Cloud Run.

---

## 7. Domain Mapping & GoDaddy Setup

### Step A: Cloud Run Domain Mapping
1.  In the Cloud Run dashboard, click **Manage Custom Domains**.
2.  Click **Add Mapping**.
3.  Select the **Frontend** service.
4.  Select **Cloud Run Domain Mapping** (Standard).
5.  Enter `spec10x.com`.
6.  GCP will provide you with **DNS Records** (A and AAAA records).

### Step B: GoDaddy DNS Configuration
1.  Log in to your [GoDaddy Domain Portfolio](https://dcc.godaddy.com/control/).
2.  Identify **spec10x.com** and click **DNS**.
3.  **Remove** any existing `A` records for `@`.
4.  **Add** the `A` records provided by GCP:
    *   **Type**: `A`
    *   **Name**: `@`
    *   **Value**: [GCP provided IP 1]
    *   **TTL**: 1 Hour
    *   (Repeat for all IPs provided by GCP).
5.  **Add a CNAME** for the subdomain (optional):
    *   **Type**: `CNAME`
    *   **Name**: `www`
    *   **Value**: `ghs.googlehosted.com`
6.  **Wait**: SSL provisioning in Cloud Run can take 30-60 minutes after DNS is set.

---

## 6. Final Steps
1.  **Migrations**: Run one local command to migrate the production DB:
    ```bash
    # From backend/
    DATABASE_URL=postgresql+asyncpg://[PROD_DB_URL] alembic upgrade head
    ```
2.  **Verify**: Visit [https://spec10x.com](https://spec10x.com).

> [!TIP]
> Use **Google Cloud Secret Manager** for your `DATABASE_URL` and `GOOGLE_API_KEY` instead of plain text environment variables for better security in the Cloud Run GUI.
