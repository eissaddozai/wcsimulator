import NumberFlow from '@number-flow/react'
import { Flame, Goal, Target, Timer } from 'lucide-react'
import { useMemo } from 'react'
import { Flag } from './Flag'
import { ratingOf, shortName } from '../data/nations'
import type { BracketState } from '../engine/bracket'
import { groupFixturesFor, koRangeFor } from '../engine/schedule'
import type { Groups } from '../engine/tournament'
import { useStore } from '../store/store'
import { isScored, type MatchResult } from '../engine/types'

/** Live records strip: the tournament's vital signs, recomputed from every entered score. */
export function TournamentPulse({
  groups,
  bracket,
  results,
}: {
  groups: Groups
  bracket: BracketState
  results: Record<number, MatchResult>
}) {
  const format = useStore((s) => s.format)
  const pulse = useMemo(() => {
    let played = 0
    let goals = 0
    let draws = 0
    let aet = 0
    let pens = 0
    let upsets = 0
    let vars = 0
    let injuries = 0
    let biggest: { margin: number; label: string; home: string; away: string } | null = null

    const consume = (home: string, away: string, r: MatchResult) => {
      if (!isScored(r)) return
      played++
      for (const e of r.events ?? []) {
        if (e.type === 'var') vars++
        if (e.type === 'injury') injuries++
      }
      const h = r.score.home! + (r.et?.home ?? 0)
      const a = r.score.away! + (r.et?.away ?? 0)
      goals += h + a
      if (r.score.home === r.score.away && !r.et) draws++
      if (r.et) aet++
      if (r.pens) pens++
      const winner = h > a ? home : a > h ? away : null
      const loser = winner === home ? away : home
      if (winner && ratingOf(winner) < ratingOf(loser) - 80) upsets++
      const margin = Math.abs(h - a)
      if (margin >= 3 && (!biggest || margin > biggest.margin)) {
        biggest = { margin, label: `${shortName(home)} ${h}–${a} ${shortName(away)}`, home, away }
      }
    }

    for (const f of groupFixturesFor(format)) {
      const home = groups[f.group][f.homePos - 1]
      const away = groups[f.group][f.awayPos - 1]
      const r = results[f.number]
      if (home && away && r) consume(home, away, r)
    }
    const [koFrom, koTo] = koRangeFor(format)
    for (let n = koFrom; n <= koTo; n++) {
      const m = bracket[n]
      if (m?.home && m.away && m.result && !m.stale) consume(m.home, m.away, m.result)
    }
    return {
      played,
      goals,
      draws,
      aet,
      pens,
      upsets,
      vars,
      injuries,
      biggest: biggest as { margin: number; label: string; home: string; away: string } | null,
    }
  }, [groups, bracket, results, format])

  if (pulse.played === 0) return null

  return (
    <div className="pulse-strip tiles" role="group" aria-label="Tournament pulse">
      <span className="pulse-tile tnum">
        <Goal size={13} />
        <b>
          <NumberFlow value={pulse.goals} />
        </b>
        <i>goals</i>
      </span>
      <span className="pulse-tile tnum">
        <Target size={13} />
        <b>
          <NumberFlow
            value={pulse.goals / pulse.played}
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
        </b>
        <i>per match</i>
      </span>
      <span className="pulse-tile tnum">
        <Flame size={13} />
        <b>
          <NumberFlow value={pulse.upsets} />
        </b>
        <i>upset{pulse.upsets === 1 ? '' : 's'}</i>
      </span>
      <span className="pulse-tile tnum">
        <Timer size={13} />
        <b>
          <NumberFlow value={pulse.aet} />
        </b>
        <i>to extra time</i>
      </span>
      <span className="pulse-tile tnum">
        <b>
          <NumberFlow value={pulse.pens} />
        </b>
        <i>shootout{pulse.pens === 1 ? '' : 's'}</i>
      </span>
      {pulse.vars > 0 && (
        <span className="pulse-tile tnum">
          <b>
            <NumberFlow value={pulse.vars} />
          </b>
          <i>VAR reversal{pulse.vars === 1 ? '' : 's'}</i>
        </span>
      )}
      {pulse.injuries > 0 && (
        <span className="pulse-tile tnum">
          <b>
            <NumberFlow value={pulse.injuries} />
          </b>
          <i>injur{pulse.injuries === 1 ? 'y' : 'ies'}</i>
        </span>
      )}
      {pulse.biggest && (
        <span className="pulse-tile record">
          <i>record win</i>
          <Flag id={pulse.biggest.home} size={15} />
          <b>{pulse.biggest.label}</b>
          <Flag id={pulse.biggest.away} size={15} />
        </span>
      )}
    </div>
  )
}
