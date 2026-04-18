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
import { existsSync } from 'node:fs'
import { exec as execCb, spawn as spawnProc } from 'node:child_process'
import { createInterface } from 'node:readline'
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
  // process family
  'layouts/process/process.ts',
  'layouts/process/chevron-process.ts',
  'layouts/process/arrow-process.ts',
  'layouts/process/circular-process.ts',
  'layouts/process/funnel.ts',
  'layouts/process/roadmap.ts',
  'layouts/process/waterfall.ts',
  'layouts/process/snake-process.ts',
  'layouts/process/step-up.ts',
  'layouts/process/step-down.ts',
  'layouts/process/circle-process.ts',
  'layouts/process/equation.ts',
  'layouts/process/bending-process.ts',
  'layouts/process/segmented-bar.ts',
  'layouts/process/phase-process.ts',
  'layouts/process/timeline-h.ts',
  'layouts/process/timeline-v.ts',
  'layouts/process/swimlane.ts',
  // list family
  'layouts/list/bullet-list.ts',
  'layouts/list/numbered-list.ts',
  'layouts/list/checklist.ts',
  'layouts/list/two-column-list.ts',
  'layouts/list/timeline-list.ts',
  'layouts/list/block-list.ts',
  'layouts/list/chevron-list.ts',
  'layouts/list/card-list.ts',
  'layouts/list/zigzag-list.ts',
  'layouts/list/ribbon-list.ts',
  'layouts/list/hexagon-list.ts',
  'layouts/list/trapezoid-list.ts',
  'layouts/list/tab-list.ts',
  'layouts/list/circle-list.ts',
  'layouts/list/icon-list.ts',
  // cycle family
  'layouts/cycle/cycle.ts',
  'layouts/cycle/donut-cycle.ts',
  'layouts/cycle/gear-cycle.ts',
  'layouts/cycle/spiral.ts',
  'layouts/cycle/block-cycle.ts',
  'layouts/cycle/segmented-cycle.ts',
  'layouts/cycle/nondirectional-cycle.ts',
  'layouts/cycle/multidirectional-cycle.ts',
  'layouts/cycle/loop.ts',
  // matrix family
  'layouts/matrix/swot.ts',
  'layouts/matrix/pros-cons.ts',
  'layouts/matrix/comparison.ts',
  'layouts/matrix/matrix-2x2.ts',
  'layouts/matrix/bcg.ts',
  'layouts/matrix/ansoff.ts',
  'layouts/matrix/matrix-nxm.ts',
  // hierarchy family
  'layouts/hierarchy/org-chart.ts',
  'layouts/hierarchy/tree.ts',
  'layouts/hierarchy/h-org-chart.ts',
  'layouts/hierarchy/hierarchy-list.ts',
  'layouts/hierarchy/radial-tree.ts',
  'layouts/hierarchy/decision-tree.ts',
  'layouts/hierarchy/sitemap.ts',
  'layouts/hierarchy/bracket.ts',
  'layouts/hierarchy/bracket-tree.ts',
  'layouts/hierarchy/mind-map.ts',
  // pyramid family
  'layouts/pyramid/pyramid.ts',
  'layouts/pyramid/inverted-pyramid.ts',
  'layouts/pyramid/pyramid-list.ts',
  'layouts/pyramid/segmented-pyramid.ts',
  'layouts/pyramid/diamond-pyramid.ts',
  // relationship family
  'layouts/relationship/venn.ts',
  'layouts/relationship/venn-3.ts',
  'layouts/relationship/venn-4.ts',
  'layouts/relationship/concentric.ts',
  'layouts/relationship/balance.ts',
  'layouts/relationship/counterbalance.ts',
  'layouts/relationship/opposing-arrows.ts',
  'layouts/relationship/web.ts',
  'layouts/relationship/cluster.ts',
  'layouts/relationship/target.ts',
  'layouts/relationship/radial.ts',
  'layouts/relationship/converging.ts',
  'layouts/relationship/diverging.ts',
  'layouts/relationship/plus.ts',
  // statistical family
  'layouts/statistical/progress-list.ts',
  'layouts/statistical/bullet-chart.ts',
  'layouts/statistical/scorecard.ts',
  'layouts/statistical/treemap.ts',
  'layouts/statistical/sankey.ts',
  'layouts/statistical/waffle.ts',
  'layouts/statistical/gauge.ts',
  'layouts/statistical/radar.ts',
  'layouts/statistical/heatmap.ts',
  // planning family
  'layouts/planning/kanban.ts',
  'layouts/planning/gantt.ts',
  'layouts/planning/gantt-lite.ts',
  'layouts/planning/sprint-board.ts',
  'layouts/planning/timeline.ts',
  'layouts/planning/milestone.ts',
  'layouts/planning/wbs.ts',
  // technical family
  'layouts/technical/layered-arch.ts',
  'layouts/technical/entity.ts',
  'layouts/technical/network.ts',
  'layouts/technical/pipeline.ts',
  'layouts/technical/sequence.ts',
  'layouts/technical/state-machine.ts',
  'layouts/technical/class.ts',
  // shared helpers
  'layouts/shared.ts',
  'layouts/hierarchy/shared.ts',
  // theme
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

// ── Lab chat (Claude) ─────────────────────────────────────────────────────────

const CLAUDE_BIN = process.env.CLAUDE_PATH
  ?? `${process.env.HOME ?? '/usr/local'}/.local/bin/claude`

