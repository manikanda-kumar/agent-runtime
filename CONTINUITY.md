# Continuity

## Goal
Build understanding, then design, an internal **agent runtime** for async Jira tasks, delegation from other channels (Slack/GitHub/email), and comment-based reporting. Phase 1 (this doc) = ecosystem understanding, no code.

## Constraints/Assumptions
- Internal use; audit trail and on-behalf-of identity matter.
- Buy the sandbox substrate; build the control plane.
- **Deployment context (per owner, 2026-09-26): AWS-native enterprise.** Consequence: T3 default shifts E2B-cloud → AWS Lambda MicroVMs (in-perimeter: IAM/VPC/CloudTrail; Bedrock keeps model egress in AWS; 8h preserved-state cap absorbed by §4.4 checkpointing). Self-host E2B = rehearsed fallback, raw Firecracker = anti-goal. Bake-off criteria unchanged.
- Prior context: `tools` MCP blueprint (stable gateway + HA replicas + Firecracker per-job isolation; runtime/gateway bake-off pending); `sandboxagent` project (Session→Runner→Worktree→Optional Sandbox layering; agentOS as substrate, not state).

## Key decisions
- ARCHITECTURE.md v1.1 (committed): buy substrate, build control plane (Record+Journal in Postgres, channel adapters, policy/approval gates, 4-tier Executor). §7 open questions closed: (1) bake-off criteria set, gate at M1 — **T3 default = Lambda MicroVMs in the AWS enterprise, E2B elsewhere/fallback**; (2) GPUs parked (Bedrock = in-perimeter inference); (3) own journal w/ Temporal discipline, Temporal = named escape hatch; (4) code-mode in control-plane isolates, no creds in sandboxes; (5) residency via architecture + data classes; plus §10.6 capacity strategy: reserve floor not peak, tier gradient = reserve pool, SP≠capacity.

## State
- `RESEARCH.md` + `ARCHITECTURE.md` committed on origin/main. Research doc: full history, agent-era three waves, six broken assumptions, requirements mapping, build-vs-buy split. Architecture doc: control-plane design + §10 closes all 5 open questions with reversal triggers.

## Done
- Recalled prior Field Theory context (Modal CTO talk notes, Vercel Sandbox saves, E2B stars, sandboxagent/tools projects).
- Researched E2B/Modal/Rivet/Vercel/Cloudflare/AWS Lambda MicroVMs/Fly Sprites, Temporal/Restate/WDK, WASM arc, code-mode/just-bash.
- Opus 5.5 (Claude Code CLI in orb) rendered a 77s Remotion explainer of RESEARCH.md → `.amp/in/artifacts/agent-runtimes.mp4` (720p30, H.264+AAC). Self-review loop fixed 5 visual defects. Source in `video/` (untracked).
- v1 judged mediocre by user → v2: hand-drawn sketchbook film via vendored skill `skills/hand-drawn-canvas-animation` (from alesha-pro/tools) → `.amp/in/artifacts/agent-runtimes-v2.mp4` (1080p24, 69.8s, H.264+AAC, Piper narration en_US-lessac-medium, synthesized SFX bed, EBU R128). Source in `film/` (untracked). 10 defect classes fixed in review loop.
- Video prompt guidance gathered: storyboard + visual direction + energy pacing in the prompt = reliable one-shot (Addy Osmani thread; trq212: "10k characters with good takes plus skills, examples"); evan.romeos.cc leidenfrost transcript = reference workflow (HTML film → visual QA pass → narration FIRST → retime → render → sound design); alesha-pro SKILL.md = production playbook (brief template, beat sheet, --grid/--strip/--only review, quality gates). Piper TTS installed at ~/.local/share/piper-voices/.

## Now
- ARCHITECTURE.md live at 05e84f5 on origin/main, **accepted with no changes** (main-thread review complete; relayed to child T-01a0de66-d17b-756c-a59f-317895d715e6).
- Blocked on one owner decision: approve starting M0 walking skeleton. M0 exit needs ≥5 real Jira tasks, which requires a real Jira webhook + creds not yet provisioned.

## Next
- User approves/adjusts M0 → then start walking skeleton (Record+hash-chained journal, disposable Runner w/ journal re-drive, Jira adapter only, E2B T3 only, comment-reply approvals, audit export).

## Open questions
- None blocking. RESEARCH.md §7 questions decided in ARCHITECTURE.md §10, each with a reversal trigger.

## Working set
- `RESEARCH.md`, `CONTINUITY.md`
- Knowledge base: `~/.fieldtheory/library/youtube/2026-07/UwxxlTNPjWo.md`, `library/projects/sandboxagent.md`, `library/projects/tools.md`
