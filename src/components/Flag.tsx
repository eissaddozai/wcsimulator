import { useState } from 'react'
import { NATION_BY_ID } from '../data/nations'
import { CIRCLE_FLAG } from './flagAssets'

interface FlagProps {
  id: string
  size?: number
  ringed?: boolean
  rect?: boolean
}

/** Circular flag token (HatScripts/circle-flags), monogram-disc fallback, never a broken image. */
export function Flag({ id, size = 24, ringed = false, rect = false }: FlagProps) {
  const [failed, setFailed] = useState(false)
  const nation = NATION_BY_ID.get(id)
  const code = nation?.flag
  const style = { width: size, height: size }
  if (!code || failed) {
    return (
      <span className={`flag${ringed ? ' ringed' : ''}`} style={style} role="img" aria-label={nation?.name ?? id}>
        <span className="monogram" style={{ fontSize: size * 0.34 }}>
          {id.slice(0, 3)}
        </span>
      </span>
    )
  }
  const src = rect
    ? `${import.meta.env.BASE_URL}flags/rect/${code}.svg`
    : (CIRCLE_FLAG[code] ?? `${import.meta.env.BASE_URL}flags/circle/${code}.svg`)
  return (
    <span className={`flag${ringed ? ' ringed' : ''}`} style={style}>
      <img src={src} alt={nation.name} loading="lazy" width={size} height={size} onError={() => setFailed(true)} />
    </span>
  )
}
