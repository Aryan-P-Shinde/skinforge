/* ============================================================
   CRT PIRATE BROADCAST — extension.js
   Reactive behavior layer. Runs inside Spotify's Chromium shell.
   ============================================================ */

(function CRTPirateBroadcast() {
  'use strict'

  // ── DOM helpers ──────────────────────────────────────────
  function el(id)    { return document.getElementById(id) }
  function create(tag, id, html) {
    const node = document.createElement(tag)
    if (id)   node.id = id
    if (html) node.innerHTML = html
    return node
  }

  // ── Signal strength badge ─────────────────────────────────
  // Sits top-right, shows fake transmission metadata
  function mountSignalBadge() {
    if (el('skinforge-signal')) return
    const badge = create('div', 'skinforge-signal',
      `FREQ: 88.█ MHz &nbsp;|&nbsp; SIG: <span id="sf-sig-strength">████</span> &nbsp;|&nbsp; ILLEGAL BROADCAST`
    )
    document.body.appendChild(badge)
    animateSignalStrength()
  }

  // Randomly degrade signal strength bar
  function animateSignalStrength() {
    const bars = ['████', '███░', '██░░', '█░░░', '████', '███░', '████']
    let i = 0
    setInterval(() => {
      const node = el('sf-sig-strength')
      if (!node) return
      // Occasionally glitch hard
      if (Math.random() < 0.08) {
        node.textContent = '░░░░'
        setTimeout(() => { if (el('sf-sig-strength')) el('sf-sig-strength').textContent = bars[i % bars.length] }, 120)
      } else {
        node.textContent = bars[i % bars.length]
      }
      i++
    }, 900)
  }

  // ── Static overlay ────────────────────────────────────────
  function mountStaticOverlay() {
    if (el('skinforge-static')) return
    const overlay = create('div', 'skinforge-static', '')
    document.body.appendChild(overlay)
  }

  // Trigger a static burst (on track change, seek, etc.)
  function staticBurst(durationMs = 180) {
    const overlay = el('skinforge-static')
    if (!overlay) return
    overlay.classList.add('active')
    setTimeout(() => overlay.classList.remove('active'), durationMs)
  }

  // ── EQ visualizer ─────────────────────────────────────────
  // Radar-style: 8 bars rendered as a canvas element in the now-playing bar
  let eqCanvas, eqCtx, eqAnimFrame
  const EQ_BARS   = 12
  const EQ_COLOR  = '#00ff41'
  const EQ_DIM    = '#003310'

  function mountEQ() {
    if (el('skinforge-eq')) return

    // Find the now-playing bar to anchor to
    const nowPlaying =
      document.querySelector('[data-testid="now-playing-bar"]') ||
      document.querySelector('footer') ||
      document.querySelector('.now-playing-bar')

    if (!nowPlaying) return

    eqCanvas        = create('canvas', 'skinforge-eq')
    eqCanvas.width  = 96
    eqCanvas.height = 36
    eqCanvas.style.cssText = `
      position: absolute;
      right: 220px;
      top: 50%;
      transform: translateY(-50%);
      image-rendering: pixelated;
      opacity: 0.85;
    `
    nowPlaying.style.position = 'relative'
    nowPlaying.appendChild(eqCanvas)
    eqCtx = eqCanvas.getContext('2d')
    animateEQ()
  }

  // Bar heights — pseudo-random walk to simulate audio reactivity
  const barHeights = Array.from({ length: EQ_BARS }, () => Math.random() * 0.6 + 0.1)
  const barTargets = Array.from({ length: EQ_BARS }, () => Math.random())
  let isPlaying = false

  function animateEQ() {
    if (!eqCtx) return

    const W = eqCanvas.width
    const H = eqCanvas.height
    const barW = Math.floor(W / EQ_BARS) - 1

    eqCtx.clearRect(0, 0, W, H)

    for (let i = 0; i < EQ_BARS; i++) {
      // Drift heights toward targets
      const speed = isPlaying ? 0.08 : 0.02
      barHeights[i] += (barTargets[i] - barHeights[i]) * speed

      // Occasionally set a new target
      if (Math.random() < (isPlaying ? 0.15 : 0.03)) {
        barTargets[i] = isPlaying ? Math.random() : Math.random() * 0.2
      }

      const h   = Math.max(2, Math.floor(barHeights[i] * H))
      const x   = i * (barW + 1)
      const y   = H - h

      // Background (dim)
      eqCtx.fillStyle = EQ_DIM
      eqCtx.fillRect(x, 0, barW, H)

      // Active bar
      eqCtx.fillStyle = EQ_COLOR
      eqCtx.fillRect(x, y, barW, h)

      // Glow: top pixel brighter
      eqCtx.fillStyle = '#afffcf'
      eqCtx.fillRect(x, y, barW, 1)
    }

    eqAnimFrame = requestAnimationFrame(animateEQ)
  }

  // ── Track change detection ────────────────────────────────
  // Watch the track title element for changes using MutationObserver
  let lastTrackName = ''

  function watchTrackChanges() {
    const observer = new MutationObserver(() => {
      const titleEl =
        document.querySelector('[data-testid="context-item-info-title"]') ||
        document.querySelector('.track-info__name')

      if (!titleEl) return
      const name = titleEl.textContent.trim()
      if (name && name !== lastTrackName) {
        lastTrackName = name
        onTrackChange(name)
      }
    })

    // Observe the now-playing widget
    const target =
      document.querySelector('[data-testid="now-playing-widget"]') ||
      document.querySelector('.now-playing-bar') ||
      document.body

    observer.observe(target, { subtree: true, childList: true, characterData: true })
  }

  function onTrackChange(trackName) {
    // Fire static burst on track change — feels like channel switching
    staticBurst(220)
    updateSignalOnChange()
    console.log(`[CRT Pirate Broadcast] Now intercepting: ${trackName}`)
  }

  function updateSignalOnChange() {
    // Brief signal dropout then recovery
    const node = el('sf-sig-strength')
    if (!node) return
    node.textContent = '░░░░'
    setTimeout(() => { if (el('sf-sig-strength')) el('sf-sig-strength').textContent = '████' }, 300)
  }

  // ── Playback state detection ──────────────────────────────
  // Watch the play button aria-label to know if music is playing
  function watchPlaybackState() {
    const observer = new MutationObserver(() => {
      const btn = document.querySelector('[data-testid="control-button-playpause"]')
      if (!btn) return
      const label = btn.getAttribute('aria-label') || ''
      isPlaying = label.toLowerCase().includes('pause')
    })

    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-label'] })
  }

  // ── Glitch text effect ────────────────────────────────────
  // Occasionally scrambles characters in the track name for a frame
  const GLITCH_CHARS = '█▓▒░╗╔╬╠╣│─┤├┼╞╡'

  function startGlitchEffect() {
    setInterval(() => {
      if (!isPlaying) return
      if (Math.random() > 0.04) return // only fire occasionally

      const titleEl =
        document.querySelector('[data-testid="context-item-info-title"]') ||
        document.querySelector('.track-info__name')
      if (!titleEl) return

      const original = titleEl.textContent
      const glitched = original.split('').map(c =>
        Math.random() < 0.25 ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : c
      ).join('')

      titleEl.textContent = glitched
      setTimeout(() => { titleEl.textContent = original }, 80)
    }, 2000)
  }

  // ── Random ambient static ─────────────────────────────────
  function startAmbientStatic() {
    setInterval(() => {
      if (Math.random() < 0.04) {
        staticBurst(60 + Math.random() * 100)
      }
    }, 4000)
  }

  // ── Boot sequence ─────────────────────────────────────────
  function boot() {
    mountSignalBadge()
    mountStaticOverlay()
    mountEQ()
    watchTrackChanges()
    watchPlaybackState()
    startGlitchEffect()
    startAmbientStatic()

    // Initial static burst — "tuning in"
    setTimeout(() => staticBurst(400), 600)

    console.log('[skinforge] CRT Pirate Broadcast — signal acquired')
  }

  // Wait for Spotify's DOM to be ready before mounting
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    // Spotify may take a moment to render its React tree even after DOMContentLoaded
    setTimeout(boot, 1200)
  }

})()
