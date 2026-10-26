import { expect, test } from '@playwright/test'

test('the app loads and a focus session can be started', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Focus' })).toBeVisible()
  await expect(page.getByText('25:00')).toBeVisible()

  await page.getByRole('button', { name: 'Start focus' }).click()

  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page).toHaveTitle(/· Focus$/)
})
