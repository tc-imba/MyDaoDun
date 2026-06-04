#!/usr/bin/env python3
"""Idempotently start the Multica daemon and create/maintain the MyDaoDun agents.

Run with any Python 3 (stdlib only):
    python .claude/skills/multica-agent/sync.py            # daemon + skill + agents
    python .claude/skills/multica-agent/sync.py --no-daemon

What it does:
  1. Ensures the local Multica daemon is running (registers this machine as a runtime).
  2. Creates or updates the `cocos-creator-dev` workspace skill from the local skill dir.
  3. Archives any legacy agents (renamed/replaced) so they don't linger.
  4. Creates or updates each MyDaoDun agent, pinned to this machine's Claude runtime,
     and assigns the cocos-creator-dev skill to each.

Constants (workspace + server) are MyDaoDun project values, not secrets. MULTICA_BIN is
machine-specific: set it in the environment, else the common install path is used.
"""
import json, os, shutil, socket, subprocess, sys, time
from pathlib import Path

# --- project constants ---------------------------------------------------
SERVER_URL = "https://multica.siki.moe"
WORKSPACE_ID = "0b5030ce-e492-4e6a-a380-83a4c724e6d2"   # MyDaoDun workspace
SKILL_NAME = "cocos-creator-dev"
PROVIDER = "claude"
MODEL = "claude-opus-4-8"
VISIBILITY = "workspace"

# Each developer gets their OWN pair of agents in the shared MyDaoDun workspace,
# named "<handle>'s Game Dev Claude" / "<handle>'s Code Review Claude". The handle is
# derived from the Multica login (or MULTICA_AGENT_HANDLE), so every dev runs the same
# `sync.py` and provisions their own pair without touching anyone else's.
ROLES = [
    {"suffix": "Game Dev Claude",    "instr": "game-dev-instructions.md"},
    {"suffix": "Code Review Claude", "instr": "code-review-instructions.md"},
]
# Agents from earlier iterations to archive on sight (idempotent: skipped if absent).
LEGACY_AGENT_NAMES = ["MyDaoDun Dev"]

SKILL_DIR = Path(__file__).resolve().parent                 # .../.claude/skills/multica-agent
SKILLS_ROOT = SKILL_DIR.parent                              # .../.claude/skills
PROJECT_ROOT = SKILLS_ROOT.parent.parent                    # E:\MyDaoDun
COCOS_SKILL_DIR = SKILLS_ROOT / SKILL_NAME

BIN = os.environ.get("MULTICA_BIN") or shutil.which("multica") \
    or r"C:\Users\ADMIN\.multica\bin\multica.exe"

ENV = dict(os.environ)
ENV["MULTICA_SERVER_URL"] = os.environ.get("MULTICA_SERVER_URL", SERVER_URL)
ENV["MULTICA_WORKSPACE_ID"] = os.environ.get("MULTICA_WORKSPACE_ID", WORKSPACE_ID)
ENV.pop("MULTICA_TOKEN", None)   # stale env token breaks auth; CLI uses ~/.multica/config.json


