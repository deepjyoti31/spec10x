import { expect, test } from '@playwright/test';

import { mockApi } from './support/mocks';

test.describe('Critical navigation path', () => {
  test('dashboard, feed, and board stay reachable via the sidebar', async ({ page }) => {
    await mockApi(page);

    const sidebarLink = (href: string) => page.locator(`a.nav-item[href="${href}"]`);

    // Dashboard.
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Active Priorities' })).toBeVisible();
    await expect(page.getByText('Onboarding confusion').first()).toBeVisible();

    // Dashboard → Feed.
    await sidebarLink('/feed').click();
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByText('Signals (4)')).toBeVisible();
    await expect(page.getByText('Evidence Detail')).toBeVisible();

    // Feed → Board.
    await sidebarLink('/board').click();
    await expect(page).toHaveURL(/\/board/);
    await expect(page.getByText('Investigate Next').first()).toBeVisible();
    await expect(page.getByText('Export failures').first()).toBeVisible();

    // Board → Dashboard.
    await sidebarLink('/home').click();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByRole('heading', { name: 'Active Priorities' })).toBeVisible();
  });
});
