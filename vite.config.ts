import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// REQ-001: GitHub Pages serves the site under this path.
export default defineConfig({
  base: '/marcona-app/',
  plugins: [react()],
})
