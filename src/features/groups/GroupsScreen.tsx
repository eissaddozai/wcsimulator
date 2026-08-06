import NumberFlow from '@number-flow/react'
import { motion } from 'framer-motion'
import { Dices, Info, ListOrdered, Move, NotebookText, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Flag } from '../../components/Flag'
import { MatchReport } from '../../components/MatchReport'
import { ScoreInput } from '../../components/ScoreInput'
import { TeamStudio } from '../../components/TeamStudio'
import { shortName } from '../../data/nations'
import { staleAfter } from '../../engine/bracket'
import { fixturesOfGroupFor, groupIdsFor, groupMatchCountFor } from '../../engine/schedule'
import { allGroupsComplete, allStandings, contentionFor, liveThirds } from '../../engine/tournament'
import { groupsOf, useStore } from '../../store/store'
import { isScored, type Format, type GroupId, type MatchResult, type Position, type TieBreakRung } from '../../engine/types'

export interface SlotRef {
  group: GroupId
  position: Position
}

const RUNG_COPY: Record<TieBreakRung, string> = {
  points: 'points',
  h2h: 'head-to-head among the tied teams',
  gd: 'overall goal difference',
  gf: 'goals scored',
  rank: 'FIFA ranking',
  lots: 'drawing of lots',
}

