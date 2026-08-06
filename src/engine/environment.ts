import { makeRng } from './rng'

/**
 * Deterministic per-match environment: weather at kickoff and the referee appointment.
 * Derived purely from (masterSeed, matchNumber), so the odds panel, the simulation, and
 * any replay all agree without storing a byte.
 */
export type Weather = 'temperate' | 'heat' | 'rain' | 'altitude'

export interface MatchEnvironment {
  weather: Weather
  tempC: number
  refName: string
  refCountry: string
  /** 1 = average; >1 books more, <1 lets play flow */
  refStrictness: number
}

export const WEATHER_LABEL: Record<Weather, string> = {
  temperate: 'Clear evening',
  heat: 'Afternoon heat',
  rain: 'Driving rain',
  altitude: 'High altitude',
}

/** An invented referee corps — neutral names, distinct temperaments. */
const REFEREES: { name: string; country: string; strict: number }[] = [
  { name: 'A. Okafor', country: 'NGA', strict: 1.0 },
  { name: 'M. Lindqvist', country: 'SWE', strict: 0.85 },
  { name: 'R. Castellanos', country: 'ARG', strict: 1.25 },
  { name: 'D. van Rooyen', country: 'RSA', strict: 0.95 },
  { name: 'K. Tanaka', country: 'JPN', strict: 0.8 },
  { name: 'S. Al-Harbi', country: 'KSA', strict: 1.1 },
  { name: 'J. Kavanagh', country: 'IRL', strict: 1.05 },
  { name: 'P. Moretti', country: 'ITA', strict: 1.3 },
  { name: 'L. Baumgartner', country: 'AUT', strict: 0.9 },
  { name: 'E. Ndiaye', country: 'SEN', strict: 1.0 },
  { name: 'T. Kowalczyk', country: 'POL', strict: 1.15 },
  { name: 'H. Grønvold', country: 'NOR', strict: 0.85 },
  { name: 'F. Barbosa', country: 'BRA', strict: 1.05 },
  { name: 'C. Mendoza', country: 'MEX', strict: 0.95 },
  { name: 'V. Petrescu', country: 'ROU', strict: 1.2 },
  { name: 'N. Achterberg', country: 'NED', strict: 0.9 },
  { name: 'G. MacLeod', country: 'SCO', strict: 1.35 },
  { name: 'Y. Haddad', country: 'MAR', strict: 1.0 },
]

export function matchEnvironment(masterSeed: string, matchNumber: number, knockout = false): MatchEnvironment {
  const rng = makeRng(`env:${masterSeed}:${matchNumber}`)
  const w = rng()
  let weather: Weather
  // knockout nights run later and cooler — heat recedes, storms roll in
  if (knockout) {
    if (w < 0.5) weather = 'temperate'
    else if (w < 0.62) weather = 'heat'
    else if (w < 0.88) weather = 'rain'
    else weather = 'altitude'
  } else if (w < 0.52) weather = 'temperate'
  else if (w < 0.74) weather = 'heat'
  else if (w < 0.9) weather = 'rain'
  else weather = 'altitude'
  const nightShift = knockout ? 3 : 0
  const tempC =
    (weather === 'heat'
      ? 30 + Math.round(rng() * 7)
      : weather === 'rain'
        ? 14 + Math.round(rng() * 6)
        : weather === 'altitude'
          ? 16 + Math.round(rng() * 6)
          : 19 + Math.round(rng() * 7)) - nightShift
  const ref = REFEREES[Math.floor(rng() * REFEREES.length)]!
  return { weather, tempC, refName: ref.name, refCountry: ref.country, refStrictness: ref.strict }
}
