# SKIN DESIGN SPECIFICATION
## ALIEN HEAD — THE SIGNAL

```
SKIN ID : DROP-03 // CODENAME: SIGNAL
REVISION: v1.0   // STATUS: SPEC LOCKED // DATE: 2026.06.21
```

> This document defines every visual and behavioral decision for the Alien Head skin.
> The builder receives this spec and executes it — no aesthetic interpretation, no gap-filling.
> Every pixel and animation described here is a locked decision.

---

## 01  CONCEPT

When Spotify opens, a 3D-sculpted alien head fades in at the center of the screen. It faces straight ahead. After a beat, it tilts downward — as if bowing, or as if the screen embedded in its skull is too heavy — and the cranial panel splits open to reveal the visualizer screen. From both sides of the skull, rigid instrument wings deploy outward. The head becomes the player.

**The aesthetic is not Y2K. It is not cyberpunk. It is alien archaeology.**

This entity was not built — it was *found*. It predates human technology. The circuit traces visible beneath its skin are not wiring, they are veins. The screen embedded in its forehead is the only manufactured-looking element — everything else looks grown, organic, ancient. The face is calm. It is not threatening. It is just watching, and playing music.

The entire skin floats as a freeform object in the center of the screen. There is no rectangular window. No title bar. No app chrome. Just the head and its wings, sitting on top of whatever is behind it — desktop, other apps, anything. The rest of the screen remains visible around it.

### Core metaphor

| SPOTIFY ELEMENT | ALIEN HEAD EQUIVALENT |
|---|---|
| Now playing / visualizer | Screen embedded in skull (cranial display) |
| Track name + artist | Text readout below the cranial screen |
| Progress bar | Thin luminescent line running along the jaw |
| Volume | Left wing slider (same position as Winamp original) |
| EQ bands | Left wing — vertical bar cluster |
| Queue / playlist | Right wing — track list panel |
| Play / pause / skip | Controls strip below cranial screen, above jaw |
| Bass hit | Subsurface face glow pulses outward |
| Genre | Subtle tint shift in circuit trace color |

---

## 02  REFERENCE IMAGES

### Ref A — Original Winamp Alien Head skin (both images)

What to preserve from the original:
- The bilateral symmetry — wings extend equally left and right from skull sides
- Screen is embedded INTO the skull, not sitting on top
- Wings are the same height as the skull, horizontally level
- Speaker units at far ends of each wing
- The face below the screen is a smooth mask — no mouth opening, no nostrils visible, eyes closed or absent
- The overall silhouette reads as a T-shape (head + crossbar of wings)

What to modernize:
- No Windows chrome (title bar, X button at top of skull — gone)
- No flat 2D panel texture — everything has depth, subsurface lighting, material quality
- Circuit traces replace the flat green plastic look
- The screen bezel is modern — thin edge, slight curvature, inner glow
- Speaker grilles are detailed, not cartoon circles

### Ref B — Aesthetic anchor: alien archaeology

Reference points (not literal references, aesthetic feeling):
- The smooth featureless quality of the face in *2001: A Space Odyssey*'s monolith scenes
- Bioluminescent deep-sea creature lighting — light comes from inside, not outside
- Circuit board traces that look like they grew rather than were etched
- The stillness of a thing that has been waiting

---

## 03  COLOR SYSTEM

| TOKEN | HEX | USAGE |
|---|---|---|
| `--void` | #000000 | Shell background (fully transparent — desktop shows through) |
| `--skull-base` | #0A1A0A | Deepest skull surface color |
| `--skull-mid` | #0F280F | Mid-tone skin surface |
| `--skull-highlight` | #1A4A1A | Raised surface highlights, cheekbones, brow ridge |
| `--glow-primary` | #00FF41 | Subsurface bioluminescent glow, bleeds through skull |
| `--glow-dim` | #004A14 | Dim glow areas, underside of jaw, eye sockets |
| `--circuit-trace` | #1BFFE4 | Circuit vein traces running under skin |
| `--circuit-dim` | #0A3A3A | Dimmer circuit traces, secondary paths |
| `--screen-bg` | #000810 | Cranial screen background |
| `--screen-border` | #1BFFE4 | Thin bezel glow around cranial screen |
| `--screen-glow` | rgba(27,255,228,0.3) | Screen ambient spill onto surrounding skull |
| `--viz-primary` | #00FF41 | Visualizer bars primary color |
| `--viz-accent` | #1BFFE4 | Visualizer bars accent / peak color |
| `--text-primary` | #C8F0C8 | Track name, readable text |
| `--text-dim` | #2A4A2A | Secondary labels, timestamps |
| `--jaw-line` | #00FF41 | Progress line running along jaw |
| `--wing-surface` | #0C200C | Wing panel surface |
| `--wing-border` | #1A3A1A | Wing panel borders |
| `--wing-accent` | #00FF41 | Wing active elements, slider handles |
| `--amber-warning` | #FF9D2E | Bass warning pulse (used sparingly) |

