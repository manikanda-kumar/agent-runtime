# Agent Runtimes: How We Got Here, and What Agents Actually Need

**Date:** 2026-09-26 · **Status:** Research / pre-build understanding
**Goal of this doc:** Build a shared mental model of the compute-runtime ecosystem — from VMware to E2B/Modal/Rivet — before we design an internal agent runtime for async Jira tasks, channel delegation, and comment-driven work.

---

## 0. The take (TL;DR)

1. **Every runtime era shrunk the unit of compute and raised the unit of state.** Machine → process → event → isolate → *durable record*. Agents need the last one most, and it's the one the industry built last.
2. **An agent is an actor with a mailbox and a memory.** Erlang solved supervision in 1986, Orleans solved virtual actors in 2014, Temporal solved durable execution in 2020. The agent era is re-deriving all three, badly, on top of sandboxes. The winners (Cloudflare Durable Objects, Rivet, Temporal) are the ones who started from state, not from containers.
3. **Sandboxes are commoditizing in real time.** E2B, Modal, Vercel Hive, AWS Lambda MicroVMs, Cloudflare Containers, Fly Sprites — same Firecracker/gVisor physics, same pause/resume APIs. Isolation is table stakes; **the control plane (identity, session records, approvals, audit) is the moat**. That's the part worth building ourselves.
4. **For our use case (async Jira tasks, Slack/channel delegation, comments): buy the substrate, build the record.** The durable session/task record that survives compute death is the product. The microVM is a line item.

---

## 1. The question we're answering

We want internal agents that:

- pick up **Jira tasks asynchronously** (assigned, commented, status-changed),
- get **delegated work from other channels** (Slack mentions, GitHub comments, email),
- **report back as comments** and status transitions,
- run for **minutes to hours**, pausing for approvals and human replies,
- execute **untrusted, model-generated code** safely,
- and leave an **audit trail** a compliance team would accept.

Which runtime primitives does that demand, and how did the ecosystem evolve them? Answer: everything below.

---

## 2. The thirty-year arc

The whole history of compute infrastructure is one move repeated five times: **shrink the unit of deployment, increase its density, then discover state doesn't fit the new unit — and bolt state back on.**

| Era | Unit | State story | Density | Cold start |
|---|---|---|---|---|
| 1. Machine (1998–2010) | VM | Inside the VM, forever | ~10s/host | minutes |
| 2. Process (2013–2016) | Container | "Stateless, externalize it" | ~100s/host | ~1s |
| 3. Event (2014–2018) | Function | Externalize everything | ~1000s/host | 100ms–10s |
| 4. Isolate (2017–2024) | V8 isolate / WASM module | KV/blob on the side | ~100,000s/host | 0–5ms |
| 5. Record (2020–now) | Durable object / actor / workflow | **Colocated with compute** | ~millions | ~20ms, hibernating |

### Act I — The Machine (VMware, 1998–2006)

- **VMware** founded 1998; Workstation (1999) and **ESX Server (2001)** made x86 virtualization real: full hardware emulation, one kernel per tenant, strongest isolation, worst density. **vMotion (2003)** proved a machine could be *moved while running* — the first "suspend/resume as a feature" moment, and the spiritual ancestor of every sandbox snapshot API in 2026.
- **Xen (2003)** → **AWS EC2 (Aug 2006)**: the VM becomes an API call. Provisioning drops from weeks to ~a minute. This is the birth of "compute as a service," but the unit is still a whole machine with a whole OS.

**Lesson that persists:** hardware-level isolation is the gold standard for multi-tenant trust. Everything since has been an attempt to keep that guarantee while shedding its weight.

### Act II — The Process (Docker, Kubernetes, 2013–2016)

- Linux **cgroups** (merged 2008) + namespaces → **LXC (2008)** → dotCloud's internal tool → **Docker (Mar 2013)**: the insight wasn't isolation, it was the **image as a hermetic, portable artifact**. Build once, run anywhere.
- **Kubernetes (Jun 2014)**, from Google's Borg: orchestration, scheduling, declarative desired-state. The pod becomes the unit of ops.
- The bargain: containers share the host kernel. Great density, weaker isolation — fine when all the code is *yours*. The era's dogma — "containers are ephemeral, state lives in databases" — is a workaround for the fact that the unit got too small to hold state.

