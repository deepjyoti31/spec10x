import { expect, test } from '@playwright/test';

import { mockApi } from './support/mocks';

test.describe('Integrations shell', () => {
  test('renders and loads provider state', async ({ page }) => {
    await mockApi(page);
    await page.goto('/integrations');

    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();

    // Connected state comes from the API: one live Zendesk connection.
    await expect(page.getByText('1 active')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zendesk' })).toBeVisible();
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
    await expect(page.getByText('128 records synced')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sync Now' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();

    // Available (unconnected) providers still offer Connect.
    await expect(page.getByRole('heading', { name: 'Fireflies' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Otter.ai' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PostHog' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CSV Survey / NPS' })).toBeVisible();
    expect(
      await page.getByRole('button', { name: 'Connect', exact: true }).count()
    ).toBeGreaterThanOrEqual(4);
  });
});
