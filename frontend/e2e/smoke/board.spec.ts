import { expect, test } from '@playwright/test';

import { mockApi } from './support/mocks';

test.describe('Priority board', () => {
  test('renders ranked themes in all three columns', async ({ page }) => {
    await mockApi(page);
    await page.goto('/board');

    // Three columns with their fixture theme counts.
    await expect(page.getByText('Pinned', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Investigate Next').first()).toBeVisible();
    await expect(page.getByText('Monitoring', { exact: true }).first()).toBeVisible();

    // Themes land in the right columns by priority state.
    await expect(page.getByText('Onboarding confusion').first()).toBeVisible();
    await expect(page.getByText('Export failures').first()).toBeVisible();
    await expect(page.getByText('Mobile performance').first()).toBeVisible();

    // Rank is inspectable: impact scores and the breakdown explanation render.
    await expect(page.getByText('8.2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Why This Rank').first()).toBeVisible();
    await expect(
      page
        .getByText('Score rose mainly on new negative support evidence', { exact: false })
        .first()
    ).toBeVisible();
  });
});
