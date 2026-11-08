/**
 * Parses every content file at build time, through the same code the site runs.
 *
 * Why this exists: src/lib/content.ts runs in the visitor's browser, so a bad
 * frontmatter value (unquoted ": ", a missing `domain`, a malformed link) used
 * to pass `npm run build` and ship a blank page. Running the loaders here turns
 * that into a failed build that names the file.
 *
 * Vite is started in-process only to resolve import.meta.glob and `?raw`
 * imports; no config file, no plugins, no server.
 */
import { createServer } from 'vite'

const vite = await createServer({
  configFile: false,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
})

let failed = false
try {
  const content = await vite.ssrLoadModule('/src/lib/content.ts')
  const loaders = Object.entries(content).filter(
    ([name, fn]) => typeof fn === 'function' && name.startsWith('get') && fn.length === 0,
  )
  const counts = loaders.map(([name, fn]) => {
    const result = fn()
    return `${name.slice(3)} ${Array.isArray(result) ? result.length : 1}`
  })
  console.log(`content OK: ${counts.join(', ')}`)
} catch (error) {
  failed = true
  console.error(`\nContent check failed:\n  ${error instanceof Error ? error.message : error}\n`)
} finally {
  await vite.close()
}
process.exit(failed ? 1 : 0)
