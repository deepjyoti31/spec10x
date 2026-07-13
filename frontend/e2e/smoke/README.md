# Playwright Smoke Suite

Ship-blocking frontend smoke coverage for `US-05-06-01`, implementing the
`D-05-04` decision exactly: Playwright, Chromium-only, six checks.

## What it covers

| Spec | Coverage |
|---|---|
| `integrations.spec.ts` | Integrations shell renders and loads provider state from the API |
| `survey-import.spec.ts` | Survey CSV import happy path reaches preview and completion UI |
| `feed.spec.ts` | Unified feed renders mixed-source rows (interview, support, survey, analytics) with evidence detail |
| `feed-filters.spec.ts` | Source and sentiment filters apply, combine, and clear without breaking page state |
| `board.spec.ts` | Priority board renders ranked themes in all three columns with score breakdown |
| `nav.spec.ts` | Critical nav path: home dashboard → feed → board → home via the sidebar |

## How it works

The suite is hermetic — no backend, database, or Firebase project needed:

- **Auth**: the app is built with `NEXT_PUBLIC_E2E_AUTH_BYPASS=1`
  (`npm run build:e2e`), which makes `AuthProvider` inject a stub user
  instead of waiting on Firebase. The flag is compile-time inlined, so
  production builds (built without the flag) contain no bypass path.
- **API**: every `/api/*` request is intercepted with `page.route()` and
  answered from `support/fixtures.ts` (see `support/mocks.ts`), including
  CORS preflights. Fixture shapes mirror the response types in
  `src/lib/api.ts` — update both together when API contracts change.

## Running

```bash
npm run test:smoke   # build with the E2E flag, start on :3100, run the suite
npx playwright test  # re-run against an existing build:e2e output
```

In CI, the suite runs as the first step of `cloudbuild.frontend.yaml`
(inside the `mcr.microsoft.com/playwright` image); a failure blocks the
Docker image from being built or pushed.
