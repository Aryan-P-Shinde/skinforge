# SKIN DESIGN SPECIFICATION
## Y2K CYBER COCKPIT

```
SKIN ID : DROP-02 // CODENAME: VANGUARD
REVISION: v1.0   // STATUS: SPEC LOCKED // DATE: 2026.06.21
```

> This document defines every visual and behavioral decision for the Y2K Cyber Cockpit skin.
> The builder receives this spec and executes it — no aesthetic interpretation, no gap-filling.
> Every pixel and animation described here is a locked decision.

---

## 01  CONCEPT

The full Spotify desktop UI transforms into the interior of a retro-futurist spacecraft cockpit. The aesthetic is Y2K sci-fi: how 1999–2005 cinema and anime imagined the future. Think Cowboy Bebop's Bebop, Ghost in the Shell terminals, Gundam cockpit panels (ref image A). Every Spotify function gets remapped to a cockpit metaphor. Music is navigation. Playback is propulsion. Your library is a star chart.

### Core metaphor mapping

| SPOTIFY ELEMENT | COCKPIT EQUIVALENT |
|---|---|
| Track name | Current mission / nav target ID |
| Artist name | Sector / origin signal |
| Progress bar | Fuel consumption / route progress gauge |
| Volume | Engine throttle — vertical lever with notches |
| BPM display | RPM gauge — analog circular dial, needle sweeps |
| Queue / upcoming tracks | Navigation route — waypoints on a star map line |
| Library / sidebar | Left instrument panel — nested readouts and switches |
| Search bar | Target acquisition input — blinking cursor + scan animation |
| Album art | Tactical display screen — rendered with CRT curvature + glow |
| Bass hit | Warning flash — amber panel pulse, 1 frame blip |
| Genre (detected) | Ship class — changes hull color accent + designation text |

---

## 02  REFERENCE IMAGES

These two images are the locked aesthetic references. When in doubt, defer to them.

### Ref A — Gundam MS-06s Cockpit

