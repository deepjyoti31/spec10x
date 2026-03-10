# spec10x — GCP Deployment & Troubleshooting Guide

This document summarizes the critical configurations and fixes required to successfully deploy the spec10x backend and worker to Google Cloud Run. Use this as a reference for future updates.

## 🚀 Deployment Commands

### 1. Build & Deploy Backend
```powershell
# Build image
gcloud builds submit --project=spec10x --tag us-central1-docker.pkg.dev/spec10x/spec10x-repo/backend:v1 ./backend

# Deploy to Cloud Run
gcloud run deploy spec10x-backend --image us-central1-docker.pkg.dev/spec10x/spec10x-repo/backend:v1 --region us-central1
```

### 2. Build & Deploy Worker
The worker uses the same codebase but a different entry point (via `cloudbuild.worker.yaml`).
```powershell
gcloud builds submit --project=spec10x --substitutions=_IMAGE_TAG=us-central1-docker.pkg.dev/spec10x/spec10x-repo/worker:v1 ./backend --config backend/cloudbuild.worker.yaml

gcloud run deploy spec10x-worker --image us-central1-docker.pkg.dev/spec10x/spec10x-repo/worker:v1 --region us-central1
```

---

## 🛠️ Critical Fixes & Configurations

### 1. Gemini AI Model Location
**Issue:** Using `gemini-3.1-flash-lite-preview` resulted in `404 NOT_FOUND` when `GCP_LOCATION` was set to `us-central1`.
**Fix:** `GCP_LOCATION` must be set to `global` in the Cloud Run environment variables for preview models.
- **File:** `app/core/config.py` (Default changed to `global`)
- **Env:** `GCP_LOCATION=global`

### 2. GCS CORS Policy
**Issue:** Frontend uploads failed due to CORS restrictions.
**Fix:** Apply a JSON CORS policy to the GCS bucket.
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```
Apply via: `gsutil cors set cors.json gs://spec10x-uploads`

### 3. WebSocket Handshake & Sync
**Issue 1:** WebSocket connections failed with `403 Forbidden` because authentication was attempted during the handshake.
**Fix:** Call `await websocket.accept()` *before* verifying the Firebase token.

**Issue 2:** UI stuck at "Analyzing..." because the worker finished processing before the WebSocket connected (race condition).
**Fix:** The WebSocket now queries the database for the *current state* of interviews immediately upon connection.
- **File:** `app/api/websocket.py`

### 4. Redis Connectivity
**Issue:** "Timeout connecting to server" errors.
**Fix:** 
1. Ensure the **Serverless VPC Access Connector** is attached to both services.
2. Set Egress Settings to **"Route all traffic through the VPC"**.
3. Use the private Memorystore IP in `REDIS_URL`.

---

## 📝 Maintenance Notes
- **Logs:** Monitor `spec10x-worker` for processing steps (Steps 1–6).
- **Themes:** Cross-interview synthesis only triggers when multiple interviews are present.
- **Cleanup:** Temporary files are automatically deleted after processing via the `_cleanup` function in `processing.py`.
