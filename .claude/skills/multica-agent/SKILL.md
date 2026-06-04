---
name: multica-agent
description: Start the local Multica daemon and create/maintain the MyDaoDun Multica delegation agents (per developer: a Game Dev Claude, a Code Review Claude, and an Art Codex) for this project. Use when setting up Multica on a fresh machine, when an agent/skill needs to be (re)created or re-synced after editing its instructions or the cocos-creator-dev skill, or when delegated tasks aren't running (daemon down / no runtime). Covers the multica CLI command surface for daemon/runtime/agent/skill, the multi-provider runtimes (Claude + Codex), the dev/art->review handoff, and the Windows gotchas that bite when porting skill content.
---

# multica-agent

Provisions and maintains the MyDaoDun delegation agents on Multica (the runtime behind https://multica.siki.moe). One command does the whole thing idempotently; the rest of this file documents the mechanics so you can do it by hand or debug it.

## The agents (per developer)

Each developer gets their **own set** of agents in the shared MyDaoDun workspace, named after their Multica handle. The set spans two providers — Claude for code/review, Codex for art:

| Agent | Provider | Role |
|---|---|---|
| **`<handle>`'s Game Dev Claude** | claude | Writes game code in the local dir `E:\MyDaoDun`. One feature = one branch + PR. Hands the issue off to the reviewer; never merges itself. Instructions: `game-dev-instructions.md`. |
| **`<handle>`'s Art Codex** | codex | Produces art — images/sprites, audio, particle/animation effects — in `E:\MyDaoDun`. One deliverable = one branch + PR. Hands off to the reviewer; never merges itself. Instructions: `art-instructions.md`. |
| **`<handle>`'s Code Review Claude** | claude | Audits code from the dev agent and art from the art agent. Sends detailed feedback back (reassign issue) on problems; once a PR is opened and good, approves + merges to `main` and sets the issue status to Done. Instructions: `code-review-instructions.md`. |

The **handle** is derived from the Multica login: the first dot-segment of the username (`yihao.liu` → `yihao`), or override with the `MULTICA_AGENT_HANDLE` env var. So every developer runs the *same* `sync.py` and provisions their own set (e.g. `di.shi` → "di's Game Dev Claude") without disturbing anyone else's agents. `sync.py` only touches agents matching the current handle (plus archiving legacy names).

The instruction files are **templates**: `sync.py` substitutes `{{DEV_AGENT}}` / `{{REVIEW_AGENT}}` / `{{ART_AGENT}}` with the resolved per-developer names before upload — so the cross-references inside the instructions always point at that developer's own set.

Handoff is by **reassigning the Multica issue** to the target agent (`issue update --assignee "<agent name>"`, which fuzzy-matches agent names) plus a comment. No agent is subject to the `CLAUDE.md` "Publish gate (HARD)" — that gate governs the interactive human session, not these delegated roles. All three have the `cocos-creator-dev` skill attached.

### Provider notes (Claude vs Codex)

Each agent pins to the **online runtime for its provider** on this machine (the daemon registers one runtime per detected CLI — Claude and Codex). Two provider-specific quirks, handled by `sync.py` via the `ROLES` table:

- **Model**: the Claude agents use `claude-opus-4-8`; the Codex agent sets **no model** (empty) so it falls back to the runtime default — Codex (`codex app-server`) rejects a `--model` it doesn't recognize.
- **Project binding**: the Claude agents get `--custom-args ["--add-dir","E:\\MyDaoDun"]`; the Codex agent gets **empty custom-args** because `--add-dir` is a Claude-Code-only flag. The Codex agent reaches the project via its instructions (`cd E:\MyDaoDun`). If Codex tasks can't access the project at runtime, the fix is a Codex-appropriate working-dir flag in that role's `add_dir`/custom-args — TBD once we confirm Codex's flag.

## TL;DR — one command

```bash
python .claude/skills/multica-agent/sync.py
```

This (1) starts the local daemon if it's down, (2) creates-or-updates the `cocos-creator-dev` workspace skill from `.claude/skills/cocos-creator-dev/`, (3) archives any legacy agents, and (4) creates-or-updates all three agents (each pinned to this machine's runtime for its provider) and assigns the skill to each. Re-run it any time you edit a `*-instructions.md` file or the cocos-creator-dev skill — it's safe to run repeatedly. Pass `--no-daemon` to skip the daemon step.

## Configuration

The CLI is driven by env vars. `sync.py` defaults them to the MyDaoDun values; for manual CLI use, export them:

| Var | Value | Notes |
|---|---|---|
| `MULTICA_BIN` | `C:\Users\ADMIN\.multica\bin\multica.exe` | Machine-specific. `sync.py` reads `$MULTICA_BIN`, else `which multica`, else this default. |
| `MULTICA_SERVER_URL` | `https://multica.siki.moe` | |
| `MULTICA_WORKSPACE_ID` | `0b5030ce-e492-4e6a-a380-83a4c724e6d2` | The **MyDaoDun** workspace (slug `mydaodun`). Not the Innosense workspace. |
| `MULTICA_TOKEN` | **unset** | A stale env token overrides the saved login and breaks auth. Auth lives in `~/.multica/config.json` via `multica login`. `sync.py` strips it from the subprocess env. |

