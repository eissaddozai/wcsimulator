import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import dseg7Url from 'dseg/fonts/DSEG7-Classic/DSEG7Classic-BoldItalic.woff2'
import { shortName } from '../data/nations'
import { isScored, type MatchResult } from '../engine/types'

/* The seven-segment scoreboard face (keshikan/DSEG, OFL) — loaded once, lazily. */
let boardFontRequested = false
function ensureBoardFont() {
  if (boardFontRequested || typeof FontFace === 'undefined') return
  boardFontRequested = true
  const face = new FontFace('DSEG7', `url(${dseg7Url})`)
  face
    .load()
    .then(() => document.fonts.add(face))
    .catch(() => {})
}

/**
 * The Match Theater: replays the minute engine's story in ~7 seconds — the clock runs,
 * the scoreboard catches goals as they land, cards flash, the rail fills with markers.
 */
export function MatchTheater({ r, home, away, autoplay = false }: { r: MatchResult; home: string; away: string; autoplay?: boolean }) {
  const total = r.et ? 120 : 90
  const [minute, setMinute] = useState(0)
  const [playing, setPlaying] = useState(false)
  const raf = useRef<number | null>(null)
  const last = useRef<number>(0)

  const events = useMemo(() => (r.events ?? []).slice().sort((a, b) => a.min - b.min), [r.events])

  useEffect(() => {
    ensureBoardFont()
    if (autoplay && !matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!playing) return
    const tick = (t: number) => {
      if (last.current === 0) last.current = t
      const dt = t - last.current
      last.current = t
      setMinute((m) => {
        const next = m + dt * 0.017 // ≈ 17 sim-minutes per second
        if (next >= total) {
          setPlaying(false)
          return total
        }
        return next
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      last.current = 0
    }
  }, [playing, total])

  if (!r.events || !isScored(r)) return null

  const shown = events.filter((e) => e.min <= minute)
  const hGoals = shown.filter((e) => e.type === 'goal' && e.side === 'home').length
  const aGoals = shown.filter((e) => e.type === 'goal' && e.side === 'away').length
  const finished = minute >= total
  const inET = minute > 90

  const start = () => {
    if (finished) setMinute(0)
    last.current = 0
    setPlaying(true)
  }

  return (
    <div className="theater">
      <div className="theater-board">
        <span className="th-team display">{shortName(home)}</span>
        <span className="th-score led tnum">
          {hGoals}
          <i className="th-sep">–</i>
          {aGoals}
        </span>
        <span className="th-team display" style={{ textAlign: 'right' }}>
          {shortName(away)}
        </span>
      </div>
      <div className="theater-clock tnum">
        {finished ? (
          r.pens ? (
            'FT · to penalties'
          ) : (
            'FULL TIME'
          )
        ) : (
          <>
            <span className="led clock-num">{String(Math.floor(minute)).padStart(2, '0')}</span>′
          </>
        )}
        {inET && !finished && <span className="low"> · ET</span>}
      </div>
      <div className="theater-rail" role="img" aria-label="Match timeline">
        <i className="th-progress" style={{ width: `${(minute / total) * 100}%` }} />
        {total === 120 && <i className="th-etmark" style={{ left: `${(90 / total) * 100}%` }} />}
        {events.map((e, i) => (
          <span
            key={i}
            className={`th-marker ${e.type}${e.side === 'away' ? ' away' : ''}${e.min <= minute ? ' lit' : ''}`}
            style={{ left: `${(e.min / total) * 100}%` }}
            title={`${e.min}′ ${e.type} — ${e.side === 'home' ? shortName(home) : shortName(away)}`}
          />
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        {playing ? (
          <button className="btn small" onClick={() => setPlaying(false)}>
            <Pause size={13} /> Pause
          </button>
        ) : (
          <button className="btn small gold-line" onClick={start}>
            {finished ? <RotateCcw size={13} /> : <Play size={13} />} {finished ? 'Replay' : minute > 0 ? 'Resume' : 'Watch replay'}
          </button>
        )}
      </div>
    </div>
  )
}
