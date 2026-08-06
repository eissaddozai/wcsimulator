import confetti from 'canvas-confetti'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FastForward, Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '../../components/Flag'
import { NATION_BY_ID } from '../../data/nations'
import { POT_TO_POSITION, groupIdsFor } from '../../engine/schedule'
import { useStore } from '../../store/store'
import type { DrawPick, GroupId, Position, PotNumber } from '../../engine/types'

type Phase = 'ball' | 'flag' | 'hold'

export function DrawScreen() {
  const drawTrace = useStore((s) => s.drawTrace)
  const drawRunId = useStore((s) => s.drawRunId)
  const runDrawAction = useStore((s) => s.runDrawAction)
  const setStep = useStore((s) => s.setStep)
  const format = useStore((s) => s.format)
  const groupIds = groupIdsFor(format)
  const potSize = format / 4
  const reduced = useReducedMotion()

  const swapGroupSlots = useStore((s) => s.swapGroupSlots)
  const [dragSlot, setDragSlot] = useState<{ group: GroupId; position: Position } | null>(null)
  const [coachSeen, setCoachSeen] = useState(() => localStorage.getItem('wcsim:coach:swap') === '1')
  const [revealed, setRevealed] = useState(0)
  const [phase, setPhase] = useState<Phase | null>(null)
  const [auto, setAuto] = useState(false)
  const [speed, setSpeed] = useState<1 | 2>(1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // restart the reveal whenever a new draw is generated
  const celebrated = useRef(false)
  useEffect(() => {
    setRevealed(0)
    setPhase(null)
    setAuto(false)
    celebrated.current = false
  }, [drawRunId])

  const trace = drawTrace ?? []
  const total = trace.length
  const current: DrawPick | null = phase !== null && revealed < total ? trace[revealed]! : null
  const done = total > 0 && revealed >= total

  // one restrained gold burst the moment the twelfth group completes
  useEffect(() => {
    if (!done || celebrated.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    celebrated.current = true
    confetti({
      particleCount: 90,
      spread: 100,
      startVelocity: 38,
      origin: { x: 0.26, y: 0.45 },
      colors: ['#e5c87f', '#d2b064', '#f2efe6'],
      scalar: 0.95,
    })
  }, [done])

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const commit = useCallback(() => {
    clearTimer()
    setPhase(null)
    setRevealed((r) => r + 1)
  }, [])

  const advance = useCallback(() => {
    if (revealed >= total || phase !== null) return
    if (reduced) {
      setRevealed((r) => r + 1)
      return
    }
    const t = (ms: number) => ms / speed
    setPhase('ball')
    timer.current = setTimeout(() => {
      setPhase('flag')
      timer.current = setTimeout(() => {
        setPhase('hold')
        timer.current = setTimeout(commit, t(750))
      }, t(450))
    }, t(400))
  }, [revealed, total, phase, speed, reduced, commit])

  // autoplay chain
  useEffect(() => {
    if (!auto || done || phase !== null) return
    const id = setTimeout(advance, 250 / speed)
    return () => clearTimeout(id)
  }, [auto, done, phase, advance, speed])

  useEffect(() => () => clearTimer(), [])

  const skipAll = () => {
    clearTimer()
    setPhase(null)
    setAuto(false)
    setRevealed(total)
  }

  const boardGroups = useMemo(() => {
    const g = {} as Record<GroupId, (DrawPick | null)[]>
    for (const id of groupIds) g[id] = [null, null, null, null]
    trace.slice(0, revealed).forEach((p) => {
      g[p.group][p.position - 1] = p
    })
    return g
  }, [trace, revealed, groupIds])

  if (!drawTrace) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 96 }}>
        <div className="kicker serif-accent">One ceremony. Every constraint honored.</div>
        <h2 className="display" style={{ fontSize: 44, margin: '0 0 8px' }}>
          The Final Draw
        </h2>
        <p className="muted" style={{ maxWidth: 520, margin: '0 auto 32px' }}>
          {format === 64 ? 'Sixteen' : 'Twelve'} groups, four pots, every FIFA constraint — confederation caps, the
          UEFA one-to-two band, host anchors, and the top-four bracket split. The engine verifies every ball keeps
          the draw completable, so it can never dead-end.
        </p>
        <button className="btn primary" onClick={runDrawAction} style={{ fontSize: 16, height: 52, padding: '0 32px' }}>
          Conduct the draw
        </button>
      </div>
    )
  }

  const lastRevealed = revealed > 0 ? trace[revealed - 1] : null
  const potOfCurrent = current?.pot ?? lastRevealed?.pot ?? 1
  const potCount = trace.filter((p) => p.pot === potOfCurrent && p.order < (current?.order ?? revealed)).length + 1

  return (
    <div className="draw-stage">
      <div className="reveal-zone">
        {!done && (
          <>
            <div className="pot-label display tnum">
              Drawing Pot {potOfCurrent} — {Math.min(potCount, potSize)} of {potSize}
            </div>
            <div className="pot-dots" role="img" aria-label={`${Math.min(potCount, potSize)} of ${potSize} drawn from this pot`}>
              {(() => {
                const potBalls = trace.filter((p) => p.pot === potOfCurrent)
                return Array.from({ length: potSize }, (_, i) => {
                  const drawnPick = potBalls[i]
                  const isDrawn = i < Math.min(potCount, potSize)
                  return (
                    <i key={i} className={isDrawn ? 'on' : ''} title={isDrawn && drawnPick ? NATION_BY_ID.get(drawnPick.teamId)?.name : undefined}>
                      {isDrawn && drawnPick && drawnPick.order < revealed && <Flag id={drawnPick.teamId} size={11} />}
                    </i>
                  )
                })
              })()}
            </div>
            <div className="reveal-stage">
              <div className="podium-rings" aria-hidden />
              <AnimatePresence mode="wait">
                {current ? (
                  <motion.div
                    key={current.order}
                    initial={{ y: 60, scale: 0.6, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
                  >
                  <div className={`reveal-ball${phase === 'ball' ? ' thinking' : ''}`}>
                    <motion.div
                      key={phase === 'ball' ? 'b' : 'f'}
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {phase === 'ball' ? (
                        <span className="display gold-text" style={{ fontSize: 32 }}>
                          ?
                        </span>
                      ) : (
                        <motion.div layoutId={`fly-${current.order}`} transition={{ layout: { duration: 0.55, ease: [0.2, 0, 0, 1] } }}>
                          <Flag id={current.teamId} size={92} />
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                  {phase === 'hold' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                    >
                      <div className="reveal-name display">{NATION_BY_ID.get(current.teamId)?.name}</div>
                      <div className="reveal-sub">
                        <span className="chip">{NATION_BY_ID.get(current.teamId)?.confed}</span>
                        <span className="chip gold">Group {current.group}</span>
                      </div>
                      {current.skipped.length > 0 && (
                        <div className="reveal-skips">
                          {current.skipped
                            .filter((s) => groupIds.indexOf(s.group) < groupIds.indexOf(current.group))
                            .slice(0, 2)
                            .map((s) => s.reason)
                            .join(' · ')}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="serif-accent reveal-idle">
                    {revealed === 0 ? 'The stage is set.' : `${total - revealed} balls remain.`}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', position: 'relative' }}
          >
            <div className="podium-rings still" aria-hidden />
            <div className="kicker serif-accent">
              {format === 64 ? 'Sixteen' : 'Twelve'} groups, every rule respected.
            </div>
            <h2 className="display" style={{ fontSize: 44, margin: '2px 0 8px' }}>
              The draw is made
            </h2>
            <p className="muted" style={{ maxWidth: 300, margin: '0 auto' }}>
              It's yours now — drag any two countries to swap their slots.
            </p>
            {!coachSeen && (
              <div className="coach-mark" role="status">
                <span className="cm-hand" aria-hidden>✥</span>
                Drag one country onto another to swap their groups
                <button
                  className="btn ghost small"
                  onClick={() => {
                    localStorage.setItem('wcsim:coach:swap', '1')
                    setCoachSeen(true)
                  }}
                >
                  Got it
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className={`board${format === 64 ? ' board-64' : ''}${phase === 'hold' ? ' spotlighting' : ''}`}>
        {groupIds.map((g) => {
          const skippedNow = phase === 'hold' && current?.skipped.some((s) => s.group === g)
          const receiving = phase === 'hold' && current?.group === g
          return (
            <div key={g} className={`card group-card${receiving ? ' receiving' : ''}${skippedNow ? ' skipflash' : ''}`}>
              <h4 className={`display${skippedNow ? ' flash' : ''}`}>
                <span className="gmedal tnum">{g}</span>
                Group {g}
              </h4>
              {([1, 2, 3, 4] as PotNumber[]).map((pot) => {
                const pos = POT_TO_POSITION[pot]
                const pick = boardGroups[g][pos - 1]
                const potForPos = pot
                return pick ? (
                  <div
                    key={pos}
                    className={`slot landed${pick.order === revealed - 1 ? ' just' : ''}${done ? ' swappable' : ''}${dragSlot?.group === g && dragSlot.position === pos ? ' dragging' : ''}`}
                    draggable={done}
                    title={done ? 'Drag onto another country to swap groups' : undefined}
                    onDragStart={() => setDragSlot({ group: g, position: pos as Position })}
                    onDragEnd={() => setDragSlot(null)}
                    onDragOver={(e) => done && e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragSlot && !(dragSlot.group === g && dragSlot.position === pos)) {
                        swapGroupSlots(dragSlot, { group: g, position: pos as Position })
                      }
                      setDragSlot(null)
                    }}
                  >
                    {pick.order === revealed - 1 ? (
                      <motion.div
                        layoutId={`fly-${pick.order}`}
                        transition={{ layout: { duration: 0.55, ease: [0.2, 0, 0, 1] } }}
                        style={{ display: 'flex' }}
                      >
                        <Flag id={pick.teamId} size={22} />
                      </motion.div>
                    ) : (
                      <Flag id={pick.teamId} size={22} />
                    )}
                    {NATION_BY_ID.get(pick.teamId)?.name}
                  </div>
                ) : (
                  <div key={pos} className="slot empty">
                    <span className="ring tnum">{potForPos}</span>
                    Pot {potForPos}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="draw-controls">
        {!done ? (
          <>
            <span className="low tnum" style={{ fontSize: 12, alignSelf: 'center', letterSpacing: '0.08em' }}>
              BALL {Math.min(revealed + 1, total)} OF {total}
            </span>
            <button className="btn primary" onClick={advance} disabled={phase !== null}>
              Draw next
            </button>
            <button
              className="btn"
              onClick={() => setAuto((a) => !a)}
              aria-label={auto ? 'Pause autoplay' : 'Autoplay'}
            >
              {auto ? <Pause size={16} /> : <Play size={16} />} {auto ? 'Pause' : 'Auto'}
            </button>
            <button className="btn" onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}>
              {speed}×
            </button>
            <button className="btn ghost" onClick={skipAll}>
              <FastForward size={16} /> Skip to result
            </button>
          </>
        ) : (
          <>
            <button className="btn primary" onClick={() => setStep('groups')}>
              Continue to the Group Stage
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                runDrawAction()
              }}
            >
              <RotateCcw size={16} /> Redraw
            </button>
          </>
        )}
      </div>
    </div>
  )
}