Verify auth (prints to stderr): `"$MULTICA_BIN" auth status 2>&1`.

## Known objects (resolve dynamically; these are current values)

| Thing | Name | ID |
|---|---|---|
| Workspace | MyDaoDun | `0b5030ce-e492-4e6a-a380-83a4c724e6d2` |
| Skill | cocos-creator-dev | `488201b4-32d5-486b-a1e7-9cdda292b062` |
| Agent (yihao) | yihao's Game Dev Claude | `70e64140-1818-432a-9b38-5eff3ff2feb6` |
| Agent (yihao) | yihao's Code Review Claude | `73de31f2-2215-4e58-9a50-ff9f32c8571d` |
| Agent (yihao) | yihao's Art Codex | `668034b8-47f4-4bb1-9608-05ed44ec8700` |

Agent IDs are **per-developer** — those above are yihao's. Other developers' pairs have their own IDs; always resolve agents by name, never hardcode the IDs.

Runtime IDs are **per-machine** and assigned when the daemon registers — never hardcode them. Resolve the local Claude runtime from `runtime list` (provider `claude`, status `online`, `device_info` containing the hostname). The agent must be pinned to a runtime on the machine where the Cocos editor + MCP actually run.

## What "pinned to this directory" means

Multica has no agent-level cwd — tasks run in an ephemeral `~/.multica/workspaces/<task-id>/`. We bind the agent to the project two ways: `--custom-args ["--add-dir","E:\\MyDaoDun"]` grants filesystem access, and `agent-instructions.md` tells it to `cd E:\MyDaoDun` and read `CLAUDE.md`. If tasks aren't landing in the project dir, add `CLAUDE_PROJECT_DIR` via `--custom-env`.

## Manual command surface

```bash
# Daemon (this machine = a runtime)
"$MULTICA_BIN" daemon start --device-name "$(hostname)"   # background poller; logs ~/.multica/daemon.log
"$MULTICA_BIN" daemon status
"$MULTICA_BIN" daemon stop
"$MULTICA_BIN" runtime list --output json                 # find the online claude runtime id

# Skill (workspace-hosted copy of the local cocos-creator-dev skill)
"$MULTICA_BIN" skill list --output json
"$MULTICA_BIN" skill create --name cocos-creator-dev --description "..." --content "<SKILL.md body>"
"$MULTICA_BIN" skill update <skill-id> --content "..." --description "..."
"$MULTICA_BIN" skill files upsert <skill-id> --path references/foo.md --content "..."

# Agent
"$MULTICA_BIN" agent create --name "yihao's Game Dev Claude" --model claude-opus-4-8 \
    --runtime-id <runtime-id> --visibility workspace --instructions "..." \
    --custom-args '["--add-dir","E:\\MyDaoDun"]'
"$MULTICA_BIN" agent update <agent-id> --instructions "..." --model ...
"$MULTICA_BIN" agent archive <agent-id>                            # reversible: agent restore
"$MULTICA_BIN" agent skills set <agent-id> --skill-ids <skill-id>   # replaces all assignments
"$MULTICA_BIN" agent get <agent-id> --output json

# Dev <-> review handoff (used inside the agents' own instructions)
"$MULTICA_BIN" issue update <issue-id> --assignee "yihao's Code Review Claude"
"$MULTICA_BIN" issue comment add <issue-id> --content-file <utf8.md>
"$MULTICA_BIN" issue status <issue-id> done
```

## CLI gotchas (each cost time to discover)

- **`agent create` has no `--skills` flag.** Skills are assigned separately via `agent skills set <id> --skill-ids a,b` (it *replaces* the full set).
- **`agent create` requires `--runtime-id`.** There's no default; you must resolve a runtime first (so the daemon must be running).
- **`skill create` / `skill files upsert` take `--content` only — no `--content-file`.** Passing multi-KB content (e.g. the 20 KB `event-system.md`) through a bash arg risks Windows command-line length limits, quoting breakage, and CRLF corruption. **Always port skill/instruction content via `sync.py` (or Python `subprocess` with an argv list)** — never a bash heredoc. `sync.py` reads files as UTF-8 and normalizes CRLF→LF.
- **Model id** is `claude-opus-4-8` (dashes, not dots). Prefer `--model` over putting `--model` in `--custom-args` (some providers reject it there).
- **`prefab_create_prefab` and other Cocos-MCP quirks** are documented in the agent's own instructions and the project `CLAUDE.md`, not here.

## Files in this skill

- `sync.py` — idempotent provisioner/maintainer (daemon + skill + the current developer's agent set, archives legacy). Stdlib-only; run with any Python 3. The `ROLES` list (suffix, instr, provider, model, add_dir) + `current_handle()` define which agents it manages.
- `game-dev-instructions.md` — instructions **template** for the Game Dev agent (placeholders: `{{DEV_AGENT}}` / `{{REVIEW_AGENT}}` / `{{ART_AGENT}}`).
- `code-review-instructions.md` — instructions **template** for the Code Review agent (same placeholders).
- `art-instructions.md` — instructions **template** for the Art Codex agent (same placeholders).

Edit an instructions template, then re-run `sync.py` — it re-renders the placeholders for your handle and pushes the change to Multica.
