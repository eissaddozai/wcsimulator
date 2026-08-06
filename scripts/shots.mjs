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
await page.click('button:text-is("Done")') // exact — "Indonesia" substring-matches text=Done

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
await page.waitForTimeout(2400) // the twelve groups cascade in one by one
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
await page.waitForTimeout(2600) // let the champion's golden thread finish drawing
await shot('14-bracket-mirrored-full')

// —— match panel with detailed odds ——
await page.locator('.bracket2 .ko-node.done').first().click()
await page.waitForSelector('.odds-card')
await shot('15-match-panel-odds')
await page.click('text=Open the full market')
await page.waitForTimeout(250)
await page.click('text=Tune the model')
await page.waitForSelector('.lab-slider')
await shot('15b-model-lab')
await page.click('button:text-is("Done")')
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

// ———————————————— the 64-team modality ————————————————
await page.evaluate(() => localStorage.clear())
await page.goto(base)
await page.waitForSelector('.landing')
await page.click('text=Start from scratch')
await page.waitForSelector('.lab-hero')
await shot('18-lab-preset-shelf')
await page.click('text=Continue to Teams')
await page.waitForSelector("text=Who's hosting?")
await page.click('text=Surprise me')
await page.waitForTimeout(250)
await page.click('text=Confirm hosts')
await page.waitForSelector('.team-grid')
await page.click('.fmt-opt:has-text("The Expanded 64")')
await page.waitForTimeout(300)
await shot('19-64-selection')

// the Intercontinental Play-offs, staged by hand: 60 direct + 16 designated entrants
await page.evaluate(() => {
  const store = window.__wcstore
  const s = store.getState()
  store.setState({
    playoffTeams: ['POL', 'HUN', 'GRE', 'EGY', 'NGA', 'CMR', 'KSA', 'UZB', 'IRQ', 'JAM', 'CRC', 'HON', 'PER', 'VEN', 'NZL', 'FIJ'],
    entries: [...s.hosts],
  })
})
// the sixteenth entrant convenes the tournament automatically
await page.waitForSelector('.po-dialog-64')
await shot('20-64-playoffs-empty')
await page.click('text=Simulate all four tournaments')
await page.waitForTimeout(700)
await shot('21-64-playoffs-settled')
await page.locator('.po-dialog-64 .host-close').click()
await page.waitForTimeout(250)

// simulated qualification fills all 64 (including the four playoff berths)
await page.click('text=Total Anarchy')
await page.click('text=As It Happens')
await page.click('text=Simulate qualification')
await page.waitForTimeout(600)
await shot('22-64-qualified')
await page.click('text=Continue to Pots')
await page.waitForSelector('.pots-grid')
await shot('23-64-pots')
await page.click('text=Proceed to the Draw')
await page.waitForSelector('text=Conduct the draw')
await page.click('text=Conduct the draw')
await page.waitForSelector('.draw-controls')
await page.click('text=Skip to result')
await page.waitForTimeout(500)
await shot('24-64-draw-complete')
await page.click('text=Continue to the Group Stage')
await page.waitForSelector('.groups-grid')
await page.click('text=Simulate remaining')
await page.waitForTimeout(3400) // sixteen groups cascade
await shot('25-64-groups')
await page.click('text=Seed the Round of 32')
await page.waitForSelector('.bracket2')
await shot('26-64-bracket-empty')
await page.click('text=Simulate remaining')
await page.waitForTimeout(2000)
const champ64 = await page.locator('.champion').isVisible().catch(() => false)
if (champ64) {
  await shot('27-64-champion')
  await page.click('text=Back to the bracket')
  await page.waitForTimeout(300)
}
await page.waitForTimeout(2600)
await shot('28-64-bracket-full')

await browser.close()
console.log('done')
