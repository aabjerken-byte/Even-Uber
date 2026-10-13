import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Port 3000 belongs to the Express API server (server.ts) — that address is
    // baked into the iOS companion app. The Vite dev server has to live
    // somewhere else or `npm run dev` starts two processes fighting over the
    // same port. App.tsx calls the API on 3000 absolutely, and the server sends
    // permissive CORS headers, so cross-port dev works as-is.
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
})
