import type { Page, Route } from '@playwright/test';

import {
  BOARD_THEMES,
  DATA_SOURCES,
  FEED_DETAILS,
  FEED_SIGNALS,
  HOME_DASHBOARD,
  SOURCE_CONNECTIONS,
  SURVEY_CONFIRM,
  SURVEY_HISTORY,
  SURVEY_VALIDATION,
} from './fixtures';

// The app fetches cross-origin (frontend on :3100, API base on :8000), so
// fulfilled responses need CORS headers and OPTIONS preflights must succeed.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Intercepts every backend API call the smoke pages make and answers from
 * fixtures. Unhandled API paths get an empty list so incidental widgets
 * (notifications, etc.) stay quiet instead of erroring.
 */
export async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }

    if (path === '/api/dashboard/home') return json(route, HOME_DASHBOARD);
    if (path === '/api/notifications') return json(route, []);
    if (path === '/api/data-sources') return json(route, DATA_SOURCES);
    if (path === '/api/source-connections' && method === 'GET') {
      return json(route, SOURCE_CONNECTIONS);
    }
    if (path === '/api/survey-import/history') return json(route, SURVEY_HISTORY);
    if (path === '/api/survey-import/validate') return json(route, SURVEY_VALIDATION);
    if (path === '/api/survey-import/confirm') return json(route, SURVEY_CONFIRM);
    if (path === '/api/themes/board') return json(route, BOARD_THEMES);

    if (path === '/api/feed') {
      const source = url.searchParams.get('source');
      const sentiment = url.searchParams.get('sentiment');
      let rows = FEED_SIGNALS;
      if (source) rows = rows.filter((row) => row.source_type === source);
      if (sentiment) rows = rows.filter((row) => row.sentiment === sentiment);
      return json(route, rows);
    }

    const feedDetailMatch = path.match(/^\/api\/feed\/([^/]+)$/);
    if (feedDetailMatch) {
      const detail = FEED_DETAILS[feedDetailMatch[1]];
      return detail
        ? json(route, detail)
        : json(route, { detail: 'Signal not found' }, 404);
    }

    return json(route, []);
  });
}
