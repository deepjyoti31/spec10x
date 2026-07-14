# PRD-053-01: Second Interview Connector & Hardening MVP

> Date: July 10, 2026
> Release: `v0.53`
> Owner: Project maintainers
> Epics: `EPIC-053-01`, `EPIC-053-02`

## Problem

Now that we have shipped `v0.5` and developed `v0.51` (Fireflies auto-sync) and `v0.52` (PostHog analytics and Score v2), we must:
1. Prove the reusability of our interview connector architecture by implementing a second interview provider (**Otter.ai**).
2. Harden our connector platform to reduce the operational cost of managing multiple live integrations (handling expired tokens/keys, rate limits, network timeouts, and preventing infinite failure-retry loops).

## Solution

### 1. Otter.ai Connector (EPIC-053-01)
We will add Otter.ai as a supported interview provider using an API-key connection method.
- Otter meetings will be fetched using a mock HTTP REST client that simulates their endpoints (similar to Fireflies GraphQL).
- Transcripts will be parsed and materialized as native Spec10x `Interview` rows.
- The standard processing pipeline will run to extract insights, chunk texts for vector database embedding (enabling grounded Ask), and emit per-insight signals.
- Idempotency will be tracked in `source_items` by checksum.

### 2. Connector Platform Hardening (EPIC-053-02)
- **Retry Policy & Dead-Letter Suspension**: We track consecutive failures per connection. After `5` consecutive failed syncs, we flag the connection as `error_suspended`. The scheduled sync task will skip suspended connections until the user re-enables them.
- **Credential Rotation**: Users can rotate their API keys directly via a `PUT` request without losing historical data, sync logs, or source items.
- **Re-enable Flow**: A simple `POST` request to re-activate a suspended connection, prompting immediate validation.

---

## User Flows

### 1. Connecting Otter.ai
1. Go to Integrations -> Interview Sources.
2. Click **Connect** on the Otter.ai card (now marked available).
3. Enter API Key in the form.
4. Click "Connect Otter.ai" -> credentials are validated -> connection transitions to `connected`.
5. Background worker kicks off backfill.

### 2. Re-enabling or Rotating Suspended Connection
1. In the integrations page, a suspended connection shows a red alert: "Suspended: 5 consecutive failures".
2. The user has two options:
   - Click **Re-enable** (tries to reconnect/revalidate with existing key).
   - Click **Update Credentials** (opens a modal to supply a new key, rotating the credential and validating it).
