import { NATION_BY_ID } from '../data/nations'
import { WEATHER_LABEL, type Weather } from './environment'
import type { GoalDetail, MatchEvent, MatchResult } from './types'

/**
 * The match report: a deterministic run-down of how a simulated game panned out,
 * written from the minute engine's own event stream. No dice — the same match
 * always tells the same story.
 */
export interface ReportLine {
  min: number
  side: 'home' | 'away'
  kind: MatchEvent['type']
  text: string
}

export interface ReportChapter {
  title: string
  prose: string
  lines: ReportLine[]
}

export interface MatchReportData {
  headline: string
  standfirst: string
  chapters: ReportChapter[]
  keyMoment: string | null
  verdict: string
}

const GOAL_PHRASE: Record<GoalDetail, string> = {
  openplay: 'works it through and finishes',
  header: 'rises highest and heads it home',
  setpiece: 'scores from a training-ground routine',
  counter: 'finishes a lightning counter-attack',
  longrange: 'scores from another postcode',
  pen: 'converts coolly from the spot',
  og: 'profits from an own goal',
}

function nameOf(id: string): string {
  return NATION_BY_ID.get(id)?.name ?? id
}

function eventLine(e: MatchEvent, homeId: string, awayId: string): ReportLine {
  const team = nameOf(e.side === 'home' ? homeId : awayId)
  let text: string
  switch (e.type) {
    case 'goal':
      text = `GOAL — ${team} ${GOAL_PHRASE[e.detail ?? 'openplay']}`
      break
    case 'penmiss':
      text = `Penalty to ${team} — saved! The keeper is a wall`
      break
    case 'bigsave':
      text = `${team} denied by a magnificent save`
      break
    case 'woodwork':
      text = `${team} rattle the frame of the goal`
      break
    case 'yellow':
      text = `${team} into the book`
      break
    case 'red':
      text = `RED CARD — ${team} down to ten`
      break
  }
  return { min: e.min, side: e.side, kind: e.type, text }
}

function scoreAt(events: MatchEvent[], upTo: number): [number, number] {
  let h = 0
  let a = 0
  for (const e of events) {
    if (e.type === 'goal' && e.min <= upTo) {
      if (e.side === 'home') h++
      else a++
    }
  }
  return [h, a]
}

