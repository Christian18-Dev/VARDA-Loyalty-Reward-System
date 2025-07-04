import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/', // ✅ CORRECT for GitHub Pages + custom domain
  server: {
    open: true,
    port: 3001,
  }
})
