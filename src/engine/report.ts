import { NATION_BY_ID } from '../data/nations'
import { WEATHER_LABEL, type Weather } from './environment'
import type { GoalDetail, MatchEvent, MatchResult, MatchTag } from './types'

/**
 * The match report: a deterministic run-down of how a simulated game panned out,
 * written from the minute engine's own event stream. No dice — the same match
 * always tells the same story.
 */
export interface ReportLine {
  min: number
  plus?: number
  side: 'home' | 'away'
  kind: MatchEvent['type']
  text: string
  xg?: number
}

export interface ReportChapter {
  title: string
  range: string
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
  freekick: 'bends a free kick over the wall and in',
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
    case 'miss':
      text = `${team} spurn a glorious chance — heads in hands`
      break
    case 'var':
      text = `VAR — ${team}'s goal is chalked off on review`
      break
    case 'injury':
      text = `${team} lose a player to a knock — treatment on the pitch`
      break
    case 'sub':
      text = `${team} turn to the bench`
      break
    case 'yellow':
      text = `${team} into the book`
      break
    case 'red':
      text = `RED CARD — ${team} down to ten`
      break
    default:
      text = `${team} — a moment the cameras missed`
  }
  return { min: e.min, plus: e.plus, side: e.side, kind: e.type, text, xg: e.type === 'goal' || e.type === 'miss' ? e.xg : undefined }
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

/** Deterministic pool pick — the match number chooses the register, not the dice. */
const pick = <T,>(pool: T[], n: number): T => pool[n % pool.length]!

