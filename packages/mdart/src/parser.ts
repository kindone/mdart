export interface MdArtItem {
  label: string
  value?: string          // from "label: value" pattern
  attrs: string[]         // from [attr, attr] brackets
  children: MdArtItem[]
  flowChildren: MdArtItem[]   // → prefixed children
  prefix?: '+' | '-' | '?' | '!'  // swot prefix chars
  isIntersection?: boolean        // label contains ∩
  isMilestone?: boolean           // * prefix
}

export interface MdArtSpec {
  type: string
  /** Visual-variant discriminator within a consolidated type (e.g. `type: list, shape: bullet`). */
  shape?: string
  theme?: string
  mode?: 'dark' | 'light'
  title?: string
  direction?: 'LR' | 'TB'
  width?: number
  items: MdArtItem[]
  nodes?: string[]        // for network graph sections
  edges?: Array<{from: string, to: string}>
  columns?: string[]      // explicit column headers for grid renderers (matrix-nxm, heatmap)
  colors?: Record<string, string | string[]>  // per-fence color overrides

  // ── Plot family (line-chart, scatter, area-chart, bar-chart) ──────────────
  // x-axis tick labels: `x: Q1, Q2, Q3, Q4` (categorical); ignored when
  // any series uses `(x,y)` numeric pair syntax — that switches the axis to
  // continuous numeric mode with auto-computed ticks.
  xAxis?: string[]
  xLabel?: string         // x-axis title (e.g. "USD (M)")
  yLabel?: string         // y-axis title
  // Per-chart options.
  smooth?: boolean        // line/area: Catmull-Rom curves through points
  points?: boolean        // line/area: force markers on / off (else auto)
  lineWidth?: number      // default stroke-width for line/area series
  stack?: boolean         // bar-chart: stack series instead of grouping
  grid?: boolean          // hide gridlines when false (default true)
  ticks?: boolean         // hide tick labels when false (default true)
  // Shaded bands and reference lines, multi-line keys (each occurrence pushes).
  shadeY?: Array<{ a: string; b: string; label: string }>
  shadeX?: Array<{ a: string; b: string; label: string }>
  refY?:   Array<{ at: string; atLabel?: string; label: string }>
  refX?:   Array<{ at: string; atLabel?: string; label: string }>

  raw: string

  // ── Network ───────────────────────────────────────────────────────────────
  edgeStyle?: 'straight' | 'curved'  // network: `edges: straight` opts out of default curved bézier

