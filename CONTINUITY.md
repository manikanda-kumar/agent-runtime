# Continuity

## Goal
Build understanding, then design, an internal **agent runtime** for async Jira tasks, delegation from other channels (Slack/GitHub/email), and comment-based reporting. Phase 1 (this doc) = ecosystem understanding, no code.

## Constraints/Assumptions
- Internal use; audit trail and on-behalf-of identity matter.
- Buy the sandbox substrate; build the control plane.
- Prior context: `tools` MCP blueprint (stable gateway + HA replicas + Firecracker per-job isolation; runtime/gateway bake-off pending); `sandboxagent` project (Session→Runner→Worktree→Optional Sandbox layering; agentOS as substrate, not state).

## Key decisions
- None yet (research phase).

## State
- `RESEARCH.md` written: full history (VMware→Docker→K8s→serverless/Firecracker→isolates/WASM→actors/durable execution), agent-era three waves (sandboxes, coordination records, code-mode), six broken assumptions, requirements mapping, build-vs-buy split, 5 open questions.
- Uncommitted; repo was empty (no commits yet) at start.

## Done
- Recalled prior Field Theory context (Modal CTO talk notes, Vercel Sandbox saves, E2B stars, sandboxagent/tools projects).
- Researched E2B/Modal/Rivet/Vercel/Cloudflare/AWS Lambda MicroVMs/Fly Sprites, Temporal/Restate/WDK, WASM arc, code-mode/just-bash.
- Opus 5.5 (Claude Code CLI in orb) rendered a 77s Remotion explainer of RESEARCH.md → `.amp/in/artifacts/agent-runtimes.mp4` (720p30, H.264+AAC). Self-review loop fixed 5 visual defects. Source in `video/` (untracked).
- v1 judged mediocre by user → v2: hand-drawn sketchbook film via vendored skill `skills/hand-drawn-canvas-animation` (from alesha-pro/tools) → `.amp/in/artifacts/agent-runtimes-v2.mp4` (1080p24, 69.8s, H.264+AAC, Piper narration en_US-lessac-medium, synthesized SFX bed, EBU R128). Source in `film/` (untracked). 10 defect classes fixed in review loop.
- Video prompt guidance gathered: storyboard + visual direction + energy pacing in the prompt = reliable one-shot (Addy Osmani thread; trq212: "10k characters with good takes plus skills, examples"); evan.romeos.cc leidenfrost transcript = reference workflow (HTML film → visual QA pass → narration FIRST → retime → render → sound design); alesha-pro SKILL.md = production playbook (brief template, beat sheet, --grid/--strip/--only review, quality gates). Piper TTS installed at ~/.local/share/piper-voices/.

## Now
- Committed + pushed root commit 9f5ac65 to origin/main (103 files; ~1.4GB regenerable mass gitignored).
- Work continues in new thread T-01a0de66-d17b-756c-a59f-317895d715e6 (kimi-k3): ARCHITECTURE.md per RESEARCH.md §5/§6 + §7 answers.

## Next
- Pick from open questions §7 (substrate bake-off criteria; durable-execution engine choice; code-mode executor placement; data residency).
- Likely follow-up: turn §5/§6 into an architecture doc for the internal runtime.

## Open questions
- See RESEARCH.md §7 (bake-off criteria, GPUs, durable-execution engine, code-mode placement, residency/BYOC).

## Working set
- `RESEARCH.md`, `CONTINUITY.md`
- Knowledge base: `~/.fieldtheory/library/youtube/2026-07/UwxxlTNPjWo.md`, `library/projects/sandboxagent.md`, `library/projects/tools.md`
