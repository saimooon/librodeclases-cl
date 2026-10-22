import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  // El plugin de Cloudflare corre el Worker (worker/index.js) dentro de Vite en local y arma el build para desplegar.
  plugins: [react(), cloudflare()],
  // Versión visible en el pie de página para confirmar qué build está desplegado.
  define: { __APP_VERSION__: JSON.stringify(version) },
})
