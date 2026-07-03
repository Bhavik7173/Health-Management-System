import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      hmr: { clientPort: 443 },
      watch: { usePolling: true },
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
    },
    define: {
      // Expose REACT_APP_BACKEND_URL the same way CRA does so all
      // platform-managed env vars work seamlessly with Vite.
      'process.env.REACT_APP_BACKEND_URL': JSON.stringify(env.REACT_APP_BACKEND_URL || ''),
    },
  }
})