def norm(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def mc(args, check=True, capture=True):
    r = subprocess.run([BIN, *args], env=ENV, capture_output=capture,
                       text=True, encoding="utf-8")
    if check and r.returncode != 0:
        sys.exit(f"multica {' '.join(args[:3])} failed:\n{r.stdout}\n{r.stderr}")
    return r


def mc_json(args):
    return json.loads(mc(args).stdout)


def find_by_name(items, name):
    return next((it for it in items if it.get("name") == name), None)


def current_handle():
    """Short per-developer handle for naming agents.

    MULTICA_AGENT_HANDLE overrides; otherwise the first dot-segment of the Multica
    login username (e.g. 'yihao.liu' -> 'yihao'). `auth status` prints to stderr.
    """
    override = os.environ.get("MULTICA_AGENT_HANDLE")
    if override:
        return override.strip()
    r = mc(["auth", "status"], check=False)
    for line in (r.stdout + "\n" + r.stderr).splitlines():
        if line.strip().startswith("User:"):
            username = line.split(":", 1)[1].strip().split()[0]  # "yihao.liu (email)" -> "yihao.liu"
            return username.split(".")[0]
    sys.exit("Could not determine Multica user. Run: "
             f'"{BIN}" login --token mul_...  (or set MULTICA_AGENT_HANDLE)')


# --- 1. daemon -----------------------------------------------------------
def ensure_daemon():
    status = mc(["daemon", "status"], check=False).stdout
    if "running" not in status.lower():
        print("daemon: starting...")
        mc(["daemon", "start", "--device-name", socket.gethostname()], capture=False)
    else:
        print("daemon: already running")


def resolve_runtime():
    host = socket.gethostname().lower()
    for _ in range(10):
        runtimes = mc_json(["runtime", "list", "--output", "json"])
        claude = [r for r in runtimes
                  if r.get("provider") == PROVIDER and r.get("status") == "online"]
        local = [r for r in claude if host in r.get("device_info", "").lower()]
        pick = (local or claude)
        if pick:
            return pick[0]["id"]
        time.sleep(1)
    sys.exit("No online Claude runtime found. Start the daemon: "
             f'"{BIN}" daemon start')


# --- 2. skill ------------------------------------------------------------
def parse_frontmatter(text):
    text = norm(text)
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            fm, body = text[4:end], text[end + 5:].lstrip("\n")
            desc = next((l.split(":", 1)[1].strip() for l in fm.splitlines()
                         if l.startswith("description:")), "")
            return desc, body
    return "", text


def ensure_skill():
    skill_md = (COCOS_SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    desc, body = parse_frontmatter(skill_md)
    existing = find_by_name(mc_json(["skill", "list", "--output", "json"]), SKILL_NAME)
    if existing:
        sid = existing["id"]
        mc(["skill", "update", sid, "--description", desc, "--content", body,
            "--output", "json"])
        print(f"skill: updated {SKILL_NAME} ({sid})")
    else:
        sid = mc_json(["skill", "create", "--name", SKILL_NAME, "--description", desc,
                       "--content", body, "--output", "json"])["id"]
        print(f"skill: created {SKILL_NAME} ({sid})")

    local_refs = {}
    refs_dir = COCOS_SKILL_DIR / "references"
    if refs_dir.is_dir():
        for ref in sorted(refs_dir.glob("*.md")):
            path = f"references/{ref.name}"
            local_refs[path] = norm(ref.read_text(encoding="utf-8"))
            mc(["skill", "files", "upsert", sid, "--path", path,
                "--content", local_refs[path], "--output", "json"])
            print(f"  upserted {path}")
    for f in mc_json(["skill", "files", "list", sid, "--output", "json"]) or []:
        p = f.get("path", "")
        if p.startswith("references/") and p not in local_refs:
            mc(["skill", "files", "delete", sid, "--path", p], check=False)
            print(f"  pruned {p}")
    return sid


# --- 3. agents -----------------------------------------------------------
def archive_legacy(agents):
    for name in LEGACY_AGENT_NAMES:
        a = find_by_name(agents, name)
        if a:
            mc(["agent", "archive", a["id"], "--output", "json"], check=False)
            print(f"agent: archived legacy '{name}' ({a['id']})")


def ensure_agent(name, instr_file, description, names, runtime_id, agents):
    raw = (SKILL_DIR / instr_file).read_text(encoding="utf-8")
    instructions = norm(raw).replace("{{DEV_AGENT}}", names["dev"]) \
                            .replace("{{REVIEW_AGENT}}", names["review"])
    custom_args = json.dumps(["--add-dir", str(PROJECT_ROOT)])
    common = ["--description", description, "--model", MODEL,
              "--runtime-id", runtime_id, "--visibility", VISIBILITY,
              "--instructions", instructions, "--custom-args", custom_args,
              "--output", "json"]
    existing = find_by_name(agents, name)
    if existing:
        aid = existing["id"]
        mc(["agent", "update", aid, "--name", name, *common])
        print(f"agent: updated '{name}' ({aid})")
    else:
        aid = mc_json(["agent", "create", "--name", name, *common])["id"]
        print(f"agent: created '{name}' ({aid})")
    return aid


def main():
    if not Path(BIN).exists() and not shutil.which("multica"):
        sys.exit(f"multica binary not found at {BIN}; set MULTICA_BIN env var.")
    if "--no-daemon" not in sys.argv:
        ensure_daemon()
    runtime_id = resolve_runtime()
    print(f"runtime: {runtime_id}")

    skill_id = ensure_skill()

    handle = current_handle()
    names = {"dev": f"{handle}'s {ROLES[0]['suffix']}",
             "review": f"{handle}'s {ROLES[1]['suffix']}"}
    descriptions = {
        "dev": (f"Codes the MyDaoDun Cocos Creator 3.8.8 game in the local dir "
                f"{PROJECT_ROOT}. One feature per branch+PR; hands off to "
                f"'{names['review']}', never merges itself."),
        "review": (f"Reviews code written by '{names['dev']}' for MyDaoDun in "
                   f"{PROJECT_ROOT}. Gives feedback, then approves+merges the PR "
                   f"and marks the issue Done."),
    }
    print(f"handle: {handle}  (agents: '{names['dev']}', '{names['review']}')")

    agents = mc_json(["agent", "list", "--output", "json"])
    archive_legacy(agents)
    for key, role in zip(("dev", "review"), ROLES):
        aid = ensure_agent(names[key], role["instr"], descriptions[key],
                           names, runtime_id, agents)
        mc(["agent", "skills", "set", aid, "--skill-ids", skill_id, "--output", "json"])
        print(f"  assigned skill {SKILL_NAME} -> '{names[key]}'")

    print("\nDONE. Manage at:", f"{SERVER_URL}/mydaodun")


if __name__ == "__main__":
    main()
