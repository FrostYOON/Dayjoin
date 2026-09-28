import { test, expect, type Page } from '@playwright/test'

async function ready(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('grid')).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
}

test('built manifest and PNG icons meet browser installation requirements', async ({ page, request }) => {
  await ready(page)
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ id: '/', scope: '/', start_url: '/', display: 'standalone', short_name: 'Dayjoin' })
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src)
    expect(response.ok()).toBe(true)
    const png = await response.body()
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes)
  }
  const client = await page.context().newCDPSession(page)
  const result = await client.send('Page.getInstallabilityErrors')
  expect(result.installabilityErrors).toEqual([])
})

test('offline reload opens the UI but never serves cached API or auth responses', async ({ page, context }) => {
  await ready(page)
  for (const path of ['/api/records', '/auth/session']) {
    expect(await page.evaluate(async (url) => (await fetch(url)).json(), path))
      .toEqual({ privateRecord: 'test-only-private-value' })
  }
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '우리 둘의 캘린더' })).toBeVisible()
  for (const path of ['/api/records', '/auth/session']) {
    expect(await page.evaluate(async (url) => {
      try { await fetch(url); return 'cached' } catch { return 'unavailable' }
    }, path)).toBe('unavailable')
    const other = await context.newPage()
    await other.goto(`http://127.0.0.1:4174${path}`).catch(() => {})
    await expect(other.getByRole('heading', { name: '우리 둘의 캘린더' })).toHaveCount(0)
    await other.close()
  }
  const cached = await page.evaluate(async () => {
    const names = await caches.keys()
    return (await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).map((entry) => entry.url)))).flat()
  })
  expect(cached.some((url) => /\/(api|auth)\//.test(url))).toBe(false)
})

test('mobile settings explain installation and memory-only demo records without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await ready(page)
  await page.getByLabel('미리보기 설정', { exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: '홈 화면에서 Dayjoin' })).toBeVisible()
  const details = dialog.locator('details').filter({ hasText: '브라우저에서 설치하는 방법' })
  if (!await details.getAttribute('open').then((value) => value !== null)) await details.locator('summary').click()
  await expect(dialog.getByText(/Safari의 공유 메뉴/)).toBeVisible()
  await expect(dialog.getByText(/설치해도 입력한 기록은 저장되지 않고/)).toBeVisible()
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('cancelled installation consumes the prompt and keeps manual instructions available', async ({ page }) => {
  await ready(page)
  await page.evaluate(() => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => ({ outcome: 'dismissed' }),
    })
    window.dispatchEvent(event)
  })
  await page.getByLabel('미리보기 설정', { exact: true }).click()
  await page.getByRole('button', { name: '홈 화면에 설치', exact: true }).click()
  await expect(page.getByText('나중에 브라우저 메뉴에서 설치할 수 있어요.')).toBeVisible()
  await expect(page.getByRole('button', { name: '홈 화면에 설치', exact: true })).toHaveCount(0)
  await expect(page.getByText(/Safari의 공유 메뉴/)).toBeVisible()
})

test('an update preserves a form, and another tab cannot force it to reload', async ({ page, context, request }) => {
  await ready(page)
  const second = await context.newPage()
  await ready(second)
  await page.getByRole('button', { name: '새 기록', exact: true }).click()
  await page.getByLabel('일정 제목', { exact: true }).fill('업데이트 중에도 유지할 일정')
  await request.post('/__test/update')
  await second.evaluate(async () => (await navigator.serviceWorker.ready).update())
  const secondBanner = second.getByRole('region', { name: '웹앱 업데이트' })
  await expect(secondBanner).toBeVisible()
  const firstBanner = page.getByRole('region', { name: '웹앱 업데이트', includeHidden: true })
  await expect(firstBanner.getByRole('button', { name: '새로고침해 업데이트', includeHidden: true })).toBeDisabled()
  await secondBanner.getByRole('button', { name: '새로고침해 업데이트' }).click()
  await expect(secondBanner).toHaveCount(0)
  await expect(page.getByLabel('일정 제목', { exact: true })).toHaveValue('업데이트 중에도 유지할 일정')
  await page.getByRole('button', { name: '등록하기', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(firstBanner).toBeVisible()
  await firstBanner.getByRole('button', { name: '새로고침해 업데이트' }).click()
  await expect(firstBanner).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '우리 둘의 캘린더' })).toBeVisible()
})
