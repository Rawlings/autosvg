import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { saveIcons } from './save-icons.ts'

export default defineConfig({
  plugins: [react(), saveIcons()],
  server: {
    port: 5173,
    host: true, // listen on the network too, so a phone on the same Wi-Fi can open it. Saving icons stays local-only (see save-icons.ts)
  },
})
