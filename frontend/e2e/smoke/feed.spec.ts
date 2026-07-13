import { expect, test } from '@playwright/test';

import { mockApi } from './support/mocks';

test.describe('Unified feed', () => {
  test('renders mixed-source rows with evidence detail', async ({ page }) => {
    await mockApi(page);
    await page.goto('/feed');

    // All four fixture signals load.
    await expect(page.getByText('Signals (4)')).toBeVisible();

    // One row per source type, each with its badge and title.
    await expect(page.getByText('Interview', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Support', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Survey', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Analytics', { exact: true }).first()).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Users get lost during onboarding' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Exports fail for large workspaces' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Mobile app feels slow' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Weekly usage: export_clicked fell 18%' }).first()
    ).toBeVisible();

    // The evidence detail panel shows the first signal by default.
    await expect(page.getByText('Evidence Detail')).toBeVisible();
    await expect(
      page.getByText('Full evidence context for the Interview signal', { exact: false })
    ).toBeVisible();

    // Selecting another row swaps the detail panel and links back to evidence.
    await page
      .getByRole('heading', { name: 'Exports fail for large workspaces' })
      .first()
      .click();
    await expect(
      page.getByText('Full evidence context for the Support signal', { exact: false })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Open in Zendesk/ })).toBeVisible();
  });
});
