import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base matchar GitHub Pages-sökvägen djyret.github.io/mnm-items/
export default defineConfig({
  base: '/mnm-items/',
  plugins: [react()],
})
