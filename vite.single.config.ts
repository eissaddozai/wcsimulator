import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Self-contained single-file build: JS, CSS, fonts, and all flag SVGs inlined,
// so dist-single/index.html runs from anywhere with zero network requests.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'es2020',
    outDir: 'dist-single',
    assetsInlineLimit: 100_000_000,
    copyPublicDir: false,
  },
})
