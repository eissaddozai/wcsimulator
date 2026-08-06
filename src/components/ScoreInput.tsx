import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number | null
  onCommit: (v: number | null) => void
  label: string
  small?: boolean
  disabled?: boolean
}

/** 44×44 numeric score field: type-through, ↑/↓ steppers, commit on blur/Enter. */
export function ScoreInput({ value, onCommit, label, small = false, disabled = false }: Props) {
  const [text, setText] = useState(value === null ? '' : String(value))
  const [invalid, setInvalid] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(value === null ? '' : String(value))
  }, [value])

  const commit = () => {
    if (text.trim() === '') {
      onCommit(null)
      return
    }
    const n = Number(text)
    if (!Number.isInteger(n) || n < 0 || n > 99) {
      setInvalid(true)
      setTimeout(() => setInvalid(false), 250)
      setText(value === null ? '' : String(value))
      return
    }
    onCommit(n)
  }

  return (
    <input
      ref={ref}
      className={`score-in tnum${small ? ' small' : ''}${invalid ? ' invalid' : ''}`}
      inputMode="numeric"
      maxLength={2}
      placeholder="–"
      aria-label={label}
      disabled={disabled}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
          const inputs = [...document.querySelectorAll<HTMLInputElement>('input.score-in:not([disabled])')]
          const idx = inputs.indexOf(e.currentTarget)
          const next = inputs.slice(idx + 1).find((i) => i.value === '')
          next?.focus()
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setText((t) => String(Math.min((Number(t) || 0) + 1, 99)))
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setText((t) => String(Math.max((Number(t) || 0) - 1, 0)))
        } else if (e.key === 'Escape') {
          setText(value === null ? '' : String(value))
          e.currentTarget.blur()
        }
      }}
    />
  )
}
