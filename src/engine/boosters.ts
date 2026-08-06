import { overrideOf } from '../data/nations'

/**
 * Boosters: manually assignable team modifiers that plug straight into the match model.
 * Nine effect axes — flat attack/defense, big-game and underdog bonuses, host-boost
 * amplification, tempo multipliers, shootout conversion, fatigue resistance, and
 * extra-time clutch. Up to three per team; a few are deliberate burdens for storytellers.
 */
export interface BoosterEffect {
  att?: number // flat attack rating
  def?: number // flat defense rating
  bigGame?: number // extra rating from the quarterfinals on
  underdog?: number // extra rating when the opponent is rated 40+ higher
  homeAmp?: number // multiplies host home advantage (default 1)
  tempo?: number // multiplies match tempo / total goals (default 1)
  pens?: number // shootout conversion delta
  stamina?: number // 0..1 — fraction of knockout fatigue shrugged off
  clutch?: number // extra rating in extra time
}

export interface Booster {
  id: string
  name: string
  blurb: string
  group: 'Attack' | 'Defense' | 'Mentality' | 'Physical' | 'Fortune' | 'Burden'
  fx: BoosterEffect
}

export const BOOSTERS: Booster[] = [
  // — Attack —
  { id: 'golden-gen', name: 'Golden Generation', blurb: 'A once-a-century crop peaks together.', group: 'Attack', fx: { att: 35, def: 20 } },
  { id: 'samba', name: 'Samba Flair', blurb: 'Joy football: more goals, both ways.', group: 'Attack', fx: { att: 40, def: -15, tempo: 1.1 } },
  { id: 'star-striker', name: 'Star Striker', blurb: 'One man settles tight games.', group: 'Attack', fx: { att: 45 } },
  { id: 'wing-wizards', name: 'Wing Wizards', blurb: 'Chalk-on-the-boots wide play.', group: 'Attack', fx: { att: 28, tempo: 1.08 } },
  { id: 'playmaker', name: 'The Playmaker', blurb: 'Everything flows through the ten.', group: 'Attack', fx: { att: 25, tempo: 1.05 } },
  { id: 'set-pieces', name: 'Set-Piece Lab', blurb: 'Corners are coded routines.', group: 'Attack', fx: { att: 18, pens: 0.03 } },
  { id: 'gegenpress', name: 'Gegenpress', blurb: 'Win it back in six seconds.', group: 'Attack', fx: { att: 25, def: 15, tempo: 1.12 } },
  // — Defense —
  { id: 'catenaccio', name: 'Catenaccio', blurb: 'The door is bolted.', group: 'Defense', fx: { def: 55, tempo: 0.85 } },
  { id: 'iron-curtain', name: 'Iron Curtain', blurb: 'Concede? Unfamiliar concept.', group: 'Defense', fx: { def: 45, att: -10 } },
  { id: 'park-the-bus', name: 'Park The Bus', blurb: 'All eleven behind the ball.', group: 'Defense', fx: { def: 60, att: -25, tempo: 0.8 } },
  { id: 'keeper-form', name: 'Keeper In Form', blurb: 'A wall with gloves.', group: 'Defense', fx: { def: 30, pens: 0.06 } },
  { id: 'rock-back', name: 'Rock At The Back', blurb: 'A centre-half pairing for the ages.', group: 'Defense', fx: { def: 40 } },
  { id: 'metronome', name: 'Midfield Metronome', blurb: 'Control the ball, control the clock.', group: 'Defense', fx: { att: 15, def: 15, tempo: 0.95 } },
  // — Mentality —
  { id: 'tournament-dna', name: 'Tournament DNA', blurb: 'They simply know how to do this.', group: 'Mentality', fx: { bigGame: 35 } },
  { id: 'final-boss', name: 'Final Boss', blurb: 'The bigger the stage, the bigger they get.', group: 'Mentality', fx: { bigGame: 50 } },
  { id: 'ice-veins', name: 'Ice In The Veins', blurb: 'Extra time is their time.', group: 'Mentality', fx: { clutch: 40, pens: 0.05 } },
  { id: 'pen-specialists', name: 'Penalty Specialists', blurb: 'Twelve yards of certainty.', group: 'Mentality', fx: { pens: 0.08 } },
  { id: 'giant-killers', name: 'Giant Killers', blurb: 'Sharpened against the mighty.', group: 'Mentality', fx: { underdog: 50 } },
  { id: 'dark-horse', name: 'Dark Horse Energy', blurb: 'Nobody rates them. Perfect.', group: 'Mentality', fx: { underdog: 35, clutch: 15 } },
  { id: 'talisman', name: 'Talisman Captain', blurb: 'An armband worth ten points.', group: 'Mentality', fx: { clutch: 30, pens: 0.03 } },
  { id: 'veterans', name: 'Grizzled Veterans', blurb: 'Seen it all, twice.', group: 'Mentality', fx: { def: 20, clutch: 20 } },
  // — Physical —
  { id: 'fresh-legs', name: 'Fresh Legs', blurb: 'Fatigue does not apply.', group: 'Physical', fx: { stamina: 1 } },
  { id: 'deep-bench', name: 'Deep Bench', blurb: 'The subs would start elsewhere.', group: 'Physical', fx: { stamina: 0.5 } },
  { id: 'heat-proof', name: 'Heat Acclimatized', blurb: 'Noon in June? Lovely.', group: 'Physical', fx: { stamina: 0.4, def: 8 } },
  { id: 'youth-movement', name: 'Youth Movement', blurb: 'Legs for days.', group: 'Physical', fx: { stamina: 0.3, att: 10 } },
  { id: 'altitude-camp', name: 'Altitude Camp', blurb: 'Trained where the air is thin.', group: 'Physical', fx: { stamina: 0.3, homeAmp: 1.2 } },
  // — Fortune —
  { id: 'fortress', name: 'Fortress Mentality', blurb: 'Home soil becomes holy ground.', group: 'Fortune', fx: { homeAmp: 1.8 } },
  { id: 'twelfth-man', name: 'Twelfth Man', blurb: 'The crowd defends the far post.', group: 'Fortune', fx: { homeAmp: 1.4, def: 10 } },
  { id: 'wonderkid', name: 'Wonderkid Breakout', blurb: 'A star is born mid-tournament.', group: 'Fortune', fx: { att: 22, clutch: 18 } },
  { id: 'destiny', name: 'Written In The Stars', blurb: 'Name on the trophy already.', group: 'Fortune', fx: { bigGame: 25, pens: 0.04, clutch: 15 } },
  // — Burdens (for storytellers) —
  { id: 'injury-crisis', name: 'Injury Crisis', blurb: 'The physio room is full.', group: 'Burden', fx: { att: -30, def: -25 } },
  { id: 'dressing-rift', name: 'Dressing Room Rift', blurb: 'Two camps, one bus.', group: 'Burden', fx: { att: -25, def: -20, clutch: -20 } },
  { id: 'stage-fright', name: 'Stage Fright', blurb: 'The occasion weighs a ton.', group: 'Burden', fx: { bigGame: -35, pens: -0.05 } },
  { id: 'travel-weary', name: 'Travel Weary', blurb: 'Jet lag is undefeated.', group: 'Burden', fx: { stamina: -0.5, def: -10 } },
]

