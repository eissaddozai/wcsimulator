// Drives the built app in headless Chromium and captures every screen.
// Usage: node scripts/shots.mjs <outDir>
import { chromium } from 'playwright-core'

const out = process.argv[2] ?? 'shots'
const base = 'http://localhost:4173/'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console.error]', m.text())
})
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

const shot = async (name) => {
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('✓', name)
}

await page.goto(base)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForSelector('.landing')
await shot('01-landing')

// —— custom flow ——
await page.click('text=Start from scratch')
await page.waitForSelector('.team-grid')
await shot('02-teams-empty')
await page.click('text=Simulate qualification')
await page.waitForTimeout(300)
await shot('03-teams-simulated')
await page.click('text=Continue to Pots')
await page.waitForSelector('.pots-grid')
await shot('04-pots')
await page.click('text=Re-roll pots')
await page.waitForTimeout(300)
await page.click('text=Proceed to the Draw')
await page.waitForSelector('text=Conduct the draw')
await shot('05-draw-intro')
await page.click('text=Conduct the draw')
await page.waitForSelector('.draw-controls')
await page.click('text=Draw next')
await page.waitForTimeout(1300)
await shot('06-draw-reveal')
await page.click('text=Skip to result')
await page.waitForTimeout(400)
await shot('07-draw-complete')
await page.click('text=Continue to the Group Stage')
await page.waitForSelector('.groups-grid')
await shot('08-groups-empty')
await page.click('text=Simulate remaining')
await page.waitForTimeout(600)
await shot('09-groups-scored')
await page.keyboard.press('t')
await page.waitForTimeout(300)
await shot('10-thirds-race')
await page.keyboard.press('t')
await page.click('text=Seed the Round of 32')
await page.waitForSelector('.bracket')
await shot('11-knockout-r32')
await page.click('.bracket-wrap .ko-node:not(.ghost)')
await page.waitForTimeout(300)
await shot('12-match-panel')
await page.click('text=Close')
// simulate the whole knockout
await page.click('text=Simulate remaining')
await page.waitForTimeout(1200)
const championVisible = await page.locator('.champion').isVisible().catch(() => false)
if (championVisible) {
  await shot('13-champion')
  await page.click('text=Back to the bracket')
}
await page.waitForTimeout(300)
await shot('14-bracket-final')

// —— light theme ——
await page.click('[aria-label="Toggle theme"]')
await shot('15-light-theme')
await page.click('[aria-label="Toggle theme"]')

// —— real 2026 preset ——
await page.evaluate(() => localStorage.clear())
await page.goto(base)
await page.waitForSelector('.landing')
await page.click('text=Load the real tournament')
await page.waitForSelector('.groups-grid')
await shot('16-real-2026')

await browser.close()
console.log('done')
