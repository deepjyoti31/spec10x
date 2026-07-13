import { expect, test } from '@playwright/test';

import { mockApi } from './support/mocks';

test.describe('Feed source filters', () => {
  test('apply and combine without breaking page state', async ({ page }) => {
    await mockApi(page);
    await page.goto('/feed');
    await expect(page.getByText('Signals (4)')).toBeVisible();

    // Filter by source.
    await page.getByRole('button', { name: /Source: All/ }).click();
    await page.getByRole('button', { name: 'Support', exact: true }).click();

    await expect(page).toHaveURL(/source=support/);
    await expect(page.getByRole('button', { name: /Source: Support/ })).toBeVisible();
    await expect(page.getByText('Signals (1)')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Exports fail for large workspaces' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Users get lost during onboarding' })
    ).toHaveCount(0);

    // Combine with a sentiment filter.
    await page.getByRole('button', { name: /Sentiment: All/ }).click();
    await page.getByRole('button', { name: 'Negative', exact: true }).click();

    await expect(page).toHaveURL(/source=support/);
    await expect(page).toHaveURL(/sentiment=negative/);
    await expect(page.getByText('Signals (1)')).toBeVisible();

    // Page state stays intact: filter bar, list, and detail panel all render.
    await expect(page.getByRole('button', { name: /Source: Support/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sentiment: Negative/ })).toBeVisible();
    await expect(page.getByText('Evidence Detail')).toBeVisible();
    await expect(
      page.getByText('Full evidence context for the Support signal', { exact: false })
    ).toBeVisible();

    // Clearing the source filter restores the full mixed feed.
    await page.getByRole('button', { name: /Source: Support/ }).click();
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(page).not.toHaveURL(/source=support/);
    await expect(page.getByText('Signals (2)')).toBeVisible(); // negative-only, both sources
  });
});
