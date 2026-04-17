/**
 * MdArt rendering service — mini-app
 *
 * Provides:
 *   POST /render              → { svg, type, title, tabCount }
 *   POST /render/states       → { states: string[], type, tabCount }
 *   POST /render/ecosystem    → { html, adapter }
 *   GET  /lab                 → renderer lab UI (Monaco editor)
 *   GET  /lab/source          → { content } — read a layout source file
 *   POST /lab/apply           → { svg, buildMs } — write + rebuild + render
 *   POST /lab/render          → { svg } — render with current build (no rebuild)
 *   GET  /                    → playground UI
 *   GET  /health              → { ok: true }
 *
 * Command template (register in steward app configs):
 *   /home/ubuntu/claude-steward/node_modules/.bin/tsx /home/ubuntu/mdart/apps/playground/src/server.ts {port}
 *
 * work_dir: /home/ubuntu/mdart/apps/playground
 */

import express     from 'express'
import path        from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile, writeFile, copyFile, unlink } from 'node:fs/promises'
import { exec as execCb } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'

import { renderMdArt, parseMdArt } from 'mdart'

// Ecosystem adapters — each is a real adapter package (workspace-resolved locally,
// published to npm when ready).
import { renderWithMarked }      from 'mdart-marked'
import { renderWithMarkdownIt }  from 'mdart-markdown-it'
import { renderWithUnified }     from 'mdart-remark'

type EcosystemAdapter = 'marked' | 'markdown-it' | 'unified'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const exec = promisify(execCb)

// ── CLI args ──────────────────────────────────────────────────────────────────

const port = parseInt(process.argv[2] ?? '', 10)
if (!port || isNaN(port)) {
  console.error('Usage: npx tsx src/server.ts <port>')
  process.exit(1)
}

// ── Lab constants ─────────────────────────────────────────────────────────────

const MDART_PKG  = '/home/ubuntu/mdart/packages/mdart'
const MDART_SRC  = `${MDART_PKG}/src`
const DIST_INDEX = `${MDART_PKG}/dist/index.js`

/** Files the lab is allowed to read and write */
const ALLOWED_LAB_FILES = new Set([
  'layouts/process.ts',
  'layouts/list.ts',
  'layouts/cycle.ts',
  'layouts/matrix.ts',
  'layouts/hierarchy.ts',
  'layouts/pyramid.ts',
  'layouts/relationship.ts',
  'layouts/statistical.ts',
  'layouts/planning.ts',
  'layouts/technical.ts',
  'theme.ts',
])

/**
 * Render mdartSource using a freshly built dist — copies dist to a temp file
 * so each call gets an isolated module (no Node ESM cache reuse).
 */
