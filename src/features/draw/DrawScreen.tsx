import confetti from 'canvas-confetti'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FastForward, Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '../../components/Flag'
import { NATION_BY_ID } from '../../data/nations'
import { GROUP_IDS, POT_TO_POSITION } from '../../engine/schedule'
import { useStore } from '../../store/store'
import type { DrawPick, GroupId, Position, PotNumber } from '../../engine/types'

type Phase = 'ball' | 'flag' | 'hold'

export function DrawScreen() {
  const drawTrace = useStore((s) => s.drawTrace)
  const drawRunId = useStore((s) => s.drawRunId)
  const runDrawAction = useStore((s) => s.runDrawAction)
  const setStep = useStore((s) => s.setStep)
  const reduced = useReducedMotion()

  const swapGroupSlots = useStore((s) => s.swapGroupSlots)
  const [dragSlot, setDragSlot] = useState<{ group: GroupId; position: Position } | null>(null)
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
    for (const id of GROUP_IDS) g[id] = [null, null, null, null]
    trace.slice(0, revealed).forEach((p) => {
      g[p.group][p.position - 1] = p
    })
    return g
  }, [trace, revealed])

  if (!drawTrace) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 96 }}>
        <h2 className="display" style={{ fontSize: 44, margin: '0 0 8px' }}>
          The Final Draw
        </h2>
        <p className="muted" style={{ maxWidth: 520, margin: '0 auto 32px' }}>
          Twelve groups, four pots, every FIFA constraint — confederation caps, the UEFA one-to-two band, host
          anchors, and the top-four bracket split. The engine verifies every ball keeps the draw completable, so it
          can never dead-end.
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
              Drawing Pot {potOfCurrent} — {Math.min(potCount, 12)} of 12
            </div>
            <div className="pot-dots" role="img" aria-label={`${Math.min(potCount, 12)} of 12 drawn from this pot`}>
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} className={i < Math.min(potCount, 12) ? 'on' : ''} />
              ))}
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
                        <Flag id={current.teamId} size={92} />
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
                            .filter((s) => GROUP_IDS.indexOf(s.group) < GROUP_IDS.indexOf(current.group))
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
            <div className="kicker serif-accent">Twelve groups, every rule respected.</div>
            <h2 className="display" style={{ fontSize: 44, margin: '2px 0 8px' }}>
              The draw is made
            </h2>
            <p className="muted" style={{ maxWidth: 300, margin: '0 auto' }}>
              It's yours now — drag any two countries to swap their slots.
            </p>
          </motion.div>
        )}
      </div>

      <div className="board">
        {GROUP_IDS.map((g) => {
          const skippedNow = phase === 'hold' && current?.skipped.some((s) => s.group === g)
          const receiving = phase === 'hold' && current?.group === g
          return (
            <div key={g} className={`card group-card${receiving ? ' receiving' : ''}`}>
              <h4 className={`display${skippedNow ? ' flash' : ''}`}>
                <span className="gmedal tnum">{g}</span>
                Group {g}
              </h4>
              {[1, 2, 3, 4].map((pos) => {
                const pick = boardGroups[g][pos - 1]
                const potForPos = ([1, 3, 2, 4] as PotNumber[]).find((p) => POT_TO_POSITION[p] === pos)!
                return pick ? (
                  <div
                    key={pos}
                    className={`slot landed${done ? ' swappable' : ''}${dragSlot?.group === g && dragSlot.position === pos ? ' dragging' : ''}`}
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
                    <Flag id={pick.teamId} size={22} />
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
