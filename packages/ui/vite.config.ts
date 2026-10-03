import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import fileRouter from 'vite-react-file-router'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const { API_PORT, UI_PORT } = loadEnv(mode, './', '')
  const apiPort = Number.parseInt(API_PORT ?? '', 10)
  const uiPort = Number.parseInt(UI_PORT ?? '', 10)

  const entry = {
    strictPort: true,
    host: true,
    port: uiPort,
    proxy: {
      '/api': {
        changeOrigin: true,
        target: `http://localhost:${apiPort}`,
      },
    },
  }

  return {
    plugins: [
      fileRouter(),
      svgr(),
      react(),
    ],
    server: entry,
    preview: entry,
  }
})
