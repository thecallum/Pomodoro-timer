import { expect, test } from '@playwright/test'

test.describe('timer page sessions', () => {
  test('a running timer is still running after a reload', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start focus' }).click()

    await page.reload()

    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Focus' })).toBeVisible()
  })

  test('a completed focus session shows up in todays stats', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel('Focus length').fill('1')
    await page.getByRole('button', { name: 'Back' }).click()

    await page.getByRole('button', { name: 'Start focus' }).click()
    await page.clock.runFor('01:00')

    await expect(page.getByRole('heading', { name: 'Break' })).toBeVisible()
    await expect(page.getByText(/completed session/)).toHaveText(/1 completed session.*1m 0s focused/)
  })
})
