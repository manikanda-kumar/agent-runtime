# Film brief — agent runtimes: a sketchbook history

Subject and emotional/action beat: thirty years of compute shrinking, ending on a
calm instruction. The emotional beat is *recognition*: the viewer watches a line
grow across a page, sees the unit of compute get smaller five times, and realises
the thing that kept getting lost — the record — is the thing agents need most.

Duration; primary aspect ratio; delivery resolution: 69.83 s (1676 frames @ 24 fps);
16:9; 1920x1080.

Drawing reference; material reference: an illustrated explainer sketchbook — a fine
technical pen on warm cartridge paper with loose watercolour washes laid off-register.
Material reference: `paperInk` palette family (cream `#f3e6cf`, indigo-black ink),
watercolour via `wash()`, paper grain from `paper()`.

Look: ink.

Techniques actually used: authored brush-stroke glyphs (drawn once, boiled per 1/8 s),
a stroke-drawn alphabet (`letters.js`) so every caption is a pen line and not a font,
watercolour washes, progressive draw-on, a tracking camera along a drawn timeline.
No photos, plates, found motion, sand or paper.

If mixing looks: not mixed. One material for the whole film.

Palette and material bindings: paper grain belongs to the **sheet** (fixed seed,
never boils). Washes belong to the **object** (fixed seed, held while the object is
held). Ink boil belongs to the **line** (seed steps 8x/sec). Nothing is seeded from
the output frame number.

Mark language: one confident contour per form, drawn with a tapering brush line;
internal detail thinner and quieter (corrugations, bays, ruled lines); washes laid
5-8 units off the line so the paint misses the edge the way real paint does. No
hatching — the tone is carried by the wash, not by texture.

Cast: no character. The "cast" is six drawn objects with distinct silhouettes:
a CRT computer (title), a server cabinet (tall vertical), a shipping container
(wide horizontal), a lightning bolt + firecracker chip (angular), a field of tiny
isolate cells (fine texture), a ledger book (open, curved) and a bound ledger
(closed, with a strap). Every pair differs in silhouette class, so no two eras
read alike at 240 px.

Drawing method: whole authored stroke drawings, drawn progressively and then held.
No inbetweening: the subjects are objects, not a performing character, so each
drawing is placed and held while the camera and the writing carry the motion.

Exposure sheet: ink boil steps at 8 Hz (`Math.floor(tau*8)`), i.e. a new redraw
variant every three output frames; washes and paper hold for the whole shot.
Draw-on ramps are 0.9-1.7 s per element, timed to start a beat before its sentence.

Hardest action: the era montage — a camera dollying 3600 units along a drawn
timeline while five vignettes draw themselves on arrival. The risk is the camera
and the draw-on fighting each other, so the camera holds completely still for the
whole of every sentence and only moves during the gaps between them.

Exposure: output 24 fps; ink on "threes" (8 Hz boil); camera and draw-on progress
continuous.

Camera and root motion; screen-space tracking check: one axis only (x), plus a
single push in from the establishing wide. Subjects never move in world space, so
screen-space motion is exactly the camera's — no double quantisation.

Environmental force: none. A sketchbook page is still.

Beat sheet:
| start | dur | viewer notices | action | camera | sound |
|---|---|---|---|---|---|
| 0.00 | 4.96 | a computer being drawn | title writes on | still | pencil bed in, soft pad |
| 4.96 | 34.29 | a line growing across the page | five era vignettes draw on arrival | wide, then dolly right in four moves | paper scratch at each era |
| 39.25 | 14.92 | three panels | sandbox, ledger, braces | still | scratch per panel |
| 54.17 | 7.42 | a staircase | marker hops up four tiers | still | three soft ticks |
| 61.58 | 8.25 | two lines of lettering | takeaway writes, beat, second line, sign-off holds 2.1 s | still | pad resolves |

Closing beat: `github.com/manikanda-kumar/agent-runtime`, small, under the two lines.

External sources/licences: none. All geometry authored here. Narration synthesised
locally with Piper (`en_US-lessac-medium`). Score synthesised with ffmpeg.

Delivery files and known limitations: `film/index.html` + local modules,
`out/index.mp4`, `agent-runtimes-v2.mp4` (muxed), contact sheet. Limitations are
listed in the final report.
