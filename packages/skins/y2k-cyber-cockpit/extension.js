/* ============================================================
   Y2K CYBER COCKPIT — extension.js
   VANGUARD OS v2.4.1 // NOMINAL
   ============================================================ */
;(function VANGUARD_OS() {
  'use strict'

  // ── CONSTANTS ───────────────────────────────────────────
  const GENRE_MAP = {
    INTERCEPTOR: { label: 'INTERCEPTOR', genre: 'ELECTRONIC',  accent: '#1BFFE4' },
    DRIFTER:     { label: 'DRIFTER',     genre: 'AMBIENT',      accent: '#7B6FFF' },
    ASSAULT:     { label: 'ASSAULT',     genre: 'HIP-HOP',      accent: '#FF4F4F' },
    BRUISER:     { label: 'BRUISER',     genre: 'ROCK',         accent: '#FF9D2E' },
  }

  const EQ_BARS    = 32
  const BPM_MIN    = 60
  const BPM_MAX    = 200

  // ── STATE ────────────────────────────────────────────────
  let audioCtx    = null
  let analyser    = null
  let sourceNode  = null
  let eqBars      = []
  let animFrameId = null
  let currentBPM  = 128
  let currentClass = 'INTERCEPTOR'
  let warningTimeout = null
  let bassHitTimeout = null

  // ── WAIT FOR SPOTIFY DOM ─────────────────────────────────
  function waitFor(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector)
      if (el) return resolve(el)
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector)
        if (el) { obs.disconnect(); resolve(el) }
      })
      obs.observe(document.body, { childList: true, subtree: true })
      setTimeout(() => { obs.disconnect(); reject(new Error('Timeout: ' + selector)) }, timeout)
    })
  }

  // ── INJECT STATUS BAR ────────────────────────────────────
  function injectStatusBar() {
    if (document.getElementById('skinforge-status-bar')) return

    const bar = document.createElement('div')
    bar.id = 'skinforge-status-bar'
    bar.innerHTML = `
      <div class="sf-seg">
        <span class="sf-ship-class" id="sf-status-class">CLASS: INTERCEPTOR</span>
        <span class="sf-pipe">|</span>
        <span class="sf-freq" id="sf-status-freq">FREQ: -- BPM</span>
      </div>
      <div class="sf-seg">
        <span class="sf-pipe">|</span>
        <div class="sf-signal" id="sf-signal">
          <span style="height:4px"></span>
          <span style="height:6px"></span>
          <span style="height:8px"></span>
          <span style="height:7px"></span>
          <span style="height:10px"></span>
        </div>
        <span class="sf-pipe">|</span>
        <span id="sf-sysclock">SYS-CLOCK: --:--:--</span>
      </div>
      <div class="sf-seg">
        <span class="sf-pipe">|</span>
        <span class="sf-os">VANGUARD OS v2.4.1 // NOMINAL</span>
      </div>
    `

    // Insert as very first child of body / app root
    const root = document.querySelector('.Root__top-container') || document.body
    root.insertBefore(bar, root.firstChild)

    // Tick clock
    function tickClock() {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      const el = document.getElementById('sf-sysclock')
      if (el) el.textContent = `SYS-CLOCK: ${hh}:${mm}:${ss}`
    }
    tickClock()
    setInterval(tickClock, 1000)
  }

  // ── INJECT RIGHT PANEL ───────────────────────────────────
  function injectRightPanel() {
    if (document.getElementById('sf-right-panel')) return

    const panel = document.createElement('div')
    panel.id = 'sf-right-panel'
    panel.innerHTML = `
      <div id="sf-bpm-gauge-container">
        <canvas id="sf-bpm-canvas" width="120" height="120"></canvas>
        <div id="sf-bpm-label">ENGINE RPM</div>
        <div id="sf-bpm-value">-- BPM</div>
      </div>
      <div id="sf-genre-badge">
        <div id="sf-genre-class">CLASS: INTERCEPTOR</div>
        <div id="sf-genre-name">GENRE MATCH: ELECTRONIC</div>
      </div>
      <div id="sf-queue-container">
        <div id="sf-queue-header">NAV // ROUTE</div>
        <div id="sf-queue-route-line"></div>
      </div>
    `

    const root = document.querySelector('.Root__top-container')
    if (root) root.appendChild(panel)

    drawBPMGauge(currentBPM)
  }

  // ── BPM GAUGE ────────────────────────────────────────────
  function drawBPMGauge(bpm) {
    const canvas = document.getElementById('sf-bpm-canvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = 60, cy = 60, r = 52

    ctx.clearRect(0, 0, 120, 120)

    // Outer ring
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#0A2E3A'
    ctx.lineWidth = 2
    ctx.stroke()

    // Tick marks at 60, 80, 100, 120, 140, 160, 180, 200 BPM
    const ticks = [60, 80, 100, 120, 140, 160, 180, 200]
    ticks.forEach(t => {
      const angle = bpmToAngle(t) * Math.PI / 180
      const x1 = cx + (r - 8) * Math.cos(angle)
      const y1 = cy + (r - 8) * Math.sin(angle)
      const x2 = cx + r * Math.cos(angle)
      const y2 = cy + r * Math.sin(angle)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = '#3A6A7A'
      ctx.lineWidth = 1
      ctx.stroke()

      // Labels
      const lx = cx + (r - 16) * Math.cos(angle)
      const ly = cy + (r - 16) * Math.sin(angle)
      ctx.fillStyle = '#3A6A7A'
      ctx.font = '7px "Share Tech Mono", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(t), lx, ly)
    })

    // Needle
    const needleAngle = bpmToAngle(Math.max(BPM_MIN, Math.min(BPM_MAX, bpm))) * Math.PI / 180
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + (r - 6) * Math.cos(needleAngle), cy + (r - 6) * Math.sin(needleAngle))
    ctx.strokeStyle = '#4A9EFF'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Center hub
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#1BFFE4'
    ctx.fill()

    // Update text
    const bpmEl = document.getElementById('sf-bpm-value')
    if (bpmEl) bpmEl.textContent = bpm > 0 ? `${Math.round(bpm)} BPM` : '-- BPM'
  }

  function bpmToAngle(bpm) {
    // Map BPM range 60–200 to angle range -220° to 40° (sweep of 260°)
    const pct = (bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)
    return -220 + pct * 260
  }

  // ── INJECT EQ STRIP ─────────────────────────────────────
  function injectEQStrip() {
    if (document.getElementById('sf-eq-strip')) return

    const strip = document.createElement('div')
    strip.id = 'sf-eq-strip'

    for (let i = 0; i < EQ_BARS; i++) {
      const bar = document.createElement('div')
      bar.className = 'sf-eq-bar'
      bar.style.height = '4px'
      strip.appendChild(bar)
    }
    eqBars = Array.from(strip.querySelectorAll('.sf-eq-bar'))

    // Insert after track info in main view
    const mainView = document.querySelector('.Root__main-view, [data-testid="main-view"]')
    if (mainView) mainView.appendChild(strip)
  }

  // ── WEB AUDIO SETUP ──────────────────────────────────────
  async function setupAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.75

      // Try to tap Spotify's audio element
      const mediaEl = document.querySelector('audio')
      if (mediaEl) {
        sourceNode = audioCtx.createMediaElementSource(mediaEl)
        sourceNode.connect(analyser)
        analyser.connect(audioCtx.destination)
        console.log('[VANGUARD] Audio tap successful')
        startEQLoop()
      } else {
        // Fallback: CSS simulation
        console.log('[VANGUARD] No audio element — using simulated EQ')
        startSimulatedEQ()
      }
    } catch (e) {
      console.warn('[VANGUARD] Audio setup failed, using simulation:', e)
      startSimulatedEQ()
    }
  }

  // ── EQ ANIMATION LOOP (Web Audio) ────────────────────────
  function startEQLoop() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    function tick() {
      animFrameId = requestAnimationFrame(tick)
      analyser.getByteFrequencyData(dataArray)

      const barCount = eqBars.length
      const binPerBar = Math.floor(dataArray.length / barCount)

      let maxEnergy = 0
      eqBars.forEach((bar, i) => {
        const start = i * binPerBar
        let sum = 0
        for (let j = start; j < start + binPerBar; j++) sum += dataArray[j]
        const avg = sum / binPerBar
        const heightPx = Math.max(4, (avg / 255) * 56)
        bar.style.height = heightPx + 'px'
        if (i < 4) maxEnergy = Math.max(maxEnergy, avg / 255) // bass bins
      })

      // Bass hit detection — threshold 0.7
      if (maxEnergy > 0.7) triggerBassWarning()
    }
    tick()
  }

  // ── EQ SIMULATION (CSS fallback) ─────────────────────────
  function startSimulatedEQ() {
    const phases = eqBars.map((_, i) => Math.random() * Math.PI * 2)
    const speeds = eqBars.map((_, i) => 1.5 + Math.random() * 2.5)

    let t = 0
    function tick() {
      animFrameId = requestAnimationFrame(tick)
      t += 0.04
      eqBars.forEach((bar, i) => {
        const val = (Math.sin(t * speeds[i] + phases[i]) + 1) / 2
        bar.style.height = Math.max(4, val * 52) + 'px'
      })
    }
    tick()
  }

  // ── WARNING SYSTEM (BASS HIT) ────────────────────────────
  function injectWarningToast() {
    if (document.getElementById('sf-warning-toast')) return
    const toast = document.createElement('div')
    toast.id = 'sf-warning-toast'
    toast.textContent = '⚠ WARNING'
    document.body.appendChild(toast)
  }

  function triggerBassWarning() {
    if (warningTimeout) return // debounce

    const toast = document.getElementById('sf-warning-toast')
    if (toast) {
      toast.classList.add('active')
      warningTimeout = setTimeout(() => {
        toast.classList.remove('active')
        warningTimeout = null
      }, 800)
    }

    // Root amber flash — 80ms on
    document.body.classList.add('sf-bass-hit')
    if (bassHitTimeout) clearTimeout(bassHitTimeout)
    bassHitTimeout = setTimeout(() => {
      document.body.classList.remove('sf-bass-hit')
    }, 300)
  }

  // ── THROTTLE (VOLUME CONTROL) ────────────────────────────
  function injectThrottle() {
    if (document.getElementById('sf-throttle')) return

    const throttle = document.createElement('div')
    throttle.id = 'sf-throttle'
    throttle.innerHTML = `
      <div id="sf-throttle-label">THROTTLE</div>
      <div id="sf-throttle-track">
        <div id="sf-throttle-handle"></div>
      </div>
      <div id="sf-throttle-value">100%</div>
    `

    const controlsBar = document.querySelector('.Root__now-playing-bar, [data-testid="now-playing-bar"]')
    if (controlsBar) controlsBar.insertBefore(throttle, controlsBar.firstChild)

    // Wire up drag behavior
    const track  = document.getElementById('sf-throttle-track')
    const handle = document.getElementById('sf-throttle-handle')
    const valEl  = document.getElementById('sf-throttle-value')
    let dragging = false

    function setVolume(pct) {
      pct = Math.max(0, Math.min(1, pct))
      // Position: 0 = bottom (full), 1 = top (mute) → invert
      const topPx = (1 - pct) * (40 - 8)  // track 40px, handle 8px
      handle.style.top = topPx + 'px'
      valEl.textContent = Math.round(pct * 100) + '%'

      // Drive Spotify's volume via its volume bar
      const spotifyVolBar = document.querySelector('.volume-bar input[type="range"], [data-testid="volume-bar"] input')
      if (spotifyVolBar) {
        spotifyVolBar.value = pct
        spotifyVolBar.dispatchEvent(new Event('input', { bubbles: true }))
        spotifyVolBar.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }

    track.addEventListener('mousedown', e => {
      dragging = true
      const rect = track.getBoundingClientRect()
      const pct  = 1 - (e.clientY - rect.top) / rect.height
      setVolume(pct)
    })

    document.addEventListener('mousemove', e => {
      if (!dragging) return
      const rect = track.getBoundingClientRect()
      const pct  = 1 - (e.clientY - rect.top) / rect.height
      setVolume(pct)
    })

    document.addEventListener('mouseup', () => { dragging = false })

    // Init at 100%
    setVolume(1)
  }

  // ── GENRE DETECTION ─────────────────────────────────────
  async function detectGenre(trackId) {
    if (!trackId) return setGenreClass('INTERCEPTOR')

    try {
      // Spotify Web API audio-features (requires token — read from Spotify's own requests)
      const token = getSpotifyToken()
      if (!token) return setGenreClass('INTERCEPTOR')

      const res = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return setGenreClass('INTERCEPTOR')
      const af = await res.json()

      // Map audio features to ship class per spec
      let cls = 'INTERCEPTOR'
      if (af.energy > 0.7 && af.tempo > 130)            cls = 'ASSAULT'     // hip-hop/trap energy
      else if (af.energy > 0.8 && af.valence > 0.5)     cls = 'BRUISER'     // rock/metal
      else if (af.acousticness > 0.6 || af.energy < 0.4) cls = 'DRIFTER'    // ambient/lo-fi
      // else INTERCEPTOR (electronic/techno default)

      setGenreClass(cls)
    } catch {
      setGenreClass('INTERCEPTOR')
    }
  }

  function setGenreClass(cls) {
    if (cls === currentClass) return
    currentClass = cls
    const g = GENRE_MAP[cls]

    // Update CSS variable for genre accent color
    document.documentElement.style.setProperty('--genre-accent', g.accent)

    // Fade badge
    const badge = document.getElementById('sf-genre-badge')
    if (badge) {
      badge.style.opacity = '0'
      setTimeout(() => {
        const classEl = document.getElementById('sf-genre-class')
        const nameEl  = document.getElementById('sf-genre-name')
        if (classEl) classEl.textContent = `CLASS: ${g.label}`
        if (nameEl)  nameEl.textContent  = `GENRE MATCH: ${g.genre}`
        badge.style.borderLeftColor = g.accent
        badge.style.background = hexToRGBA(g.accent, 0.1)
        badge.style.opacity = '1'
      }, 300)
    }

    // Update status bar ship class
    const statusClass = document.getElementById('sf-status-class')
    if (statusClass) {
      statusClass.textContent = `CLASS: ${g.label}`
      statusClass.style.color = g.accent
    }
  }

  // ── BPM UPDATE ──────────────────────────────────────────
  function updateBPM(bpm) {
    if (!bpm || bpm === currentBPM) return
    currentBPM = bpm

    drawBPMGauge(bpm)

    const freqEl = document.getElementById('sf-status-freq')
    if (freqEl) freqEl.textContent = `FREQ: ${Math.round(bpm)} BPM`
  }

  // ── QUEUE / ROUTE WAYPOINTS ──────────────────────────────
  function updateQueue(tracks) {
    const routeEl = document.getElementById('sf-queue-route-line')
    if (!routeEl) return

    routeEl.innerHTML = ''

    tracks.slice(0, 4).forEach((track, i) => {
      const wp = document.createElement('div')
      wp.className = 'sf-waypoint' + (i === 0 ? ' current' : '')
      wp.style.animationDelay = (i * 80) + 'ms'

      const nameEl = document.createElement('div')
      nameEl.className = 'sf-waypoint-name'
      nameEl.textContent = track.name || 'UNKNOWN'
      wp.appendChild(nameEl)
      routeEl.appendChild(wp)
    })
  }

  // ── SPOTIFY TOKEN EXTRACTION ─────────────────────────────
  // Reads the bearer token Spotify itself uses for API calls from localStorage
  function getSpotifyToken() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes('accessToken')) {
          const val = JSON.parse(localStorage.getItem(key))
          if (val && val.accessToken) return val.accessToken
        }
      }
    } catch { }
    return null
  }

  // ── TRACK CHANGE OBSERVER ────────────────────────────────
  let lastTrackId = null

  function observeTrackChanges() {
    const obs = new MutationObserver(() => {
      // Try to get current track info from DOM
      const trackNameEl = document.querySelector('[data-testid="track-info-name"]')
      if (!trackNameEl) return

      // Artist prefix: "SIGNAL: "
      const artistLinks = document.querySelectorAll('[data-testid="track-info-artists"] a, [data-testid="track-info-artist"]')
      artistLinks.forEach(a => {
        if (!a.dataset.sfPrefixed) {
          const orig = a.textContent
          a.textContent = `SIGNAL: ${orig}`
          a.dataset.sfPrefixed = '1'
        }
      })

      // Album prefix: "SOURCE: "
      const albumEl = document.querySelector('[data-testid="track-info-album"]')
      if (albumEl && !albumEl.dataset.sfPrefixed) {
        albumEl.textContent = `SOURCE: ${albumEl.textContent}`
        albumEl.dataset.sfPrefixed = '1'
      }
    })

    obs.observe(document.body, { childList: true, subtree: true, characterData: true })
  }

  // ── SYS STATUS BARS (decorative telemetry) ────────────────
  function injectSysStatus() {
    const sidebar = document.querySelector('.Root__nav-bar, [data-testid="left-sidebar"]')
    if (!sidebar || document.getElementById('sf-sys-status')) return

    const sys = document.createElement('div')
    sys.id = 'sf-sys-status'

    const bars = [
      { label: 'HULL',   pct: 87 },
      { label: 'SHIELD', pct: 92 },
      { label: 'FUEL',   pct: 79 },
    ]

    bars.forEach((b, i) => {
      const label = document.createElement('div')
      label.className = 'sf-sys-bar-label'
      label.innerHTML = `<span>${b.label}</span><span id="sf-sys-val-${i}">${b.pct}%</span>`

      const track = document.createElement('div')
      track.className = 'sf-sys-bar-track'

      const fill = document.createElement('div')
      fill.className = 'sf-sys-bar-fill'
      fill.id = `sf-sys-fill-${i}`
      fill.style.width = b.pct + '%'
      fill.style.animationDuration = (7 + i * 1.3) + 's'

      track.appendChild(fill)
      sys.appendChild(label)
      sys.appendChild(track)
    })

    sidebar.appendChild(sys)

    // Drift animation — ±5% random drift every few seconds
    setInterval(() => {
      bars.forEach((b, i) => {
        const drift = (Math.random() - 0.5) * 10
        const newVal = Math.max(70, Math.min(99, b.pct + drift))
        b.pct = newVal
        const fill = document.getElementById(`sf-sys-fill-${i}`)
        const val  = document.getElementById(`sf-sys-val-${i}`)
        if (fill) fill.style.width = newVal.toFixed(0) + '%'
        if (val)  val.textContent  = newVal.toFixed(0) + '%'
      })
    }, 3000)
  }

  // ── TACTICAL DISPLAY LABEL ────────────────────────────────
  function injectTacticalLabel() {
    const coverArt = document.querySelector('.cover-art, [data-testid="cover-art"]')
    if (!coverArt || coverArt.querySelector('.sf-tactical-label')) return
    const label = document.createElement('div')
    label.className = 'sf-tactical-label'
    label.textContent = 'TACTICAL DISPLAY // SECTOR SCAN'
    coverArt.insertAdjacentElement('afterend', label)
  }

  // ── HELPERS ──────────────────────────────────────────────
  function hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  // ── BOOT SEQUENCE ────────────────────────────────────────
  async function boot() {
    console.log('[VANGUARD OS] Booting...')

    await waitFor('.Root__top-container, body', 8000).catch(() => {})

    injectStatusBar()
    injectRightPanel()
    injectWarningToast()

    // Stagger secondary injections
    setTimeout(() => {
      injectEQStrip()
      injectThrottle()
      injectSysStatus()
      injectTacticalLabel()
      observeTrackChanges()
    }, 800)

    setTimeout(async () => {
      await setupAudio()
      // Simulate BPM update (real detection via audio-features when token available)
      setInterval(() => {
        // Drift BPM slightly for demo; real value comes from audio-features
        const bpm = currentBPM + (Math.random() - 0.5) * 4
        updateBPM(Math.max(60, Math.min(200, bpm)))
      }, 5000)
    }, 1500)

    console.log('[VANGUARD OS v2.4.1] // NOMINAL')
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }

})()