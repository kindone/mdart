import path from 'node:path'

export type CliName = 'claude' | 'opencode' | 'codex'

export type ErrorCode = 'session_expired' | 'context_limit' | 'provider_quota' | 'process_error'

export type ModelOption = {
  value: string | null
  label: string
}

export type CliCapabilities = {
  streamingTokens: boolean
  toolUseStructured: boolean
  branchResume: boolean
}

export type LaunchOptions = {
  prompt: string
  resumeId: string | null
  systemPrompt: string | null
  model: string | null
  workingDirectory: string
  extraDirs: string[]
}

export type CanonicalEvent =
  | { type: 'session_id'; externalId: string }
  | { type: 'text_block_start' }
  | { type: 'text_delta'; text: string }
  | { type: 'result_done'; externalId: string }
  | { type: 'result_error'; code: ErrorCode; message: string; errorText: string }

export interface CliParser {
  parseLine(line: string): { rawChunk: unknown | null; events: CanonicalEvent[] }
}

export interface CliAdapter {
  readonly name: CliName
  readonly models: ModelOption[]
  readonly capabilities: CliCapabilities
  binaryPath(): string
  buildArgs(opts: LaunchOptions): string[]
  buildEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv
  createParser(opts: LaunchOptions): CliParser
  classifyError(text: string, hadResume: boolean): ErrorCode
}

const CLAUDE_ALLOWED_TOOLS = [
  'Bash(node *)',
  'Bash(npm *)',
  'Bash(npx *)',
  'Bash(git status*)',
  'Bash(git diff*)',
  'Bash(git log*)',
  'Bash(git add *)',
  'Bash(git commit *)',
].join(' ')

export function defaultUserMessageForErrorCode(code: ErrorCode, rawErrorText: string): string {
  if (code === 'provider_quota') return 'The AI provider rate limit or quota was reached. Try again later or check provider billing and usage limits.'
  if (code === 'context_limit') return 'Context limit reached. Start a fresh chat or reduce the attached context.'
  if (code === 'session_expired') return 'The previous CLI session could not be resumed. The next message will start a fresh conversation.'
  return rawErrorText
}

function classifyCommonError(text: string): ErrorCode {
  const lower = (text || '').toLowerCase()
  if (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('resource exhausted') ||
    lower.includes('too many requests') ||
    lower.includes('429') ||
    lower.includes('overload') ||
    lower.includes('overloaded') ||
    lower.includes('529')
  ) return 'provider_quota'

  if (
    lower.includes('context') ||
    lower.includes('too long') ||
    lower.includes('too many tokens') ||
    lower.includes('maximum') ||
    lower.includes('token limit')
  ) return 'context_limit'

  if (
    lower.includes('invalid model') ||
    lower.includes('unknown model') ||
    lower.includes('model not found') ||
    lower.includes('providermodelnotfound') ||
    (lower.includes('model') && lower.includes('not found'))
  ) return 'process_error'

  if (
    lower.includes('session not found') ||
    lower.includes('session expired') ||
    lower.includes('session has expired') ||
    lower.includes('no such session') ||
    lower.includes('could not resume') ||
    lower.includes('could not be resumed') ||
    lower.includes('conversation not found') ||
    lower.includes('no conversation found')
  ) return 'session_expired'

  return 'process_error'
}

function parseJsonLine(line: string): Record<string, unknown> | null {
  if (!line.trim()) return null
  try { return JSON.parse(line) as Record<string, unknown> } catch { return null }
}

function cleanClaudeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {}
  for (const [key, val] of Object.entries(env)) {
    if (val === undefined) continue
    // Strip CLAUDE* (CLAUDECODE=1 hangs the child) and ANTHROPIC_API_KEY so the
    // spawned CLI falls back to the OAuth credentials at ~/.claude/.credentials.json
    // (subscription billing) instead of API-key billing. Without this, a depleted
    // ANTHROPIC_API_KEY in steward's .env propagates here and every chat turn
    // fails with "Credit balance is too low" even though Claude Pro is active.
    // Mirrors steward's fix in commit a7297e1.
    if (key.startsWith('CLAUDE')) continue
    if (key === 'ANTHROPIC_API_KEY') continue
    out[key] = val
  }
  // Re-admit explicit allowlist
  if (env.CLAUDE_CODE_OAUTH_TOKEN) out.CLAUDE_CODE_OAUTH_TOKEN = env.CLAUDE_CODE_OAUTH_TOKEN
  if (env.ANTHROPIC_BASE_URL)      out.ANTHROPIC_BASE_URL      = env.ANTHROPIC_BASE_URL
  return out
}

function buildOpencodeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {}
  for (const [key, val] of Object.entries(env)) {
    if (val === undefined) continue
    if (key === 'CLAUDECODE') continue
    out[key] = val
  }
  if (!('OPENCODE_ENABLE_EXA' in out)) out.OPENCODE_ENABLE_EXA = '1'
  return out
}

class ClaudeParser implements CliParser {
  private sessionIdEmitted = false

  constructor(private readonly opts: LaunchOptions) {}

  parseLine(line: string): { rawChunk: unknown | null; events: CanonicalEvent[] } {
    const chunk = parseJsonLine(line)
    if (!chunk) return { rawChunk: null, events: [] }

    const events: CanonicalEvent[] = []
    if (chunk.type === 'system' && chunk.subtype === 'init' && !this.sessionIdEmitted) {
      const id = typeof chunk.session_id === 'string' ? chunk.session_id : ''
      if (id) {
        this.sessionIdEmitted = true
        events.push({ type: 'session_id', externalId: id })
      }
    }

    if (chunk.type === 'stream_event') {
      const ev = chunk.event as Record<string, unknown> | undefined
      const contentBlock = ev?.content_block as Record<string, unknown> | undefined
      const delta = ev?.delta as Record<string, unknown> | undefined
      if (ev?.type === 'content_block_start' && contentBlock?.type === 'text') events.push({ type: 'text_block_start' })
      if (ev?.type === 'content_block_delta' && delta?.type === 'text_delta') {
        events.push({ type: 'text_delta', text: String(delta.text ?? '') })
      }
    }

    if (chunk.type === 'result') {
      const isError = chunk.is_error === true
      const sessionId = typeof chunk.session_id === 'string' ? chunk.session_id : ''
      if (isError) {
        const errors = Array.isArray(chunk.errors) ? chunk.errors.map(String).join('; ') : ''
        const errorText = errors || String(chunk.result ?? 'Claude error')
        const code = claudeAdapter.classifyError(errorText, Boolean(this.opts.resumeId))
        events.push({ type: 'result_error', code, message: defaultUserMessageForErrorCode(code, errorText), errorText })
      } else {
        events.push({ type: 'result_done', externalId: sessionId })
      }
    }

    return { rawChunk: chunk, events }
  }
}

class OpencodeParser implements CliParser {
  private sessionIdEmitted = false

  constructor(private readonly opts: LaunchOptions) {}

  parseLine(line: string): { rawChunk: unknown | null; events: CanonicalEvent[] } {
    const chunk = parseJsonLine(line)
    if (!chunk) return { rawChunk: null, events: [] }

    const events: CanonicalEvent[] = []
    const sessionID = typeof chunk.sessionID === 'string' ? chunk.sessionID : ''
    if (sessionID && !this.sessionIdEmitted) {
      this.sessionIdEmitted = true
      events.push({ type: 'session_id', externalId: sessionID })
    }

    if (chunk.type === 'text') {
      const part = chunk.part as Record<string, unknown> | undefined
      const text = typeof part?.text === 'string' ? part.text : ''
      if (text) {
        events.push({ type: 'text_block_start' })
        events.push({ type: 'text_delta', text })
      }
    }

    if (chunk.type === 'step_finish') {
      const part = chunk.part as Record<string, unknown> | undefined
      if (part?.reason === 'stop') events.push({ type: 'result_done', externalId: sessionID })
    }

    if (chunk.type === 'error') {
      const err = chunk.error as Record<string, unknown> | undefined
      const data = err?.data as Record<string, unknown> | undefined
      const errorText = String(data?.message ?? err?.name ?? 'opencode error')
      const code = opencodeAdapter.classifyError(errorText, Boolean(this.opts.resumeId))
      events.push({ type: 'result_error', code, message: defaultUserMessageForErrorCode(code, errorText), errorText })
    }

    return { rawChunk: chunk, events }
  }
}

