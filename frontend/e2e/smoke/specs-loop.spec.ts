import { expect, test } from '@playwright/test';

import { mockApi } from './support/mocks';

/**
 * v1.1 full-loop smoke (US-11-04-01): the specs → tasks → outcomes path.
 * Fully mocked like the rest of the suite — no backend needed.
 */
test.describe('Full loop: specs → tasks → outcomes', () => {
  test('spec list shows the pipeline and opens Spec Studio', async ({ page }) => {
    await mockApi(page);
    await page.goto('/specs');

    await expect(page.getByRole('heading', { name: 'Specs' })).toBeVisible();
    await expect(page.getByText('Fix export timeouts').first()).toBeVisible();
    await expect(page.getByText('Faster onboarding checklist').first()).toBeVisible();

    await page.getByText('Fix export timeouts').first().click();
    await expect(page).toHaveURL(/\/specs\/spec-approved-1/);
  });

  test('Spec Studio renders the brief, evidence, and task breakdown', async ({ page }) => {
    await mockApi(page);
    await page.goto('/specs/spec-approved-1');

    // Brief sections with citation chips
    await expect(page.getByText('Problem Statement').first()).toBeVisible();
    await expect(
      page.getByText('Large exports time out before finishing.').first()
    ).toBeVisible();

    // Evidence panel carries the snapshot
    await expect(page.getByText('Evidence (2)').first()).toBeVisible();
    await expect(
      page.getByText('Exports keep timing out for our weekly reports.').first()
    ).toBeVisible();

    // Task breakdown with complexity and dependency chips
    await expect(page.getByText('Task Breakdown (2)').first()).toBeVisible();
    await expect(page.getByText('Add export job queue').first()).toBeVisible();
    await expect(page.getByText('after #1').first()).toBeVisible();

    // Agent handoff actions are live
    await expect(page.getByRole('button', { name: /Copy for agent/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /GitHub Issues/ }).first()).toBeVisible();
  });

  test('GitHub Issues export flows through the modal and links tasks', async ({ page }) => {
    await mockApi(page);
    await page.goto('/specs/spec-approved-1');

    await page.getByRole('button', { name: /GitHub Issues/ }).first().click();
    await expect(page.getByText('Export tasks to GitHub Issues').first()).toBeVisible();
    await expect(
      page.getByText('used for this export only and never stored').first()
    ).toBeVisible();

    await page.getByPlaceholder('owner/name').fill('acme/roadmap');
    await page.getByPlaceholder(/ghp_/).fill('ghp_smoke_token');
    await page.getByRole('button', { name: 'Create Issues' }).click();

    await expect(page.getByText(/Created 2 GitHub issues/).first()).toBeVisible();
  });

  test('tasks workbench lists approved specs with handoff actions', async ({ page }) => {
    await mockApi(page);
    await page.goto('/tasks');

    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByText('Fix export timeouts').first()).toBeVisible();
    await expect(page.getByText('2 tasks').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy for agent/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /GitHub Issues/ }).first()).toBeVisible();
  });

  test('outcomes page reads honestly with pre/post volume', async ({ page }) => {
    await mockApi(page);
    await page.goto('/outcomes');

    await expect(page.getByRole('heading', { name: 'Outcomes' })).toBeVisible();
    await expect(page.getByText('Faster onboarding checklist').first()).toBeVisible();
    await expect(page.getByText('Voice volume fell').first()).toBeVisible();
    // Correlational caution is a trust requirement, not decoration
    await expect(
      page.getByText('supporting evidence, not proven impact').first()
    ).toBeVisible();
    await expect(page.getByText('Before ship').first()).toBeVisible();
    await expect(page.getByText('After ship').first()).toBeVisible();
  });
});
