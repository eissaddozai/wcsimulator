import NumberFlow from '@number-flow/react'
import { useMemo } from 'react'
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
    let biggest: { margin: number; label: string } | null = null

    const consume = (home: string, away: string, r: MatchResult) => {
      if (!isScored(r)) return
      played++
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
        biggest = { margin, label: `${shortName(home)} ${h}–${a} ${shortName(away)}` }
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
    return { played, goals, draws, aet, pens, upsets, biggest: biggest as { margin: number; label: string } | null }
  }, [groups, bracket, results, format])

  if (pulse.played === 0) return null

  return (
    <div className="pulse-strip" role="group" aria-label="Tournament pulse">
      <span className="pulse-item tnum">
        <b>
          <NumberFlow value={pulse.goals} />
        </b>{' '}
        goals
      </span>
      <span className="pulse-item tnum">
        <b>
          <NumberFlow
            value={pulse.goals / pulse.played}
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
        </b>{' '}
        per match
      </span>
      <span className="pulse-item tnum">
        <b>
          <NumberFlow value={pulse.upsets} />
        </b>{' '}
        upset{pulse.upsets === 1 ? '' : 's'}
      </span>
      <span className="pulse-item tnum">
        <b>
          <NumberFlow value={pulse.aet} />
        </b>{' '}
        to extra time
      </span>
      <span className="pulse-item tnum">
        <b>
          <NumberFlow value={pulse.pens} />
        </b>{' '}
        shootout{pulse.pens === 1 ? '' : 's'}
      </span>
      {pulse.biggest && (
        <span className="pulse-item">
          record win <b>{pulse.biggest.label}</b>
        </span>
      )}
    </div>
  )
}
