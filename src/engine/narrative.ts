import { shortName } from '../data/nations'
import { isScored, type MatchResult } from './types'

/** One-paragraph match report auto-written from the minute engine's events. */
export function matchRecap(r: MatchResult, homeId: string, awayId: string): string | null {
  if (!r.events || !isScored(r)) return null
  const home = shortName(homeId)
  const away = shortName(awayId)
  const h = r.score.home! + (r.et?.home ?? 0)
  const a = r.score.away! + (r.et?.away ?? 0)
  const goals = r.events.filter((e) => e.type === 'goal')
  const reds = r.events.filter((e) => e.type === 'red')
  const bits: string[] = []

  const winner = h > a ? home : a > h ? away : null
  const late = goals.find((g) => g.min >= 85 && g.min <= 90)
  const etGoal = goals.find((g) => g.min > 90)

  if (r.pens) {
    bits.push(`Nothing could separate them in ${goals.length === 0 ? 'a cagey stalemate' : '120 breathless minutes'} — it took the shootout, ${r.pens.home}–${r.pens.away}.`)
  } else if (etGoal) {
    const scorer = etGoal.side === 'home' ? home : away
    bits.push(`${scorer} settled it in extra time, the decisive blow landing on ${etGoal.min}′.`)
  } else if (late && winner) {
    bits.push(`${winner} struck in the ${late.min}′ minute to break hearts at the death.`)
  } else if (goals.length === 0) {
    bits.push(`A goalless arm-wrestle — chances came and went, nerves held.`)
  } else if (Math.abs(h - a) >= 3) {
    bits.push(`${winner} ran riot — a statement performance.`)
  } else if (winner) {
    bits.push(`${winner} edged a tight one.`)
  } else {
    bits.push(`Honours even after ninety.`)
  }

  if (reds.length > 0) {
    const side = reds[0]!.side === 'home' ? home : away
    bits.push(`A red card for ${side} on ${reds[0]!.min}′ tilted the pitch.`)
  }
  if (r.stats && Math.abs(r.stats.xgHome - r.stats.xgAway) > 1.2) {
    const dom = r.stats.xgHome > r.stats.xgAway ? home : away
    const unlucky = (r.stats.xgHome > r.stats.xgAway) === (h < a)
    bits.push(unlucky ? `${dom} dominated the chances and somehow lost the scoreboard.` : `${dom} deserved it on the balance of chances.`)
  }
  return bits.join(' ')
}
