import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page.on('dialog', (d) => d.accept())
await page.goto('http://localhost:4173/')
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForSelector('.landing-v2')
await page.waitForTimeout(900)
await page.screenshot({ path: process.argv[2] + '/fix-home.png' })
// find a run with a shootout so the pens chip is provable on a compact node
for (let i = 0; i < 6; i++) {
  await page.click('text=Roll the universe')
  await page.waitForSelector('.bracket2', { timeout: 30000 })
  await page.waitForTimeout(700)
  if (await page.locator('.champion').isVisible().catch(() => false)) {
    await page.click('text=Back to the bracket')
    await page.waitForTimeout(400)
  }
  const pens = await page.locator('.ko-node.compact .verdict.pens').count()
  if (pens > 0) {
    console.log('compact pens chips visible:', pens)
    break
  }
  await page.evaluate(() => window.__wcstore.getState().reset())
  await page.waitForTimeout(300)
  await page.waitForSelector('.landing-v2')
}
await page.screenshot({ path: process.argv[2] + '/fix-bracket-pens.png' })
console.log('done')
await browser.close()
