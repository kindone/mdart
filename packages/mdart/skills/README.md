# mdart skill

Reference content that teaches an AI agent (Claude Code, opencode, etc.) to use mdart proficiently — both syntactically (valid output) and judgmentally (picking the right diagram type for the user's intent).

## Structure

```
packages/mdart/
├── docs/
│   └── mdart.md           (comprehensive cross-agent reference: type catalog,
│                            selection guide, plot syntax, authoring rules)
└── skills/
    └── mdart/
        ├── SKILL.md           (thin behavioral wrapper: always loaded when triggered;
        │                       points to docs/mdart.md for the full reference)
        └── anti-patterns.md   (loaded on demand: 7 categories of failure modes)
```

Both `"docs"` and `"skills"` are listed in `packages/mdart/package.json`'s `files` array, so both directories are included in the npm package. Consumers receive them inside `node_modules/mdart/` whenever they install mdart.

## How consumers use it

Each project copies the skill and docs from the npm package. Typical flow, e.g. for steward:

```bash
# In steward's package.json:
"sync:mdart": "rm -rf node_modules/mdart && npm install --include=dev && mkdir -p .claude/skills/mdart && cp node_modules/mdart/skills/mdart/anti-patterns.md .claude/skills/mdart/anti-patterns.md && cp node_modules/mdart/docs/mdart.md docs/mdart.md"
```

Then:

```bash
cd ~/claude-steward && npm run sync:mdart
```

That single command pulls a fresh mdart bundle and refreshes:
- `docs/mdart.md` — the comprehensive cross-agent reference (type catalog, selection guide, plot syntax, authoring rules)
- `.claude/skills/mdart/anti-patterns.md` — the full failure-mode catalog

**`SKILL.md` is intentionally not overwritten.** Consumer projects maintain their own thin `SKILL.md` that points to their local `docs/mdart.md`. This lets each consumer add context (e.g. steward-specific artifact notes) without the sync clobbering it. If you're setting up a new consumer, copy `node_modules/mdart/skills/mdart/SKILL.md` once as a starting point, then keep it locally.

## Why per-project rather than `~/.claude/skills/`

- Project-scoped: `.claude/skills/` matches the same convention as `.claude/commands/` and `.claude/settings.json`.
- Visible in `git status` and grep — anyone reading the project tree sees what skills are installed.
- Portable: agents other than Claude that adopt the same `.claude/skills/` convention pick it up too.
- No global state: nothing in `~/.claude/` to maintain or remember per machine.
- Versioned with the project: a project pinned to mdart 0.2.x gets that version of the skill.

## Regenerating after mdart changes

The skill content is *derived* from mdart's `packages/mdart/src/layouts/` directory. When new diagram types are added or removed, regenerate from the mdart repo root:

```bash
cd ~/mdart
npm run regen:skill
```

That opens a Claude session pre-loaded with the meta-prompt at `scripts/regen-skill.md` and pre-authorised to edit files. The meta-prompt tells Claude how to enumerate types, classify aliases, diff against the current skill, and surgically update only what changed. After regeneration, commit the updated `packages/mdart/skills/mdart/*` files. Consumers will pick up the changes next time they run their own sync script.

## Optional: install for use in the mdart repo itself

If you also want the skill loaded when working inside the mdart repo (e.g. for self-reference while improving the layouts), use the helper script:

```bash
npm run install:skill
```

It copies `packages/mdart/skills/mdart/` to mdart's own `.claude/skills/mdart/` by default — project-scoped, just like consumer projects. Pass `--no-default --target=$HOME/.claude/skills/mdart` if you'd rather install globally. Same `--target=PATH`, `--dry-run` flags as before; same `MDART_SKILL_TARGETS` env var for custom destinations. See `scripts/install-skill.mjs` for details.
