import createGlobe from 'cobe'
import { useEffect, useRef } from 'react'

/** The three 2026 host cities glow gold on the sphere, strung together by arcs. */
const HOST_MARKERS = [
  { location: [19.43, -99.13] as [number, number], size: 0.07 },
  { location: [43.65, -79.38] as [number, number], size: 0.06 },
  { location: [40.71, -74.0] as [number, number], size: 0.07 },
]
const HOST_ARCS = [
  { from: [19.43, -99.13] as [number, number], to: [43.65, -79.38] as [number, number] },
  { from: [43.65, -79.38] as [number, number], to: [40.71, -74.0] as [number, number] },
  { from: [40.71, -74.0] as [number, number], to: [19.43, -99.13] as [number, number] },
]

/**
 * A slowly turning dotted globe (cobe, ~5 kB of WebGL) tinted to the stadium palette.
 * Rebuilt on theme change so its light responds to the room.
 */
export function WorldGlobe({ size = 640 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let phi = 4.4
    let raf = 0
    let globe: ReturnType<typeof createGlobe> | null = null

    const build = () => {
      globe?.destroy()
      const light = document.documentElement.dataset.theme === 'light'
      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: size * 2,
        height: size * 2,
        phi,
        theta: 0.22,
        dark: light ? 0 : 1,
        diffuse: 1.2,
        mapSamples: 18000,
        mapBrightness: light ? 8 : 5.5,
        baseColor: light ? [0.6, 0.54, 0.38] : [0.44, 0.41, 0.29],
        markerColor: [0.9, 0.75, 0.42],
        glowColor: light ? [0.97, 0.95, 0.88] : [0.05, 0.08, 0.06],
        markers: HOST_MARKERS,
        arcs: HOST_ARCS,
        arcColor: [0.85, 0.7, 0.4],
        opacity: light ? 0.7 : 0.85,
      })
    }
    let t = 0
    const spin = () => {
      phi += 0.0016
      t += 0.035
      // the host cities breathe
      const pulse = 0.055 + (Math.sin(t) + 1) * 0.014
      globe?.update({ phi, markers: HOST_MARKERS.map((m) => ({ ...m, size: pulse })) })
      raf = requestAnimationFrame(spin)
    }
    build()
    if (!reduced) raf = requestAnimationFrame(spin)
    const obs = new MutationObserver(build)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      cancelAnimationFrame(raf)
      obs.disconnect()
      globe?.destroy()
    }
  }, [size])

  return <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden />
}