export function GroupsScreen() {
  const drawTrace = useStore((s) => s.drawTrace)
  const results = useStore((s) => s.results)
  const setResult = useStore((s) => s.setResult)
  const simulateGroupMatch = useStore((s) => s.simulateGroupMatch)
  const simulateGroup = useStore((s) => s.simulateGroup)
  const masterSeed = useStore((s) => s.masterSeed)
  const setStep = useStore((s) => s.setStep)
  const format = useStore((s) => s.format)
  const groupIds = groupIdsFor(format)
  const groupMatchCount = groupMatchCountFor(format)

  const [md, setMd] = useState<0 | 1 | 2 | 3>(1) // 0 = all
  const [thirdsOpen, setThirdsOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [editGroups, setEditGroups] = useState(false)
  const [dragSlot, setDragSlot] = useState<SlotRef | null>(null)
  const [pendingEdit, setPendingEdit] = useState<{ n: number; r: MatchResult | null; casualties: number[] } | null>(null)
  const [reportFor, setReportFor] = useState<{ n: number; home: string; away: string; label: string } | null>(null)
  const swapGroupSlots = useStore((s) => s.swapGroupSlots)

  const groups = useMemo(() => groupsOf(drawTrace, format), [drawTrace, format])
  const standings = useMemo(
    () => (groups ? allStandings(groups, results, masterSeed, format) : null),
    [groups, results, masterSeed, format],
  )
  const thirds = useMemo(
    () => (format === 48 && groups && standings ? liveThirds(groups, standings, results, masterSeed) : []),
    [groups, standings, results, masterSeed, format],
  )
  const contention = useMemo(() => (groups ? contentionFor(groups, results, format) : null), [groups, results, format])
  const complete = allGroupsComplete(results, format)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 't' && !(e.target instanceof HTMLInputElement)) setThirdsOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!groups || !standings) {
    return (
      <div className="page empty-stage" style={{ textAlign: 'center', paddingTop: 96 }}>
        <svg className="empty-art" viewBox="0 0 120 48" aria-hidden>
          <circle cx="24" cy="30" r="13" />
          <circle cx="60" cy="24" r="16" />
          <circle cx="96" cy="32" r="11" />
          <path d="M53 20 a9 9 0 0 1 9 -5" />
        </svg>
        <p className="serif-accent" style={{ fontSize: 19, color: 'var(--text-mid)', margin: 0 }}>
          No draw yet — the balls wait in their pots.
        </p>
      </div>
    )
  }

  /** commit a group score, but preview knockout casualties first */
  const commitScore = (n: number, r: MatchResult | null) => {
    const hasKoResults = Object.keys(results).some((k) => Number(k) > groupMatchCount)
    if (hasKoResults) {
      const next = { ...results }
      if (r === null) delete next[n]
      else next[n] = r
      const nextDone = allGroupsComplete(next, format)
      const casualties = staleAfter(
        nextDone ? allStandings(groups, next, masterSeed, format) : null,
        nextDone && format === 48
          ? liveThirds(groups, allStandings(groups, next, masterSeed), next, masterSeed)
          : null,
        next,
        format,
      ).filter((m) => !staleNow.includes(m))
      if (casualties.length > 0) {
        setPendingEdit({ n, r, casualties })
        return
      }
    }
    setResult(n, r)
  }

  const staleNow = useMemo(
    () =>
      staleAfter(
        complete ? standings : null,
        complete && format === 48 ? thirds : null,
        results,
        format,
      ),
    [complete, standings, thirds, results, format],
  )

  const doneCount = groupIds.reduce(
    (acc, g) =>
      acc + fixturesOfGroupFor(g, format).filter((f) => results[f.number] && isScored(results[f.number]!)).length,
    0,
  )

  return (
    <div className="page">
      <div className="groups-toolbar">
        <div>
          <div className="kicker serif-accent">
            {format === 64 ? 'Ninety-six matches shape the thirty-two.' : 'Seventy-two matches shape the thirty-two.'}
          </div>
          <h2 className="display" style={{ fontSize: 34, margin: 0 }}>
            Group Stage
          </h2>
        </div>
        <div className="seg" role="tablist" aria-label="Matchday">
          {[1, 2, 3, 0].map((m) => {
            const mdFixtures = groupIds.flatMap((g) => fixturesOfGroupFor(g, format)).filter(
              (f) => m === 0 || f.matchday === m,
            )
            const mdDone = mdFixtures.filter((f) => results[f.number] && isScored(results[f.number]!)).length
            const live = m !== 0 && mdDone > 0 && mdDone < mdFixtures.length
            return (
              <button key={m} className={md === m ? 'on' : ''} onClick={() => setMd(m as 0 | 1 | 2 | 3)}>
                {live && <i className="md-live" role="img" aria-label="Matchday in play" />}
                {m === 0 ? 'All' : `MD${m}`}
                <span className="md-count tnum">{mdDone}/{mdFixtures.length}</span>
                <i
                  className="md-fill"
                  style={{ transform: `scaleX(${mdFixtures.length ? mdDone / mdFixtures.length : 0})` }}
                  aria-hidden
                />
              </button>
            )
          })}
        </div>
        <span className="low tnum" style={{ fontSize: 13 }}>
          <NumberFlow value={doneCount} /> / {groupMatchCount} scored
        </span>
        <div style={{ flex: 1 }} />
        {format === 48 && (
          <button className="btn small" onClick={() => setThirdsOpen(true)}>
            <ListOrdered size={14} /> 3rd place race
          </button>
        )}
        <button className="btn small" onClick={() => setStudioOpen(true)}>
          <SlidersHorizontal size={14} /> Team studio
        </button>
        <button
          className={`btn small${editGroups ? ' gold-line' : ''}`}
          onClick={() => setEditGroups((e) => !e)}
          aria-pressed={editGroups}
          title="Move countries between groups by dragging"
        >
          <Move size={14} /> {editGroups ? 'Done moving' : 'Edit groups'}
        </button>
        <button
          className="btn small gold-line"
          onClick={() => {
            // groups fall one by one — the tables glide as each lands
            groupIds.forEach((g, i) => setTimeout(() => simulateGroup(g), i * 140))
          }}
        >
          <Dices size={14} /> Simulate remaining
        </button>
        <button
          className="btn small danger ghost"
          onClick={() => {
            if (confirm(`Clear all ${groupMatchCount} group scores (knockout results will be set aside)?`)) {
              for (const g of groupIds) for (const f of fixturesOfGroupFor(g, format)) setResult(f.number, null)
            }
          }}
        >
          <Trash2 size={14} /> Clear
        </button>
      </div>

      {editGroups && (
        <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>
          Drag any country onto another to swap their group slots. Scores in the affected groups are cleared — FIFA
          draw constraints are yours to break here.
        </p>
      )}
      <div className={`groups-grid${editGroups ? ' editing' : ''}`}>
        {groupIds.map((g) => (
          <GroupCard
            key={g}
            g={g}
            format={format}
            slots={groups[g]}
            md={md}
            results={results}
            standings={standings[g]!}
            thirds={thirds}
            contention={contention?.[g] ?? null}
            onScore={commitScore}
            onDice={simulateGroupMatch}
            onReport={(n, home, away, label) => setReportFor({ n, home, away, label })}
            editMode={editGroups}
            dragSlot={dragSlot}
            setDragSlot={setDragSlot}
            onSwap={(a, b) => {
              const affected = [a.group, b.group].some((gg) =>
                fixturesOfGroupFor(gg, format).some((f) => results[f.number] !== undefined),
              )
              if (affected && !confirm('Swapping clears the entered scores of both groups. Continue?')) return
              swapGroupSlots(a, b)
            }}
          />
        ))}
      </div>

      <div className="footerbar">
        {!complete && (
          <span className="why">Enter or simulate all {groupMatchCount} matches to seed the Round of 32.</span>
        )}
        <button className="btn primary" disabled={!complete} onClick={() => setStep('knockout')}>
          Seed the Round of 32
        </button>
      </div>

      {thirdsOpen && format === 48 && <ThirdsPanel thirds={thirds} onClose={() => setThirdsOpen(false)} />}
      {studioOpen && <TeamStudio onClose={() => setStudioOpen(false)} />}
      {reportFor && results[reportFor.n] && (
        <MatchReport
          r={results[reportFor.n]!}
          home={reportFor.home}
          away={reportFor.away}
          matchNo={reportFor.n}
          stageLabel={reportFor.label}
          onClose={() => setReportFor(null)}
        />
      )}

      {pendingEdit && (
        <div className="overlay" role="dialog" aria-modal>
          <div className="dialog">
            <h3 className="display" style={{ margin: '0 0 8px', fontSize: 22 }}>
              This changes what comes after
            </h3>
            <p className="muted">
              Editing this score re-seeds the knockout pairings. {pendingEdit.casualties.length} knockout result
              {pendingEdit.casualties.length === 1 ? '' : 's'} ({pendingEdit.casualties.map((m) => `M${m}`).join(', ')})
              will be set aside — restorable if the pairings return.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn ghost" onClick={() => setPendingEdit(null)}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  setResult(pendingEdit.n, pendingEdit.r)
                  setPendingEdit(null)
                }}
              >
                Edit and set aside
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupCard(props: {
  g: GroupId
  format: Format
  slots: (string | null)[]
  md: 0 | 1 | 2 | 3
  results: Record<number, MatchResult>
  standings: ReturnType<typeof allStandings>[GroupId]
  thirds: ReturnType<typeof liveThirds>
  contention: Map<string, { outOfTop2: boolean; outOfTop3: boolean; securedTop2: boolean }> | null
  onScore: (n: number, r: MatchResult | null) => void
  onDice: (n: number) => void
  onReport: (n: number, home: string, away: string, label: string) => void
  editMode: boolean
  dragSlot: SlotRef | null
  setDragSlot: (s: SlotRef | null) => void
  onSwap: (a: SlotRef, b: SlotRef) => void
}) {
  const { g, format, slots, md, results, standings, thirds, contention, onScore, onDice, onReport, editMode, dragSlot, setDragSlot, onSwap } = props
  const hasThirdsRace = format === 48
  const fixtures = fixturesOfGroupFor(g, format).filter((f) => md === 0 || f.matchday === md)
  const sealed = standings.length === 4 && standings.every((r) => r.played === 3)

  // 69 · the form guide: W/D/L per team in matchday order
  const formGuide = (id: string): ('W' | 'D' | 'L')[] => {
    const out: ('W' | 'D' | 'L')[] = []
    for (const f of fixturesOfGroupFor(g, format)) {
      const home = slots[f.homePos - 1]
      const away = slots[f.awayPos - 1]
      if (home !== id && away !== id) continue
      const r = results[f.number]
      if (!r || !isScored(r)) continue
      const mine = home === id ? r.score.home! : r.score.away!
      const theirs = home === id ? r.score.away! : r.score.home!
      out.push(mine > theirs ? 'W' : mine === theirs ? 'D' : 'L')
    }
    return out
  }

  return (
    <div className={`card ghub-card${sealed ? ' sealed' : ''}`}>
      <h4 className="display">
        <span className="gmedal tnum">{g}</span>
        Group {g}
        {sealed && (
          <span className="sealed-flags" role="img" aria-label="Qualified: top two">
            <Flag id={standings[0]!.id} size={15} />
            <Flag id={standings[1]!.id} size={15} />
          </span>
        )}
        <span
          className="gprog"
          title="Fixtures entered"
          role="img"
          aria-label={`${fixturesOfGroupFor(g, format).filter((f) => results[f.number] && isScored(results[f.number]!)).length} of 6 entered`}
        >
          <b
            style={{
              transform: `scaleX(${fixturesOfGroupFor(g, format).filter((f) => results[f.number] && isScored(results[f.number]!)).length / 6})`,
            }}
          />
        </span>
      </h4>
      <table className="standings">
        <thead>
          <tr>
            <th className="team">Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Goals scored">GF</th>
            <th title="Goals conceded">GA</th>
            <th title="Goal difference">GD</th>
            <th title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const groupDone = standings.every((r) => r.played === 3)
            const c = contention?.get(row.id)
            const third = hasThirdsRace ? thirds.find((t) => t.id === row.id) : undefined
            const raceLive = hasThirdsRace && (thirds.length === 0 || thirds.some((x) => x.provisional))
            const posClass =
              row.position <= 2
                ? 'pos-adv'
                : hasThirdsRace && row.position === 3 && (groupDone ? raceLive || third?.qualified : !c?.outOfTop3)
                  ? 'pos-third'
                  : 'pos-out'
            // finished groups: positions (+ the thirds race, 48 only) decide; live groups: points-only proofs
            const badge = groupDone ? (
              row.position <= 2 ? (
                <span className="badge q">Q</span>
              ) : hasThirdsRace && row.position === 3 ? (
                raceLive || !third ? (
                  <span className="badge t3">3rd?</span>
                ) : third.qualified ? (
                  <span className="badge q">Q</span>
                ) : (
                  <span className="badge out" title="Eliminated">E</span>
                )
              ) : (
                <span className="badge out" title="Eliminated">E</span>
              )
            ) : c?.securedTop2 ? (
              <span className="badge q">Q</span>
            ) : (hasThirdsRace ? c?.outOfTop3 : c?.outOfTop2) ? (
              <span className="badge out" title="Eliminated">E</span>
            ) : hasThirdsRace && row.position === 3 ? (
              <span className="badge t3">3rd?</span>
            ) : null
            const slotPos = (slots.indexOf(row.id) + 1) as Position
            const isDragging = dragSlot?.group === g && dragSlot.position === slotPos
            const cells = (
              <>
                <td className="team">
                  <span className="cell">
                    <span className="posn tnum">{row.position}</span>
                    <Flag id={row.id} size={22} />
                    <span className="nm">{shortName(row.id)}</span>
                    {row.played > 0 && (
                      <span className="form-dots" role="img" aria-label={`Form: ${formGuide(row.id).join(' ')}`}>
                        {formGuide(row.id).map((x, i) => (
                          <i key={i} className={`fd-${x.toLowerCase()}`} />
                        ))}
                      </span>
                    )}
                    {badge}
                    {row.played > 0 && row.decidedBy && row.decidedBy !== 'points' && (
                      <span className={`tiebreak-note tb-${row.decidedBy}`} title={`Separated by ${RUNG_COPY[row.decidedBy]}`}>
                        <Info size={11} />
                      </span>
                    )}
                  </span>
                </td>
                <td className="tnum">{row.played}</td>
                <td className="tnum">{row.won}</td>
                <td className="tnum">{row.drawn}</td>
                <td className="tnum">{row.lost}</td>
                <td className="tnum">{row.gf}</td>
                <td className="tnum">{row.ga}</td>
                <td className={`tnum gdv${row.gd > 0 ? ' up' : row.gd < 0 ? ' down' : ''}`}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="tnum">
                  <span className="ptsv">
                    <NumberFlow value={row.points} />
                  </span>
                </td>
              </>
            )
            // In edit mode the row is a native drag source; in play the row glides to its
            // new position whenever a score reshuffles the table.
            return editMode ? (
              <tr
                key={row.id}
                className={`${posClass} draggable-row${isDragging ? ' dragging' : ''}`}
                draggable
                onDragStart={() => setDragSlot({ group: g, position: slotPos })}
                onDragEnd={() => setDragSlot(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragSlot && !(dragSlot.group === g && dragSlot.position === slotPos)) {
                    onSwap(dragSlot, { group: g, position: slotPos })
                  }
                  setDragSlot(null)
                }}
              >
                {cells}
              </tr>
            ) : (
              <motion.tr
                key={row.id}
                layout
                transition={{ layout: { duration: 0.5, ease: [0.2, 0, 0, 1] } }}
                className={posClass}
              >
                {cells}
              </motion.tr>
            )
          })}
        </tbody>
      </table>
      <div className="fixtures">
        {fixtures.map((f) => {
          const home = slots[f.homePos - 1]
          const away = slots[f.awayPos - 1]
          if (!home || !away) return null
          const r = results[f.number]
          return (
            <div key={f.number} className={`fixture${r?.simulated ? ' simmed' : ''}`}>
              <span className="mtag tnum ftag">Match {f.number}</span>
              {r?.tags?.[0] && (
                <span className={`tag-chip t-${r.tags[0]}`} role="img" aria-label={r.tags[0]}>
                  {r.tags[0].replace(/-/g, ' ')}
                </span>
              )}
              <span className="side">
                <Flag id={home} size={26} />
                <span className="fx-name">{shortName(home)}</span>
                <span className="fx-tri tnum">{home}</span>
              </span>
              <span className="mid">
                <ScoreInput
                  small
                  label={`${home} goals vs ${away}`}
                  value={r?.score.home ?? null}
                  onCommit={(v) => {
                    const away_ = r?.score.away ?? null
                    if (v === null && away_ === null) onScore(f.number, null)
                    else onScore(f.number, { score: { home: v, away: away_ } })
                  }}
                />
                <span className="low">–</span>
                <ScoreInput
                  small
                  label={`${away} goals vs ${home}`}
                  value={r?.score.away ?? null}
                  onCommit={(v) => {
                    const home_ = r?.score.home ?? null
                    if (v === null && home_ === null) onScore(f.number, null)
                    else onScore(f.number, { score: { home: home_, away: v } })
                  }}
                />
              </span>
              <span className="side away">
                <Flag id={away} size={26} />
                <span className="fx-name">{shortName(away)}</span>
                <span className="fx-tri tnum">{away}</span>
              </span>
              <span className="fx-actions">
                <button
                  className="dice-btn"
                  title={r?.simulated ? 'Simulated — press to re-roll' : 'Simulate this match'}
                  onClick={() => onDice(f.number)}
                  aria-label={`Simulate ${home} vs ${away}`}
                >
                  <Dices size={14} />
                </button>
                {r?.events && r.events.length > 0 && (
                  <button
                    className="dice-btn"
                    title="Full match report"
                    onClick={() => onReport(f.number, home, away, `Group ${g} · Matchday ${f.matchday}`)}
                    aria-label={`Match report: ${home} vs ${away}`}
                  >
                    <NotebookText size={13} />
                  </button>
                )}
                {r && (
                  <button
                    className="dice-btn"
                    title="Clear this score"
                    onClick={() => onScore(f.number, null)}
                    aria-label={`Clear ${home} vs ${away}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ThirdsPanel({ thirds, onClose }: { thirds: ReturnType<typeof liveThirds>; onClose: () => void }) {
  return (
    <>
      <div className="overlay" style={{ background: 'rgba(4,7,6,0.4)' }} onClick={onClose} />
      <aside className="slideover thirds-panel" aria-label="Third place race">
        <div style={{ padding: 24 }}>
          <div className="row spread">
            <h3 className="display" style={{ margin: 0, fontSize: 24 }}>
              3rd Place Race
            </h3>
            <button className="btn small ghost" onClick={onClose}>
              Close
            </button>
          </div>
          {thirds.length > 0 && (
            <div className="thirds-mosaic" aria-hidden>
              {thirds.slice(0, 8).map((t) => (
                <Flag key={t.id} id={t.id} size={20} />
              ))}
            </div>
          )}
          <p className="low" style={{ fontSize: 12 }}>
            The eight best third-placed teams cross into the Round of 32. Rows from unfinished groups are provisional.
          </p>
          {thirds.length === 0 && <p className="muted">Standings appear once every group has a third-placed team.</p>}
          {thirds.map((t, i) => (
            <motion.div key={t.id} layout transition={{ layout: { duration: 0.5, ease: [0.2, 0, 0, 1] } }}>
              <div className={`thirds-row${i > 7 ? ' below-line' : ''}${t.provisional ? ' provisional' : ''}`}>
                <span className="tnum low">{t.rank}</span>
                <span className="chip">{t.group}</span>
                <Flag id={t.id} size={24} />
                <span style={{ fontWeight: 500 }}>
                  {shortName(t.id)}
                  {t.provisional && <span className="low"> · in play</span>}
                </span>
                <span className="tnum low">{t.row.points}p</span>
                <span className="tnum low">{t.row.gd > 0 ? `+${t.row.gd}` : t.row.gd}</span>
                <span className="tnum low">{t.row.gf}</span>
                {t.qualified ? <span className="badge q">Q</span> : <span className="badge out" title="Eliminated">E</span>}
              </div>
              {i === 7 && <div className="thirds-line">Qualification line</div>}
            </motion.div>
          ))}
        </div>
      </aside>
    </>
  )
}
