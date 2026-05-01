import path from 'node:path'

export type CliName = 'claude' | 'opencode'

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
    if (key.startsWith('CLAUDE')) continue
    out[key] = val
  }
  if (env.ANTHROPIC_BASE_URL) out.ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL
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

const claudeModels: ModelOption[] = [
  { value: null, label: 'Default' },
  { value: 'claude-opus-4-6', label: 'Opus 4.6' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { value: 'claude-opus-4-5', label: 'Opus 4.5' },
  { value: 'claude-sonnet-4-5', label: 'Sonnet 4.5' },
  { value: 'claude-haiku-4-5', label: 'Haiku 4.5' },
]

// Mirrors steward's curated opencode model list (server/src/cli/opencode-adapter.ts).
// Pricing comments (USD per Mtok input / output) are sourced from opencode's
// models.dev registry — see ~/.cache/opencode/models.json. Use these to judge
// cost vs. tier when adding entries; not authoritative billing.
//
// `null` = no `--model` flag, lets opencode read OPENCODE_DEFAULT_MODEL.
const opencodeModels: ModelOption[] = [
  { value: null,                              label: 'Default (env)' },
  // opencode-hosted — no API key required; free, rate-limited by opencode
  { value: 'opencode/big-pickle',             label: 'Big Pickle (opencode, free)' },
  { value: 'opencode/gpt-5-nano',             label: 'GPT-5 Nano (opencode, free)' },
  { value: 'opencode/nemotron-3-super-free',  label: 'Nemotron 3 Super (opencode, free)' },
  { value: 'opencode/minimax-m2.5-free',      label: 'MiniMax M2.5 (opencode, free)' },
  { value: 'opencode/hy3-preview-free',       label: 'HY3 Preview (opencode, free)' },
  // Google — Gemini API key
  { value: 'google/gemini-2.5-pro',           label: 'Gemini 2.5 Pro' },
  { value: 'google/gemini-2.5-flash',         label: 'Gemini 2.5 Flash' },
  { value: 'google/gemma-4-31b-it',           label: 'Gemma 4 31B' },
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
    args.push('--allowedTools', 'Bash(node *) Bash(npm *) Bash(npx *)')
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
}

export function normalizeCliName(value: unknown): CliName {
  return value === 'opencode' ? 'opencode' : 'claude'
}

export function defaultCliName(): CliName {
  return normalizeCliName(process.env.STEWARD_CLI)
}

export function getAdapter(name?: unknown): CliAdapter {
  return adapters[normalizeCliName(name ?? defaultCliName())]
}