Key elements to extract:
- Color field: deep blue-black (#050B14) background, flat matte gray panel surfaces
- Accent color: phosphor teal-green (#1BFFE4) for all UI readout lines, crosshair brackets, text
- Panel language: rectangular readout screens with T-bracket corner markers (no rounded corners anywhere)
- Grid overlay: faint measurement grid on screens, 10-unit increments, very low opacity
- Depth: three distinct surface layers — background void, mid panel, foreground glass screens
- Typography on panels: condensed sans or monospace, all caps, right-aligned data labels
- Hardware details: bolt heads visible at panel joins, channel routing lines between panels

### Ref B — Sci-fi tactical readout screen

Key elements to extract:
- Information density: data everywhere, no empty space, every region has a function or label
- Color palette: deep black bg (#000000), amber/orange data (#FF9D2E), blue data (#4A9EFF), white highlights
- Panel subdivision: UI broken into many small regions with thin border lines, like a real instrument cluster
- Circular displays: radial/circular elements mixed with rectangular — oscilloscope, radar, globe readouts
- Text density: small monospace text labels on every panel segment, like real avionics
- Layout asymmetry: left sidebar taller, bottom strip full-width readouts, right sidebar narrower

---

## 03  COLOR SYSTEM

These are the only colors permitted. No other hex values. Every element maps to one of these tokens.

| TOKEN | HEX | USAGE |
|---|---|---|
| `--void` | #050B14 | App background, deepest layer |
| `--panel` | #0A1828 | Panel surfaces, sidebar bg, player bar bg |
| `--panel-mid` | #0F2438 | Elevated panel surfaces, hover backgrounds |
| `--accent-primary` | #1BFFE4 | Primary readout lines, active states, brackets |
| `--accent-blue` | #4A9EFF | Secondary data, progress fill, BPM needle |
| `--amber` | #FF9D2E | Warning system flash, genre badge, alerts |
| `--text-primary` | #C8E8F0 | Main readable text, track name |
| `--text-dim` | #3A6A7A | Secondary labels, timestamps, metadata |
| `--grid-line` | #0A2E3A | Grid overlay, panel borders, dividers |
| `--glass` | #1BFFE4 at 6% opacity | Screen surface overlay (phosphor feel) |
| `--genre-techno` | #1BFFE4 | Ship class: INTERCEPTOR (electronic/techno) |
| `--genre-ambient` | #7B6FFF | Ship class: DRIFTER (ambient/lo-fi) |
| `--genre-hiphop` | #FF4F4F | Ship class: ASSAULT (hip-hop/trap) |
| `--genre-rock` | #FF9D2E | Ship class: BRUISER (rock/metal) |

> ⚡ Genre detection: use Spotify's audio-features API endpoint (energy, valence, tempo, acousticness). Map ranges to ship classes. Default to INTERCEPTOR (teal) when no detection available.

---

## 04  TYPOGRAPHY

Two fonts only. No exceptions. Both loaded via `@import` in the injected CSS.

| ROLE | FONT | USAGE |
|---|---|---|
| Display | Orbitron (Google Fonts) | Track name, section headers, BPM readout |
| Data / UI | Share Tech Mono (Google Fonts) | All labels, timestamps, metadata, sidebar text |

### Type scale

| LEVEL | SIZE / WEIGHT | ELEMENT |
|---|---|---|
| XL | 22px / 700 / Orbitron | Track name in main player |
| L | 16px / 700 / Orbitron | BPM counter, section heads |
| M | 13px / 400 / Share Tech Mono | Artist name, album, sidebar items |
| S | 11px / 400 / Share Tech Mono | Timestamps, secondary labels, grid text |
| XS | 9px / 400 / Share Tech Mono | Panel data labels, sub-readings, decorative telemetry |

All text: `letter-spacing: 0.12em` minimum. All caps for panel labels and section headers. Track names in title case. NO italic anywhere in the skin.

---

## 05  BUILD ARCHITECTURE

**Critical — read before touching any code.**

### Why CSS-only structural overrides don't work

Spotify's desktop app renders its UI through React with dynamically generated class names (e.g. `._3nSize_`, `.__abc123`) that change every update. The main layout grid is controlled by React's inline styles and JS — not static CSS classes. When injected CSS tries to override `grid-template-columns` or `display: grid` on the root container, React re-renders and reasserts its own layout on every state change, every interaction, every track change. CSS wins once. React wins every time after.

The sidebar width, main content, and player bar are controlled by Spotify's ResizablePanels component with JS event listeners. `!important` overrides only survive until the next render. This is why the previous attempt showed a near-untouched layout — the CSS applied momentarily then React stomped it.

### The correct approach: Shell overlay

The patcher injects a full-screen shell div that **becomes** the cockpit UI. Spotify's native UI runs underneath, hidden — it still handles playback, auth, and API calls. The shell reads Spotify's state and renders its own cockpit layout.

```
┌─────────────────────────────────────────────────────┐
│  #cockpit-shell  (position: fixed, z-index: 9999)   │  ← YOUR UI
│  Full cockpit layout, all your CSS/JS               │
│  Reads data from Spotify internals                  │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  Spotify native UI  (opacity: 0, pointer-events: none) │  ← HIDDEN, still running
│  Handles playback, auth, library, API               │
└─────────────────────────────────────────────────────┘
```

### Injection sequence (app.js)

```js
// 1. On load: inject shell
const shell = document.createElement('div');
shell.id = 'cockpit-shell';
document.body.appendChild(shell);

// 2. Hide Spotify's native app root
document.querySelector('#main').style.opacity = '0';
document.querySelector('#main').style.pointerEvents = 'none';

// 3. MutationObserver watches Spotify's player state node
// When track changes, volume changes, playback state changes —
// pull the new values and update the shell UI

const observer = new MutationObserver(() => {
  syncStateToShell();
});
observer.observe(document.querySelector('[data-testid="now-playing-bar"]'), {
  childList: true, subtree: true, attributes: true
});

// 4. syncStateToShell() reads from Spotify's DOM / Cosmos API
// and updates #cockpit-shell child elements with current values
```

### Data sources for the shell

| DATA NEEDED | WHERE TO READ IT |
|---|---|
| Track name, artist, album | `[data-testid="context-item-info-title"]`, `[data-testid="context-item-info-subtitles"]` |
| Playback state (playing/paused) | `[data-testid="control-button-playpause"]` aria-label |
| Progress / duration | `[data-testid="playback-progressbar"]` aria values |
| Volume | `[data-testid="volume-bar"]` aria value |
| Album art URL | `[data-testid="CoverSlotCollapsed--cover-art"] img` src |
| Queue items | `[data-testid="tracklist-row"]` within queue panel |
| Shuffle / repeat state | `[data-testid="control-button-shuffle"]` aria-checked |

> ⚡ Spotify's `data-testid` attributes are more stable than class names — they change less frequently across updates. Still wrap all selectors in try/catch. When a selector breaks after a Spotify update, only that data field goes dark, not the whole shell.

### BPM detection

Spotify's audio-features endpoint requires OAuth. For the patcher context, two options:

**Option A (preferred):** Use the Spotify Web Playback SDK's `player.getCurrentState()` — available in the injected context. No separate OAuth flow needed since the user is already logged in.

**Option B (fallback):** Beat detection via Web Audio API tapping the system audio output. Less accurate but requires no API calls.

### Shell render cycle

```
Track change event
  → fetch track metadata from DOM
  → fetch BPM (SDK or beat detection)
  → classify genre → set ship class + color token
  → re-render shell sections that changed (not full re-render)
  → animate queue waypoints sliding up
```

### Files produced by the patcher

```
inject/
  app.js          — shell creation, observer, state sync, BPM, bass detection
  cockpit.css     — all shell layout and component styles
  fonts.css       — @import Orbitron + Share Tech Mono
  manifest.json   — patcher metadata, version, target Spotify build
```

---

## 06  STRUCTURAL LAYOUT

The `#cockpit-shell` div uses this layout. This is YOUR grid — React has no say here.

```
╔══════════════════════════════════════════════════════════════════════╗
║  STATUS BAR  ·  SHIP CLASS  ·  FREQ READOUT  ·  CLOCK  ·  SYS ID  ║  ← 32px
╠═══════════════╦═══════════════════════════════╦═══════════════════════╣
║               ║                               ║                       ║
║  LEFT PANEL   ║       MAIN VIEWPORT           ║   RIGHT PANEL         ║
║  220px        ║       flex: 1                 ║   200px               ║
║               ║                               ║                       ║
║  ─ LIBRARY    ║  [ album art / now playing ]  ║  ─ QUEUE / ROUTE      ║
║  ─ PLAYLISTS  ║  [ track info + controls ]    ║  ─ BPM GAUGE          ║
║  ─ STAR MAP   ║  [ EQ visualizer strip ]      ║  ─ GENRE BADGE        ║
║               ║                               ║  ─ WARNING SYSTEMS    ║
╠═══════════════╩═══════════════════════════════╩═══════════════════════╣
║     PROGRESS BAR (full width)   ·   FUEL GAUGE METAPHOR              ║  ← 6px bar
╠═══════════════════════════════════════════════════════════════════════╣
║  THROTTLE │ ◀◀  ◀  ▶▶  ▶  ■  │ VOLUME  │  SHUFFLE/REPEAT SWITCHES  ║  ← 72px
╚══════════════════════════════════════════════════════════════════════╝
```

### Shell CSS grid

```css
#cockpit-shell {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  grid-template-rows: 32px 1fr 6px 72px;
  grid-template-columns: 220px 1fr 200px;
  background: var(--void);
  font-family: 'Share Tech Mono', monospace;
}

#shell-status-bar   { grid-column: 1 / -1; grid-row: 1; }
#shell-left-panel   { grid-column: 1; grid-row: 2; }
#shell-main         { grid-column: 2; grid-row: 2; }
#shell-right-panel  { grid-column: 3; grid-row: 2; }
#shell-progress     { grid-column: 1 / -1; grid-row: 3; }
#shell-controls     { grid-column: 1 / -1; grid-row: 4; }
```

Corner bracket markers: every panel corner gets a 12px × 12px L-bracket in `--accent-primary` via `::before` and `::after` pseudo-elements. Pure CSS, no images.

---

## 07  COMPONENT SPECIFICATIONS

### 07.A  STATUS BAR

Full-width 32px bar. `background: var(--void)`. `border-bottom: 1px solid var(--grid-line)`. All text 9px Share Tech Mono. All caps.

- **LEFT:** `CLASS: INTERCEPTOR` — color = current genre accent, updates on genre change
- **CENTER-LEFT:** `FREQ: 128.4 BPM` — real-time BPM value
- **CENTER:** SIGNAL indicator — 5 vertical bars like phone signal, always full (decorative)
- **CENTER-RIGHT:** `SYS-CLOCK: HH:MM:SS` — JS `setInterval` ticking real time
- **RIGHT:** `VANGUARD OS v2.4.1 // NOMINAL` — static, decorative
- Segment separator: `|` in `var(--grid-line)`

> ⚡ All status bar text: `animation: statusPulse 4s ease-in-out infinite` — opacity 1.0 → 0.7 → 1.0.

---

### 07.B  LEFT INSTRUMENT PANEL

220px wide. `background: var(--panel)`. `border-right: 1px solid var(--grid-line)`. Three sub-sections, each separated by `1px solid var(--grid-line)`.

**Sub-section 1 — NAV // STAR-CHART (Library)**
- Header: `NAV // STAR-CHART` — 9px Share Tech Mono, `var(--accent-primary)`, `border-bottom: 1px solid var(--grid-line)`
- Items: 11px Share Tech Mono, `var(--text-dim)` default
- Active item: `var(--text-primary)` + `border-left: 2px solid var(--accent-primary)` + `background: var(--panel-mid)`
- Hover: `background: var(--panel-mid)`, `color: var(--text-primary)`
- No Spotify icons — replace with 3-letter text badges: `PLY` / `ALB` / `ART` in `var(--accent-blue)`

> ⚡ This section reads from Spotify's library DOM and clones the item list into the shell. Clicking a shell item triggers a click on the hidden corresponding Spotify element.

**Sub-section 2 — MISSION // LOG (Recent tracks)**
- Header: `MISSION // LOG`
- Last 5 played tracks as: `T-001 · Track Name` format
- 10px Share Tech Mono, `var(--text-dim)`

**Sub-section 3 — SYS // STATUS (Decorative telemetry)**
- Header: `SYS // STATUS`
- Three bars: `HULL`, `SHIELD`, `FUEL` — always at 80–90%, slow drift animation
- Bar fill: `var(--accent-primary)` at 60% opacity
- Label: 9px Share Tech Mono, `var(--text-dim)`
- Drift: `@keyframes drift` — width oscillates ±5%, each bar different duration (8s / 11s / 14s)

> ⚡ These bars are purely decorative. They do not map to real Spotify data.

---

### 07.C  MAIN VIEWPORT

`background: var(--void)`. Contains album art, track info, EQ strip.

**Album art**
- 240px × 240px container, centered, 40px from top
- `box-shadow: 0 0 24px rgba(27,255,228,0.25)` — phosphor glow
- `border-radius: 4px; filter: contrast(1.05) saturate(0.9)` — CRT curvature feel
- Corner bracket markers in `var(--accent-primary)` around the container (not on the image)
- Caption below: `TACTICAL DISPLAY // SECTOR SCAN` — 9px Share Tech Mono, `var(--text-dim)`

**Track info block**
- Track name: 22px Orbitron 700, `var(--text-primary)`, single line, `text-overflow: ellipsis`
- Artist: 13px Share Tech Mono, `var(--accent-blue)`, prefixed `SIGNAL: Artist Name`
- Album: 11px Share Tech Mono, `var(--text-dim)`, prefixed `SOURCE: Album Name`
- All three left-aligned within a centered 400px container

**EQ / Visualizer strip**
- 60px tall, full width of viewport
- 32 bars. Width: 6px. Gap: 3px. `border-radius: 0`
- Fill: `linear-gradient(to top, var(--accent-primary), var(--accent-blue))`
- Driven by Web Audio API `AnalyserNode` at 60fps via `requestAnimationFrame`
- Fallback: CSS keyframe simulation if Web Audio unavailable
- Strip background: `var(--void)` with `--grid-line` horizontal lines every 10px at 15% opacity

---

### 07.D  PROGRESS BAR (Fuel gauge)

6px tall. Full width. `grid-row: 3` in the shell.

- Track: `background: var(--grid-line)`, height 6px, `border-radius: 0`
- Fill: `var(--accent-primary)`, `border-radius: 0`
- Hover: height expands to 10px via `transition: height 150ms ease`
- Playhead: 10px × 10px diamond (`transform: rotate(45deg)`) in `var(--accent-primary)`, centered vertically
- Elapsed: 11px Share Tech Mono, `var(--text-dim)`, left of bar
- Total: 11px Share Tech Mono, `var(--text-dim)`, right of bar
- Label: `ROUTE PROGRESS` — 9px `var(--text-dim)`, above bar center, visible only on hover

> ⚡ Scrubbing: clicking the shell progress bar calculates the click position ratio, then triggers a click at the equivalent position on Spotify's hidden native progress bar.

---

### 07.E  PLAYER CONTROLS (Bottom bar)

72px tall. `background: var(--panel)`. `border-top: 1px solid var(--grid-line)`. Three zones.

**Left zone — Throttle (volume)**
- Vertical lever: 40px tall × 16px wide
- Track: 2px line, `var(--grid-line)`. Handle: 16px × 8px rect, `var(--accent-primary)`
- Label above: `THROTTLE` — 9px Share Tech Mono, `var(--text-dim)`
- Value below: percentage — 11px, `var(--accent-primary)`
- Dragging the handle → calculates position ratio → sets Spotify hidden volume slider to equivalent value

> ⚡ This is the most structurally distinct control. It must look like a physical cockpit throttle lever. Do not use a rotary knob or horizontal slider.

**Center zone — Transport controls**
- Play/Pause: 44px × 44px hexagonal button via `clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)`. Border: 2px `var(--accent-primary)`. Icon: SVG triangle / square in `var(--accent-primary)`.
- Skip prev / next: 32px × 32px square, `border: 1px solid var(--grid-line)`, icon in `var(--text-dim)`
- Hover: border → `var(--accent-primary)`, icon → `var(--text-primary)`
- Playing state: play button `box-shadow: 0 0 12px rgba(27,255,228,0.5)`
- All controls click-through to hidden Spotify equivalents

> ⚡ NO circular buttons anywhere. All controls are angular — hexagons, rectangles, diamonds.

**Right zone — Mode switches**
- Shuffle + Repeat as physical toggles: 32px × 16px, `border-radius: 0`
- OFF: `border: 1px solid var(--grid-line)`, `background: var(--panel-mid)`, label in `var(--text-dim)`
- ON: `border: 1px solid var(--accent-primary)`, `background: rgba(27,255,228,0.2)`, label in `var(--accent-primary)`
- Labels: `RAND` / `LOOP` — 9px Share Tech Mono

---

### 07.F  RIGHT INSTRUMENT PANEL

200px wide. `background: var(--panel)`. `border-left: 1px solid var(--grid-line)`. Three sub-sections.

**Sub-section 1 — BPM GAUGE**
- Circular analog dial: 120px diameter, centered in section
- Outer ring: `border: 2px solid var(--grid-line)`, full circle
- Tick marks at 60, 80, 100, 120, 140, 160, 180, 200 BPM — labeled in 8px Share Tech Mono, `var(--text-dim)`
- Needle: 1px line, `var(--accent-blue)`, rotates proportionally to BPM. `transition: transform 800ms cubic-bezier(0.4,0,0.2,1)`
- Center hub: 8px circle, `var(--accent-primary)`
- Label below dial: `ENGINE RPM` — 9px Share Tech Mono, `var(--text-dim)`
- BPM value below label: 16px Orbitron, `var(--accent-primary)`

**Sub-section 2 — SHIP CLASS / GENRE BADGE**
- Full-width block: `CLASS: INTERCEPTOR` (or current genre class)
- 11px Share Tech Mono 700, color = genre accent
- `background`: genre accent at 10% opacity
- `border-left: 3px solid` genre accent
- Updates on genre detection with 600ms opacity fade transition
- Sub-label: `GENRE MATCH: [genre]` — 9px, `var(--text-dim)`

**Sub-section 3 — NAV ROUTE (Queue)**
- Header: `NAV // ROUTE`
- Next 4 tracks as waypoints on a vertical dashed line (center of panel)
- Route line: `border-left: 1px dashed var(--grid-line)`
- Each waypoint: small diamond marker on the line, track name right of it — 10px Share Tech Mono, `var(--text-dim)`
- Current track: diamond filled `var(--accent-primary)`. Upcoming: outline only, `var(--grid-line)`
- No album art in queue — text only
- On track change: waypoints slide up 20px + fade in, 300ms, staggered 80ms each

---

### 07.G  WARNING SYSTEM (Bass reactivity)

Triggered by Web Audio API amplitude spike detection (threshold: normalized energy > 0.7).

- App border flash: `box-shadow: 0 0 0 2px var(--amber)` on `#cockpit-shell`, 80ms on / 300ms off
- `WARNING` text appears top-right of shell, 11px Share Tech Mono, `var(--amber)`, 800ms then fades
- Status bar background: `rgba(255,157,46,0.15)` for 300ms then back

> ⚡ One clean flash per bass peak. Not continuous. Cooldown: 500ms between triggers to prevent flicker.

---

## 08  MINIPLAYER SKIN

Hard requirement — CRT Broadcast had no miniplayer support. This skin must handle it.

**Concept:** detached cockpit HUD. Like a heads-up display projected on a pilot's visor — minimal, floating, just essential instruments.

```
╔══════════════════════════════════════════════════════╗
║ [ART]  TRACK NAME              ◀  ▶  ■    THROTTLE  ║
║ 48px   Orbitron 14px           controls   20px lever ║
║        SIGNAL: Artist                               ║
╠══════════════════════════════════════════════════════╣
║ ████████████░░░░░░░░░  ROUTE  02:14 / 04:33          ║  ← 3px bar
╚══════════════════════════════════════════════════════╝
```

**Miniplayer spec**
- Container: 320px × 80px. `background: var(--panel)`. `border: 1px solid var(--grid-line)`.
- `position: fixed`. Location: bottom-right, 16px from edges.
- Left border: 3px solid current genre accent color
- `box-shadow: 0 4px 24px rgba(27,255,228,0.15)` — float glow
- Corner brackets in `var(--accent-primary)`, 6px size
- Album art: 48px × 48px, `border-radius: 0`, `border: 1px solid var(--grid-line)`
- Track name: 14px Orbitron, `var(--text-primary)`, max-width 140px, truncated
- Artist: 11px Share Tech Mono, `var(--accent-blue)`, `SIGNAL:` prefix
- Controls: ◀ ▶ ■ — 20px tap targets, `var(--text-dim)` default, hover → `var(--accent-primary)`
- Throttle: 20px tall vertical lever, same design logic as full player, right-aligned
- Progress bar: 3px tall, full width, no playhead dot in miniplayer — fill only

**Miniplayer trigger:** when Spotify enters miniplayer mode, `#cockpit-shell` sets `display: none` and `#cockpit-mini` becomes `display: block`. Both live in the DOM from initial load.

---

## 09  ANIMATIONS

| ELEMENT | ANIMATION |
|---|---|
| Status bar text | `opacity` 1.0 → 0.7 → 1.0, 4s sine, infinite |
| BPM needle | CSS `transform: rotate()`, 800ms `cubic-bezier(0.4,0,0.2,1)`, on BPM change |
| EQ bars | Height via JS `requestAnimationFrame` at 60fps, Web Audio API driven |
| SYS STATUS bars | Width drifts ±5%, CSS keyframe, 8s / 11s / 14s per bar, `ease-in-out infinite` |
| Bass warning flash | `box-shadow` pulse 80ms on / 300ms off, JS triggered on audio peak |
| Genre badge swap | `opacity` 1 → 0 → 1, 600ms, on genre change |
| Queue waypoints | Slide up 20px + fade in, 300ms, staggered 80ms each, on track change |
| Album art swap | `opacity` 1 → 0 (200ms), new art loads, 0 → 1 (400ms) |
| Shell-to-miniplayer | `#cockpit-shell` fades out 200ms, `#cockpit-mini` fades in 200ms |

**Forbidden:**
- No transitions longer than 800ms on interactive elements
- No rotation on layout structure
- No particle effects, no floating elements
- No animated blur
- `prefers-reduced-motion`: all animations disabled when set

---

## 10  ANTI-SPEC

If the builder would default to any of these, this section overrides:

- NO `border-radius` anywhere except album art (max 4px) and genre badge accent border
- NO Spotify green (`#1DB954`) anywhere in the skin
- NO gradients except the EQ bar fill gradient (section 07.C)
- NO hover tooltips — cockpits don't have tooltips
- NO layout structure animation — only content inside panels animates
- NO `box-shadow` on text
- NO word `PLAY` on any button — controls are icon-only
- Search placeholder: change `What do you want to play?` → `TARGET SCAN //`
- Right panel is fixed-height sections — NOT scrollable
- Loading state: NO spinners — use a 1px horizontal scan line sweeping panel height at 600ms instead

---

## 11  BUILD INSTRUCTIONS

**This is not a Spicetify skin.** This is an independent patcher that:
- Locates Spotify's installation directory on Windows / Mac / Linux
- Backs up original files
- Injects `app.js` and `cockpit.css` into Spotify's Electron/Chromium context at startup
- Restores cleanly on uninstall
- Handles Spotify update recovery

The patcher is written in Node.js (or Go for a single binary). Study Spicetify's source (`github.com/spicetify/spicetify-cli`, MIT) for the patching mechanism — how it locates files and patches `xpui.js`. Write your own version. Do not ship Spicetify code.

**Build prompt for new thread:**

> "I'm building a music player skin called Y2K Cyber Cockpit for an independent Spotify patcher (not Spicetify). The patcher injects JS and CSS into Spotify's Electron app at startup. I have a locked design spec. Follow it exactly — no aesthetic decisions, no gap-filling. The architecture is a shell overlay (#cockpit-shell, position: fixed, z-index: 9999) that becomes the real UI while Spotify's native UI is hidden underneath. Build in this order: (1) cockpit.css — CSS variables and font imports, (2) shell HTML structure injected by app.js, (3) MutationObserver + state sync from Spotify's DOM, (4) left panel, (5) right panel, (6) main viewport, (7) controls + throttle lever, (8) progress bar, (9) status bar, (10) BPM gauge JS, (11) warning system, (12) miniplayer. Deliver only changed files each iteration."

---

## 12  REVISION LOG

| VERSION | DATE | CHANGE |
|---|---|---|
| v1.0 | 2026.06.21 | Initial spec locked |
| v1.1 | 2026.06.21 | Section 05 rewritten: CSS-only structural overrides replaced with shell overlay architecture. Section 07 updated with click-through and state-sync notes. Build instructions updated. |

---

```
END OF SPEC // VANGUARD OS // Y2K CYBER COCKPIT // DROP-02
```