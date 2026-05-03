# mdart skill

Reference content that teaches an AI agent (Claude Code, opencode, etc.) to use mdart proficiently — both syntactically (valid output) and judgmentally (picking the right diagram type for the user's intent).

## Structure

```
packages/mdart/skills/
├── README.md          (this file)
└── mdart/
    ├── SKILL.md           (always loaded when triggered: cheat sheet + decision tree)
    └── anti-patterns.md   (loaded on demand: 7 categories of failure modes)
```

`packages/mdart/package.json` lists `"skills"` in its `files` array, so the entire `skills/` directory is included in the npm package. Consumers receive it inside `node_modules/mdart/skills/` whenever they install mdart.

## How consumers use it

Each project that wants the skill copies it into its own `.claude/skills/` directory — the per-project convention that Claude (and other agents) discover. Typical flow, e.g. for steward:

```bash
# In steward's package.json:
"sync:mdart": "rm -rf node_modules/mdart && npm install --include=dev && rm -rf .claude/skills/mdart && cp -r node_modules/mdart/skills/mdart .claude/skills/mdart"
```

Then:

```bash
cd ~/claude-steward && npm run sync:mdart
```

That single command pulls a fresh mdart bundle *and* refreshes the project's skill copy. After running, `<project>/.claude/skills/mdart/SKILL.md` is the current canonical skill content.

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
