import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wails from '@wailsio/runtime/plugins/vite'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [react(), wails('./bindings')],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        toast: resolve(__dirname, 'toast.html'),
        launcher: resolve(__dirname, 'launcher.html')
      }
    }
  }
})
