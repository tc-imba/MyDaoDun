# MyDaoDun

Cocos Creator 3.8.8 project.

## Cocos MCP Server setup

The [`cocos-mcp-server`](https://github.com/DaxianLee/cocos-mcp-server) extension exposes the Cocos Creator editor over MCP so Claude Code can drive scenes, nodes, components, prefabs, assets, builds, etc.

### Layout

- Extension lives at `extensions/cocos-mcp-server/` as a git submodule.
- Project-level server settings: `settings/mcp-server.json` (port, autoStart, debug log, etc.).
- Claude Code endpoint registration: `.mcp.json` at the repo root (`cocos-creator` → `http://127.0.0.1:3000/mcp`).

### First-time setup on a fresh clone

```bash
git submodule update --init --recursive
npm install --prefix extensions/cocos-mcp-server
npm run build --prefix extensions/cocos-mcp-server
```

Then open the project in Cocos Creator 3.8.6+. With `autoStart: true` the HTTP MCP server comes up on port 3000 automatically; otherwise open `Extension → Cocos MCP Server` and click **Start Server**.

### Verifying from Claude Code

```bash
claude mcp list | grep cocos-creator
```

`✓ Connected` means the editor is running and the MCP endpoint is reachable. `✗ Failed to connect` almost always means Cocos Creator is closed or the server hasn't started yet.

### Changing the port

Edit `settings/mcp-server.json`, then update `.mcp.json` to match. Both files are committed — keep them in sync.

### Rebuilding after pulling submodule updates

```bash
git submodule update --remote extensions/cocos-mcp-server
npm install --prefix extensions/cocos-mcp-server
npm run build --prefix extensions/cocos-mcp-server
```

The submodule's `dist/` is checked in upstream, so a rebuild will show as locally-modified content inside the submodule — that's expected and should not be committed to this repo.

## Scene-vs-disk desync (HARD rule)

The Cocos editor reads `Main.scene` into memory on open and **never re-syncs from disk after that**. If you `git pull` (or `git checkout`, `git reset`, `git rebase`) while the scene is open, the editor still holds the *old* version. The next save overwrites whatever the pull brought in — silently wiping any subtree another developer (or Claude via MCP) added.

We've lost `SkillPicker`, `AttackRange`, and other nodes to this multiple times.

**Before doing anything in the editor after pulling/checking-out/rebasing:**

1. Close the `Main.scene` tab (right-click → Close, or Ctrl+W).
2. Open it again by double-clicking `assets/scenes/Main.scene` in the Asset panel.

Only then is the editor's view in sync with disk. Do not click Save until you've reloaded. The same applies after Claude makes scene changes via MCP — close + reopen before you edit further.

Structural mitigation: anything that doesn't need to live in `Main.scene` directly (modals, HUD overlays, debug overlays) should live as a **prefab** under `assets/prefabs/` and be instantiated in the scene as a prefab reference. That way a teammate editing Player can't accidentally overwrite an unrelated UI subtree — only the prefab asset itself is shared, and prefab files conflict less catastrophically.

## Cocos MCP server limitations

Known broken tools — do not use, fall back to the editor GUI:

- **`prefab_create_prefab`** writes prefab JSON that references scripts by class name (`"__type__": "Nailong"`) instead of the script's cid (`"__type__": "dd7b6BPMY1NWovqg2zjPOvf"`). It also fails to capture the source node's customized property values (UITransform contentSize, Sprite spriteFrame, sizeMode, etc.) — the generated file ends up as a default-valued stub. The editor's importer flags such files as `invalid: true` and runtime deserialization errors with "Missing class". **Workaround**: build the node in the scene via MCP, then drag it from the Hierarchy into `assets/prefabs/` in the editor's Asset panel — Cocos generates a correct prefab.

Known quirks of working tools:

- **`component_set_component_property` rejects exact zero** for some Vec2 fields (e.g. `cc.UITransform.anchorPoint.y = 0`) and silently keeps the prior value with `changeVerified: false`. Pass `0.0001` instead; it's identical for rendering.
- **`component_attach_script` reports `Script 'X' was not found on node after addition`** even though the component IS attached (the script appears in the components list under its cid like `dd7b6BPMY1NWovqg2zjPOvf`). The "error" is just a verification mismatch — proceed by setting properties via the cid.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`.

- **type**: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore` | `build` | `ci`.
- **scope** (optional but encouraged): the area touched. Common scopes in this repo: `player`, `world`, `scene`, `input`, `mcp`, `skill`, `claude`.
- **subject**: imperative, lower-case, no trailing period, under ~70 chars.

Examples:

```
feat(player): add WASD/arrow keyboard control
fix(player): repair BreathingIdle reference after scene churn
refactor(world): host player under Map node with camera follow
chore(mcp): configure project endpoint and autostart
docs: document Cocos MCP server setup
```

Use the body (separated by a blank line) for the **why** when it isn't obvious from the diff.

## Publish gate (HARD)

Before any operation that publishes to a remote — **`git push`** (in any form, including `--force`, `--force-with-lease`, `-u`, branch-specific), **`gh pr create`**, **`gh pr merge`** — the user's message must contain the literal word **`push`** or **`submit`** (lower-case) as an explicit imperative. The word can appear on its own ("push", "submit") or inside a clearly intent-bearing instruction ("commit and push", "push these changes", "go ahead and submit"). Ambiguous approvals — "yes", "ok", "go ahead", "ship it", or silence — do **not** authorize; the literal word must be present.

Show what's about to be published first (`git log`, `gh pr view`, etc.) so the user can verify, then state explicitly that you are waiting on `submit` or `push`. One authorization message authorizes one push or PR action — do not assume the next one is also approved.

Applies to every push, every session, every commit set. This rule overrides any prior "go ahead and push" approval that referred to a different set of commits.
