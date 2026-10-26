import { expect, test } from '@playwright/test'

// The service worker would answer script requests itself, past the route below.
test.use({ serviceWorkers: 'block' })

test('a saved dark appearance is applied before the app has loaded', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('radio', { name: 'Dark' }).click()

  // With every script request blocked, only the inline script in index.html can apply the theme.
  await page.route('**/*', (route) =>
    route.request().resourceType() === 'script' ? route.abort() : route.continue(),
  )
  await page.reload()

  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('#root')).toBeEmpty()
})