> ⚡ The shell background is `background: transparent` — the desktop / other app windows show through around the head shape. The head itself has no rectangular container. It is a shaped object floating on screen.

### Genre tint shifts (circuit trace color only)

| GENRE | CIRCUIT COLOR | FEEL |
|---|---|---|
| Electronic / techno | #1BFFE4 (default teal) | Cold signal |
| Ambient / lo-fi | #7B6FFF (violet) | Deep space drift |
| Hip-hop / trap | #FF4F4F (red) | Heat signature |
| Rock / metal | #FF9D2E (amber) | Overload |
| Classical / acoustic | #C8A86E (warm gold) | Ancient, organic |

Circuit trace color transitions over 2s ease when genre changes. Everything else stays green.

---

## 04  TYPOGRAPHY

Two fonts. No exceptions.

| ROLE | FONT | USAGE |
|---|---|---|
| Display | Exo 2 (Google Fonts) — 700 italic | Track name, nothing else |
| Data | Share Tech Mono (Google Fonts) | All other text — artist, time, labels |

### Type scale

| LEVEL | SIZE / WEIGHT | ELEMENT |
|---|---|---|
| L | 15px / Exo 2 700 italic | Track name below cranial screen |
| M | 11px / Share Tech Mono | Artist name, album |
| S | 10px / Share Tech Mono | Timestamps, EQ labels, playlist items |
| XS | 8px / Share Tech Mono | Secondary labels, track numbers |

All text: `letter-spacing: 0.08em`. Track name title case. Everything else lowercase except acronyms.

---

## 05  BUILD ARCHITECTURE

### Shell approach — identical to Y2K Cockpit

The patcher injects `#alien-shell` as a `position: fixed, inset: 0, z-index: 9999` div with `background: transparent` and `pointer-events: none` on the transparent areas. Spotify's native UI is hidden underneath. The shell reads Spotify's playback state via MutationObserver on stable `data-testid` selectors.

**Key difference from Y2K Cockpit:** the shell background is transparent. The head shape is an SVG/HTML object with actual shape — not a rectangle. Click events pass through transparent areas to whatever is behind. Only the head and wings capture pointer events.

```css
#alien-shell {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: transparent;
  pointer-events: none; /* transparent areas pass clicks through */
  display: flex;
  align-items: center;
  justify-content: center;
}

#alien-head-container {
  pointer-events: all; /* only the head captures events */
  position: relative;
  width: 640px; /* wings fully deployed */
  height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### State sync (same selectors as Y2K Cockpit spec)

| DATA | SELECTOR |
|---|---|
| Track name, artist | `[data-testid="context-item-info-title"]`, subtitles |
| Playback state | `[data-testid="control-button-playpause"]` aria-label |
| Progress / duration | `[data-testid="playback-progressbar"]` aria values |
| Volume | `[data-testid="volume-bar"]` aria value |
| Album art URL | `[data-testid="CoverSlotCollapsed--cover-art"] img` src |
| Queue items | `[data-testid="tracklist-row"]` within queue panel |
| Shuffle / repeat | `[data-testid="control-button-shuffle"]` aria-checked |

### Files produced

```
inject/
  app.js          — shell creation, observer, state sync, audio analysis, bass detection
  alien.css       — all shell layout, head shape, wing layout, animations
  fonts.css       — @import Exo 2 + Share Tech Mono
  manifest.json   — patcher metadata