export const BOOSTER_BY_ID: ReadonlyMap<string, Booster> = new Map(BOOSTERS.map((b) => [b.id, b]))
export const MAX_BOOSTERS_PER_TEAM = 3

export interface CombinedFx {
  att: number
  def: number
  bigGame: number
  underdog: number
  homeAmp: number
  tempo: number
  pens: number
  stamina: number
  clutch: number
}

const NEUTRAL: CombinedFx = { att: 0, def: 0, bigGame: 0, underdog: 0, homeAmp: 1, tempo: 1, pens: 0, stamina: 0, clutch: 0 }

/** Combined effect of a team's assigned boosters (flat axes add, multipliers multiply). */
export function combinedFx(id: string): CombinedFx {
  const boosts = overrideOf(id)?.boosts
  if (!boosts || boosts.length === 0) return NEUTRAL
  const out = { ...NEUTRAL }
  for (const bid of boosts.slice(0, MAX_BOOSTERS_PER_TEAM)) {
    const fx = BOOSTER_BY_ID.get(bid)?.fx
    if (!fx) continue
    out.att += fx.att ?? 0
    out.def += fx.def ?? 0
    out.bigGame += fx.bigGame ?? 0
    out.underdog += fx.underdog ?? 0
    out.homeAmp *= fx.homeAmp ?? 1
    out.tempo *= fx.tempo ?? 1
    out.pens += fx.pens ?? 0
    out.stamina += fx.stamina ?? 0
    out.clutch += fx.clutch ?? 0
  }
  out.pens = Math.min(Math.max(out.pens, -0.12), 0.12)
  out.stamina = Math.min(out.stamina, 1)
  out.tempo = Math.min(Math.max(out.tempo, 0.6), 1.5)
  return out
}
