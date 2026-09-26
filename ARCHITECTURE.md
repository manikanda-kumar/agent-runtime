# Architecture: The Internal Agent Runtime

**Date:** 2026-09-26 · **Status:** Design v1.1, accepted · **Amended:** 2026-09-26 — AWS-native enterprise deployment context (§10.1 default, §10.5 order, new §10.6 capacity strategy) · **Predecessor:** [RESEARCH.md](RESEARCH.md) — its §5/§6 are the settled direction. This doc turns them into a system and closes the five open questions from its §7.

---

## 0. TL;DR

Buy the substrate, build the control plane. The control plane has four parts:

1. **The Record** — a durable session/task store (Postgres) with an append-only, hash-chained journal of every step. This is the product.
2. **Channels** — Jira/Slack/GitHub adapters that normalize every ingress event into one task envelope and render everything outbound as native comments and status transitions.
3. **The Executor** — one interface over a four-tier isolation gradient (interpreter → isolate → container → microVM), rented, with Lambda MicroVMs as the default microVM provider in our AWS deployment (E2B elsewhere).
4. **Policy & identity** — task-scoped short-lived credentials, a per-call policy gate, durable human-approval waits, and a kill switch.

Held together by one invariant: **no internal-API credential ever exists inside a sandbox.** Sandboxes receive a worktree and a task brief; all internal traffic flows through the control plane's connector gateway, where it is policy-checked and journaled.

The five open questions, closed (details and reversal triggers in §10):

| # | Question | Decision |
|---|---|---|
| 1 | Substrate bake-off criteria | **Default T3: AWS Lambda MicroVMs** in our AWS-enterprise deployment; **E2B** remains the default elsewhere and the rehearsed self-host fallback (§10.1, §10.5, §10.6). Criteria defined now; the formal bake-off is a decision gate at M1. The Executor interface keeps two providers warm regardless of who wins. |
| 2 | Do we need GPUs? | **Parked: no.** Triage runs on hosted model APIs. Re-open only on a no-egress data mandate (→ Modal GPUs, same platform as their sandboxes) or measured cost/latency pain at M1 review. |
| 3 | Durable-execution engine | **Our own journal in Postgres**, built with Temporal's discipline (idempotent steps, durable timers, fencing tokens). The journal is mandatory scope anyway — the engine is the marginal 20%. Temporal is the named escape hatch with explicit adoption triggers; WDK parked behind it. |
| 4 | Code-mode executor placement | **Control-plane isolate per execution**, behind the connector gateway (§10.4). Per-session sandboxes never mediate internal-API access. Interim: a locked-down container profile until the isolate runtime lands. |
| 5 | Data residency / BYOC | **Architecture first, vendor contract second.** Channel data never enters sandboxes, so residency risk concentrates in the control plane we own. A data-class table routes restricted work to internal tiers. Self-hosting (E2B infra is Apache-2.0) is insurance — rehearsed at M2, not operated from day one. |

---

## 1. What we're building

A control plane for internal agents that:

- pick up **Jira tasks asynchronously** (assigned, commented, status-changed),
- take **delegation from other channels** (Slack mentions, GitHub comments; email later),
- **report back as comments** and status transitions,
- run for **minutes to hours**, pausing for human approvals and replies without burning compute,
- execute **untrusted, model-generated code** safely,
- and leave an **audit trail** a compliance team would accept.

The research conclusion this operationalizes (RESEARCH.md §5–§6): the microVM is a line item; **the durable record is the product.** Everything below is either the record or something that serves it.

---

## 2. Design principles