```

---

## 06  THE HEAD — STRUCTURE AND RENDERING

The alien head is built as an **SVG object** embedded in the shell. Not a PNG, not a 3D render — a fully authored SVG with layered paths, radial gradients, and filter effects that create the illusion of depth and subsurface glow. This is important: it must be code, not an image asset, so it can animate, react, and have its circuit traces change color.

### SVG layer stack (bottom to top)

```
Layer 1: Base skull shape       — filled #0A1A0A, the dark mass of the head
Layer 2: Subsurface glow        — radial gradients from cheekbones, brow, top of skull
                                   in #00FF41 at 15–25% opacity, soft blur
Layer 3: Surface contour        — lighter paths defining brow ridge, cheekbones,
                                   nasal ridge, chin — #1A4A1A fills
Layer 4: Circuit traces         — thin paths (stroke: 0.8px) in --circuit-trace,
                                   running from temples down cheekbones, branching
                                   at jaw. Look like they grew, not etched.
Layer 5: Screen cavity          — rectangular cutout area in skull for the screen,
                                   inset with shadow to look recessed
Layer 6: Screen bezel           — thin border path around screen cavity, --screen-border
Layer 7: Screen content         — visualizer SVG/canvas element, lives here
Layer 8: Screen ambient spill   — soft radial glow from screen onto surrounding skull
Layer 9: Eye sockets            — subtle indentations, darker than skull surface,
                                   no visible eyes — just shadow
Layer 10: Specular highlights   — tiny bright path highlights on brow ridge, top of
                                   skull, catching imaginary overhead light
```

### Head dimensions

```
Total head height (forehead to chin):  ~280px
Width at widest (temples):             ~200px
Screen dimensions:                     140px × 100px
Screen position:                       centered horizontally, 60px from top of skull
Jaw line position:                     230px from top
```

### Circuit trace layout

Traces must look grown, not designed. Guidelines:
- Two main trunk paths from each temple running down to the jaw, branching 2–3 times each
- Branch angles: 30–45 degrees, never 90 degrees (90 degrees looks manufactured)
- Traces fade out at the ends (stroke-opacity gradient along path)
- Total traces visible: 8–12 individual paths
- No trace crosses the screen area
- No trace on the center vertical axis of the face (keeps it symmetric but not mechanical)
- Traces on left and right side mirror each other with slight hand-drawn imperfection (2–3px offset)

### Subsurface glow behavior

```css
/* Static base glow — always on */
.skull-glow-cheek-left,
.skull-glow-cheek-right {
  fill: radial-gradient centered at each cheekbone;
  color: #00FF41 at 18% opacity at center, 0% at edge;
  filter: blur(12px);
}

/* Bass reactive layer — additional glow on beat */
.skull-glow-bass {
  opacity: 0; /* normally invisible */
  fill: radial-gradient from skull center;
  color: #00FF41 at 40% opacity;
  filter: blur(20px);
  transition: opacity 80ms ease-out;
}
/* On bass hit: .skull-glow-bass { opacity: 1 } for 200ms then back to 0 */
```

---

## 07  ENTRY ANIMATION SEQUENCE

This is the most important animation in the skin. It runs once when Spotify opens (shell mounts). It is a sequence, not a loop.

```
T+0ms     Shell mounts. Head invisible (opacity: 0, scale: 0.95)
T+200ms   Head fades in (opacity: 0 → 1, scale 0.95 → 1.0)
           Duration: 600ms, ease-out
           Head is facing straight — no tilt yet
           Wings are retracted (width: 0, folded against skull sides)

T+800ms   Pause. The head sits there, facing you. 1 full second.

T+1800ms  Head tilts forward (tilt down)
           transform: rotateX(28deg) — perspective tilt, not flat 2D rotation
           The top of the skull rises, chin drops toward viewer
           Duration: 900ms, cubic-bezier(0.4, 0, 0.2, 1)
           As it tilts: the skull top splits — a horizontal seam opens
           Seam is a 1px #1BFFE4 line that appears and widens

T+2700ms  Cranial screen slides up from the seam
           Screen panel rises out of the top of the skull like a monitor
           rising from a laptop hinge
           Duration: 700ms, cubic-bezier(0.34, 1.56, 0.64, 1) — slight overshoot
           Screen's inner glow fades in as it rises (opacity: 0 → 1)