// Single in-memory conversation session — resets on server restart.
let chatSessionId: string | null = null

/**
 * GET /lab/chat/status
 * Returns { available: true } if the Claude CLI binary is reachable.
 */
app.get('/lab/chat/status', (_req, res) => {
  res.json({ available: existsSync(CLAUDE_BIN) })
})

/**
 * DELETE /lab/chat/session
 * Clears the stored Claude session so the next message starts fresh.
 */
app.delete('/lab/chat/session', (_req, res) => {
  chatSessionId = null
  res.json({ ok: true })
})

/**
 * POST /lab/chat
 * Body: { message: string, context?: string }
 * Streams a Claude response as SSE.  context is prepended to the message so
 * Claude sees the current file + mdart source without polluting chat history.
 */
app.post('/lab/chat', (req, res) => {
  const { message, context } = req.body as { message?: string; context?: string }
  if (!message?.trim()) { res.status(400).json({ error: 'message required' }); return }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const fullMessage = context?.trim()
    ? `${context.trim()}\n\n${message.trim()}`
    : message.trim()

  const args = [
    '--print', fullMessage,
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode', 'acceptEdits',
    '--mcp-config', '{"mcpServers":{}}',  // empty MCP config
    '--strict-mcp-config',            // ignore global ~/.claude.json MCP servers
    '--system-prompt', LAB_SYSTEM_PROMPT,
  ]
  if (chatSessionId) args.push('--resume', chatSessionId)

  // Strip CLAUDE* env vars to prevent sub-agent IPC hang (see CLAUDE.md)
  const cleanEnv: NodeJS.ProcessEnv = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith('CLAUDE')) cleanEnv[k] = v
  }
  if (process.env.ANTHROPIC_BASE_URL) cleanEnv.ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL

  const child = spawnProc(CLAUDE_BIN, args, {
    env: { ...cleanEnv, CI: 'true' },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: MDART_PKG,
  })

  function sse(event: string, data: unknown): void {
    if (res.writableEnded) return
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) } catch { /* socket closed */ }
  }

  function finish() {
    if (!res.writableEnded) res.end()
  }

  // Drain stderr to prevent the child's stderr buffer from blocking it
  child.stderr.resume()

  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity })

  rl.on('error', (err) => { sse('error', { message: err.message }); finish() })

  rl.on('line', (line) => {
    if (!line.trim()) return
    let chunk: Record<string, unknown>
    try { chunk = JSON.parse(line) as Record<string, unknown> } catch { return }

    if (chunk.type === 'system' && chunk.subtype === 'init') {
      chatSessionId = chunk.session_id as string
    }

    // Forward streaming text deltas; skip large/noisy chunk types to reduce traffic
    const ev = chunk.type === 'stream_event'
      ? (chunk.event as Record<string, unknown> | undefined)
      : null
    const isTextDelta = ev?.type === 'content_block_delta' &&
      (ev.delta as Record<string, unknown> | undefined)?.type === 'text_delta'
    const isResult = chunk.type === 'result'
    const isInit   = chunk.type === 'system' && chunk.subtype === 'init'
    if (isTextDelta || isResult || isInit) sse('chunk', chunk)

    if (isResult) {
      const isErr = chunk.is_error as boolean
      if (isErr) {
        const detail = (chunk.errors as string[] | undefined)?.join('; ') || String(chunk.result)
        sse('error', { message: detail })
      } else {
        sse('done', { session_id: chunk.session_id })
      }
      finish()
    }
  })

  child.on('error', (err) => { sse('error', { message: err.message }); finish() })
  child.on('close', (code) => {
    if (!res.writableEnded) {
      if (code !== 0) sse('error', { message: `Claude exited with code ${code}` })
      finish()
    }
  })

  // Kill child if browser disconnects
  res.on('close', () => { child.kill() })
})

const LAB_SYSTEM_PROMPT = `\
You are an AI assistant embedded in the MdArt Renderer Lab — a browser tool
for editing TypeScript layout renderers and previewing SVG diagrams live.

## Architecture

Each of the 101 diagram types lives in its own file:
  packages/mdart/src/layouts/{family}/{type}.ts
Each exports a single function:
  export function render(spec: MdArtSpec, theme: MdArtTheme): string

Shared SVG helpers:  layouts/shared.ts
Tree-layout helpers: layouts/hierarchy/shared.ts
Theme definitions:   packages/mdart/src/theme.ts
Parser:              packages/mdart/src/parser.ts

## Key types

MdArtSpec   — spec.type, spec.title, spec.items (MdArtItem[]), spec.colors?
MdArtItem   — item.label, item.value?, item.children[], item.attrs[]
MdArtTheme  — primary, secondary, accent, muted, bg, surface, border,
               text, textMuted, danger, warning, palette (string[])

## Shared helpers (layouts/shared.ts)

svgWrap(inner, W, H, theme)  — wraps content in a full <svg> with bg rect
escapeXml(str)               — escapes & < > for SVG text nodes
tt(str, max)                 — truncates with ellipsis
renderEmpty(theme)           — placeholder SVG for empty input

## Your role

- Explain how a renderer works and suggest improvements
- Help debug SVG layout math or visual issues
- Write or rewrite renderer code when asked
- After editing a file the user clicks Apply to rebuild (~250 ms) and preview

Keep responses concise. Show code diffs when suggesting changes.`

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
