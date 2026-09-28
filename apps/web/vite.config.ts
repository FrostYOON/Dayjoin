import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const auth = loadEnv(mode, process.cwd(), 'VITE_SUPABASE_')
  const url = auth.VITE_SUPABASE_URL
  const key = auth.VITE_SUPABASE_PUBLISHABLE_KEY
  if (Boolean(url) !== Boolean(key)) throw new Error('Configure both public Supabase values')
  if (key && !key.startsWith('sb_publishable_')) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must be a public publishable key')
  if (url) {
    const parsed = new URL(url)
    if (!(parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname))) ||
      parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw new Error('VITE_SUPABASE_URL must be an HTTPS project origin or local development origin')
    }
  }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': process.env.DAYJOIN_API_PROXY_TARGET ?? 'http://localhost:3000' },
    },
  }
})
