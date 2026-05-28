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
