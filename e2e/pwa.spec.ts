import { expect, test } from '@playwright/test'

test('the app loads while offline once the service worker has cached it', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Focus' })).toBeVisible()
})