1. **The record is the product; the sandbox is a line item.** Identity, state, and history live in our Postgres. Compute underneath is disposable and swappable.
2. **The control plane lives outside the sandbox.** Rivet's blast-radius argument (RESEARCH.md §3 wave 2): run the agent's brain inside the untrusted box and the box's blast radius becomes the agent's. Our Runner and all credentials stay outside; only generated code goes in.
3. **No internal credentials inside sandboxes.** Bindings-as-capabilities, the Cloudflare model: code gets handles, not secrets. The per-sandbox JWE pattern from AWS Lambda MicroVMs is the same idea — scoped, short-lived, per-execution context.
4. **Idle costs $0.** Every wait — approval, human reply, timer — pauses the sandbox. Our workload's defining ratio is wall-time to active-time (tasks wait on humans for most of their lives), so pause/resume quality matters more than peak performance.
5. **Every side effect is journaled, idempotent, and attributed.** The journal is the audit trail, not a debug log. If it isn't in the journal, it didn't happen — and if it is, it says who (which human, via which delegation chain) authorized it.
6. **Cheapest sufficient isolation per operation.** The four-tier gradient is an economic instrument, not a taxonomy. Triage picks the lowest tier that satisfies the task's blast radius (RESEARCH.md §3 wave 3).
7. **AX is a feature.** Humans and other agents both operate this system: CLI/SDK/MCP-shaped surfaces, machine-readable status, machine-readable docs. (The Modal CTO's DX→AX point, RESEARCH.md §4.)

---

## 3. System overview

```
┌──────────────────────────── CHANNELS ────────────────────────────┐
│   Jira webhook     Slack @mention     GitHub comment   (email: later) │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   Channel adapters   │  in:  normalize → TaskEnvelope (dedupe)
                    └─────────┬───────────┘  out: render comments / statuses per channel
                              ▼
┌───────────────────────── CONTROL PLANE (our k8s + Postgres) ─────────────────────┐
│                                                                                  │
│   Scheduler ── due-session waker, one lease per session                          │
│        │                                                                         │
│        ▼                                                                         │
│   Runner ── one per active session; the agent loop (observe→reason→act)          │
│        │                                                                         │
│        ├──► LLM API (model calls journaled)                                      │
│        │                                                                         │
│        ├──► Policy gate ──► Connector gateway ──► internal APIs                  │
│        │      (scoped creds, per-call check,   (Jira/Slack/GitHub/…;             │
│        │       code-mode isolates)              stable URLs per tools blueprint) │
│        │                                                                         │
│        ├──► Executor ──► substrate sandboxes (below the line)                    │
│        │                                                                         │
│        └──────► Record ── sessions + journal (Postgres) ◄── every step above     │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        ▼
┌──────────────────────── SUBSTRATE (rented / internal) ───────────────────────────┐
│   T0 just-bash interpreter · T1 isolate · T2 k8s+gVisor · T3 E2B microVM (default) │
└───────────────────────────────────────────────────────────────────────────────────┘
```

The line matters: **above it, trusted control-plane code we operate; below it, untrusted model-generated code in rented isolation.** Credentials exist only above the line.

### 3.1 Lifecycle of a task

1. **Ingress.** A Jira issue is assigned to the agent (or it's @-mentioned in a comment). The Jira adapter receives the webhook, normalizes it into a `TaskEnvelope`, dedupes on a correlation key, writes a `sessions` row (`received`) plus the first journal entry, and enqueues.
2. **Triage.** A small model call classifies the task: data class, executor tier, policy set, required tool scopes. It posts a plan comment ("here's what I'm going to do and what I'll need") — the first human checkpoint and the first audit artifact. State → `queued`.
3. **Dispatch.** The scheduler leases the session to a Runner (`running`). The Runner mints task-scoped, short-lived tokens, requests a sandbox from the Executor at the triaged tier (default T3/E2B), and materializes the worktree (repo at the task's ref).
4. **Agent loop.** Observe → reason → act, every step journaled:
   - shell/build/test commands run **in the sandbox**,
   - internal-API calls run as **code-mode in the connector gateway** (model writes code against typed connectors; each call policy-checked and journaled),
   - a gated action (e.g. push, external comment) suspends the loop: state → `waiting_approval`, an approval request posts to the originating channel, a durable timer arms, the sandbox pauses, the Runner exits. **Cost while waiting: $0.**
5. **Resume.** A human approves by replying in-channel. The adapter normalizes the reply into an `approval_decision` journal event; the scheduler wakes the session; the Executor resumes the sandbox from its pause token (or restores from checkpoint); the loop continues.
6. **Completion.** The Runner posts the result as a channel-native comment (idempotent — one per correlation key), transitions the Jira status, seals the journal, revokes tokens, destroys the sandbox. State → `completed`.

Crash anywhere in 4: the Runner was disposable. The scheduler re-drives the session from the journal — last committed sequence number plus idempotency keys make re-execution safe (§4.3).

---

## 4. The Record

Postgres. Three tables carry the system; everything else is derived.

### 4.1 Schema sketch

```sql
sessions (
  id              uuid primary key,
  correlation_key text unique,        -- channel dedupe, e.g. jira:PROJ-123:assigned
  source          jsonb not null,     -- the TaskEnvelope
  requester       jsonb not null,     -- identity chain: human → agent
  jira_key        text,
  state           text not null,      -- state machine in §4.2
  data_class      text not null,      -- public | internal | restricted (§10.5)
  executor_tier   text not null,      -- T0 | T1 | T2 | T3 (set at triage)
  policy_set      text not null,      -- approval policy bundle ref
  code_version    text not null,      -- pinned agent build; sessions never cross deploys
  sandbox_ref     jsonb,              -- provider handle / resume token; NOT authoritative state
  created_at      timestamptz not null,
  updated_at      timestamptz not null
);

session_events (                      -- the journal; append-only
  session_id      uuid references sessions,
  seq             bigint not null,    -- gapless per session
  type            text not null,      -- ingress | triage | llm_call | tool_call |
                                      -- connector_call | sandbox_op | approval_request |
                                      -- approval_decision | comment | state | timer
  payload         jsonb not null,
  idempotency_key text unique,        -- {session_id}:{seq}:{kind}
  actor           text not null,      -- agent | human:<id> | system
  prev_hash       text not null,      -- hash chain: tamper-evidence for ~10 lines of code
  ts              timestamptz not null,
  primary key (session_id, seq)
);

approvals (
  id              uuid primary key,
  session_id      uuid references sessions,
  action          jsonb not null,     -- the gated action, fully described
  state           text not null,      -- pending | approved | rejected | expired
  requested_seq   bigint not null,    -- → the approval_request journal event
  decided_by      text,               -- human identity from the channel
  decided_at      timestamptz
);
```

### 4.2 Session state machine

```
received → triaged → queued → running ─┬─► waiting_approval ─┐
                          ▲            ├─► waiting_reply    ─┤  (channel webhook
                          │            └─► waiting_timer    ─┘   or durable timer)
                          └──────────────────────────────────┘
running → completed | failed | cancelled
any state → cancelled        (human kill switch; journaled like everything else)
```

Waits are durable: exiting a wait requires a journal event (a normalized channel webhook or a fired timer row), never an in-memory callback. A Runner crash, a deploy, or a week of human silence are indistinguishable to the machine — and all three are fine.

### 4.3 What we steal from Temporal without adopting it

The journal-first decision (§10.3) obligates four disciplines. They are the actual work of "durable execution," and they're all cheap because our shape is simple (one agent per session, coarse steps):

1. **Idempotent steps.** Every side effect carries an `idempotency_key`. Channel adapters check the key before posting, so a re-driven step can't double-comment.
2. **Fencing.** The scheduler issues a lease with a fencing token to exactly one Runner per session; journal writes check the fence. No zombie Runners.
3. **Durable timers.** Waits are rows with fire-at timestamps, not `setTimeout`.
4. **Pinned code versions.** A session runs one agent build end-to-end; deploys never change the semantics of a live session.

What we deliberately skip: event-sourced replay (our recovery is re-drive-from-journal-pointer, not replay-from-top), determinism constraints (we never re-run model calls — they're journaled, not replayed), and a second distributed system to operate.

### 4.4 The sandbox is never state

`sandbox_ref` is a cache, not a source of truth. Rule: **at every pause and every milestone, the worktree is checkpointed out of the sandbox** (pushed to a scratch ref / artifact store, pointer journaled). Resume prefers the provider's pause/snapshot, falls back to fresh-sandbox-plus-checkpoint. This single rule absorbs provider incidents, runtime caps (E2B/Modal cap continuous runtime around 24h), and preserved-state limits (Lambda MicroVMs hold memory/disk for only 8h — shorter than a weekend approval wait, which is one reason they're not the default).

---

## 5. Channel adapters

Adapters are thin by design: normalize in, render out, zero policy.

### 5.1 The envelope

```ts
interface TaskEnvelope {
  correlationKey: string;        // dedupe: jira:PROJ-123:assigned:<event-id>
  channel: 'jira' | 'slack' | 'github';
  trigger: 'assigned' | 'mention' | 'comment' | 'label' | 'command';
  requester: Identity;           -- resolved to a directory identity, not a channel handle
  instruction: string;           -- the ask, in text
  contextRefs: ContextRef[];     -- issue key, repo, branch, thread, attachments
  receivedAt: Timestamp;
}
```

### 5.2 Ingress rules

- **Allowlisted requesters only.** A mention from an unknown identity gets a polite refusal, journaled. Delegation is a privileged act.
- **Dedupe on `correlation_key`** at the Record insert — webhook redelivery is normal and harmless.
- **Jira is the system of engagement.** Slack/GitHub delegations that produce real work create or link a Jira issue; the session row carries the `jira_key` regardless of origin channel. One audit story per unit of work, not per channel.
- **Email is deferred.** The envelope admits it; no adapter until demand proves out.

### 5.3 Egress rules

- **Channel-native rendering:** Jira gets comments + status transitions; Slack gets threaded replies under the mention; GitHub gets PR/issue comments. One status comment per session, edited in place; discrete events (plan, approval requests, final report) as new comments.
- **Idempotent posting** via the journal's idempotency keys — the adapter asks the Record "did I already post seq 41?" before rendering seq 41.
- **Everything outbound passes the policy gate first** (§7). An adapter is a renderer, not a decision-maker.

---

## 6. The Executor

One interface, four tiers, chosen per task at triage.

```ts
interface Executor {
  create(spec: SandboxSpec): Promise<Sandbox>;      // image, worktree, env — never internal creds
  exec(sb: Sandbox, cmd: Command): Promise<ExecResult>;
  pause(sb: Sandbox): Promise<ResumeToken>;         // $0-idle is the point
  resume(token: ResumeToken): Promise<Sandbox>;     // falls back to checkpoint restore
  snapshot(sb: Sandbox): Promise<SnapshotRef>;
  destroy(sb: Sandbox): Promise<void>;
}
```

| Tier | Technology | Isolation | Role | Operated by |
|---|---|---|---|---|
| **T0 — interpreter** | just-bash (bash re-implemented in TS, in-memory fs, no host access) | language-level | dry-running generated shell, simulated ops | in-process, control plane |
| **T1 — isolate** | V8-isolate runtime (workerd-class; Cloudflare Dynamic Worker Loader is the reference model) | V8 sandbox, no network by default | **code-mode connector execution** (§10.4) | control plane — the one tier with real build cost |
| **T2 — container** | k8s Job + gVisor | user-space kernel | **restricted** data class; bulk internal work; the poor-man's tier | our cluster |
| **T3 — microVM** | Firecracker, via **Lambda MicroVMs** (AWS deployment) or **E2B** (elsewhere) | hardware (KVM) | default for untrusted model code needing a full toolchain | rented |

Selection: cheapest tier satisfying the task's data class (§10.5) and capability need. Default is T3; T2 when the data class forbids third-party substrate; T1/T0 are for mediation, not task execution.

This table is where the `tools` MCP blueprint lands: its "stable gateway URLs + HA replicas + Firecracker per-job isolation" is this Executor plus the §7 gateway, its pending runtime bake-off merges with §10.1, and its earlier just-bash proposal becomes T0.

**Provider note.** The interface assumes the converged sandbox API (`create → exec → pause → resume → snapshot → destroy`) that RESEARCH.md §3 documents across E2B, Modal, Vercel Sandbox, Lambda MicroVMs, and Fly Sprites. Convergence is what makes the bake-off a benchmark exercise instead of a rewrite.

---

## 7. Policy, identity, approvals

### 7.1 Identity and credentials

Every session carries an explicit **identity chain**: `human:mani → agent:runtime/1 → tool:jira`. From it, the gateway mints **task-scoped, short-lived tokens** — scopes from triage's declared tool set, TTL ≤ one session segment, revoked at completion or cancel. No ambient credentials exist anywhere; sandboxes hold none at all (the §0 invariant). On-behalf-of is therefore structural: every internal-API call is attributable to the delegating human through the chain.

### 7.2 Action classes

| Class | Examples | Gate |
|---|---|---|
| **Read** | repo read, Jira read, search | none (journaled) |
| **Draft** | commits in the sandbox worktree, generated artifacts | none (journaled) |
| **Publish-internal** | Jira comment, status transition, thread reply in the originating channel | auto-allowed within the session's policy set; journaled; reversible |
| **Publish-external / irreversible** | push outside scratch refs, open PR on an external repo, message a shared Slack channel, spend money | **human approval** (durable wait) |
| **Credential use** | any connector call | per-call scope check at the gateway |

Policy sets are named bundles (`standard-jira-task`, `external-comms`, `restricted-repo`) chosen at triage and overridable by humans via comment command.

### 7.3 Approvals as durable waits

An approval is a first-class row plus journal events, not a callback. Request posts to the originating channel (Jira: reply-to-approve convention; Slack: interactive button → webhook — both normalize to the same `approval_decision` event). Timeout policy: durable timer → escalate (re-mention, then DM) → expire-reject. A human who answers three days later costs the session nothing; the sandbox was paused the whole time.

### 7.4 Kill switch

`agent: stop` in any channel (or an admin command) → `cancelled`: tokens revoked, sandbox destroyed, journal sealed. Plus a global per-channel freeze flag for incident response. Both are journaled like everything else.

---

## 8. Audit

The audit trail is not a feature built on the system; it **is** the system, read from the other side:

- **Complete** — every model call, tool call, connector call, sandbox operation, comment, approval, and state transition is a journal row.
- **Attributed** — every row carries the actor and the delegation chain back to a human.
- **Tamper-evident** — the hash chain over `(session_id, seq)` makes quiet edits visible.
- **Exportable** — per-session signed JSONL, plus a compliance-friendly rendered transcript. Retention per org policy.

The test we hold it to: a skeptic reading only the export can reconstruct what the agent did, what it was told, what it asked permission for, who granted it, and what changed in the outside world.

---

## 9. Continuity with `sandboxagent`

This architecture is the `sandboxagent` layering (RESEARCH.md Appendix B) grown into a control plane. The prior design already separated durable identity from disposable compute — which is exactly the split the market converged on in wave 2 (Rivet's control-plane-outside-the-sandbox, Cloudflare's Agent-on-DO + Sandbox, Vercel's workflow + Sandbox).

| `sandboxagent` | This runtime | What changed |
|---|---|---|
| **Session** | **The Record** (`sessions` + `session_events`) | The queued `session_trace_runs/events` work becomes the journal — promoted from trace to audit trail (hash-chained, compliance-grade). |
| **Runner** | **Runner** | Now explicitly disposable: stateless, leased, re-driven from the journal after any crash. |
| **Worktree** | **Worktree** | Now checkpointed *out of* the sandbox at every pause (§4.4) — the sandbox is never state. |
| **Optional Sandbox** | **Executor tiers T0–T3** | "Optional" was the prescient part: the gradient generalizes it into per-task isolation economics. |
| agentOS as substrate, not state | E2B et al. as rented substrate | Same posture; now with five vendors racing to be the line item. |
| — (didn't exist) | **Channels, policy gate, connector gateway, approvals** | The new surface area. This is what turns a session runner into a product. |

Keep the layering. Add the control plane.

---

## 10. The five open questions, decided

### 10.1 Substrate bake-off — criteria set now, gate at M1

**Decision (amended 2026-09-26 for deployment context):** the target environment is an **AWS-native enterprise**, so the T3 default there is **AWS Lambda MicroVMs** — managed, zero-ops, and inside the AWS org boundary (IAM/VPC/CloudTrail), which collapses most of the security and procurement review. Its 8h preserved-state cap is absorbed by §4.4 checkpointing (resume = fresh microVM + restore), and pairing it with Bedrock for model calls keeps even inference egress in-perimeter — which keeps §10.2 parked. **E2B remains the default outside this context and the rehearsed self-host fallback within it:** open-source Apache-2.0 infra, pause-forever semantics that fit human-timescale waits best, production proof at Devin (Outposts) and Stripe. The bake-off below still runs — the criteria are provider-neutral — with **Modal** (gVisor, the 100k-concurrency elasticity story, GPUs if §10.2 re-opens) and **Vercel Sandbox** (Firecracker "Hive", GA Jan 2026, the Cursor Cloud Agents precedent) as challengers; switching costs stay low because the Executor interface exists first. Cloudflare enters only if we ever rebuild the control plane on Durable Objects — §10.3 says we don't.

**Criteria** (pass/fail against targets, then cost at our usage mix as tiebreak):

| Criterion | Target | Why |
|---|---|---|
| Cold start p95 at 100 concurrent creates | ≤ 2s to first `exec` | delegation is bursty (RESEARCH.md §4.3) |
| Resume p95 after a 6h pause | ≤ 3s to first `exec` | waits are human-timescale |
| Pause retention | ≥ 7 days, $0 while paused | approvals span weekends and PTO |
| Continuous runtime cap | ≥ 4h | active work is minutes-to-hours; checkpointing (§4.4) covers the rest |
| Snapshot/restore path | exists, ≤ 60s | fallback when pause expires |
| Image model | OCI/Dockerfile-derived | no bespoke-format lock-in (Vercel's VHS is a mild mark against) |
| Credential model | supports per-sandbox short-lived tokens | the §0 invariant (Lambda MicroVMs' per-sandbox JWE is the reference) |
| Self-host / BYOC path | exists and is rehearsed | residency insurance (§10.5) |
| AX | agent-drivable SDK/CLI, machine-readable docs | §2.7 |
| Failure semantics | stated durability of paused sandboxes under provider incidents | §4.4 assumes loss is possible |
| Sustained create rate at floor concurrency under regional constraint | ≥ the §10.6 floor during quota/capacity pressure | shortage behavior is the whole point of the floor; measure, don't trust marketing |

**Reversal trigger:** bake-off failure on any pass/fail criterion → promote the challenger that passes; cost tiebreak only among passers.

### 10.2 GPUs — parked, no

Triage is a cheap classification call; hosted model APIs win on quality, cost, and ops burden, and nothing in the workload (Jira/Slack/GitHub text and code) needs local inference. **Reversal triggers:** (a) a `restricted` data class that forbids egress to model APIs — then Modal's GPU fleet, on the same platform as its sandboxes, is the easy add; (b) measured triage cost or latency at M1 review crossing a threshold we set then, not before. **Structural hedge:** triage sits behind a one-method interface, so swapping providers (hosted → local) touches nothing else.

### 10.3 Durable execution — our journal, Temporal's discipline

**Decision: the Record's journal *is* the durable-execution engine for v1.** Reasoning: the journal is mandatory scope regardless (audit is non-negotiable), so the engine is the marginal 20% — idempotent steps, fencing, durable timers, pinned versions (§4.3). Our shape is one agent per session with coarse, event-driven steps — closer to an actor mailbox than to the multi-step sagas Temporal's replay model exists for. Adopting Temporal on day one buys us that 20% at the cost of operating (or paying for) a second distributed system and forcing the audit trail into someone else's data model.

**Escape hatches, in order:** (1) **Vercel WDK** with the self-hosted Postgres World — durability as a build-time directive, no new infra; parked for now (young, TS-only, Worlds beyond Vercel are early). (2) **Temporal** — adopt when any trigger fires:

- we build cross-session orchestration (fan-out/fan-in, multi-agent choreography, compensation logic);
- a production incident traces to our lease/fencing/idempotency machinery;
- sessions routinely exceed ~20 branching steps or spawn dynamic sub-work.

The §4.3 disciplines are chosen so that either adoption is a refactor of the Runner, not a rewrite of the Record.

### 10.4 Code-mode placement — control-plane isolate per execution

**Decision: model-written code that calls internal APIs executes in per-execution T1 isolates inside the control plane, behind the connector gateway.** The gateway exposes each internal API as a typed connector (the code-mode pattern from RESEARCH.md §3: typed API + code execution beats JSON tool-call soup; Anthropic measured up to 98.7% token reduction), and it is where scoped credentials live, policy checks run, and the journal is written. The isolate gets no network and no secrets — only bindings, Cloudflare-style. **Per-session sandboxes never mediate internal-API access:** when sandboxed code needs internal data, it calls back through the gateway proxy, same policy path. Interim until the isolate runtime lands (the one real build item in the Executor): a locked-down T2 container profile — no network except the gateway — which preserves the invariant at higher per-call latency.

Why not per-session placement: the untrusted thing is the model's code and the precious thing is internal credentials; colocating them is the blast-radius mistake §2.2 exists to prevent. Why per-execution rather than per-session isolates: executions are stateless and short, and isolate economics (RESEARCH.md §3) make one context per call nearly free.

### 10.5 Data residency / BYOC — architecture first, vendor second

**Decision: solve residency with the §0 invariant and a data-class table, not with premature self-hosting.**

The key structural fact: **channel data (Jira, Slack, GitHub content) never enters a sandbox at any data class** — the sandbox sees a worktree and a task brief, and all channel traffic is control-plane-mediated. Residency risk therefore concentrates in the control plane, which we own end to end, in our region. What flows to a substrate provider is code and generated artifacts, governed by class:

| Data class | Examples | Substrate rule |
|---|---|---|
| `public` | OSS repos | any tier, any provider |
| `internal` | normal product repos | T3 rented is acceptable (code egress under contract review at M1); T2 always acceptable |
| `restricted` | embargoed/customer/regulated work | T2 internal or **in-account** substrate (Lambda MicroVMs) only; no third-party substrate providers; model calls via in-perimeter Bedrock only |

**Amended (2026-09-26):** the deployment context *is* an AWS-native enterprise, so the preference order is exercised, not hypothetical — **Lambda MicroVMs first** (managed, in-perimeter; §10.1), **self-hosted E2B second** (rehearsed at M2, flipped to if pause-forever economics or API fit ever beat the managed primitive), **raw Firecracker never** (§11 anti-goal). Self-hosting E2B before that flip is an ops tax paid for an option we already own; the insurance is that the infra is Apache-2.0 and the migration is rehearsed once, so the switch is measured in days.

**Reversal trigger:** a signed customer/regulatory residency requirement → execute the rehearsed self-host plan; the control plane doesn't change.

### 10.6 Capacity strategy — reserve the floor, share the peak (added 2026-09-26)

**Decision: no large static reserve pool.** Two properties of this system make hoarding the wrong answer:

1. **The workload is delay-tolerant by design.** A capacity miss is just another `waiting_timer` state (§4.2) — an agent that waits 90 seconds for compute while its human approver is at lunch loses nothing. Backpressure is free. What a reserve pool buys (sub-second admission guarantees) is something an async, comment-driven workload doesn't need.
2. **The tier gradient is the reserve pool.** Under CPU scarcity: T2 (k8s+gVisor, on cluster capacity the enterprise already owns) absorbs overflow; T3 queues; the journal doesn't care. Scarcity becomes a routing decision, not a procurement ticket. (This is also why metal-based self-host reserves are a bad deal — bare metal bills for the whole box, 24/7, at floor utilization.)

AWS levers, in the order to pull them:

| Lever | When | Idle cost |
|---|---|---|
| Raise Lambda concurrency quota (support ticket) | day one, before it's needed | $0 |
| Reserved concurrency on the agent fleet | shields sandboxes from other Lambda workloads in the same account | $0 |
| Multi-region deployment | regional constraint events; doubles as a residency lever | ~$0 |
| Small provisioned-concurrency floor | only if cold starts measurably miss the §10.1 p95 target | pays — keep it tiny |
| ODCRs on metal + Savings Plans (only if the self-host E2B fallback flips) | floor only, across 2 AZs | this *is* the reserve pool — size it to the floor |

**Trap:** Savings Plans are a discount, not a capacity guarantee — only ODCRs/Capacity Blocks actually hold machines. Conflating them is how teams discover their "reserve" was a coupon.

**Operating habit:** start at zero reserve; dogfood through M0/M1; then set the floor at ~p70 of observed peak-day concurrency and review quarterly as adoption grows. In a genuine shortage, AWS's shared pool usually absorbs bursts better than a small private pool — reservations exist to protect the floor, not the ceiling. Bake-off criterion added in §10.1: sustained create rate under regional constraint, measured.

---

## 11. Non-goals

- **No microVM orchestrator, image builder, or fleet scheduler.** That race is over (RESEARCH.md §6 anti-goal); five vendors operate Firecracker better than we will.
- **No multi-tenant SaaS, no dev-environment product.** Internal users, Jira-shaped work. Daytona's job is not our job.
- **No general workflow-engine exposure.** Sessions are the only programming model users see.
- **No multi-agent choreography in v1.** Sessions may link (parent/child rows); orchestrated fan-out is a §10.3 Temporal trigger, not a feature.
- **No GPUs** (§10.2).

---

## 12. Milestones

Scope-based, no dates; each phase is dogfoodable.

- **M0 — walking skeleton.** Record + hash-chained journal; disposable Runner with journal re-drive; Jira adapter only; E2B T3 only; approvals via Jira comment replies; audit export. *Exit: the agent completes ≥5 real Jira tasks end-to-end with approvals, and a skeptic passes the §8 reconstruction test on the exports.*
- **M1 — control plane hardening.** Policy engine + token minting; Slack and GitHub adapters; connector gateway with code-mode (interim T2 profile, then T1 isolates); T2 internal tier; **substrate bake-off per §10.1 as a decision gate**; provider contract review for code egress. *Exit: three channels live, two executor tiers live, bake-off decided on evidence.*
- **M2 — residency and scale.** Self-hosted E2B rehearsal (insurance, not operations); restricted-class routing drills; triage automation tuning behind its interface; fleet dashboards and cost reporting; kill-switch game day. *Exit: residency switch demonstrated in days, not quarters.*

---

## 13. Risks and failure modes

| Risk | Mitigation |
|---|---|
| Journal-first re-derives durable-execution lessons the hard way | §4.3 disciplines are non-negotiable from M0; §10.3 has named Temporal adoption triggers |
| Paused-sandbox loss (provider incident, runtime caps, 8h preserved-state limits) | §4.4: the sandbox is never state — checkpoint at every pause; resume falls back to restore |
| Approval latency stalls the fleet | waits cost $0; durable timers escalate; per-human concurrency caps in policy sets |
| Idle sandboxes leak money | pause-by-default is in the Runner's wait path; $0-idle is a pass/fail bake-off criterion |
| A hostile or compromised channel message drives actions | allowlisted requesters; policy gate on every side effect; kill switch + per-channel freeze |
| Scope creep toward a platform | §11 non-goals; the record is the product, everything else is rented or thin |
