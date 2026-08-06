/**
 * Circle-flag URLs resolved through Vite's asset pipeline so the single-file build
 * inlines them as data URIs. Falls back to the public/ path (dev + normal build serve
 * both; the map wins when present).
 */
const modules = import.meta.glob('../assets/flags/circle/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const CIRCLE_FLAG: Record<string, string> = {}
for (const [path, url] of Object.entries(modules)) {
  const code = path.split('/').pop()!.replace('.svg', '')
  CIRCLE_FLAG[code] = url
}
