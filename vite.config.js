import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'

// Emits dist/sw.js with a precache list of every built asset + public file,
// so the whole app works offline after the first visit. No extra dependency.
function offlineServiceWorker() {
  return {
    name: 'ashdo-offline-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const publicDir = 'public'
      const walk = (dir) =>
        readdirSync(dir).flatMap((f) => {
          const p = join(dir, f)
          return statSync(p).isDirectory() ? walk(p) : [p]
        })
      const publicFiles = walk(publicDir).map((p) => '/' + relative(publicDir, p).split('\\').join('/'))
      const built = Object.keys(bundle).map((f) => '/' + f)
      const files = [...new Set(['/', '/index.html', ...built, ...publicFiles])].filter((f) => f !== '/sw.js')
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12)
      const source = readFileSync('src/sw.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), offlineServiceWorker()],
  build: {
    chunkSizeWarningLimit: 900,
  },
})