async function renderFresh(mdartSource: string): Promise<string> {
  const tmp = path.join(tmpdir(), `mdart-lab-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`)
  await copyFile(DIST_INDEX, tmp)
  try {
    const mod = await import(`file://${tmp}`) as { renderMdArt: typeof renderMdArt }
    return mod.renderMdArt(mdartSource)
  } finally {
    await unlink(tmp).catch(() => {})
  }
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express()
app.use(express.json({ limit: '2mb' }))

// Serve playground UI from public/
app.use(express.static(path.join(__dirname, '../public')))

// ── Playground routes ─────────────────────────────────────────────────────────

/**
 * POST /render
 * Render mdart source to a single SVG string (tab 0 active for tab-list).
 */
app.post('/render', (req, res) => {
  const { source, hintType } = req.body as { source?: string; hintType?: string }
  if (!source?.trim()) {
    res.status(400).json({ error: 'source is required' }); return
  }
  try {
    const spec = parseMdArt(source, hintType)
    const svg  = renderMdArt(source, hintType)
    res.json({
      svg,
      type:     spec.type,
      title:    spec.title ?? null,
      tabCount: spec.type === 'tab-list' ? spec.items.length : 1,
    })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

/**
 * POST /render/states
 * For tab-list diagrams: returns one SVG per tab state.
 * For all other layouts: returns a single-element array.
 */
app.post('/render/states', (req, res) => {
  const { source, hintType } = req.body as { source?: string; hintType?: string }
  if (!source?.trim()) {
    res.status(400).json({ error: 'source is required' }); return
  }
  try {
    const spec   = parseMdArt(source, hintType)
    const svg    = renderMdArt(source, hintType)
    const states = spec.type === 'tab-list'
      ? spec.items.map(() => svg)
      : [svg]
    res.json({ states, type: spec.type, tabCount: states.length })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

/**
 * POST /render/ecosystem
 * Render a full Markdown document through a chosen ecosystem adapter.
 */
app.post('/render/ecosystem', async (req, res) => {
  const { source, adapter } = req.body as { source?: string; adapter?: EcosystemAdapter }
  if (!source?.trim()) {
    res.status(400).json({ error: 'source is required' }); return
  }
  const name: EcosystemAdapter = adapter ?? 'marked'
  try {
    let html: string
    if (name === 'marked')            html = await renderWithMarked(source)
    else if (name === 'markdown-it')  html = renderWithMarkdownIt(source)
    else if (name === 'unified')      html = await renderWithUnified(source)
    else { res.status(400).json({ error: `unknown adapter: ${String(adapter)}` }); return }
    res.json({ html, adapter: name })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

// ── Lab routes ────────────────────────────────────────────────────────────────

/**
 * GET /lab/source?file=layouts/process.ts
 * Returns the raw TypeScript source of an allowed layout file.
 */
app.get('/lab/source', async (req, res) => {
  const file = (req.query.file as string | undefined) ?? ''
  if (!ALLOWED_LAB_FILES.has(file)) {
    res.status(400).json({ error: `invalid file: ${file}` }); return
  }
  try {
    const content = await readFile(path.join(MDART_SRC, file), 'utf8')
    res.json({ content, file })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

/**
 * POST /lab/apply
 * Body: { file: string, content: string, mdartSource: string }
 * Writes the modified TypeScript to disk, rebuilds the ESM bundle (esbuild only,
 * ~100 ms, no type-checking), then renders mdartSource with the fresh build.
 * Returns: { svg, buildMs }
 */
app.post('/lab/apply', async (req, res) => {
  const { file, content, mdartSource } = req.body as {
    file?: string; content?: string; mdartSource?: string
  }
  if (!file || !ALLOWED_LAB_FILES.has(file)) {
    res.status(400).json({ error: `invalid file: ${String(file)}` }); return
  }
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content required' }); return
  }
  if (!mdartSource?.trim()) {
    res.status(400).json({ error: 'mdartSource required' }); return
  }

  try {
    // 1. Write modified source
    await writeFile(path.join(MDART_SRC, file), content, 'utf8')

    // 2. Rebuild — esbuild only (fast, no tsc type-check)
    const t0 = Date.now()
    await exec('node scripts/build-esm.js', { cwd: MDART_PKG })
    const buildMs = Date.now() - t0

    // 3. Render with fresh build (isolated via temp-file import)
    const svg = await renderFresh(mdartSource)
    res.json({ svg, buildMs })
  } catch (err) {
    res.status(422).json({ error: String(err) })
  }
})

/**
 * POST /lab/render
 * Body: { mdartSource: string }
 * Renders with the current dist build without rebuilding.
 * Use after /lab/apply to re-render different sources cheaply.
 */
app.post('/lab/render', async (req, res) => {
  const { mdartSource } = req.body as { mdartSource?: string }
  if (!mdartSource?.trim()) {
    res.status(400).json({ error: 'mdartSource required' }); return
  }
  try {
    const svg = await renderFresh(mdartSource)
    res.json({ svg })
  } catch (err) {
    res.status(422).json({ error: String(err) })
  }
})

/** GET /lab — serve the renderer lab UI */
app.get('/lab', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/lab.html'))
})

/** GET /health */
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'mdart' })
})

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`[mdart] listening on :${port}`)
})

process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT',  () => process.exit(0))
