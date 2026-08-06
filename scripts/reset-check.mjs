// Verifies the factory reset: run a full-chaos tournament, dirty the lab and
// ratings, reset, and confirm nothing carries over. Also captures the clean
// group scoreboards.
import { chromium } from 'playwright-core'

const out = process.argv[2] ?? 'shots'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page.on('dialog', (d) => d.accept())

await page.goto('http://localhost:4173/')
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForSelector('.landing')
await page.click('text=Roll the universe')
await page.waitForSelector('.bracket2', { timeout: 30000 })
await page.waitForTimeout(600)
const dirty = await page.evaluate(() => {
  const st = window.__wcstore.getState()
  st.setModelParam('tempo', 1.4)
  st.setNationOverride('ESP', { rating: 2300 })
  st.setChaos('match', 1.8)
  const s = window.__wcstore.getState()
  return {
    results: Object.keys(s.results).length,
    params: Object.keys(s.modelParams).length,
    overrides: Object.keys(s.ratingOverrides).length,
  }
})
console.log('before reset:', JSON.stringify(dirty))

// the champion scene may be covering the page — reset via the store like the button does
await page.evaluate(() => window.__wcstore.getState().reset())
await page.waitForTimeout(400)
const clean = await page.evaluate(() => {
  const s = window.__wcstore.getState()
  return {
    step: s.step,
    results: Object.keys(s.results).length,
    params: Object.keys(s.modelParams).length,
    overrides: Object.keys(s.ratingOverrides).length,
    entries: s.entries.length,
    chaos: s.chaos.match,
    pots: s.pots === null,
    trace: s.drawTrace === null,
    format: s.format,
  }
})
console.log('after reset:', JSON.stringify(clean))
if (clean.results !== 0 || clean.params !== 0 || clean.overrides !== 0 || !clean.pots || !clean.trace || clean.chaos !== 1) {
  console.log('RESET LEAK DETECTED')
  process.exit(1)
}
console.log('reset is clean ✓')

// clean scoreboard capture: fresh chaos run → groups
await page.click('text=Roll the universe')
await page.waitForSelector('.bracket2', { timeout: 30000 })
await page.waitForTimeout(500)
await page.evaluate(() => window.__wcstore.getState().setStep('groups'))
await page.waitForSelector('.groups-grid')
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/fix-groups-neat.png` })
console.log('✓ fix-groups-neat')
await browser.close()
