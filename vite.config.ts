import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // base defaults to '/', which is correct for a GitHub Pages *user site*
  // (username.github.io). Only a project site needs base: '/repo-name/'.

  server: {
    watch: {
      // Windows locks a file while it is being copied in or held open by a PDF
      // viewer. Vite's watcher treats that as a fatal EBUSY and kills the dev
      // server. Nothing here imports a PDF, so there is no reason to watch them.
      ignored: ['**/*.pdf'],
    },
  },
})
