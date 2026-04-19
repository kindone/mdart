/**
 * MdArt rendering service — mini-app
 *
 * Provides:
 *   GET  /                  → README landing page (dynamically rendered)
 *   GET  /demo              → merged demo + renderer lab UI
 *   GET  /lab               → redirect to /demo (backward compat)
 *   POST /render            → { svg, type, title, tabCount }
 *   POST /render/states     → { states: string[], type, tabCount }
 *   POST /render/ecosystem  → { html, adapter }
 *   GET  /lab/source        → { content } — read a layout source file
 *   POST /lab/apply         → { svg, buildMs } — write + rebuild + render
 *   POST /lab/render        → { svg } — render with current build (no rebuild)
 *   GET  /lab/chat/status   → { available: bool }
 *   DELETE /lab/chat/session → { ok: true }
 *   POST /lab/chat          → SSE stream
 *   GET  /health            → { ok: true }
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

// ── Paths ─────────────────────────────────────────────────────────────────────

const MDART_ROOT  = path.resolve(__dirname, '../../..')
const MDART_PKG   = path.join(MDART_ROOT, 'packages/mdart')
const MDART_SRC   = path.join(MDART_PKG, 'src')
const DIST_INDEX  = path.join(MDART_PKG, 'dist/index.js')
const README_PATH = path.join(MDART_ROOT, 'README.md')
const DOCS_DIR    = path.join(MDART_ROOT, 'docs')

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

// ── README landing page ───────────────────────────────────────────────────────

/**
 * GET /
 * Dynamically renders README.md through the marked adapter and wraps it
 * in a styled HTML template. Served fresh on every request so edits to
 * README.md are reflected instantly without a server restart.
 */
app.get('/', async (_req, res) => {
  try {
    const md   = await readFile(README_PATH, 'utf8')
    const body = await renderWithMarked(md)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(README_TEMPLATE(body))
  } catch (err) {
    res.status(500).send(`<pre>Failed to render README: ${String(err)}</pre>`)
  }
})

/** Minimal styled HTML wrapper for the rendered README */
function README_TEMPLATE(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MdArt</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d0d10; --surface: #16161d; --border: #2a2a38;
      --text: #e2e2ea; --muted: #6b6b80; --accent: #4f6ef7;
      --green: #34d399; --mono: 'JetBrains Mono','Fira Code',ui-monospace,monospace;
    }
    html { background: var(--bg); color: var(--text); font-family: system-ui,-apple-system,sans-serif; }
    body { max-width: 800px; margin: 0 auto; padding: 0 20px 80px; }

    /* ── Site header ── */
    .site-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 0 20px; border-bottom: 1px solid var(--border);
      margin-bottom: 40px;
    }
    .site-logo { font-size: 20px; font-weight: 700; letter-spacing: -.5px; }
    .site-logo span { color: var(--accent); }
    .site-header-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .btn-demo {
      background: var(--accent); color: #fff; border: none;
      padding: 7px 18px; border-radius: 6px; font-size: 13px; font-weight: 600;
      cursor: pointer; text-decoration: none; display: inline-block;
      transition: opacity .15s;
    }
    .btn-demo:hover { opacity: .85; }
    .btn-npm {
      color: var(--muted); font-size: 12px; text-decoration: none;
      padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px;
      transition: color .15s, border-color .15s;
    }
    .btn-npm:hover { color: var(--text); border-color: var(--muted); }

    /* ── Prose ── */
    .prose h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; letter-spacing: -.5px; }
    .prose h2 { font-size: 20px; font-weight: 600; margin: 40px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .prose h3 { font-size: 15px; font-weight: 600; margin: 28px 0 8px; color: var(--text); }
    .prose h4 { font-size: 13px; font-weight: 600; margin: 20px 0 6px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
    .prose p  { margin: 10px 0; line-height: 1.75; color: #c8c8d8; font-size: 14px; }
    .prose a  { color: var(--accent); text-decoration: none; }
    .prose a:hover { text-decoration: underline; }
    .prose strong { color: var(--text); font-weight: 600; }
    .prose em { color: #a8a8c0; font-style: italic; }
    .prose hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
    .prose ul,.prose ol { margin: 10px 0 10px 22px; }
    .prose li { margin: 4px 0; line-height: 1.7; color: #c8c8d8; font-size: 14px; }

    /* code */
    .prose code {
      font-family: var(--mono); font-size: 12px;
      background: var(--surface); color: #ce9178;
      padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);
    }
    .prose pre {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; padding: 16px 18px; overflow-x: auto; margin: 14px 0;
    }
    .prose pre code {
      background: none; border: none; padding: 0; color: var(--text);
      font-size: 12.5px; line-height: 1.65;
    }

    /* tables */
    .prose table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .prose th,.prose td { padding: 8px 14px; border: 1px solid var(--border); text-align: left; }
    .prose th { background: var(--surface); color: var(--text); font-weight: 600; }
    .prose tr:nth-child(even) td { background: #0f0f14; }

    /* images — README has SVG diagram images */
    .prose img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block; }

    /* mdart inline SVGs from the adapter */
    .prose svg { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block; }
    .mdart-error { color: #f87171; font-size: 12px; font-family: var(--mono); }
  </style>
</head>
<body>
  <div class="site-header">
    <span class="site-logo">Md<span>Art</span></span>
    <div class="site-header-right">
      <a href="https://www.npmjs.com/package/mdart" target="_blank" rel="noopener" class="btn-npm">npm ↗</a>
      <a href="/demo" class="btn-demo">Try Demo →</a>
    </div>
  </div>
  <div class="prose">${body}</div>
</body>
</html>`
}

// ── Static file serving ───────────────────────────────────────────────────────

// Serve docs/ for README image references (./docs/examples/*.svg → /docs/examples/*.svg)
app.use('/docs', express.static(DOCS_DIR))

// Serve playground UI from public/
app.use(express.static(path.join(__dirname, '../public')))

// ── Page routes ───────────────────────────────────────────────────────────────

/** GET /demo — serve the merged demo + renderer lab UI */
app.get('/demo', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/demo.html'))
})

/** GET /lab — redirect to /demo for backward compatibility */
app.get('/lab', (_req, res) => {
  res.redirect(301, '/demo')
})

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
You are an AI assistant embedded in the MdArt Demo — a browser tool for
authoring mdart diagrams and editing TypeScript layout renderers.

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
- Help author mdart source diagrams and explain syntax

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