T+3400ms  Wings deploy
           Left wing slides out to the left, right wing to the right
           From 0px to full width, simultaneously
           Duration: 500ms, cubic-bezier(0.4, 0, 0.2, 1)
           Wing content (EQ sliders, playlist) fades in as wings reach full extension

T+3900ms  System fully open. All animations complete. Interactive state begins.
           Visualizer starts. Progress line on jaw activates.
```

### Closing animation (Spotify closes / skin unloads)

Reverse of entry, compressed to 600ms total.

### Idle micro-animations (loop, once system is open)

- **Head breathe:** very subtle `translateY` oscillation, ±2px, 6s sine, infinite. Makes it feel alive without being distracting.
- **Circuit pulse:** every 8–12 seconds (randomized), one circuit trace path briefly brightens (opacity 0.4 → 1.0 → 0.4) over 800ms, like a signal passing through. One path at a time. Random selection.
- **Screen flicker:** screen brightness dips to 85% for 40ms every 15–30 seconds (randomized). Like CRT tube settling.

---

## 08  CRANIAL SCREEN (Visualizer)

The screen embedded in the skull forehead. This is the central visual focus.

### Physical spec
- Dimensions: 140px × 100px
- Position: centered horizontally on skull, 60px from skull top
- Bezel: 2px border, `var(--screen-border)` color, slight inner glow
- Screen surface has `border-radius: 3px` — barely rounded, feels like a real screen
- `filter: brightness(1.1) contrast(1.05)` on screen content — phosphor-bright look
- Ambient spill: `box-shadow: 0 0 30px rgba(27,255,228,0.25)` spreading onto skull around it

### Visualizer design
- **32 bars**, vertical, filling the screen width
- Bar color: `linear-gradient(to top, var(--viz-primary), var(--viz-accent))`
- Peak dots: 2px × 2px dot at top of each bar, `var(--viz-accent)`, holds for 600ms then falls
- Screen background: `var(--screen-bg)` — near black, so bars glow against it
- Driven by Web Audio API `AnalyserNode`. Fallback: CSS simulation
- Bar behavior: fast attack (20ms), slow decay (400ms) — classic Winamp feel

### Screen content during entry animation
- Before screen fully opens: blank, dark
- As it rises: first a horizontal scan line sweeps from bottom to top (200ms)
- Then visualizer bars fade in over 300ms

---

## 09  JAW PROGRESS LINE

A thin luminescent line running along the jaw of the face — the progress bar.

- Path: follows the curved contour of the jaw, SVG `<path>` element
- Total jaw path length represents full track duration
- Filled portion: `stroke: var(--jaw-line)`, `stroke-width: 1.5px`, `stroke-linecap: round`
- Unfilled portion: `stroke: var(--glow-dim)`, `stroke-width: 1px`
- Glow: `filter: drop-shadow(0 0 3px var(--jaw-line))`
- On hover over jaw area: line thickens to 3px and a dot scrubber appears on the line
- Scrubbing: drag the dot along the jaw path → writes to Spotify's hidden progress bar

---

## 10  LEFT WING — INSTRUMENT PANEL

The left wing extends from the left side of the skull. It is a rigid panel matching the skull height.

### Dimensions (fully deployed)
- Width: 180px
- Height: matches skull section height ~240px
- `background: var(--wing-surface)`
- `border: 1px solid var(--wing-border)`
- Corner: subtle 2px `border-radius` — modern but not soft
- Outer edge: speaker grille unit

### Wing sections (top to bottom)

**Section 1 — Balance + Volume (top, 60px tall)**
- Two horizontal sliders: BALANCE and VOLUME
- Slider track: 1px line, `var(--wing-border)`. Height: 1px.
- Slider handle: 8px × 14px rect, `var(--wing-accent)`, no border-radius
- Labels: 8px Share Tech Mono, `var(--text-dim)`, above each slider: `bal` / `vol`
- Current value: shown as number to the right, 8px, `var(--wing-accent)`

**Section 2 — EQ bands (main, 140px tall)**
- 10 vertical bar sliders for EQ: 32Hz, 63Hz, 125Hz, 250Hz, 500Hz, 1K, 2K, 4K, 8K, 16K
- Each slider: vertical track 100px tall, handle same style as vol slider
- Default position: center (flat EQ)
- Freq labels below each bar: 8px Share Tech Mono, `var(--text-dim)`
- Active/dragged handle: `var(--viz-primary)` with `filter: drop-shadow(0 0 4px var(--viz-primary))`

**Section 3 — EQ visualization (bottom, 40px tall)**
- Small mini-visualizer strip at wing bottom: 10 bars mirroring the EQ bands
- Same bar style as cranial screen but smaller (10px tall bars)
- Purely decorative, responds to audio

### Speaker grille (far left edge of wing)

- 40px × 160px unit attached to far left of wing
- Grille pattern: 5 × 8 grid of 4px circles, `var(--wing-border)` color
- Two visible speaker rings: outer ring (2px border, `var(--wing-border)`), inner cone shape (filled `#050A05`)
- `border-radius: 4px` on the grille unit only (the grille can be slightly rounded)
- No glow on speakers — they are passive, mechanical elements

