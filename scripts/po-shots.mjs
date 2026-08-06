// Focused capture of the play-off ceremony trees (48 and 64).
// Usage: node scripts/po-shots.mjs <outDir>
import { chromium } from 'playwright-core'

const out = process.argv[2] ?? 'shots'
const base = 'http://localhost:4173/'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

const shot = async (name) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('✓', name)
}

await page.goto(base)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForSelector('.landing')

// —— the 48 ceremony: six entrants, finals crowned in the center ——
await page.evaluate(() => {
  const store = window.__wcstore
  store.getState().setStep('teams')
  store.setState({
    hostsChosen: true,
    playoffTeams: ['EGY', 'KSA', 'JAM', 'CRC', 'PER', 'NZL'],
    entries: [...store.getState().hosts],
  })
})
await page.waitForSelector('.po-dialog')
await shot('po48-empty')
await page.click('text=Simulate the tournament')
await page.waitForTimeout(700)
await shot('po48-settled')
await page.locator('.po-dialog .host-close').click()

// —— the 64 ceremony: four tournaments, each a converging tree ——
await page.evaluate(() => {
  const store = window.__wcstore
  const s = store.getState()
  store.setState({
    format: 64,
    playoffResults: {},
    playoffTeams: ['POL', 'HUN', 'GRE', 'EGY', 'NGA', 'CMR', 'KSA', 'UZB', 'IRQ', 'JAM', 'CRC', 'HON', 'PER', 'VEN', 'NZL', 'FIJ'],
    entries: [...s.hosts],
  })
})
await page.waitForSelector('.po-dialog-64')
await shot('po64-empty')
await page.click('text=Simulate all four tournaments')
await page.waitForTimeout(800)
await shot('po64-settled')
await page.evaluate(() => document.querySelector('.po-scroll').scrollBy(0, 700))
await shot('po64-settled-lower')

await browser.close()
console.log('done')
