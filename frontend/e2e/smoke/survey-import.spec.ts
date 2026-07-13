import { expect, test } from '@playwright/test';

import { SURVEY_CSV_CONTENT } from './support/fixtures';
import { mockApi } from './support/mocks';

test.describe('Survey CSV import', () => {
  test('happy path reaches preview and completion UI', async ({ page }) => {
    await mockApi(page);
    await page.goto('/integrations');

    // Open the CSV import modal from the catalog card.
    await page
      .locator('div.rounded-xl')
      .filter({ hasText: 'CSV Survey / NPS' })
      .getByRole('button', { name: 'Connect', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Import CSV Survey / NPS' })
    ).toBeVisible();

    // Import history from the API is visible before any new upload.
    await expect(page.getByText('Recent Imports')).toBeVisible();
    await expect(page.getByText('nps_q2.csv')).toBeVisible();

    // Choose a file and preview it.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'smoke_survey.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(SURVEY_CSV_CONTENT, 'utf-8'),
    });
    await expect(page.getByText('smoke_survey.csv')).toBeVisible();
    await page.getByRole('button', { name: 'Preview Import' }).click();

    // Preview UI: row/column summary, readiness badge, warnings, mapped rows.
    await expect(page.getByText('5 rows detected across 4 columns.')).toBeVisible();
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    await expect(page.getByText('2 rows are missing a score value')).toBeVisible();
    await expect(
      page.getByText('The export flow is confusing on mobile')
    ).toBeVisible();

    // Confirm the import and reach the completion UI.
    const confirmResponse = page.waitForResponse((response) =>
      response.url().includes('/api/survey-import/confirm')
    );
    await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
    await confirmResponse;
    await expect(page.getByText('Import complete!')).toBeVisible();
  });
});