---

## 11  RIGHT WING — PLAYLIST PANEL

Same dimensions and border treatment as left wing, mirrored.

### Wing sections

**Section 1 — Now playing header (top, 40px tall)**
- Track name: 15px Exo 2 700 italic, `var(--text-primary)`, single line truncated
- Artist: 10px Share Tech Mono, `var(--text-dim)`
- Duration remaining: 10px Share Tech Mono, `var(--text-dim)`, right-aligned

**Section 2 — Playlist / queue (main, 160px tall, scrollable)**
- Each item: track number + track name + duration
- Format: `01  Track Name ·············· 3:42`
- Dots are `var(--text-dim)` dot leaders between name and duration
- Font: 10px Share Tech Mono
- Default color: `var(--text-dim)`
- Currently playing: `var(--wing-accent)`, `border-left: 2px solid var(--wing-accent)`, `background: rgba(0,255,65,0.06)`
- Hover: `color: var(--text-primary)`
- Click: triggers play on Spotify's hidden equivalent

**Section 3 — Controls (bottom, 40px tall)**
- Play/Pause: 28px × 28px. Shape: diamond (45deg rotated square). Border: 1.5px `var(--wing-accent)`. Icon inside.
- Skip prev / next: 20px × 20px squares, `border: 1px solid var(--wing-border)`
- Shuffle toggle: `SHF` label, 8px Share Tech Mono. ON = `var(--wing-accent)`. OFF = `var(--text-dim)`.
- Repeat toggle: `RPT` label, same treatment
- All hover: border → `var(--wing-accent)`, icon → `var(--text-primary)`

### Speaker grille (far right edge of right wing)

Identical to left wing, mirrored.

---

## 12  CONTROLS STRIP (between screen and jaw)

A 32px tall strip sitting between the bottom of the cranial screen and the jaw progress line.

- Play/Pause: same diamond shape as right wing controls, 32px size
- Skip prev / next: 22px squares
- Time display: `02:14 / 04:33` — 10px Share Tech Mono, `var(--text-dim)`, right side of strip
- All on a single horizontal line, centered under the screen

---

## 13  BASS REACTIVITY

On significant bass hit (Web Audio API amplitude spike > 0.7 normalized):

- Subsurface skull glow pulses outward: `.skull-glow-bass` opacity 0 → 1 → 0, total 280ms
- Circuit traces briefly all brighten simultaneously: opacity → 1.0 for 100ms
- Cranial screen brightness: `filter: brightness(1.3)` for 80ms then back to `brightness(1.1)`
- Cooldown: 400ms between triggers

> ⚡ The effect should feel like the head is absorbing the bass — not a flash, a pulse from inside.

---

## 14  DRAGGABILITY

The entire `#alien-head-container` is draggable. The user can reposition the head anywhere on screen.

```js
// Standard drag implementation on #alien-head-container
// Save position to localStorage under key 'alien-head-position'
// On load: restore saved position (default: center of screen)
// During drag: pointer-events on transparent shell areas stay none
```

---

## 15  MINIPLAYER STATE

When Spotify enters miniplayer mode (or user double-clicks head to collapse):

The wings fold back in (reverse of deploy animation, 400ms), the cranial screen slides back down, and the head tilts back to facing forward. What remains: just the alien face, facing forward, 200px × 280px, floating on screen.