  // ── Animation ─────────────────────────────────────────────────────────────
  animate?: boolean     // false = disable; undefined = use global/default (on)
  animateSpeed?: number // multiplier: >1 = faster, <1 = slower (default 1.0)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Plot helpers ─────────────────────────────────────────────────────────────

const TRUTHY = new Set(['true', 'yes', '1', 'on'])
const FALSY  = new Set(['false', 'no', '0', 'off', 'none', 'hidden'])
function asBool(v: string): boolean | null {
  const s = v.toLowerCase().trim()
  if (TRUTHY.has(s)) return true
  if (FALSY.has(s))  return false
  return null
}

/** Split "100..300 [warning]" / "Mar..Apr [campaign]" into a/b range + optional label.
 *  Accepts `..`, `—`, or whitespace-padded `-` as separator. */
function parseRangeWithLabel(val: string): { a: string; b: string; label: string } | null {
  const m = val.match(/^([^[]+?)\s*(?:\[(.+?)\])?\s*$/)
  if (!m) return null
  const range = m[1].trim()
  const label = (m[2] || '').trim()
  let a: string, b: string
  if (range.includes('..'))      [a, b] = range.split('..').map(s => s.trim())
  else if (range.includes('—'))  [a, b] = range.split('—').map(s => s.trim())
  else {
    // Hyphen split — require padding so "−5" / "100-200" with no spaces works.
    const dash = range.match(/^\s*(\S.*?)\s+-\s+(\S.*?)\s*$/)
    if (dash) { a = dash[1]; b = dash[2] }
    else      { a = range; b = range }
  }
  return { a, b, label }
}

/** Split "250 [SLA]" into at + optional label.
 *  Optional `@ <secondary>` syntax positions the label along the perpendicular
 *  axis: e.g. `ref-x: 12 @ 65 [Plateau]` puts the label at (x=12, y=65) in
 *  data coordinates instead of pinning it to the top edge.
 */
function parseRefWithLabel(val: string): { at: string; atLabel?: string; label: string } | null {
  const m = val.match(/^([^[]+?)\s*(?:\[(.+?)\])?\s*$/)
  if (!m) return null
  const head = m[1].trim()
  const label = (m[2] || '').trim()
  const atMatch = head.match(/^(.+?)\s*@\s*(\S.*)$/)
  if (atMatch) {
    return { at: atMatch[1].trim(), atLabel: atMatch[2].trim(), label }
  }
  return { at: head, label }
}

function parseAttrs(segment: string): { cleanLabel: string; attrs: string[] } {
  // Repeatedly strip trailing [...] groups so multiple separate bracket
  // pairs are all extracted (e.g. "foo [a] [b] [c]" → label "foo", attrs
  // ["a","b","c"]). Comma-lists inside a single bracket also still split.
  let s = segment
  const attrs: string[] = []
  while (true) {
    const m = s.match(/^(.*?)\s*\[([^\]]*)\]\s*$/)
    if (!m) break
    const inside = m[2].split(',').map(a => a.trim()).filter(Boolean)
    attrs.unshift(...inside)   // preserve left-to-right user order
    s = m[1]
  }
  return { cleanLabel: s.trim(), attrs }
}

function parseLabelValue(raw: string): { label: string; value?: string } {
  // Find the first `:` that qualifies as a key/value split. A colon
  // qualifies only when ALL of the following hold:
  //
  //   1. It is not preceded by an escaping backslash (`\:` is literal —
  //      `\\:` means a literal `\` followed by a free `:`; we don't model
  //      a `\\` → `\` escape, so backslashes elsewhere stay literal).
  //   2. It is not the leading `:` of a URL scheme (`://`).
  //   3. It is followed by whitespace or end-of-line. (YAML-strict.
  //      Distinguishes `Cache: 5ms` from `3:30pm`, `aspect-ratio:16:9`,
  //      `:rocket:`, etc.)
  //   4. It is not flanked by digits on both sides (`3:30`, `16:9`).
  //   5. It is not nested inside `()`, `[]`, `{}`, or `"…"`. Common
  //      English-prose constructs like `Cache (e.g.: redis)` or
  //      `Says "hello: world"` keep the inner `:` as part of the label.
  //
  // Apostrophe (`'`) intentionally does NOT toggle a quote scope: it is
  // far more common as a contraction (`it's`, `don't`) than a quote
  // delimiter. Use double quotes if you need a literal-quote scope, or
  // `\:` to escape the colon directly.
  //
  // Edge cases that still need `\:` (escape):
  //   • Sentence-initial labels: `Note: do this later` (still ambiguous —
  //     the colon does have whitespace after, no parens, no digits).
  //   • Emoji shortcodes: `:rocket: launches` (second colon has space).
  //
  // After the split point is chosen, `\:` sequences are unescaped to `:`
  // in both the label and value sides.
  let parenD = 0, brackD = 0, braceD = 0
  let inDQ = false   // double-quote scope (only)
  let colonIdx = -1
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (c === '"') { inDQ = !inDQ; continue }
    if (inDQ) continue
    if (c === '(') { parenD++; continue }
    if (c === ')') { if (parenD > 0) parenD--; continue }
    if (c === '[' || c === '\x00') { brackD++; continue }
    if (c === ']' || c === '\x01') { if (brackD > 0) brackD--; continue }
    if (c === '{') { braceD++; continue }
    if (c === '}') { if (braceD > 0) braceD--; continue }
    if (c !== ':') continue
    // Inside any nested group → keep as label content.
    if (parenD > 0 || brackD > 0 || braceD > 0) continue
    // Backslash escape: count consecutive backslashes immediately before.
    let bs = 0
    for (let j = i - 1; j >= 0 && raw[j] === '\\'; j--) bs++
    if (bs % 2 === 1) continue
    // URL-scheme guard.
    if (raw[i + 1] === '/' && raw[i + 2] === '/') continue
    // Digit-on-both-sides guard.
    const prev = raw[i - 1]
    const next = raw[i + 1]
    if (prev !== undefined && /\d/.test(prev) && next !== undefined && /\d/.test(next)) continue
    // YAML-strict: must be followed by whitespace or end-of-line.
    if (next !== undefined && !/\s/.test(next)) continue
    colonIdx = i
    break
  }
  const unescape = (s: string) => s.replace(/\\:/g, ':').replace(/\\→/g, '→').replace(/\\->/g, '->')
  if (colonIdx === -1) return { label: unescape(raw.trim()) }
  const label = unescape(raw.slice(0, colonIdx).trim())
  const value = unescape(raw.slice(colonIdx + 1).trim())
  return { label, value: value || undefined }
}

function parseItem(rawLine: string): MdArtItem {
  // Pre-protect escaped brackets so they survive both parseAttrs passes.
  // \[content] → NUL+content+SOH  (matched pair → restores to [content])
  // \[          → NUL             (unmatched open → restores to [)
  // These sentinels (0x00 / 0x01) never appear in real user input.
  const withProtectedBrackets = rawLine
    .replace(/\\\[([^\]]*)\]/g, '\x00$1\x01')
    .replace(/\\\[/g, '\x00')

  const restoreBrackets = (s: string) =>
    s.replace(/\x00([^\x01]*)\x01/g, '[$1]').replace(/\x00/g, '[')

  // 0. Strip leading markdown-style checkbox marker if present.
  //    "[ ]" → open (strip from label, no state change)
  //    "[x]" / "[X]" → done (strip from label, add "done" attr so the
  //    checklist renderer treats it like "Item [done]")
  let checkboxDone = false
  let line = withProtectedBrackets
  const cbMatch = line.match(/^\[([ xX])\]\s+(.*)$/)
  if (cbMatch) {
    checkboxDone = cbMatch[1].toLowerCase() === 'x'
    line = cbMatch[2]
  }

  // 1. Pull off trailing [attrs] from the whole line ("label [x]" or "label: value [x]").
  const tailParsed = parseAttrs(line)
  // 2. Split label from value on the first non-URL colon.
  const { label: rawLabel, value: rawValue } = parseLabelValue(tailParsed.cleanLabel)
  // 3. Also check the label portion for its own [attrs] ("label [x]: value").
  const labelParsed = parseAttrs(rawLabel)
  // 4. Restore escaped brackets in label and value.
  const label = restoreBrackets(labelParsed.cleanLabel)
  const value = rawValue ? restoreBrackets(rawValue) : undefined
  const attrs = [...labelParsed.attrs, ...tailParsed.attrs]
  if (checkboxDone && !attrs.includes('done')) attrs.push('done')
  return {
    label,
    value,
    attrs,
    children: [],
    flowChildren: [],
    // Intersection is signalled by ∩ (math) or && (typeable). Both work in any
    // venn renderer, e.g. `Marketing && Sales` ≡ `Marketing ∩ Sales`.
    isIntersection: /∩|&&/.test(label),
  }
}

function leadingWhitespace(line: string): number {
  // Tabs count as 2 (matches the historical default unit). Mixed indents in the
  // same block resolve consistently as long as users pick one style.
  let n = 0
  for (const ch of line) {
    if (ch === ' ') n++
    else if (ch === '\t') n += 2
    else break
  }
  return n
}

function detectIndentUnit(lines: string[], bodyStart: number): number {
  // Find the smallest positive leading-whitespace count across body lines.
  // That becomes the indent step. Examples:
  //   "  - child"   → unit 2  (classic 2-space)
  //   "    - child" → unit 4  (4-space style)
  //   "\t- child"   → unit 2  (one tab, since tab counts as 2)
  // No indented lines → fall back to 2 (legacy behaviour).
  let min = Infinity
  for (let i = bodyStart; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const w = leadingWhitespace(lines[i])
    if (w > 0 && w < min) min = w
  }
  return min === Infinity ? 2 : min
}

function indentLevel(line: string, unit: number): number {
  return Math.floor(leadingWhitespace(line) / unit)
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseMdArt(raw: string, hintType?: string): MdArtSpec {
  try {
    return _parseMdArt(raw, hintType)
  } catch {
    // On any parse error, return a minimal valid spec
    return {
      type: hintType ?? 'process',
      items: [],
      raw,
    }
  }
}

function _parseMdArt(raw: string, hintType?: string): MdArtSpec {
  const lines = raw.split('\n')
  const spec: MdArtSpec = {
    type: hintType ?? '',
    items: [],
    raw,
  }

  // Track whether we're in nodes: or edges: sections
  let inNodes = false
  let inEdges = false
  const nodes: string[] = []
  const edges: Array<{from: string, to: string}> = []

  // ── Front-matter parsing ──────────────────────────────────────────────────
  // Front-matter: key: value lines before first blank line or bullet/flow/prefix/section
  const bodyStartChars = new Set(['-', '→', '+', '?', '!', '*'])
  const sectionHeaders = new Set(['nodes:', 'edges:'])

  let bodyStart = 0
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      // Blank lines are tolerated within front-matter — they're often used
      // for visual grouping. The body still starts at the first body-char
      // line, colon-less line, or unrecognized key. (Previously a blank line
      // ended front-matter outright, which surprised users who'd separated
      // groups of keys with whitespace and then saw later keys appear in the
      // legend as series.)
      continue
    }
    if (bodyStartChars.has(trimmed[0]) || sectionHeaders.has(trimmed.toLowerCase())) {
      bodyStart = i
      break
    }
    // Try to parse as front-matter key: value
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase()
      const val = trimmed.slice(colonIdx + 1).trim()
      if (key === 'type') spec.type = val
      else if (key === 'shape') spec.shape = val.toLowerCase()
      else if (key === 'theme') spec.theme = val
      else if (key === 'mode') {
        const m = val.toLowerCase()
        if (m === 'dark' || m === 'light') spec.mode = m
      }
      else if (key === 'title') spec.title = val
      else if (key === 'direction') spec.direction = val as 'LR' | 'TB'
      else if (key === 'width') spec.width = parseInt(val, 10) || undefined
      else if (['primary','secondary','accent','muted','bg','surface','border','text','textmuted','danger','warning'].includes(key)) {
        // Per-fence color override (e.g. `danger: #ff0000`)
        // Normalize camelCase lookup: textMuted can be entered as "textmuted" or "textMuted"
        const camelKey = key === 'textmuted' ? 'textMuted' : key
        if (!spec.colors) spec.colors = {}
        spec.colors[camelKey] = val
      } else if (key === 'palette') {
        // palette: #f00, #0f0, #00f  (comma-separated hex colours)
        if (!spec.colors) spec.colors = {}
        spec.colors['palette'] = val.split(',').map(c => c.trim()).filter(Boolean)
      } else if (key === 'columns') {
        // columns: Frontend, Backend, DevOps  (comma-separated column headers)
        spec.columns = val.split(',').map(c => c.trim()).filter(Boolean)
      }
      // ── Plot family front-matter ───────────────────────────────────────
      else if (key === 'x' || key === 'x-axis') {
        spec.xAxis = val.split(',').map(s => s.trim()).filter(Boolean)
      } else if (key === 'x-label' || key === 'xlabel' || key === 'label-x') {
        spec.xLabel = val
      } else if (key === 'y-label' || key === 'ylabel' || key === 'label-y') {
        spec.yLabel = val
      } else if (key === 'smooth') {
        const b = asBool(val); if (b !== null) spec.smooth = b
      } else if (key === 'points' || key === 'markers') {
        const b = asBool(val); if (b !== null) spec.points = b
      } else if (key === 'line-width' || key === 'linewidth' || key === 'lw' || key === 'stroke-width') {
        const n = parseFloat(val)
        if (!isNaN(n)) spec.lineWidth = n
      } else if (key === 'stack' || key === 'stacked') {
        const b = asBool(val); if (b !== null) spec.stack = b
      } else if (key === 'grid') {
        const b = asBool(val); if (b !== null) spec.grid = b
      } else if (key === 'ticks') {
        const b = asBool(val); if (b !== null) spec.ticks = b
      } else if (key === 'edges') {
        // `edges: straight|curved` — network edge style opt-in (body-level `edges:` section is separate)
        const v = val.toLowerCase()
        if (v === 'straight' || v === 'curved') spec.edgeStyle = v
      } else if (key === 'shade-y' || key === 'shade-x') {
        const r = parseRangeWithLabel(val)
        if (r) {
          if (key === 'shade-y') (spec.shadeY ??= []).push(r)
          else                   (spec.shadeX ??= []).push(r)
        }
      } else if (key === 'ref-y' || key === 'ref-x') {
        const r = parseRefWithLabel(val)
        if (r) {
          if (key === 'ref-y') (spec.refY ??= []).push(r)
          else                 (spec.refX ??= []).push(r)
        }
      } else if (key === 'animate') {
        const b = asBool(val); if (b !== null) spec.animate = b
      } else if (key === 'animate-speed' || key === 'animatespeed' || key === 'speed') {
        const n = parseFloat(val)
        if (!isNaN(n) && n > 0) spec.animateSpeed = n
      } else {
        // Not a recognized front-matter key — treat as body start
        bodyStart = i
        break
      }
      bodyStart = i + 1
    } else {
      // No colon — body start
      bodyStart = i
      break
    }
  }

  // Fallback to hintType if not set in front-matter
  if (!spec.type && hintType) spec.type = hintType
  if (!spec.type) spec.type = 'process'

  // ── Arrow chain detection ──────────────────────────────────────────────────
  // List-type diagrams use → as content (prose / math notation), not as a
  // flow separator, so chain detection must be suppressed for them.
  const isListType = /list/.test(spec.type)
  // Sequence diagrams use "A → B: msg" as flat message syntax — chain splitting
  // would incorrectly split those into two separate items.
  const isSequenceType = spec.type === 'sequence'

  // Check if the entire body is a single arrow-chain line. Skip when the line
  // is really a single key:value with → in the value (e.g. "direction: any → any")
  // — see the structurally-identical guard at the per-line branch below for the
  // disambiguation rationale.
  const bodyLines = lines.slice(bodyStart).filter(l => l.trim())
    .map(l => l.replace(/ -> /g, ' → '))  // normalise ASCII arrow in chain detection
  if (!isListType && !isSequenceType && bodyLines.length === 1 && bodyLines[0].includes(' → ')) {
    const chainLine = bodyLines[0].trim().replace(/^[-*]\s+/, '')
    const colonIdx  = chainLine.indexOf(': ')
    const arrowIdx  = chainLine.indexOf(' → ')
    const colonBeforeArrow = colonIdx !== -1 && colonIdx < arrowIdx
    const moreColonsAfterArrow = colonBeforeArrow && chainLine.indexOf(': ', arrowIdx) !== -1
    const isKeyValueOnly = colonBeforeArrow && !moreColonsAfterArrow
    if (!isKeyValueOnly) {
      const parts = chainLine.split(' → ')
      spec.items = parts.map(p => parseItem(p.trim()))
      return spec
    }
    // Fall through to the hierarchical parser, which will produce a single
    // item with label="direction" value="any → any".
  }

  // ── Hierarchical list parsing ──────────────────────────────────────────────
  // Stack-based: track indent depth. Indent unit auto-detected per fence so
  // 2-space, 4-space, and 1-tab styles all work — as long as the block is
  // internally consistent.
  const indentUnit = detectIndentUnit(lines, bodyStart)
  const stack: Array<{ item: MdArtItem; depth: number }> = []

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i]
    // Normalise ASCII arrow -> to unicode → so both syntaxes work
    const trimmed = line.trim()
      .replace(/^->\s/, '→ ')          // flow-child prefix:  -> Target
      .replace(/ -> /g, ' → ')         // chain / edge separator:  A -> B -> C
    if (!trimmed) continue

    // Section headers
    const lowerTrimmed = trimmed.toLowerCase()
    if (lowerTrimmed === 'nodes:') { inNodes = true; inEdges = false; continue }
    if (lowerTrimmed === 'edges:') { inEdges = true; inNodes = false; continue }

    // Nodes section
    if (inNodes) {
      if (trimmed.startsWith('- ')) {
        nodes.push(trimmed.slice(2).trim())
      }
      continue
    }

    // Edges section
    if (inEdges) {
      if (trimmed.startsWith('- ')) {
        const edgeStr = trimmed.slice(2).trim()
        const arrowIdx = edgeStr.indexOf(' → ')
        if (arrowIdx !== -1) {
          edges.push({ from: edgeStr.slice(0, arrowIdx).trim(), to: edgeStr.slice(arrowIdx + 3).trim() })
        }
      }
      continue
    }

    const depth = indentLevel(line, indentUnit)

    // Arrow chain line (can appear as a body line). Skip when the line is
    // really a key-value pair whose value happens to contain " → ":
    //
    //  Indented child of a structured parent (e.g. comparison column):
    //      - SyncStep1
    //        - direction: A → B   ← "A → B" is the value, NOT a chain
    //
    //  Single key:value at root with arrow in the value:
    //      direction: any → any   ← one colon, before the only arrow
    //
    // But genuine chains where each part is itself "key: value" must still
    // parse as chains (covered by an existing test):
    //      Alpha: First → Beta: Second → Gamma: Third
    // The disambiguator: a key:value-with-arrow-in-value pattern has *one*
    // colon and that colon is before the first arrow. A kv chain has more
    // colons appearing after the first arrow.
    if (!isListType && !isSequenceType && trimmed.includes(' → ') && !trimmed.startsWith('→') && depth === 0) {
      const chainLine = trimmed.replace(/^[-*]\s+/, '')
      const colonIdx  = chainLine.indexOf(': ')
      const arrowIdx  = chainLine.indexOf(' → ')
      const colonBeforeArrow = colonIdx !== -1 && colonIdx < arrowIdx
      const moreColonsAfterArrow = colonBeforeArrow && chainLine.indexOf(': ', arrowIdx) !== -1
      const isKeyValueOnly = colonBeforeArrow && !moreColonsAfterArrow
      if (!isKeyValueOnly) {
        const parts = chainLine.split(' → ')
        const items = parts.map(p => parseItem(p.trim()))
        spec.items.push(...items)
        stack.length = 0
        continue
      }
    }

    // Flow child: → prefix
    // Flow children attach to the nearest parent at a strictly shallower depth.
    // They are NOT pushed onto the stack themselves (they don't own sub-items
    // in the normal containment sense; they're edges, not containers).
    if (trimmed.startsWith('→ ')) {
      const raw = trimmed.slice(2).trim()
      const item = parseItem(raw)
      // At root level, a leading arrow continues a flat process:
      //
      //   First step
      //   → Second step
      //   → Third step
      //
      // There is no shallower parent at depth 0, and process renderers consume
      // top-level items. Treating these as children made every continuation
      // disappear from a basic process diagram.
      if (spec.type === 'process' && depth === 0 && spec.items.length > 0) {
        spec.items.push(item)
        stack.length = 0
        continue
      }
      // Find the nearest ancestor at a shallower depth
      let parentItem: MdArtItem | null = null
      for (let si = stack.length - 1; si >= 0; si--) {
        if (stack[si].depth < depth) {
          parentItem = stack[si].item
          break
        }
      }
      if (parentItem) {
        parentItem.flowChildren.push(item)
        parentItem.children.push(item)       // also visible to non-flow renderers
      } else if (spec.items.length > 0) {
        spec.items[spec.items.length - 1].flowChildren.push(item)
        spec.items[spec.items.length - 1].children.push(item)
      }
      // Do NOT push flow children onto the stack
      continue
    }

    // Prefix chars (SWOT): +, ?, ! are unambiguous (never used as list bullets).
    // '-' is ambiguous — it's both a list bullet AND a SWOT weakness marker.
    // We handle '-' in the regular list-item section below.
    const prefixMatch = trimmed.match(/^([+?!])\s+(.+)$/)
    if (prefixMatch) {
      const prefix = prefixMatch[1] as '+' | '?' | '!'
      const rest = prefixMatch[2]
      const item = parseItem(rest)
      item.prefix = prefix
      // Prefix items are flat — they don't nest in the stack
      spec.items.push(item)
      stack.length = 0
      continue
    }

    // Regular list item: - or * prefix
    // Both '-' and '*' are treated as generic bullets. The only special case is
    // that '-' at depth 0 in swot/pros-cons is also treated as a SWOT weakness
    // marker (assigning prefix: '-'). '*' never gets a SWOT prefix, so it can
    // be used for items that intentionally have no quadrant assignment.
    // NOTE: milestones in gantt are encoded via the range attr, e.g. [wk8*],
    // NOT via the '*' bullet prefix.
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const rest = trimmed.slice(2).trim()
      if ((spec.type === 'swot' || spec.type === 'pros-cons') && depth === 0 && trimmed.startsWith('- ')) {
        // Treat as SWOT weakness prefix item (flat, no parent-child nesting)
        const item = parseItem(rest)
        item.prefix = '-'
        spec.items.push(item)
        stack.length = 0
        continue
      }
      const item = parseItem(rest)
      // Pop stack until we're at a shallower depth
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop()
      }
      if (stack.length === 0) {
        spec.items.push(item)
      } else {
        stack[stack.length - 1].item.children.push(item)
        stack[stack.length - 1].item.flowChildren.push(item)  // also visible to flow renderers
      }
      stack.push({ item, depth })
      continue
    }

    // Plain line (no prefix): treat as a flat item at current depth
    const item = parseItem(trimmed)
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop()
    }
    if (stack.length === 0) {
      spec.items.push(item)
    } else {
      stack[stack.length - 1].item.children.push(item)
    }
    stack.push({ item, depth })
  }

  if (nodes.length > 0) spec.nodes = nodes
  if (edges.length > 0) spec.edges = edges

  return spec
}
