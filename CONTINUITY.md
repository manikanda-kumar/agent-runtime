# Continuity

## Goal
Build understanding, then design, an internal **agent runtime** for async Jira tasks, delegation from other channels (Slack/GitHub/email), and comment-based reporting. Phase 1 (this doc) = ecosystem understanding, no code.

## Constraints/Assumptions
- Internal use; audit trail and on-behalf-of identity matter.
- Buy the sandbox substrate; build the control plane.
- Prior context: `tools` MCP blueprint (stable gateway + HA replicas + Firecracker per-job isolation; runtime/gateway bake-off pending); `sandboxagent` project (Session→Runner→Worktree→Optional Sandbox layering; agentOS as substrate, not state).

## Key decisions
- ARCHITECTURE.md (committed): buy substrate (E2B default T3), build control plane (Record+Journal in Postgres, channel adapters, policy/approval gates, 4-tier Executor). §7 open questions closed: (1) bake-off criteria set, gate at M1; (2) GPUs parked; (3) own journal w/ Temporal discipline, Temporal = named escape hatch; (4) code-mode in control-plane isolates, no creds in sandboxes; (5) residency via architecture + data classes, self-host E2B as rehearsed insurance.

## State
- `RESEARCH.md` + `ARCHITECTURE.md` committed on origin/main. Research doc: full history, agent-era three waves, six broken assumptions, requirements mapping, build-vs-buy split. Architecture doc: control-plane design + §10 closes all 5 open questions with reversal triggers.

## Done
- Recalled prior Field Theory context (Modal CTO talk notes, Vercel Sandbox saves, E2B stars, sandboxagent/tools projects).
- Researched E2B/Modal/Rivet/Vercel/Cloudflare/AWS Lambda MicroVMs/Fly Sprites, Temporal/Restate/WDK, WASM arc, code-mode/just-bash.
- Opus 5.5 (Claude Code CLI in orb) rendered a 77s Remotion explainer of RESEARCH.md → `.amp/in/artifacts/agent-runtimes.mp4` (720p30, H.264+AAC). Self-review loop fixed 5 visual defects. Source in `video/` (untracked).
- v1 judged mediocre by user → v2: hand-drawn sketchbook film via vendored skill `skills/hand-drawn-canvas-animation` (from alesha-pro/tools) → `.amp/in/artifacts/agent-runtimes-v2.mp4` (1080p24, 69.8s, H.264+AAC, Piper narration en_US-lessac-medium, synthesized SFX bed, EBU R128). Source in `film/` (untracked). 10 defect classes fixed in review loop.
- Video prompt guidance gathered: storyboard + visual direction + energy pacing in the prompt = reliable one-shot (Addy Osmani thread; trq212: "10k characters with good takes plus skills, examples"); evan.romeos.cc leidenfrost transcript = reference workflow (HTML film → visual QA pass → narration FIRST → retime → render → sound design); alesha-pro SKILL.md = production playbook (brief template, beat sheet, --grid/--strip/--only review, quality gates). Piper TTS installed at ~/.local/share/piper-voices/.

## Now
- Root commit 9f5ac65 (103 files) pushed earlier; ARCHITECTURE.md written/committed/pushed in delegated thread T-01a0de66-d17b-756c-a59f-317895d715e6 (control-plane design; RESEARCH.md §7 questions decided with reversal triggers). Awaiting user review.
- Also delivered there: curated history-of-compute-runtimes reading/watching list (Disco→Docker→Firecracker→WASM→Erlang/Orleans/Temporal) via bookmark recall + web search.

## Next
- User review of ARCHITECTURE.md → then M0 walking skeleton (Record+Journal, disposable Runner, Jira adapter, E2B T3, comment approvals).

## Open questions
- None blocking. RESEARCH.md §7 questions decided in ARCHITECTURE.md §10, each with a reversal trigger.

## Working set
- `RESEARCH.md`, `CONTINUITY.md`
- Knowledge base: `~/.fieldtheory/library/youtube/2026-07/UwxxlTNPjWo.md`, `library/projects/sandboxagent.md`, `library/projects/tools.md`