export function buildReport(
  r: MatchResult,
  homeId: string,
  awayId: string,
  env: { weather: Weather; tempC: number; refName: string; refCountry: string } | null,
  stageLabel: string,
  matchNo: number,
): MatchReportData | null {
  if (!r.events || r.score.home === null || r.score.away === null) return null
  const events = [...r.events].sort((x, y) => x.min - y.min)
  const home = nameOf(homeId)
  const away = nameOf(awayId)
  const hFT = r.score.home + (r.et?.home ?? 0)
  const aFT = r.score.away + (r.et?.away ?? 0)
  const winner = hFT > aFT ? home : aFT > hFT ? away : r.pens ? ((r.pens.home ?? 0) > (r.pens.away ?? 0) ? home : away) : null
  const loser = winner === home ? away : home
  const margin = Math.abs(hFT - aFT)

  // did the eventual winner ever trail?
  let comeback = false
  if (winner) {
    const winSide = winner === home ? 'home' : 'away'
    let h = 0
    let a = 0
    for (const e of events) {
      if (e.type !== 'goal') continue
      if (e.side === 'home') h++
      else a++
      if ((winSide === 'home' && a > h) || (winSide === 'away' && h > a)) comeback = true
    }
  }

  const lateWinner = (() => {
    if (!winner || r.pens || margin !== 1) return null
    const goals = events.filter((e) => e.type === 'goal')
    const last = goals[goals.length - 1]
    return last && last.min >= 87 ? last : null
  })()

  // headline
  let headline: string
  if (r.pens) headline = `${winner} hold their nerve`
  else if (comeback && winner) headline = `The great escape — ${winner} come from behind`
  else if (lateWinner) headline = `${winner} steal it at the death`
  else if (margin >= 4) headline = `${winner} run riot`
  else if (hFT === 0 && aFT === 0) headline = 'A goalless arm-wrestle'
  else if (winner) headline = margin === 1 ? `${winner} edge a tight one` : `${winner} take control`
  else headline = `${home} and ${away} share the spoils`

  // standfirst
  const conditions = env ? ` Played in ${WEATHER_LABEL[env.weather].toLowerCase()} at ${env.tempC}°C.` : ''
  const scoreline = `${home} ${hFT}–${aFT} ${away}${r.pens ? ` (${r.pens.home}–${r.pens.away} on penalties)` : r.et ? ' after extra time' : ''}`
  const standfirst = `${stageLabel} · Match ${matchNo} — ${scoreline}.${conditions}`

  // chapters
  const firstHalf = events.filter((e) => e.min <= 45)
  const secondHalf = events.filter((e) => e.min > 45 && e.min <= 90)
  const extra = events.filter((e) => e.min > 90)
  const [h45, a45] = scoreAt(events, 45)
  const [h90, a90] = scoreAt(events, 90)

  const chapterProse = (which: 'first' | 'second' | 'et'): string => {
    if (which === 'first') {
      const reds = firstHalf.filter((e) => e.type === 'red').length
      const base =
        h45 === a45
          ? h45 === 0
            ? `A cagey opening half — chances came, but the score stayed blank.`
            : `Level at the break, ${h45}–${a45}, with both sides landing blows.`
          : `${h45 > a45 ? home : away} carried a ${Math.max(h45, a45)}–${Math.min(h45, a45)} lead into the interval.`
      return reds > 0 ? `${base} A first-half red card bent the whole shape of the game.` : base
    }
    if (which === 'second') {
      const swing = h90 - a90 !== h45 - a45
      if (!swing && secondHalf.filter((e) => e.type === 'goal').length === 0)
        return 'The second half tightened rather than opened — fewer chances, more nerves.'
      if (comeback) return 'After the restart the momentum turned completely — the comeback was on.'
      return h90 === a90
        ? 'The second half swung both ways and settled nothing.'
        : `${h90 > a90 ? home : away} kept the upper hand after the restart.`
    }
    if (r.pens)
      return 'Extra time could not separate them, so the tie went the full distance — twelve yards, one kick at a time.'
    return 'Into extra time, legs heavy, every touch loaded — and this time it found a winner.'
  }

  const chapters: ReportChapter[] = [
    { title: 'First half', prose: chapterProse('first'), lines: firstHalf.map((e) => eventLine(e, homeId, awayId)) },
    { title: 'Second half', prose: chapterProse('second'), lines: secondHalf.map((e) => eventLine(e, homeId, awayId)) },
  ]
  if (r.et)
    chapters.push({ title: 'Extra time', prose: chapterProse('et'), lines: extra.map((e) => eventLine(e, homeId, awayId)) })

  // key moment
  let keyMoment: string | null = null
  if (r.pens && r.pensDetail) {
    const kicks = r.pensDetail.home.length + r.pensDetail.away.length
    keyMoment = `A ${kicks}-kick shoot-out settled it — ${winner} scored when it mattered most.`
  } else if (winner && margin >= 1) {
    const winSide = winner === home ? 'home' : 'away'
    const goals = events.filter((e) => e.type === 'goal')
    let h = 0
    let a = 0
    for (const e of goals) {
      if (e.side === 'home') h++
      else a++
      const lead = winSide === 'home' ? h - a : a - h
      const final = winSide === 'home' ? hFT - aFT : aFT - hFT
      if (lead === final && e.side === winSide) {
        keyMoment = `${e.min}′ — the decisive moment: ${nameOf(e.side === 'home' ? homeId : awayId)} ${GOAL_PHRASE[e.detail ?? 'openplay']}.`
      }
    }
  }

  // verdict from the numbers
  let verdict = ''
  if (r.stats) {
    const xh = r.stats.xgHome
    const xa = r.stats.xgAway
    const xgWinner = xh > xa ? home : away
    if (winner && xgWinner !== winner && Math.abs(xh - xa) >= 0.8)
      verdict = `The numbers dissent: ${loser} won the xG battle ${Math.max(xh, xa).toFixed(1)}–${Math.min(xh, xa).toFixed(1)} and lost the war.`
    else if (winner)
      verdict = `The numbers agree — ${winner} earned it on chances (${xh.toFixed(1)}–${xa.toFixed(1)} xG) and took what the night offered.`
    else verdict = `A fair share of the spoils: ${xh.toFixed(1)}–${xa.toFixed(1)} on expected goals.`
  }

  return { headline, standfirst, chapters, keyMoment, verdict }
}
