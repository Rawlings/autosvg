import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { saveVectors } from './save-vectors.ts'

export default defineConfig({
  plugins: [react(), saveVectors()],
  server: {
    port: 5173,
    host: true, // listen on the network too, so a phone on the same Wi-Fi can open it. Saving vectors stays local-only (see save-vectors.ts)
  },
})