// Mirrors steward's curated Claude CLI model list (server/src/cli/claude-adapter.ts).
// claude-fable-5 draws from a separate usage-credit pool and 429s with
// "requires usage credits" if the account doesn't have any.
const claudeModels: ModelOption[] = [
  { value: null, label: 'Default' },
  { value: 'claude-sonnet-5', label: 'Sonnet 5' },
  { value: 'claude-opus-5', label: 'Opus 5' },
  { value: 'claude-opus-4-8', label: 'Opus 4.8' },
  { value: 'claude-opus-4-7', label: 'Opus 4.7' },
  { value: 'claude-fable-5', label: 'Fable 5 (usage credits)' },
  { value: 'claude-haiku-4-5', label: 'Haiku 4.5' },
]

// Mirrors steward's curated opencode model list (server/src/cli/opencode-adapter.ts).
// Pricing comments (USD per Mtok input / output) are sourced from opencode's
// models.dev registry — see ~/.cache/opencode/models.json. Use these to judge
// cost vs. tier when adding entries; not authoritative billing.
//
// `null` = no `--model` flag, lets opencode read OPENCODE_DEFAULT_MODEL.
const opencodeModels: ModelOption[] = [
  { value: null,                                    label: 'Default (env)' },
  // opencode Go subscription — requires opencode Go auth (`opencode auth login`)
  { value: 'opencode-go/kimi-k2.7-code',            label: 'Kimi K2.7 Code (Go)' },
  { value: 'opencode-go/kimi-k2.6',                 label: 'Kimi K2.6 (Go)' },
  { value: 'opencode-go/deepseek-v4-pro',           label: 'DeepSeek V4 Pro (Go)' },
  { value: 'opencode-go/deepseek-v4-flash',         label: 'DeepSeek V4 Flash (Go)' },
  { value: 'opencode-go/minimax-m3',                label: 'MiniMax M3 (Go)' },
  { value: 'opencode-go/minimax-m2.7',              label: 'MiniMax M2.7 (Go)' },
  { value: 'opencode-go/qwen3.7-max',               label: 'Qwen 3.7 Max (Go)' },
  { value: 'opencode-go/qwen3.7-plus',              label: 'Qwen 3.7 Plus (Go)' },
  { value: 'opencode-go/qwen3.6-plus',              label: 'Qwen 3.6 Plus (Go)' },
  { value: 'opencode-go/mimo-v2.5-pro',             label: 'Mimo V2.5 Pro (Go)' },
  { value: 'opencode-go/mimo-v2.5',                 label: 'Mimo V2.5 (Go)' },
  { value: 'opencode-go/glm-5.2',                   label: 'GLM 5.2 (Go)' },
  { value: 'opencode-go/glm-5.1',                   label: 'GLM 5.1 (Go)' },
  // opencode-hosted free — no API key required; rate-limited by opencode
  { value: 'opencode/big-pickle',                   label: 'Big Pickle (opencode, free)' },
  { value: 'opencode/deepseek-v4-flash-free',       label: 'DeepSeek V4 Flash (opencode, free)' },
  { value: 'opencode/mimo-v2.5-free',               label: 'Mimo V2.5 (opencode, free)' },
  { value: 'opencode/nemotron-3-ultra-free',        label: 'Nemotron 3 Ultra (opencode, free)' },
  { value: 'opencode/north-mini-code-free',         label: 'North Mini Code (opencode, free)' },
  // Google — Gemini API key
  { value: 'google/gemini-3.5-flash',               label: 'Gemini 3.5 Flash' },
  { value: 'google/gemini-3.1-pro-preview',         label: 'Gemini 3.1 Pro' },
  { value: 'google/gemini-3.1-flash-lite',          label: 'Gemini 3.1 Flash Lite' },
  { value: 'google/gemini-3-flash-preview',         label: 'Gemini 3 Flash' },
  { value: 'google/gemini-2.5-pro',                 label: 'Gemini 2.5 Pro' },
  { value: 'google/gemini-2.5-flash',               label: 'Gemini 2.5 Flash' },
  { value: 'google/gemma-4-31b-it',                 label: 'Gemma 4 31B' },
  { value: 'google/gemma-4-26b-a4b-it',             label: 'Gemma 4 26B' },
  // Anthropic — via opencode (separate from the Claude CLI adapter)
  { value: 'anthropic/claude-opus-4-6',       label: 'Opus 4.6 (via opencode)' },
  { value: 'anthropic/claude-sonnet-4-6',     label: 'Sonnet 4.6 (via opencode)' },
  { value: 'anthropic/claude-haiku-4-5',      label: 'Haiku 4.5 (via opencode)' },
  // OpenAI — OPENAI_API_KEY (cheap → frontier; pricing per Mtok in/out from models.dev)
  // GPT-5.x family (chat-optimised)
  { value: 'openai/gpt-5-nano',               label: 'GPT-5 Nano' },                 // $0.05 / $0.4
  { value: 'openai/gpt-5.4-nano',             label: 'GPT-5.4 Nano' },               // $0.2  / $1.25
  { value: 'openai/gpt-5-mini',               label: 'GPT-5 Mini' },                 // $0.25 / $2
  { value: 'openai/gpt-5.4-mini',             label: 'GPT-5.4 Mini' },               // $0.75 / $4.5
  { value: 'openai/gpt-5.1',                  label: 'GPT-5.1' },                    // $1.25 / $10
  { value: 'openai/gpt-5.1-codex',            label: 'GPT-5.1 Codex' },
  { value: 'openai/gpt-5.2',                  label: 'GPT-5.2' },                    // ~$1.75/ $14
  { value: 'openai/gpt-5.4',                  label: 'GPT-5.4 (1M ctx)' },           // $2.50 / $15
  { value: 'openai/gpt-5.5',                  label: 'GPT-5.5 (1M ctx)' },           // $5    / $30
  { value: 'openai/gpt-5',                    label: 'GPT-5' },
  { value: 'openai/gpt-5-pro',                label: 'GPT-5 Pro' },                  // $15   / $120
  // GPT-4.x (still cheap / widely supported)
  { value: 'openai/gpt-4.1-nano',             label: 'GPT-4.1 Nano' },
  { value: 'openai/gpt-4.1-mini',             label: 'GPT-4.1 Mini' },
  { value: 'openai/gpt-4.1',                  label: 'GPT-4.1' },
  { value: 'openai/gpt-4o-mini',              label: 'GPT-4o Mini' },
  { value: 'openai/gpt-4o',                   label: 'GPT-4o' },
  // OpenAI reasoning
  { value: 'openai/o4-mini',                  label: 'o4-mini' },
  { value: 'openai/o3-mini',                  label: 'o3-mini' },
  { value: 'openai/o3',                       label: 'o3' },
  { value: 'openai/o1',                       label: 'o1' },
  // Groq — GROQ_API_KEY (LPU inference; Apr 2026 free tier).
  // Curated to models that survive Groq's per-model TPM caps with opencode's
  // ~50K-token system prompt + tool defs. Most Groq free models cap at 6–12K
  // TPM (llama-3.3-70b, qwen3-32b, gpt-oss-20b/120b, llama-3.1-8b) and 429
  // immediately. llama-4-scout passes; verified text + tool-use end-to-end.
  { value: 'groq/meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B (Groq, free)' },
]

