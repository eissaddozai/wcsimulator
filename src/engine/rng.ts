/**
 * Seeded RNG: xmur3 string hash → mulberry32 PRNG. Pinned forever — changing the
 * PRNG would break replay of shared seeds. All randomness in the app flows through
 * named streams derived from one user-visible master seed string.
 */
export type Rng = () => number

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seedString: string): Rng {
  return mulberry32(xmur3(seedString)())
}

/** Independent stream per pipeline stage: re-running one stage never perturbs another. */
export function stream(masterSeed: string, name: string): Rng {
  return makeRng(`${masterSeed} ${name}`)
}

export function mintSeed(): string {
  const a = new Uint32Array(2)
  crypto.getRandomValues(a)
  const s = (n: number) => n.toString(36).toUpperCase().padStart(4, '0').slice(-4)
  return `${s(a[0]!)}-${s(a[1]!)}`
}

export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n)
}

export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

let spare: number | null = null
export function gaussian(rng: Rng): number {
  if (spare !== null) {
    const v = spare
    spare = null
    return v
  }
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  const mag = Math.sqrt(-2.0 * Math.log(u))
  spare = mag * Math.sin(2.0 * Math.PI * v)
  return mag * Math.cos(2.0 * Math.PI * v)
}

/** Knuth inversion — fine for λ < 10. */
export function poisson(rng: Rng, lambda: number): number {
  const l = Math.max(lambda, 0.0001)
  const target = Math.exp(-l)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > target)
  return k - 1
}

export function gumbel(rng: Rng): number {
  let u = 0
  while (u === 0) u = rng()
  return -Math.log(-Math.log(u))
}

/** Chaos knob θ ∈ [0,2] → softmax inverse-temperature. θ=0 callers short-circuit to argmax. */
export function beta(theta: number): number {
  return 1.4 * Math.pow(3, 1 - Math.min(Math.max(theta, 0), 2))
}
