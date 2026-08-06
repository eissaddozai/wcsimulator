import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  // assetsInlineLimit 0: flag SVGs stay hashed files in the normal build (JS budget);
  // the single-file build (vite.single.config.ts) inlines everything instead.
  build: { target: 'es2020', assetsInlineLimit: 0 },
})
