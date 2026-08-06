// Maximal state capture for the visual audit — every screen, mode, modal, and theme.
// Usage: node scripts/max-shots.mjs <outDir>
import { chromium } from 'playwright-core'

const out = process.argv[2] ?? 'shots-max'
const base = 'http://localhost:4173/'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

const shot = async (name) => {
  await page.waitForTimeout(380)
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('✓', name)
}
const st = () => page.evaluate(() => window.__wcstore.getState())

await page.goto(base)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForSelector('.landing')
await shot('m01-landing-dark')
await page.click('[aria-label="Toggle theme"]')
await shot('m02-landing-light')
await page.click('[aria-label="Toggle theme"]')

// full chaos gives a complete tournament instantly — richest state to audit
await page.click('text=Roll the universe')
await page.waitForSelector('.bracket2', { timeout: 30000 })
await page.waitForTimeout(1000)
const champOpen = await page.locator('.champion').isVisible().catch(() => false)
if (champOpen) {
  await shot('m03-champion-scene')
  await page.click('text=Back to the bracket')
  await page.waitForTimeout(400)
}
await shot('m04-bracket-48-full')
await page.click('[aria-label="Toggle theme"]')
await shot('m05-bracket-48-light')
await page.click('[aria-label="Toggle theme"]')

// match panel states: odds capsule closed, open, shootout, timeline
await page.locator('.bracket2 .ko-node.done').first().click()
await page.waitForSelector('.odds-card')
await shot('m06-match-panel')
await page.click('text=Open the full market')
await page.waitForTimeout(300)
await shot('m07-match-panel-market')
const reportBtn = page.locator('text=Match report')
if (await reportBtn.isVisible().catch(() => false)) {
  await reportBtn.click()
  await page.waitForTimeout(600)
  await shot('m08-match-report')
  await page.keyboard.press('Escape')
  await page.locator('.report-dialog .host-close, .dialog .host-close').first().click().catch(() => {})
  await page.waitForTimeout(200)
}
const replayBtn = page.locator('text=Watch replay')
if (await replayBtn.isVisible().catch(() => false)) {
  await replayBtn.click()
  await page.waitForTimeout(1800)
  await shot('m09-theater')
  await page.locator('.theater-dialog .host-close').click().catch(() => {})
  await page.waitForTimeout(200)
}
await page.locator('text=Close').first().click().catch(() => {})
await page.waitForTimeout(250)

// groups hub: full tables, thirds panel, edit mode, matchday tabs
await page.click('text=Groups')
await page.waitForSelector('.groups-grid')
await shot('m10-groups-48')
await page.keyboard.press('t')
await page.waitForTimeout(350)
await shot('m11-thirds-race')
await page.keyboard.press('t')
await page.click('text=Edit groups')
await page.waitForTimeout(250)
await shot('m12-groups-edit')
await page.click('text=Done moving')
await page.click('[aria-label="Toggle theme"]')
await shot('m13-groups-light')
await page.click('[aria-label="Toggle theme"]')

// draw screen (board is done — audit the finished board + controls)
await page.click('text=Draw')
await page.waitForTimeout(400)
await shot('m14-draw-board-done')

// pots
await page.click('text=Pots')
await page.waitForSelector('.pots-grid')
await shot('m15-pots')

// teams (post-chaos: fully qualified rail)
await page.click('text=Teams')
await page.waitForSelector('.team-grid')
await shot('m16-teams-qualified')

// lab: chambers + squads + chaos
await page.click('text=Lab')
await page.waitForSelector('.lab-hero')
await shot('m17-lab-scoring')
await page.click('text=Match Psychology')
await page.waitForTimeout(250)
await shot('m18-lab-psychology')
await page.click('text=Chaos')
await page.waitForTimeout(250)
await shot('m19-lab-chaos')
await page.click('text=Squads')
await page.waitForTimeout(300)
await shot('m20-lab-squads')
await page.click('[aria-label="Toggle theme"]')
await shot('m21-lab-light')
await page.click('[aria-label="Toggle theme"]')

// archive / tournament menu
await page.click('text=Tournament')
await page.waitForTimeout(300)
await shot('m22-tournament-menu')
await page.keyboard.press('Escape')
await page.click('text=Tournament').catch(() => {})
await page.waitForTimeout(150)

// host picker
await page.click('text=Teams')
await page.waitForSelector('.team-grid')
await page.click('text=Change')
await page.waitForTimeout(400)
await shot('m23-host-picker')
await page.keyboard.press('Escape')
await page.locator('.host-close').first().click().catch(() => {})
await page.waitForTimeout(200)

// zoomed UI extremes
await page.evaluate(() => window.__wcstore.getState().setUiZoom(0.8))
await page.waitForTimeout(250)
await shot('m24-uizoom-80')
await page.evaluate(() => window.__wcstore.getState().setUiZoom(1))

// ——— 64-format states ———
await page.evaluate(() => localStorage.clear())
await page.goto(base)
await page.waitForSelector('.landing')
await page.evaluate(() => window.__wcstore.getState().setFormat(64))
await page.click('text=Roll the universe')
await page.waitForSelector('.bracket2', { timeout: 60000 })
await page.waitForTimeout(1200)
const c64 = await page.locator('.champion').isVisible().catch(() => false)
if (c64) {
  await page.click('text=Back to the bracket')
  await page.waitForTimeout(400)
}
await shot('m25-bracket-64-full')
await page.click('text=Groups')
await page.waitForSelector('.groups-grid')
await shot('m26-groups-64')
await page.click('text=Teams')
await page.waitForSelector('.team-grid')
await shot('m27-teams-64-qualified')

// 64 playoff ceremony with a non-MEX host (venue line check)
await page.evaluate(() => {
  const store = window.__wcstore
  store.setState({
    hosts: ['JPN'],
    hostsChosen: true,
    playoffResults: {},
    playoffTeams: ['POL', 'HUN', 'GRE', 'SWE', 'EGY', 'NGA', 'CMR', 'KSA', 'UZB', 'IRQ', 'JAM', 'CRC', 'HON', 'PER', 'VEN', 'NZL'],
    entries: ['JPN'],
    pots: null,
    drawTrace: null,
    results: {},
  })
})
await page.waitForSelector('.po-dialog-64')
await shot('m28-po64-venue-check')

await browser.close()
console.log('done')
