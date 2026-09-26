# The Opus Video Playbook

How to get genuinely good videos out of Claude Opus (5.5+) writing code — distilled from two real runs in this repo (one mediocre, one good), Addy Osmani's threads, the evan.romeos.cc Leidenfrost transcript, and the alesha-pro `hand-drawn-canvas-animation` skill.

**Date:** 2026-09-26 · **Status:** Field-tested, two runs

---

## 0. The one-shot myth

> "the post: 'Claude one-shot this' — the prompt: 10k characters with good takes plus skills, examples and API keys" — [@trq212](https://x.com/trq212/status/2102870353781641416)

Every stunning "one-prompt" video on X is actually: **a vendored skill + a filled brief template + a mandatory visual QA loop**. The prompt sentence is the smallest part. Addy Osmani's "how browsers work" was one-shot *because* the prompt carried storyboard, visual direction, and (implicitly) a workflow the model already knew. Your job is to supply all three explicitly.

**Corollary:** a vague 10-line prompt gets you a slideshow with easing. That's what my first run produced, and it was painfully average.

---

## 1. Pick the medium first (this decides everything)

| Medium | Look | Toolchain | When to use |
|---|---|---|---|
| **Hand-drawn canvas film** | Sketchbook: ink lines that boil ~8Hz, watercolor washes, cream paper, hand lettering | HTML + Canvas 2D + the alesha-pro skill, headless Chrome frame export, ffmpeg | Explainers, "how X works", anything emotional. **This is the Addy bar.** |
| **Motion graphics** | Dark terminal, kinetic type, spring easing | Remotion (React → MP4) | Product demos, changelogs, data stories. Clean but generic-looking |
| **3D cinematic** | Three.js procedural worlds | Single HTML file + three.js, screen capture | Wow-factor pieces; hours of agent time |
| **Raw JS/Canvas frames** | Anything | JS draws frames → headless browser screenshots → ffmpeg | When you want zero framework |

Default to **hand-drawn canvas**. It has the highest quality-per-effort because the medium forgives small rendering imperfections — wobble is a feature.

---

## 2. The pipeline (in order — do not skip steps)

### Phase 0 — Distill the content
Before any prompt: reduce the source to **3 things the viewer must remember**. Write them down. Everything in the video serves those. (For the runtime video: 5 eras → the record is what agents need → buy substrate, build control plane.)

### Phase 1 — The brief (fill it, as a file)
Use the skill's `brief-template.md` or this minimal version. The model fills inferable choices; you supply subject, duration, look, and the 3 takeaways.

```text
Subject and emotional beat:
Duration; aspect ratio; resolution:
Look: ink | pencil | riso | screen | doodle
Palette + material bindings (what boils vs what holds still):
Cast of glyphs (one per concept, silhouette-readable):
Beat sheet: start, duration, viewer focus, action, camera, sound:
Hardest action: keys, breakdowns, contacts:
Closing beat:
Known limitations:
```

### Phase 2 — Build the film as interactive HTML first
Not a render script — a page you can open. Canvas 2D, `defineFilm`-style scene functions, seeded randomness (nothing seeded from the frame number — that's how you get "swimming" strokes), progressive draw-on. Study the skill's `examples/sketchbook-bird.html` pattern: authored glyphs, whole-pose drawing, exposure sheets.

### Phase 3 — Visual QA loop (MANDATORY, this is where quality happens)
Render previews and **look at them** (the model must Read the PNGs):

```bash
node scripts/render.mjs film.html --grid 24 --out /tmp/review      # whole-film contact grid
node scripts/render.mjs film.html --strip 480,12 --out /tmp/strip  # consecutive frames around a transition
node scripts/render.mjs film.html --only 480 --out /tmp/one        # full-res single frame
```

Fix-loop until stills pass. The checklist that caught 10 defect classes in our run:

- **Glyph test:** does every drawing read as what it is at thumbnail? (Our sandbox glyph "read as a boat" — redrawn twice)
- **240px test:** shrink a frame to 240px — era names and the takeaway must survive; fine print must not exist
- **Dead-frame test:** scrub the timeline — no frame may be empty or near-empty
- **Tangency test:** no two strokes may kiss accidentally (fence pickets touching cards, straps overshooting washes)
- **Transition test:** `--strip` across every cut — labels must cross-fade, not pop
- **Closing-card test:** final card holds ≥ 2s
- **Monotonic-axis test:** timelines must be ordered correctly (v1 put Firecracker 2018 before Workers 2017)

### Phase 4 — Narration FIRST, then re-time
The Leidenfrost lesson: **record the voice before finalizing timing.** Script ~140-150 words per 60s, calm delivery, one idea per beat, ending on the takeaway. Scenes cut on sentence boundaries; total runtime = narration + ~2s tail.

```bash
# Piper TTS (local, good enough):
pip install piper-tts
mkdir -p ~/.local/share/piper-voices && cd ~/.local/share/piper-voices
curl -sLO https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx
curl -sLO https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
echo "Your sentence here." | python3 -m piper -m ~/.local/share/piper-voices/en_US-lessac-medium.onnx -f s01.wav
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 s01.wav
```

Synthesize per-sentence (s01.wav…s14.wav) so you can re-time segments individually.

### Phase 5 — Render
One headless Chrome instance, frames exported via `canvas.toDataURL` — **never** one `--screenshot` process per frame (100× slower). ~4 fps at 1080p → a 70s/24fps film renders in ~7 min.

```bash
ffmpeg -v error -y -framerate 24 -i frames/%04d.png -vf fps=24 -c:v libx264 -pix_fmt yuv420p -crf 18 film.mp4
```

### Phase 6 — Sound design
Synthesize procedurally with ffmpeg (no external assets): noise-burst scratches at cuts, a low sine pad, ducking under narration, loudness normalize to ~-14 LUFS:

```bash
ffmpeg -i film.mp4 -i mix.wav -map 0:v:0 -map 1:a:0 -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v copy -c:a aac -b:a 192k final.mp4
```

### Phase 7 — Verify the ENCODED video
Not the PNGs — the MP4. ffprobe (duration, streams, resolution), then decode 8+ frames spread across the runtime and view them. Report known limitations honestly.

---

## 3. The prompt that works (skeleton)

The full prompt is long by design. Structure:

```text
1. ROLE + SKILL: "A skill for this is vendored at ./skills/hand-drawn-canvas-animation.
   Read SKILL.md, references/{style,motion,architecture,redrawn-animation,brief-template}.md,
   and examples/sketchbook-bird.html FIRST. Follow its workflow exactly."
2. CONTENT: the 3 takeaways + the source doc path. "Do NOT cram."
3. BEATS: per-scene timing, action, caption text, glyph description (see §2 Phase 0-1)
4. VISUAL DIRECTION: palette (hex), material (what boils / what holds), mark language
5. WORKFLOW: brief → build → --grid/--strip/--only review loop with named defect tests →
   narration first (piper command + voice path) → retime → render → sound → verify encoded MP4
6. ENVIRONMENT: exact Chrome path, ffmpeg presence, fonts available, TTS voice path
7. DELIVERY: exact output path; report format (what you fixed, known limitations)
```

Real example: the v2 prompt in this thread's history (session of 2026-09-26), which produced [agent-runtimes-v2.mp4](assets/media/agent-runtimes-v2.mp4).

---

## 4. Environment setup (fresh machine)

```bash
# Skill (the single highest-leverage artifact):
git clone --depth 1 https://github.com/alesha-pro/tools /tmp/alesha-tools
mkdir -p skills && cp -r /tmp/alesha-tools/skills/hand-drawn-canvas-animation skills/

# Chrome for Testing (or agent-browser's): note exact path for the render script
ls ~/.agent-browser/browsers/

# ffmpeg: preinstalled on most dev images. Piper TTS: see §2 Phase 4.

# Claude Code with Opus:
claude --print --model opus --effort medium --dangerously-skip-permissions "<prompt>"
```

---

## 5. Expectations

| | v1 (Remotion, vague-ish prompt) | v2 (skill + brief + QA loop) |
|---|---|---|
| Wall time | ~11 min | ~33 min |
| Render | 720p, first attempt | 1080p, 1640 frames, ~7 min render |
| Defects found in self-review | 5 | 10 classes |
| Result | Generic slide-deck energy | Sketchbook film with narration + sound |
| Verdict | "nowhere near Addy" | The Addy bar |

Time budget rule: **most of the agent's time should go to the review loop, not the first build.** If it renders in one pass without looking at frames, it will be mediocre.

## 6. Sources

- Addy Osmani, "how browsers work" thread: https://x.com/addyosmani/status/2103009037164110327 (one-shot confirmed; prompt never shared — the skill IS the prompt)
- @trq212 on one-shot reality: https://x.com/trq212/status/2102870353781641416
- Leidenfrost workflow transcript (the reference pipeline): https://evan.romeos.cc/share/UYNYG88v-HH0JRg3R2j766V4Hkt-OypVtkYwPK2paEg
- Skill: https://github.com/alesha-pro/tools/tree/main/skills/hand-drawn-canvas-animation
- Video-editing skill (different job: cutting/subtitles/Manim+Remotion): https://github.com/browser-use/video-use
- Numman Ali voice-prompt example: https://x.com/nummanali/status/2103565570310340931
- HyperFrames (alternative agentic video tool): https://x.com/mvanhorn/status/2063624356484501832