export function buildReport(
  r: MatchResult,
  homeId: string,
  awayId: string,
  env: { weather: Weather; tempC: number; refName: string; refCountry: string } | null,
  stageLabel: string,
  matchNo: number,
): MatchReportData | null {
  if (!r.events || r.score.home === null || r.score.away === null) return null
  const events = [...r.events].sort((x, y) => x.min + (x.plus ?? 0) / 10 - (y.min + (y.plus ?? 0) / 10))
  const home = nameOf(homeId)
  const away = nameOf(awayId)
  const hFT = r.score.home + (r.et?.home ?? 0)
  const aFT = r.score.away + (r.et?.away ?? 0)
  const winner = hFT > aFT ? home : aFT > hFT ? away : r.pens ? ((r.pens.home ?? 0) > (r.pens.away ?? 0) ? home : away) : null
  const loser = winner === home ? away : home
  const margin = Math.abs(hFT - aFT)
  const tags = new Set<MatchTag>(r.tags ?? [])

  // did the eventual winner ever trail?
  let comeback = tags.has('comeback')
  if (winner && !comeback) {
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

  // 41 · tag-aware headline registers
  let headline: string
  if (tags.has('shock'))
    headline = pick([`${winner} shock the world`, `Upset — ${winner} topple ${loser}`, `${winner} tear up the script`], matchNo)
  else if (r.pens && tags.has('marathon'))
    headline = pick([`${winner} survive the marathon`, `${winner} outlast them from twelve yards`], matchNo)
  else if (r.pens) headline = pick([`${winner} hold their nerve`, `${winner} win it from twelve yards`], matchNo)
  else if (comeback && winner)
    headline = pick([`The great escape — ${winner} come from behind`, `${winner} climb off the canvas`, `Down, not out — ${winner} turn it around`], matchNo)
  else if (lateWinner) headline = pick([`${winner} steal it at the death`, `The last word belongs to ${winner}`], matchNo)
  else if (tags.has('smash-and-grab')) headline = `${winner} raid ${loser} — a smash-and-grab`
  else if (tags.has('siege')) headline = `${winner} survive the siege`
  else if (margin >= 4) headline = pick([`${winner} run riot`, `${winner} hand out a lesson`], matchNo)
  else if (hFT === 0 && aFT === 0) headline = 'A goalless arm-wrestle'
  else if (winner) headline = margin === 1 ? pick([`${winner} edge a tight one`, `${winner} find a way`], matchNo) : `${winner} take control`
  else headline = `${home} and ${away} share the spoils`

  // 42 · standfirst cites its context
  const conditions = env ? ` Played in ${WEATHER_LABEL[env.weather].toLowerCase()} at ${env.tempC}°C.` : ''
  const derby = tags.has('derby') ? ' A derby with history — and it played like one.' : ''
  const varNote = events.some((e) => e.type === 'var') ? ' VAR had its say.' : ''
  const scoreline = `${home} ${hFT}–${aFT} ${away}${r.pens ? ` (${r.pens.home}–${r.pens.away} on penalties)` : r.et ? ' after extra time' : ''}`
  const standfirst = `${stageLabel} · Match ${matchNo} — ${scoreline}.${conditions}${derby}${varNote}`

  // chapters, with momentum-shaped prose (43)
  const firstHalf = events.filter((e) => e.min <= 45)
  const secondHalf = events.filter((e) => e.min > 45 && e.min <= 90)
  const extra = events.filter((e) => e.min > 90)
  const [h45, a45] = scoreAt(events, 45)
  const [h90, a90] = scoreAt(events, 90)
  const momFirst = (r.momentum ?? []).slice(0, 9)
  const momAvg = momFirst.length ? momFirst.reduce((s, x) => s + x, 0) / momFirst.length : 0

  const chapterProse = (which: 'first' | 'second' | 'et'): string => {
    if (which === 'first') {
      const reds = firstHalf.filter((e) => e.type === 'red').length
      const stormer = Math.abs(momAvg) > 0.12 ? (momAvg > 0 ? home : away) : null
      const base =
        h45 === a45
          ? h45 === 0
            ? stormer
              ? `${stormer} made all the running before the break — the score just refused to say so.`
              : pick(
                  [
                    'A cagey opening half — chances came, but the score stayed blank.',
                    'Forty-five minutes of shadow-boxing; neither side blinked.',
                    'The first half was all feints and no finish.',
                  ],
                  matchNo,
                )
            : `Level at the break, ${h45}–${a45}, with both sides landing blows.`
          : `${h45 > a45 ? home : away} carried a ${Math.max(h45, a45)}–${Math.min(h45, a45)} lead into the interval.`
      return reds > 0 ? `${base} A first-half red card bent the whole shape of the game.` : base
    }
    if (which === 'second') {
      const swing = h90 - a90 !== h45 - a45
      if (!swing && secondHalf.filter((e) => e.type === 'goal').length === 0)
        return pick(
          [
            'The second half tightened rather than opened — fewer chances, more nerves.',
            'After the restart the game grew careful, both benches trading changes instead of chances.',
          ],
          matchNo,
        )
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
    { title: 'First half', range: '1′–45′', prose: chapterProse('first'), lines: firstHalf.map((e) => eventLine(e, homeId, awayId)) },
    { title: 'Second half', range: '46′–90′', prose: chapterProse('second'), lines: secondHalf.map((e) => eventLine(e, homeId, awayId)) },
  ]
  if (r.et)
    chapters.push({ title: 'Extra time', range: '91′–120′', prose: chapterProse('et'), lines: extra.map((e) => eventLine(e, homeId, awayId)) })

  // 44 · the moment, scored: chance quality × timing, VAR reversals and misses eligible
  let keyMoment: string | null = null
  if (r.pens && r.pensDetail) {
    const kicks = r.pensDetail.home.length + r.pensDetail.away.length
    keyMoment = `A ${kicks}-kick shoot-out settled it — ${winner} scored when it mattered most.`
  } else {
    let best = -1
    for (const e of events) {
      let score = 0
      const t = e.min + (e.plus ?? 0) / 10
      if (e.type === 'goal') score = (0.4 + (e.xg ?? 0.3)) * (1 + t / 90) * (winner && ((e.side === 'home') === (winner === home)) ? 1.3 : 1)
      else if (e.type === 'var') score = 0.5 * (1 + t / 90)
      else if (e.type === 'miss' && margin <= 1) score = (0.3 + (e.xg ?? 0.3)) * (t / 90)
      else if (e.type === 'red' && t < 60) score = 0.55
      if (score > best) {
        best = score
        const team = nameOf(e.side === 'home' ? homeId : awayId)
        const stamp = e.plus ? `${e.min}+${e.plus}′` : `${e.min}′`
        if (e.type === 'goal') keyMoment = `${stamp} — the decisive moment: ${team} ${GOAL_PHRASE[e.detail ?? 'openplay']}.`
        else if (e.type === 'var') keyMoment = `${stamp} — the turning point: ${team} think they've scored, and VAR takes it away.`
        else if (e.type === 'miss') keyMoment = `${stamp} — the sliding-doors moment: ${team} spurn the chance that would have changed everything.`
        else if (e.type === 'red') keyMoment = `${stamp} — the hinge: a red card leaves ${team} playing uphill for an hour.`
      }
    }
  }

  // 45 · verdict families
  let verdict = ''
  if (r.stats) {
    const xh = r.stats.xgHome
    const xa = r.stats.xgAway
    const gap = Math.abs(xh - xa)
    const xgWinner = xh > xa ? home : away
    const saves = events.filter((e) => e.type === 'bigsave' && (e.side === 'home') !== (winner === home)).length
    if (winner && xgWinner !== winner && gap >= 0.8)
      verdict =
        saves >= 3
          ? `A heist, and the keeper drove the getaway car — ${saves} great saves while ${loser} won the xG battle ${Math.max(xh, xa).toFixed(1)}–${Math.min(xh, xa).toFixed(1)}.`
          : `The numbers dissent: ${loser} won the xG battle ${Math.max(xh, xa).toFixed(1)}–${Math.min(xh, xa).toFixed(1)} and lost the war.`
    else if (winner && margin >= 4 && gap >= 1.2)
      verdict = `No arguments anywhere — ${winner} dominated every column of the ledger (${xh.toFixed(1)}–${xa.toFixed(1)} xG).`
    else if (r.pens && gap < 0.25)
      verdict = `A genuine coin flip — ${xh.toFixed(1)}–${xa.toFixed(1)} on chances, inseparable for 120 minutes, decided by nerve alone.`
    else if (winner)
      verdict = `The numbers agree — ${winner} earned it on chances (${xh.toFixed(1)}–${xa.toFixed(1)} xG) and took what the night offered.`
    else verdict = `A fair share of the spoils: ${xh.toFixed(1)}–${xa.toFixed(1)} on expected goals.`
  }

  return { headline, standfirst, chapters, keyMoment, verdict }
}
