import { Dices, Info, ListOrdered, Move, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Flag } from '../../components/Flag'
import { ScoreInput } from '../../components/ScoreInput'
import { TeamStudio } from '../../components/TeamStudio'
import { shortName } from '../../data/nations'
import { staleAfter } from '../../engine/bracket'
import { GROUP_IDS, fixturesOfGroup } from '../../engine/schedule'
import { allGroupsComplete, allStandings, contentionFor, liveThirds } from '../../engine/tournament'
import { groupsOf, useStore } from '../../store/store'
import { isScored, type GroupId, type MatchResult, type Position, type TieBreakRung } from '../../engine/types'

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
  const simulateRemainingGroups = useStore((s) => s.simulateRemainingGroups)
  const masterSeed = useStore((s) => s.masterSeed)
  const setStep = useStore((s) => s.setStep)

  const [md, setMd] = useState<0 | 1 | 2 | 3>(1) // 0 = all
  const [thirdsOpen, setThirdsOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [editGroups, setEditGroups] = useState(false)
  const [dragSlot, setDragSlot] = useState<SlotRef | null>(null)
  const [pendingEdit, setPendingEdit] = useState<{ n: number; r: MatchResult | null; casualties: number[] } | null>(null)
  const swapGroupSlots = useStore((s) => s.swapGroupSlots)

  const groups = useMemo(() => groupsOf(drawTrace), [drawTrace])
  const standings = useMemo(
    () => (groups ? allStandings(groups, results, masterSeed) : null),
    [groups, results, masterSeed],
  )
  const thirds = useMemo(
    () => (groups && standings ? liveThirds(groups, standings, results, masterSeed) : []),
    [groups, standings, results, masterSeed],
  )
  const contention = useMemo(() => (groups ? contentionFor(groups, results) : null), [groups, results])
  const complete = allGroupsComplete(results)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 't' && !(e.target instanceof HTMLInputElement)) setThirdsOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!groups || !standings) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 96 }}>
        <p className="muted">Run the draw first — the groups will appear here.</p>
      </div>
    )
  }

  /** commit a group score, but preview knockout casualties first */
  const commitScore = (n: number, r: MatchResult | null) => {
    const hasKoResults = Object.keys(results).some((k) => Number(k) > 72)
    if (hasKoResults) {
      const next = { ...results }
      if (r === null) delete next[n]
      else next[n] = r
      const casualties = staleAfter(
        allGroupsComplete(next) ? allStandings(groups, next, masterSeed) : null,
        allGroupsComplete(next) ? liveThirds(groups, allStandings(groups, next, masterSeed), next, masterSeed) : null,
        next,
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
        complete ? thirds : null,
        results,
      ),
    [complete, standings, thirds, results],
  )

  const doneCount = GROUP_IDS.reduce(
    (acc, g) => acc + fixturesOfGroup(g).filter((f) => results[f.number] && isScored(results[f.number]!)).length,
    0,
  )

  return (
    <div className="page">
      <div className="groups-toolbar">
        <h2 className="display" style={{ fontSize: 32, margin: 0 }}>
          Group Stage
        </h2>
        <div className="seg" role="tablist" aria-label="Matchday">
          {[1, 2, 3, 0].map((m) => (
            <button key={m} className={md === m ? 'on' : ''} onClick={() => setMd(m as 0 | 1 | 2 | 3)}>
              {m === 0 ? 'All' : `MD${m}`}
            </button>
          ))}
        </div>
        <span className="low tnum" style={{ fontSize: 13 }}>
          {doneCount} / 72 scored
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn small" onClick={() => setThirdsOpen(true)}>
          <ListOrdered size={14} /> 3rd place race
        </button>
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
        <button className="btn small gold-line" onClick={simulateRemainingGroups}>
          <Dices size={14} /> Simulate remaining
        </button>
        <button
          className="btn small danger ghost"
          onClick={() => {
            if (confirm('Clear all 72 group scores (knockout results will be set aside)?')) {
              for (const g of GROUP_IDS) for (const f of fixturesOfGroup(g)) setResult(f.number, null)
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
        {GROUP_IDS.map((g) => (
          <GroupCard
            key={g}
            g={g}
            slots={groups[g]}
            md={md}
            results={results}
            standings={standings[g]!}
            thirds={thirds}
            contention={contention?.[g] ?? null}
            onScore={commitScore}
            onDice={simulateGroupMatch}
            editMode={editGroups}
            dragSlot={dragSlot}
            setDragSlot={setDragSlot}
            onSwap={(a, b) => {
              const affected = [a.group, b.group].some((gg) =>
                fixturesOfGroup(gg).some((f) => results[f.number] !== undefined),
              )
              if (affected && !confirm('Swapping clears the entered scores of both groups. Continue?')) return
              swapGroupSlots(a, b)
            }}
          />
        ))}
      </div>

      <div className="footerbar">
        {!complete && <span className="why">Enter or simulate all 72 matches to seed the Round of 32.</span>}
        <button className="btn primary" disabled={!complete} onClick={() => setStep('knockout')}>
          Seed the Round of 32
        </button>
      </div>

      {thirdsOpen && <ThirdsPanel thirds={thirds} onClose={() => setThirdsOpen(false)} />}
      {studioOpen && <TeamStudio onClose={() => setStudioOpen(false)} />}

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
  slots: (string | null)[]
  md: 0 | 1 | 2 | 3
  results: Record<number, MatchResult>
  standings: ReturnType<typeof allStandings>[GroupId]
  thirds: ReturnType<typeof liveThirds>
  contention: Map<string, { outOfTop2: boolean; outOfTop3: boolean; securedTop2: boolean }> | null
  onScore: (n: number, r: MatchResult | null) => void
  onDice: (n: number) => void
  editMode: boolean
  dragSlot: SlotRef | null
  setDragSlot: (s: SlotRef | null) => void
  onSwap: (a: SlotRef, b: SlotRef) => void
}) {
  const { g, slots, md, results, standings, thirds, contention, onScore, onDice, editMode, dragSlot, setDragSlot, onSwap } = props
  const fixtures = fixturesOfGroup(g).filter((f) => md === 0 || f.matchday === md)

  return (
    <div className="card ghub-card">
      <h4 className="display">
        <span className="letter">Group {g}</span>
      </h4>
      <table className="standings">
        <thead>
          <tr>
            <th className="team">Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const groupDone = standings.every((r) => r.played === 3)
            const c = contention?.get(row.id)
            const third = thirds.find((t) => t.id === row.id)
            const raceLive = thirds.length === 0 || thirds.some((x) => x.provisional)
            const posClass =
              row.position <= 2
                ? 'pos-adv'
                : row.position === 3 && (groupDone ? raceLive || third?.qualified : !c?.outOfTop3)
                  ? 'pos-third'
                  : 'pos-out'
            // finished groups: positions + the thirds race decide; live groups: points-only proofs
            const badge = groupDone ? (
              row.position <= 2 ? (
                <span className="badge q">Q</span>
              ) : row.position === 3 ? (
                raceLive || !third ? (
                  <span className="badge t3">3rd?</span>
                ) : third.qualified ? (
                  <span className="badge q">Q</span>
                ) : (
                  <span className="badge out">OUT</span>
                )
              ) : (
                <span className="badge out">OUT</span>
              )
            ) : c?.securedTop2 ? (
              <span className="badge q">Q</span>
            ) : c?.outOfTop3 ? (
              <span className="badge out">OUT</span>
            ) : row.position === 3 ? (
              <span className="badge t3">3rd?</span>
            ) : null
            const slotPos = (slots.indexOf(row.id) + 1) as Position
            const isDragging = dragSlot?.group === g && dragSlot.position === slotPos
            return (
              <tr
                key={row.id}
                className={`${posClass}${editMode ? ' draggable-row' : ''}${isDragging ? ' dragging' : ''}`}
                draggable={editMode}
                onDragStart={() => setDragSlot({ group: g, position: slotPos })}
                onDragEnd={() => setDragSlot(null)}
                onDragOver={(e) => editMode && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragSlot && !(dragSlot.group === g && dragSlot.position === slotPos)) {
                    onSwap(dragSlot, { group: g, position: slotPos })
                  }
                  setDragSlot(null)
                }}
              >
                <td className="team">
                  <span className="cell">
                    <span className="posn tnum">{row.position}</span>
                    <Flag id={row.id} size={22} />
                    <span className="nm">{shortName(row.id)}</span>
                    {badge}
                    {row.played > 0 && row.decidedBy && row.decidedBy !== 'points' && (
                      <span className="tiebreak-note" title={`Separated by ${RUNG_COPY[row.decidedBy]}`}>
                        <Info size={11} />
                      </span>
                    )}
                  </span>
                </td>
                <td className="tnum">{row.played}</td>
                <td className="tnum">{row.won}</td>
                <td className="tnum">{row.drawn}</td>
                <td className="tnum">{row.lost}</td>
                <td className={`tnum gdv${row.gd > 0 ? ' up' : row.gd < 0 ? ' down' : ''}`}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="tnum">
                  <span className="ptsv">{row.points}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div>
        {fixtures.map((f) => {
          const home = slots[f.homePos - 1]
          const away = slots[f.awayPos - 1]
          if (!home || !away) return null
          const r = results[f.number]
          return (
            <div key={f.number} className="fixture">
              <span className="side">
                <Flag id={home} size={26} />
                {home}
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
                {away}
              </span>
              <button
                className="dice-btn"
                title={r?.simulated ? 'Simulated — press to re-roll' : 'Simulate this match'}
                onClick={() => onDice(f.number)}
                aria-label={`Simulate ${home} vs ${away}`}
              >
                <Dices size={14} />
              </button>
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
      <aside className="slideover" aria-label="Third place race">
        <div style={{ padding: 24 }}>
          <div className="row spread">
            <h3 className="display" style={{ margin: 0, fontSize: 24 }}>
              3rd Place Race
            </h3>
            <button className="btn small ghost" onClick={onClose}>
              Close
            </button>
          </div>
          <p className="low" style={{ fontSize: 12 }}>
            The eight best third-placed teams cross into the Round of 32. Rows from unfinished groups are provisional.
          </p>
          {thirds.length === 0 && <p className="muted">Standings appear once every group has a third-placed team.</p>}
          {thirds.map((t, i) => (
            <div key={t.id}>
              <div className="thirds-row">
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
                {t.qualified ? <span className="badge q">Q</span> : <span className="badge out">OUT</span>}
              </div>
              {i === 7 && <div className="thirds-line">Qualification line</div>}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