In this collapsed state:
- Jaw progress line still active (shows track progress on the face)
- Subsurface glow still pulses with bass
- Circuit traces still idle-animate
- Track name appears as a floating label below the chin in 11px Share Tech Mono, fading after 3s
- Double-click head again → re-deploys full layout (entry animation, abbreviated 800ms version)
- The collapsed head is still draggable

---

## 16  ANIMATIONS REFERENCE TABLE

| ELEMENT | ANIMATION | DURATION | EASING |
|---|---|---|---|
| Entry fade-in | opacity + scale | 600ms | ease-out |
| Head tilt | rotateX(28deg) | 900ms | cubic-bezier(0.4,0,0.2,1) |
| Skull seam open | path expand | 400ms | ease-out |
| Screen rise | translateY | 700ms | cubic-bezier(0.34,1.56,0.64,1) |
| Wing deploy | translateX | 500ms | cubic-bezier(0.4,0,0.2,1) |
| Head breathe | translateY ±2px | 6000ms | sine, infinite |
| Circuit pulse | opacity on one path | 800ms | ease-in-out, random 8–12s interval |
| Screen flicker | brightness dip | 40ms on / hold | random 15–30s interval |
| Bass skull glow | opacity 0→1→0 | 280ms total | ease-out / ease-in |
| Circuit bass sync | opacity → 1.0 | 100ms on | one-shot on bass |
| Wing fold (mini) | translateX back | 400ms | ease-in |
| Genre tint shift | stroke color | 2000ms | ease |
| Jaw progress fill | stroke-dashoffset | continuous | linear |

**Forbidden:**
- No rotation on wings
- No scale animations after entry sequence
- `prefers-reduced-motion`: entry animation collapses to instant fade-in, no tilt, no deploy sequence. All idle loops disabled. Bass reactivity disabled.

---

## 17  ANTI-SPEC

- NO rectangular window or app chrome anywhere
- NO Spotify green (#1DB954)
- NO white anywhere in the skin — `var(--text-primary)` is the lightest value used
- NO border-radius greater than 4px on any element (speaker grille unit: max 4px)
- NO drop shadow on text
- NO glow on speaker grille elements — speakers are dead metal, head is alive
- NO album art displayed anywhere — the visualizer IS the visual
- NO genre label or text badge — genre shift is communicated only through circuit trace color
- NO tooltip text on any control
- The head does NOT have visible eyes — eye sockets are shadow only
- The head does NOT have a visible mouth — jaw line is the progress bar, not a feature
- NO particles, NO floating elements other than the head itself

---

## 18  BUILD INSTRUCTIONS

**This is not a Spicetify skin.** Independent patcher — same architecture as Y2K Cyber Cockpit. Shell overlay, Spotify UI hidden, MutationObserver state sync. See Y2K Cockpit spec Section 05 for full architecture detail — identical approach.

**Build prompt for new thread:**

> "I'm building a music player skin called Alien Head (codename: SIGNAL) for an independent Spotify patcher (not Spicetify). The patcher injects JS and CSS into Spotify's Electron app at startup. Spotify's native UI is hidden. The shell is position: fixed, z-index: 9999, background: transparent — the alien head floats on screen as a shaped SVG object with no rectangular container. I have a locked design spec. Follow it exactly — no aesthetic decisions, no gap-filling. Build in this order: (1) fonts.css and CSS variables, (2) shell + head container structure with transparent background, (3) head SVG — layer by layer as specified, (4) circuit trace SVG paths, (5) subsurface glow gradients and bass reactivity, (6) cranial screen + visualizer, (7) jaw progress line, (8) entry animation sequence — all 5 stages with correct timing, (9) left wing with EQ sliders, (10) right wing with playlist, (11) controls strip, (12) speaker grilles, (13) idle micro-animations, (14) draggability + position persistence, (15) miniplayer collapsed state. Deliver only changed files each iteration."

---

## 19  REVISION LOG

| VERSION | DATE | CHANGE |
|---|---|---|
| v1.0 | 2026.06.21 | Initial spec locked |

---

```
END OF SPEC // ALIEN HEAD // CODENAME: SIGNAL // DROP-03
```