// ── Codex ─────────────────────────────────────────────────────────────────────

/**
 * Codex CLI adapter for the MdArt demo.
 *
 * Codex is OpenAI's open-source agent CLI (https://github.com/openai/codex).
 * It emits JSONL events on stdout in `exec --json` mode.
 *
 * Auth note: OPENAI_API_KEY env alone is insufficient — codex requires a
 * prior `codex login --with-api-key` or `codex login --device-auth` call.
 * Auth is stored in ~/.codex/auth.json. The demo does not manage auth.
 *
 * Event mapping:
 *   thread.started          → session_id (thread_id as externalId)
 *   item.completed (agent_message) → text_block_start + text_delta
 *   turn.completed          → result_done
 *   turn.failed             → result_error
 *   error (recoverable)     → ignored (codex retries internally)
 */

function classifyCodexError(text: string): ErrorCode {
  const lower = (text || '').toLowerCase()
  if (
    lower.includes('missing bearer') ||
    lower.includes('api key') ||
    lower.includes('credential') ||
    lower.includes('unauthorized') ||
    lower.includes('not supported when using codex')
  ) return 'process_error'
  if (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('check your plan and billing') ||
    lower.includes('usage limit') ||
    lower.includes('429')
  ) return 'provider_quota'
  if (
    lower.includes('context') ||
    lower.includes('too long') ||
    lower.includes('too many tokens') ||
    lower.includes('token limit')
  ) return 'context_limit'
  if (
    lower.includes('session not found') ||
    lower.includes('thread not found') ||
    lower.includes('could not resume') ||
    lower.includes('could not be resumed')
  ) return 'session_expired'
  return 'process_error'
}