**Lesson that persists:** the image/registry model won so hard that even 2026's agent sandboxes (Vercel's VHS images, Cloudflare Containers, Modal's image builder) still speak OCI/Dockerfile.

### Act III — The Event (Lambda, Firecracker, gVisor, 2014–2018)

- **AWS Lambda (Nov 2014)**: the unit shrinks to a function invocation. Per-second billing, scale-to-zero. But Lambda v1 isolated customers with **separate EC2 instances** — serverless was VMs wearing a trench coat.
- **Kata Containers (2017)** and **gVisor (May 2018, Google)**: two answers to "containers aren't isolated enough for hostile tenants." Kata puts each container in a light VM; gVisor interposes a user-space kernel (sentry) that filters syscalls.
- **Firecracker (Nov 2018, AWS, open-source, Rust, from Chrome OS's crosvm)**: the industry-defining move. A minimal VMM — 5 emulated devices, **<125ms boot, <5 MiB overhead, ~150 microVMs/sec/host** — giving VM-grade isolation at container-grade weight. Lambda and Fargate rebuilt on it; Fly.io built a cloud on it.

**Lesson that persists:** Firecracker *is* the physical layer of the agent era. E2B, Vercel Hive, Fly Sprites, AWS Lambda MicroVMs all run on it. Modal deliberately bet on gVisor instead. This is the only layer where two credible answers still compete.

### Act IV — The Isolate (Cloudflare Workers, WASM, 2017–2024)

- **Cloudflare Workers (Sep 2017)**: skip the OS entirely. Run tenant code as a **V8 isolate** — a lightweight JS runtime instance sharing one process. ~0ms cold starts, thousands of tenants per process. The trade: a restricted runtime (no arbitrary binaries, no raw sockets for years, web APIs only).
- **WebAssembly**: browser MVP 2017 → **WASI (2019)** for server-side syscalls → Bytecode Alliance → **Docker+Wasm support (Oct 2022)**, prompting Solomon Hykes' famous line that had WASM+WASI existed in 2008, Docker needn't have been invented → Spin 1.0 (Apr 2023), wasmCloud (CNCF), WASI 0.2 (Jan 2024), **WASI 0.3 (Jun 2026, native async)**, Akamai acquiring Fermyon (Dec 2025).
- **Honest 2026 verdict on server-side WASM:** it conquered exactly three niches — edge functions, plugin systems, and sandboxed in-process execution — and stayed niche everywhere else (no mature threads, rough debugging, uneven language toolchains). It did *not* replace containers. But note where it won: **untrusted code that must start in microseconds**. That's the agent use case, and it's why WASM/isolates are having a second life *inside* agent runtimes (Cloudflare's Dynamic Worker Loader, Rivet's WASM/isolate sandbox library, just-bash's pure-interpreter approach) rather than as a general app platform.

**Lesson that persists:** the lighter the sandbox, the more you can afford **one execution context per operation** — even per tool call. That economics shift reappears in §4 (code mode).

### Act V — The Record (actors + durable execution, 2020–now)

While the compute stack was shedding state, a parallel lineage was solving it. This is the thread that matters most for agents, and the one the sandbox vendors are now racing to bolt on.

**The actor thread:**
- **Actor model** (Hewitt, 1973) → **Erlang/OTP (Ericsson, 1986–1996)**: lightweight processes, mailboxes, supervision trees, "let it crash." Built for telecom switches that may never stop. Every 2026 agent runtime is a worse Erlang, and the good ones know it.
- **Microsoft Orleans (virtual actors, paper 2014, Halo in production)**: actors as *logical* entities, always addressable, activated on demand, state persisted transparently. The "virtual" trick — identity decoupled from the process hosting it — is exactly what an agent session needs.
- **Cloudflare Durable Objects (2020)**: the actor model productized on the edge. A uniquely-addressed object with **single-threaded execution, colocated SQLite storage, WebSocket hibernation** (pay nothing while idle, wake in ms). This was the first mainstream primitive where *identity + state + compute* shipped as one thing. Agents SDK (2025) put an `Agent` class directly on top: durable identity, state, sessions, scheduling, fibers (durable execution), routing.

**The durable-execution thread:**
- **Amazon SWF (2012)** → **Azure Durable Functions (2016)** → **Uber Cadence (2017)** → **Temporal (2020, by Cadence's authors)**: the core idea is **event-sourced replay**. Journal every external step (API call, timer, signal) to an event history; on crash, *re-run the function from the top* and replay recorded results until you catch up to the failure point. Code looks normal; reliability is systemic. Costs: determinism constraints, history-size limits (50k events → continue-as-new), a learning curve.
- **Restate (2023)**, **DBOS (2023)**, **Inngest (2021)**: same journal/replay idea, friendlier packaging. Restate's *virtual objects* = durable execution + actor state in one.
- **Vercel Workflow Development Kit (Oct 2025)**: durability as a *language directive* — `"use workflow"` on an async function, steps journaled, `sleep()` for months without holding compute. Open source, pluggable "Worlds" (Vercel, Postgres, custom). Significant because it moved durable execution from infra-you-run to a build-time transform.

**Lesson that persists:** *durable execution is the formal version of what every agent harness implements ad hoc.* An agent loop is observe → reason → act → repeat, with LLM calls and tool calls as the journaled steps. Temporal's own guidance: run model/tool calls as Activities outside the replayable core. Every agent framework that added "checkpointing" (LangGraph, etc.) reinvented event history, usually worse.

---

## 3. The agent era (2023–2026): three waves

LLM agents broke the assumptions of all five eras simultaneously, and the market responded in three waves. We're at the tail end of wave 2, start of wave 3.

### Wave 1 — Execution substrate: the sandbox land-grab

Agents generate and run **untrusted code**, so isolation went from "nice" to existential. Every major cloud now ships a sandbox primitive:

| Player | Isolation | Persistence model | Notable | Posture |
|---|---|---|---|---|
| **E2B** | Firecracker microVM | Pause/resume (fs+memory), kept indefinitely while paused; runtime caps by plan (e.g. 24h Pro) | The category definer; open-source infra (Apache 2.0); Devin Outposts, Stripe distribution; 94% F100 claim | Ephemeral-first |
| **Modal Sandboxes** | gVisor | Snapshots; up to 24h sessions | 100k+ concurrent claim; GPUs (T4→B200) on the same platform; Ramp's internal coding agent (Inspect) writes a large share of their PRs; Lovable did 1M sandboxes/48h | AI-infra platform, code-first SDK |
| **Vercel Sandbox** | Firecracker ("Hive") | Snapshots; Drives (persistent volumes, beta); VHS image format | GA Jan 2026; 25M sandboxes/week on Fluid; Cursor Cloud Agents runs on it; active-CPU billing | Ephemeral + agent DX |
| **AWS Lambda MicroVMs** | Firecracker | **Full memory+disk preserved up to 8h, suspend/resume** | Managed, per-sandbox HTTPS endpoint + JWE auth; the big validation that "stateful sandbox" is now a first-class cloud SKU | Managed primitive |
| **Cloudflare Sandbox SDK** | Containers on Workers (gVisor-style at edge) | Tied to Durable Object lifecycle | Sandbox state coordinated by DOs; `@cloudflare/computer` orchestrates isolate vs container per operation | Edge-native, DO-coordinated |
| **Fly.io Sprites** | Firecracker | Persistent fs, checkpoint/restore, unlimited runtime | "Perpetual machine" model | Stateful-first |
| **Daytona / Blaxel / Northflank** | Firecracker/Kata/Cloud Hypervisor/gVisor (Northflank: pick per workload) | Configurable persistence; Blaxel "standby forever at $0" | Daytona: dev-env heritage, SOC2; Northflank: self-serve BYOC | Challengers |
| **Rivet** | Actor processes (open source) | In-memory state, auto-persisted (SQLite/FoundationDB) | ~20ms cold start incl. state init, ~0.6KB/actor idle, hibernation; built for agents/sessions explicitly | Stateful-first, self-hostable |

**The pattern:** everyone converged on the same API — `create → exec → pause → resume → snapshot → destroy` — and the same discovery that **idle agents must cost $0**. Hibernation/suspend-resume went from exotic (vMotion, 2003) to the default billing model.

### Wave 2 — Coordination: the durable agent record

Substrate ≠ agent. The second wave is about what survives when the compute dies:

- **Cloudflare Agents SDK**: `Agent` class on Durable Objects — durable identity, state, sessions, WebSockets, cron/alarms, and *fibers* for durable execution. Plus `@cloudflare/computer` (2026): a virtual fs backed by SQLite, orchestrating between isolates (fast ops) and containers (heavy ops) per operation, all gated and audited.
- **Rivet Actors**: one actor per agent/session/user; queues, workflows, scheduling built in; hibernate when idle. Nathan Flurry (Rivet) is making the sharpest argument in the space right now: **"running agents inside the sandbox means the sandbox's blast radius becomes your agent's blast radius"** — the control plane should hold state and orchestration *outside* the untrusted box.
- **Temporal/Restate/Inngest/WDK** all shipped agent stories: LLM calls as journaled steps, human-approval as a durable `await`, timers that survive deploys. Temporal published multi-agent patterns explicitly (signals for input, queries for state, continue-as-new for long-lived agents).
- **Vercel's "durable agent approval workflows"** guides and their Slack-copilot ("eve") examples show the market shape: *agent as a durable workflow + a sandbox + channel adapters*.

The discourse converged (Sept 2026): **"the bottleneck is whether an agent's identity and session state can survive the compute underneath it dying."** That's the record.

### Wave 3 — Interface contraction: MCP → code mode → just-bash

How agents *call tools* turned out to be a runtime problem too:

- **MCP (Nov 2024, Anthropic)** standardized tool servers. Problem: 1,000 tools ≈ 150k tokens of schemas in context, and every intermediate result round-trips through the model.
- **Cloudflare "Code Mode" (Sep 2025)** + **Anthropic "Code Execution with MCP" (Nov 2025)**: present tools as a typed API; let the model **write code** that calls them; execute in a cheap isolate; return only final results. Anthropic measured up to **98.7% token reduction**. Now shipping as Claude's Programmatic Tool Calling, Cloudflare's codemode package (with durable runtime: approvals, replay, rollback, snippets in DO SQLite), Goose, etc.
- **just-bash (vercel-labs, 2026)**: bash *re-implemented in TypeScript* with an in-memory/overlay filesystem — no container, no VM, no host access; 70+ commands; `js-exec` to run JS; `@just-bash/executor` turns OpenAPI/GraphQL/MCP specs into bash CLIs inside the sandbox. Sits at the lightest end of a now-explicit **isolation gradient**:

| Executor tier | Example | Isolation | Latency | Capability |
|---|---|---|---|---|
| In-process interpreter | just-bash, rust-bash | Language-level (no syscall reach) | µs | Simulated fs/commands |
| Isolate | CF Dynamic Worker Loader | V8 sandbox, no net by default | ~ms | JS/TS, WASM |
| Container | Modal, CF Containers | gVisor/Kata | ~100ms–1s | Arbitrary userland |
| MicroVM | E2B, Vercel, Lambda MicroVMs | Hardware (KVM) | ~125ms–1s | Full kernel, arbitrary binaries |

The skill is picking the **cheapest tier that satisfies the blast-radius requirement per operation** — which is precisely what `@cloudflare/computer` automates.

---

## 4. Six assumptions agents broke

1. **"The code is ours."** → Agents emit adversarial-by-accident code. Isolation is now per-task, not per-tenant. (Multiple Sept-2026 incident threads on X: "I ran agents without a sandbox, learned the hard way.")
2. **"Requests are short and stateless."** → Agent tasks run minutes–hours, stream progress, and *wait on humans*. Runtime must hibernate and resume without losing anything.
3. **"Fleets are steady."** → Modal's "100,000 sandbox problem": bursty, massive, short-lived concurrency. Schedulers, image caches, and IP allocation designed for 10^3 long-lived services fall over.
4. **"State lives in the database."** → Agent state is a hot, evolving working set (transcript, fs, env). Rehydrating it per step is untenable → colocated state (DO SQLite, actor memory, sandbox snapshots) came back.
5. **"Users are humans clicking."** → Users are programs. Modal's CTO: DX is now **AX (agent experience)** — CLIs/SDKs agents can drive, docs served as `llms.txt` and MCP. E2B ships docs *for machines* explicitly.
6. **"Auth at the edge is enough."** → Agents act *on behalf of* users across Jira/Slack/GitHub. Every tool call needs scoped credentials, policy gates, and a journal. Provenance is a runtime feature, not a logging afterthought.

---

## 5. What our internal agent runtime actually needs

Mapped to *our* workloads (async Jira tasks, channel delegation, comment replies):

| Need | What history says to steal | Candidate implementations |
|---|---|---|
| **Durable task/session record** — identity + state surviving compute death | Orleans virtual actors; Durable Objects; Temporal event history | Postgres/foundation record per session (like our `sandboxagent` Session→Runner→Worktree→Sandbox layering); or DOs/actors if we go Cloudflare/Rivet |
| **Execution substrate** — untrusted code, full tooling | Firecracker physics; buy don't build | E2B (self-hostable) / Modal / Vercel Sandbox / Lambda MicroVMs; internally: k8s jobs + gVisor as the poor-man's tier |
| **Pause/resume & hibernation** — $0 idle, wake on events | vMotion → Lambda MicroVM suspend/resume; DO hibernation | Sandbox snapshots + durable record holding the resume token |
| **Durable waits for approvals** — human-in-loop without holding compute | Temporal signals; WDK `sleep`; codemode durable runtime (approvals, replay, rollback) | Workflow engine or journal in our control plane |
| **Channel ingress** — Jira webhooks, Slack mentions, GH comments | Normalized task envelope; per-channel adapters writing to one queue | Thin adapters → durable queue (the "eve"/Slack-copilot shape) |
| **On-behalf-of identity & scoped creds** | Cloudflare bindings-as-capabilities; per-sandbox JWE (Lambda MicroVMs) | Mint short-lived, task-scoped tokens; never ambient credentials in the sandbox |
| **Audit/journal of every tool call** | Temporal event history; codemode connector-call logs | Journal in the record, not logs in the sandbox |
| **Tool interface at scale** | Code mode: typed API + code execution over JSON tool-call soup | Expose internal APIs as OpenAPI→code-mode connectors; keep schemas out of context |
| **Heartbeat/scheduling** — wake on event, no polling | DO alarms; actor scheduling; Temporal timers | Durable timers keyed to session records |

**The anti-goal:** do *not* build a microVM orchestrator, an image builder, or a scheduler. That race is over; Firecracker won and five well-funded vendors operate it better than we will.

---

## 6. Build vs buy

**Buy/rent (substrate):** sandbox creation, isolation, snapshot/resume, image caching, bursty capacity. Shortlist for our bake-off (already queued in the `tools` MCP blueprint work): E2B (self-hostable, category default), Modal (scale + GPUs), Vercel Sandbox (DX + Cursor precedent), AWS Lambda MicroVMs (if we want zero-infra on AWS), Cloudflare (if we want DO-coordinated edge). Poor-man's internal tier: k8s Jobs + gVisor for low-sensitivity tasks.

**Build (control plane — the actual product):**
1. **The Record**: durable session/task store — envelope (source channel, requester identity, Jira key), state machine, journal of tool calls, artifacts, resume tokens. This is our Durable Object; whether it runs on Postgres+our service or literally on DOs is an implementation choice.
2. **Channel adapters**: Jira, Slack, GitHub → normalized envelopes → queue; outbound comment/status renderers.
3. **Policy/approval gates**: per-tool-scoped credentials, human-in-the-loop durable waits, audit export.
4. **The executor abstraction**: one interface, four tiers (just-bash-style interpreter → isolate → container → microVM) chosen per task sensitivity. Matches the MCP blueprint's existing decision: stable gateway URLs + HA orchestrated replicas + **Firecracker per-job isolation**.

This split mirrors what the best 2026 systems converged on (Rivet's "control plane outside the sandbox," Cloudflare's Agent-on-DO + Sandbox, Vercel's workflow + Sandbox) — and what our own `sandboxagent` project already sketched: Session → Runner → Worktree → *optional* Sandbox, with agentOS as substrate, not as the source of durable state.

---

## 7. Open questions

1. Substrate bake-off criteria: cold-start p95 under 100 concurrent? Snapshot size limits? Cost at our idle/active ratio? (E2B vs Modal vs Lambda MicroVMs vs CF.)
2. Do we need GPUs ever (local model inference for triage)? If yes, Modal jumps the queue.
3. Durable-execution engine choice: adopt Temporal/WDK, or keep a minimal journal in our own record store (cheaper, fewer concepts, but we re-derive their lessons the hard way)?
4. Where does code-mode execution live for internal API access — isolate per execution (CF model) or per-session sandbox?
5. Multi-region/data-residency requirements for Jira data flowing through sandbox providers (BYOC/self-host question — favors E2B or Northflank).

---

## Appendix A — Timeline (compressed)

```
1973  Actor model (Hewitt)
1986  Erlang (Ericsson) — supervision, mailboxes
1998  VMware founded; ESX Server 2001; vMotion 2003
2006  AWS EC2
2008  cgroups/LXC
2012  Amazon SWF
2013  Docker
2014  Kubernetes · AWS Lambda · Orleans virtual-actor paper
2017  Cloudflare Workers (isolates) · Kata · Uber Cadence · WASM browser MVP
2018  Firecracker · gVisor
2019  WASI · Dapr (actors as a sidecar)
2020  Cloudflare Durable Objects · Temporal
2022  Docker+Wasm · ChatGPT moment — agents begin
2023  E2B · Restate · Spin 1.0 · LangGraph
2024  MCP (Anthropic, Nov) · WASI 0.2
2025  Cloudflare code mode (Sep) · Anthropic code-execution-with-MCP (Nov)
      Vercel Sandbox beta (Jun) · Vercel WDK (Oct) · CF Containers/Agents SDK
2026  Vercel Sandbox GA + Fluid (25M sandboxes/wk) · AWS Lambda MicroVMs
      Cursor Cloud Agents on Vercel Sandbox · Akamai buys Fermyon · WASI 0.3
      @cloudflare/computer · just-bash ecosystem · Devin Outposts on E2B
```

## Appendix B — Sources

**Primary / official**
- Firecracker: https://firecracker-microvm.github.io/ · AWS Lambda MicroVMs: https://aws.amazon.com/lambda/lambda-microvms/
- E2B: https://docs.e2b.dev/ · https://e2b.dev/resources (Devin Outposts, Stripe)
- Modal: https://modal.com/products/sandboxes · https://modal.com/blog/how-ramp-built-a-full-context-background-coding-agent-on-modal
- Vercel: https://vercel.com/blog/vercel-sandbox-is-now-generally-available · https://vercel.com/blog/fluid-compute-takes-any-shape · https://vercel.com/blog/introducing-workflow · https://vercel.com/changelog/run-untrusted-code-with-vercel-sandbox
- Cloudflare: https://blog.cloudflare.com/code-mode · https://blog.cloudflare.com/code-mode-mcp · https://developers.cloudflare.com/agents · https://developers.cloudflare.com/sandbox · https://developers.cloudflare.com/agents/tools/codemode/how-it-works/
- Anthropic: https://www.anthropic.com/engineering/code-execution-with-mcp
- Rivet: https://github.com/rivet-dev/actors
- Temporal: https://docs.temporal.io/workflows · https://temporal.io/blog/durable-flexible-multi-agent-systems
- Restate: https://restate.dev/what-is-durable-execution
- just-bash: https://justbash.dev/ · https://github.com/vercel-labs/just-bash · https://github.com/vercel-labs/bash-tool
- WASM: https://bytecodealliance.org/articles/WASI-0.3 · state-of-WASM 2026 reviews

**From our knowledge base (saved earlier — relevant prior art)**
- "The 100,000 Sandbox Problem" — Akshat Bubna (Modal CTO) on Latent Space; saved 2026-07-10, notes in `library/youtube/2026-07/UwxxlTNPjWo.md` (100k-sandbox elasticity, DX→AX, primitives-not-wrappers, permission levels)
- Ramp background coding agent on Modal — saved 2026-08-10 & 08-26
- Vercel Sandbox + bb/Herdr ephemeral-machine plugins — saved 2026-08-29/30; digest synthesis: *"one durable coordinator plus many sandboxed workers… the bottleneck is heartbeat, context routing, and isolation"*
- `e2b-dev/infra`, `e2b-dev/surf`, `firecracker` — starred 2026-09-06
- `sandboxagent` project — Session→Runner→Worktree→Optional Sandbox layering already designed; durable trace storage (`session_trace_runs/events`) queued
- `tools` MCP blueprint — "stable gateway URLs + HA orchestrated replicas + Firecracker per-job isolation"; runtime/gateway bake-off pending; just-bash previously noted as proposal
- Current X discourse (Sep 2026): @NathanFlurry on agent-in-sandbox blast radius & WASM/isolate sandbox library; @stretchcloud "managed agent runtime becoming its own infrastructure category"; @vercel_dev Cursor Cloud Agents on Vercel Sandbox
