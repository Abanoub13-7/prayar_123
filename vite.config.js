import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths allow deployment both at a domain root and under a GitHub Pages repo path.
  base: './',
  plugins: [react()],
})