class CodexParser implements CliParser {
  private sessionIdEmitted = false
  private threadId: string | null = null

  constructor(private readonly opts: LaunchOptions) {}

  parseLine(line: string): { rawChunk: unknown | null; events: CanonicalEvent[] } {
    if (!line.trim()) return { rawChunk: null, events: [] }
    let chunk: Record<string, unknown>
    try { chunk = JSON.parse(line) as Record<string, unknown> } catch { return { rawChunk: null, events: [] } }

    const events: CanonicalEvent[] = []

    if (chunk.type === 'thread.started') {
      const tid = typeof chunk.thread_id === 'string' ? chunk.thread_id : ''
      if (tid) {
        this.threadId = tid
        if (!this.sessionIdEmitted) {
          this.sessionIdEmitted = true
          events.push({ type: 'session_id', externalId: tid })
        }
      }
    } else if (chunk.type === 'item.completed') {
      const item = chunk.item as Record<string, unknown> | undefined
      if (item?.type === 'agent_message') {
        const text = typeof item.text === 'string' ? item.text : ''
        if (text) {
          events.push({ type: 'text_block_start' })
          events.push({ type: 'text_delta', text })
        }
      }
    } else if (chunk.type === 'turn.completed') {
      events.push({ type: 'result_done', externalId: this.threadId ?? '' })
    } else if (chunk.type === 'turn.failed') {
      const err = chunk.error as Record<string, unknown> | undefined
      const errorText = typeof err?.message === 'string' ? err.message : 'codex error'
      const code = classifyCodexError(errorText)
      events.push({ type: 'result_error', code, message: defaultUserMessageForErrorCode(code, errorText), errorText })
    }
    // 'error' events are recoverable internal retries — codex handles them itself; ignore.

    return { rawChunk: chunk, events }
  }
}

// Mirrors steward's codex fallback list (server/src/cli/codex-adapter.ts).
// Steward additionally probes `codex debug models` at runtime and prefers
// that dynamic list when available; this demo always uses the static one.
const codexModels: ModelOption[] = [
  { value: null,       label: 'Default (codex picks)' },
  { value: 'gpt-5.5',  label: 'GPT-5.5' },
  { value: 'gpt-5.4',  label: 'GPT-5.4' },
  { value: 'gpt-5.2',  label: 'GPT-5.2' },
]

function buildCodexEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {}
  for (const [key, val] of Object.entries(env)) {
    if (val === undefined) continue
    if (key === 'CLAUDECODE') continue  // defensive scrub
    out[key] = val
  }
  // Silence Rust tracing logs that otherwise spam stderr during connection retries.
  if (!('RUST_LOG' in out)) out.RUST_LOG = 'off'
  return out
}

export const codexAdapter: CliAdapter = {
  name: 'codex',
  models: codexModels,
  capabilities: { streamingTokens: false, toolUseStructured: false, branchResume: true },
  binaryPath: () => process.env.CODEX_PATH ?? 'codex',
  buildArgs: (opts) => {
    const args: string[] = ['exec', '--skip-git-repo-check', '--json', '--dangerously-bypass-approvals-and-sandbox']
    if (opts.workingDirectory) args.push('-C', path.resolve(opts.workingDirectory))
    if (opts.model) args.push('-m', opts.model)
    const fullPrompt = opts.systemPrompt
      ? `${opts.systemPrompt}\n\n---\n\n${opts.prompt}`
      : opts.prompt
    if (opts.resumeId) {
      args.push('resume', opts.resumeId, fullPrompt)
    } else {
      args.push(fullPrompt)
    }
    return args
  },
  buildEnv: buildCodexEnv,
  createParser: (opts) => new CodexParser(opts),
  classifyError: (text) => classifyCodexError(text),
}

export const claudeAdapter: CliAdapter = {
  name: 'claude',
  models: claudeModels,
  capabilities: { streamingTokens: true, toolUseStructured: true, branchResume: true },
  binaryPath: () => process.env.CLAUDE_PATH ?? `${process.env.HOME ?? '/usr/local'}/.local/bin/claude`,
  buildArgs: (opts) => {
    const args = [
      '--print', opts.prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--permission-mode', 'acceptEdits',
    ]
    for (const dir of opts.extraDirs) args.push('--add-dir', dir)
    args.push('--allowedTools', CLAUDE_ALLOWED_TOOLS)
    args.push('--mcp-config', '{"mcpServers":{}}')
    args.push('--strict-mcp-config')
    if (opts.systemPrompt) args.push('--system-prompt', opts.systemPrompt)
    if (opts.resumeId) args.push('--resume', opts.resumeId)
    if (opts.model) args.push('--model', opts.model)
    return args
  },
  buildEnv: cleanClaudeEnv,
  createParser: (opts) => new ClaudeParser(opts),
  classifyError: (text) => classifyCommonError(text),
}

export const opencodeAdapter: CliAdapter = {
  name: 'opencode',
  models: opencodeModels,
  capabilities: { streamingTokens: false, toolUseStructured: true, branchResume: true },
  binaryPath: () => process.env.OPENCODE_PATH ?? `${process.env.HOME ?? '/root'}/.opencode/bin/opencode`,
  buildArgs: (opts) => {
    const args = ['run', '--dir', path.resolve(opts.workingDirectory), '--format', 'json', '--dangerously-skip-permissions']
    const model = opts.model ?? process.env.OPENCODE_DEFAULT_MODEL ?? null
    if (model) args.push('--model', model)
    if (opts.resumeId) args.push('-s', opts.resumeId)
    const prompt = opts.systemPrompt ? `${opts.systemPrompt}\n\n---\n\n${opts.prompt}` : opts.prompt
    args.push('--', prompt)
    return args
  },
  buildEnv: buildOpencodeEnv,
  createParser: (opts) => new OpencodeParser(opts),
  classifyError: (text) => classifyCommonError(text),
}

export const adapters: Record<CliName, CliAdapter> = {
  claude: claudeAdapter,
  opencode: opencodeAdapter,
  codex: codexAdapter,
}

export function normalizeCliName(value: unknown): CliName {
  if (value === 'opencode') return 'opencode'
  if (value === 'codex') return 'codex'
  return 'claude'
}

export function defaultCliName(): CliName {
  return normalizeCliName(process.env.STEWARD_CLI)
}

export function getAdapter(name?: unknown): CliAdapter {
  return adapters[normalizeCliName(name ?? defaultCliName())]
}
