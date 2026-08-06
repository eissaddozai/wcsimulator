// Vendors exactly the SVGs referenced by nations.json from the two MIT-licensed npm
// packages (HatScripts/circle-flags primary, lipis/flag-icons 4:3 hero) into public/,
// and fails loudly on any unmapped code.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nations = JSON.parse(readFileSync(join(root, 'src/data/nations.json'), 'utf8'))

const circleSrc = join(root, 'node_modules/circle-flags/flags')
const rectSrc = join(root, 'node_modules/flag-icons/flags/4x3')
const circleDst = join(root, 'public/flags/circle')
const rectDst = join(root, 'public/flags/rect')
mkdirSync(circleDst, { recursive: true })
mkdirSync(rectDst, { recursive: true })

const missing = []
for (const n of nations) {
  const circle = join(circleSrc, `${n.flag}.svg`)
  const rect = join(rectSrc, `${n.flag}.svg`)
  if (existsSync(circle)) copyFileSync(circle, join(circleDst, `${n.flag}.svg`))
  else missing.push(`circle:${n.id}:${n.flag}`)
  if (existsSync(rect)) copyFileSync(rect, join(rectDst, `${n.flag}.svg`))
  else missing.push(`rect:${n.id}:${n.flag}`)
}

const licenseNote = `Flag SVGs vendored from:
- HatScripts/circle-flags (MIT) https://github.com/HatScripts/circle-flags
- lipis/flag-icons (MIT) https://github.com/lipis/flag-icons
`
writeFileSync(join(root, 'public/flags/LICENSE.md'), licenseNote)

if (missing.length > 0) {
  console.error(`✗ ${missing.length} unmapped flag codes:\n${missing.join('\n')}`)
  process.exit(1)
}
console.log(`✓ vendored ${nations.length} circle + ${nations.length} rect flags`)
