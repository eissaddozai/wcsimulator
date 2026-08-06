import { useId } from 'react'

/**
 * A bespoke stylized trophy — a globe cradled by flaring golden arms over a plinth —
 * drawn in-house so it takes the app's gold gradient and both themes natively.
 */
export function TrophyMark({ height = 64, className = '' }: { height?: number; className?: string }) {
  const gid = `tg${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 64 72" height={height} className={`trophy ${className}`} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold-hi)" />
          <stop offset="0.55" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold-dim)" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="66.5" rx="14" ry="3.4" fill={`url(#${gid})`} opacity="0.85" />
      <rect x="21" y="58" width="22" height="7" rx="2.4" fill={`url(#${gid})`} />
      <path
        d="M27.5 58 C27 50 25.5 45 22.8 40.5 C16.5 30.5 19.5 20.5 30 18.2 L34 18.2 C44.5 20.5 47.5 30.5 41.2 40.5 C38.5 45 37 50 36.5 58 Z"
        fill={`url(#${gid})`}
      />
      <circle cx="32" cy="13.5" r="9.6" fill={`url(#${gid})`} />
      <g className="trophy-lines" fill="none" strokeWidth="0.9">
        <path d="M22.9 11 A9.6 9.6 0 0 1 41.1 11" />
        <path d="M22.4 16 A9.6 9.6 0 0 0 41.6 16" />
        <line x1="22.4" y1="13.5" x2="41.6" y2="13.5" />
        <ellipse cx="32" cy="13.5" rx="4.6" ry="9.6" />
      </g>
      <path
        d="M26.5 24 C23.5 28 23 33 25.5 37.5"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
