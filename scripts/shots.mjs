// Drives the built app in headless Chromium and captures every screen.
// Usage: node scripts/shots.mjs <outDir>
import { chromium } from 'playwright-core'

const out = process.argv[2] ?? 'shots'
const base = 'http://localhost:4173/'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
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

// —— custom flow: the Laboratory first ——
await page.click('text=Start from scratch')
await page.waitForSelector('.lab-hero')
await shot('02-laboratory')
await page.click('text=Cup of Miracles')
await page.waitForTimeout(250)
await shot('02b-lab-preset')
await page.click('text=World Cup 26')
await page.click('text=Continue to Teams')
await page.waitForSelector('text=Who\'s hosting?')
await shot('03-host-picker')
await page.click('text=Surprise me') // the simulator decides
await page.waitForTimeout(250)
await page.click('text=Confirm hosts')
await page.waitForSelector('.team-grid')
await page.click('text=Simulate qualification')
await page.waitForTimeout(400)
await shot('04-teams-simulated')

// —— team studio: ratings + boosters ——
await page.click('text=Team studio — ratings & boosters')
await page.waitForSelector('.studio-row')
await page.locator('.studio-row button:has-text("Boosters")').first().click()
await page.waitForSelector('.booster-panel')
await page.locator('.booster-chip:has-text("Golden Generation")').click()
await page.locator('.booster-chip:has-text("Ice In The Veins")').click()
await shot('05-team-studio')
await page.click('text=Done')

await page.click('text=Continue to Pots')
await page.waitForSelector('.pots-grid')
await shot('06-pots')
await page.click('text=Proceed to the Draw')
await page.waitForSelector('text=Conduct the draw')
await page.click('text=Conduct the draw')
await page.waitForSelector('.draw-controls')
await page.click('text=Draw next')
await page.waitForTimeout(1300)
await shot('07-draw-reveal')
await page.click('text=Skip to result')
await page.waitForTimeout(400)
await shot('08-draw-complete')
await page.click('text=Continue to the Group Stage')
await page.waitForSelector('.groups-grid')
await page.click('text=Simulate remaining')
await page.waitForTimeout(700)
await shot('09-groups-scored')

// —— partial score: type one side only ——
await page.click('text=Clear', { timeout: 3000 }).catch(() => {})
await page.keyboard.press('Escape')

await page.keyboard.press('t')
await page.waitForTimeout(300)
await shot('10-thirds-race')
await page.keyboard.press('t')

// —— edit groups mode ——
await page.click('text=Edit groups')
await page.waitForTimeout(200)
await shot('11-edit-groups')
await page.click('text=Done moving')

await page.click('text=Seed the Round of 32')
await page.waitForSelector('.bracket2')
await shot('12-bracket-mirrored-empty')
await page.click('text=Simulate remaining')
await page.waitForTimeout(1500)
const championVisible = await page.locator('.champion').isVisible().catch(() => false)
if (championVisible) {
  await shot('13-champion')
  await page.click('text=Back to the bracket')
  await page.waitForTimeout(300)
}
await shot('14-bracket-mirrored-full')

// —— match panel with detailed odds ——
await page.locator('.bracket2 .ko-node.done').first().click()
await page.waitForSelector('.odds-card')
await shot('15-match-panel-odds')
await page.click('text=Tune the model')
await page.waitForSelector('.lab-slider')
await shot('15b-model-lab')
await page.click('text=Done')
await page.click('text=Close')

// —— light theme + real preset ——
await page.click('[aria-label="Toggle theme"]')
await shot('16-light-theme')
await page.click('[aria-label="Toggle theme"]')

await page.evaluate(() => localStorage.clear())
await page.goto(base)
await page.waitForSelector('.landing')
await page.click('text=Load the real tournament')
await page.waitForSelector('.groups-grid')
await shot('17-real-2026')

await browser.close()
console.log('done')
