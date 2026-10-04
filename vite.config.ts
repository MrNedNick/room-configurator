import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.PAGES_BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    // The lazily loaded 3D view is three.js plus its React bindings (~930 kB, ~250 kB gzipped). It
    // arrives after the editor is usable, so the default 500 kB warning is raised rather than chased.
    chunkSizeWarningLimit: 1000,
  },
})
