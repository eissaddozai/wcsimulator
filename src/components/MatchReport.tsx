import { X } from 'lucide-react'
import { useMemo } from 'react'
import { Flag } from './Flag'
import { NATION_BY_ID } from '../data/nations'
import { matchEnvironment } from '../engine/environment'
import { buildReport } from '../engine/report'
import { useStore } from '../store/store'
import type { MatchResult } from '../engine/types'

/**
 * The Match Report: how the game panned out, told as a broadsheet piece —
 * headline, standfirst, the swing of the tie, chaptered minutes, and a verdict.
 */
export function MatchReport({
  r,
  home,
  away,
  matchNo,
  stageLabel,
  onClose,
}: {
  r: MatchResult
  home: string
  away: string
  matchNo: number
  stageLabel: string
  onClose: () => void
}) {
  const masterSeed = useStore((s) => s.masterSeed)
  const env = useMemo(() => matchEnvironment(masterSeed, matchNo), [masterSeed, matchNo])
  const report = useMemo(
    () => buildReport(r, home, away, env, stageLabel, matchNo),
    [r, home, away, env, stageLabel, matchNo],
  )
  if (!report) return null

  const hFT = (r.score.home ?? 0) + (r.et?.home ?? 0)
  const aFT = (r.score.away ?? 0) + (r.et?.away ?? 0)

  // the swing of the tie: score margin over the minutes
  const total = r.et ? 120 : 90
  const goals = (r.events ?? []).filter((e) => e.type === 'goal').sort((a, b) => a.min - b.min)
  const pts: [number, number][] = [[0, 0]]
  let diff = 0
  for (const g of goals) {
    pts.push([g.min, diff])
    diff += g.side === 'home' ? 1 : -1
    pts.push([g.min, diff])
  }
  pts.push([total, diff])
  const maxAbs = Math.max(1, ...pts.map(([, d]) => Math.abs(d)))
  const W = 560
  const H = 72
  const xOf = (min: number) => (min / total) * W
  const yOf = (d: number) => H / 2 - (d / maxAbs) * (H / 2 - 6)
  const path = pts.map(([m, d], i) => `${i === 0 ? 'M' : 'L'} ${xOf(m).toFixed(1)} ${yOf(d).toFixed(1)}`).join(' ')

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal
      aria-label="Match report"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog report-dialog">
        <button className="btn icon ghost host-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="report-scroll">
          <div className="report-hero">
            <div className="kicker serif-accent">Match report</div>
            <h3 className="display report-headline">{report.headline}</h3>
            <div className="report-score row" style={{ justifyContent: 'center', gap: 14 }}>
              <span className="row" style={{ gap: 8 }}>
                <Flag id={home} size={26} />
                <b>{NATION_BY_ID.get(home)?.name}</b>
              </span>
              <span className="display tnum" style={{ fontSize: 28, color: 'var(--gold)' }}>
                {hFT}–{aFT}
              </span>
              <span className="row" style={{ gap: 8 }}>
                <b>{NATION_BY_ID.get(away)?.name}</b>
                <Flag id={away} size={26} />
              </span>
            </div>
            <p className="report-standfirst serif-accent">{report.standfirst}</p>
          </div>

          <div className="report-worm" role="img" aria-label="The swing of the tie">
            <div className="rw-label">
              <span>{NATION_BY_ID.get(home)?.name} ahead</span>
              <span className="rw-title">The swing of the tie</span>
              <span>{NATION_BY_ID.get(away)?.name} ahead</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <line x1={0} y1={H / 2} x2={W} y2={H / 2} className="rw-axis" />
              {r.et && <line x1={xOf(90)} y1={0} x2={xOf(90)} y2={H} className="rw-axis" strokeDasharray="3 3" />}
              <path d={path} className="rw-line" />
              {goals.map((g, i) => {
                const d = goals.slice(0, i + 1).reduce((acc, x) => acc + (x.side === 'home' ? 1 : -1), 0)
                return <circle key={i} cx={xOf(g.min)} cy={yOf(d)} r={3.2} className="rw-dot" />
              })}
            </svg>
          </div>

          {report.chapters.map((ch) => (
            <div key={ch.title} className="report-chapter">
              <div className="rc-title">{ch.title}</div>
              <p className="rc-prose">{ch.prose}</p>
              {ch.lines.length > 0 && (
                <div className="rc-ledger">
                  {ch.lines.map((l, i) => (
                    <div key={i} className={`rc-line ${l.kind}${l.side === 'away' ? ' away' : ''}`}>
                      <span className="rc-min tnum">{l.min}′</span>
                      <i className={`rc-ico ${l.kind}`} />
                      <span className="rc-text">{l.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {report.keyMoment && (
            <div className="report-key">
              <span className="rk-label">The moment</span>
              <p className="serif-accent">{report.keyMoment}</p>
            </div>
          )}

          {r.stats && (
            <div className="stat-duel tnum" style={{ border: 'none', paddingBottom: 0 }}>
              <span>
                xG <b>{r.stats.xgHome.toFixed(1)}</b>–<b>{r.stats.xgAway.toFixed(1)}</b>
              </span>
              <span>
                shots <b>{r.stats.shotsHome}</b>–<b>{r.stats.shotsAway}</b>
              </span>
              <span>
                poss <b>{Math.round(r.stats.possHome * 100)}%</b>–<b>{Math.round((1 - r.stats.possHome) * 100)}%</b>
              </span>
            </div>
          )}

          <p className="report-verdict serif-accent">{report.verdict}</p>
        </div>
      </div>
    </div>
  )
}
