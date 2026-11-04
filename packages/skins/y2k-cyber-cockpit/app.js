/* ============================================================
   VANGUARD OS — app.js
   Shell overlay. Spotify's native UI is hidden. This IS the UI.
   ============================================================ */
;(function VANGUARD_OS() {
  'use strict'

  // ── CONSTANTS ──────────────────────────────────────────
  const GENRE_CLASSES = {
    INTERCEPTOR: { label: 'INTERCEPTOR', genre: 'ELECTRONIC', accent: '#1BFFE4' },
    DRIFTER:     { label: 'DRIFTER',     genre: 'AMBIENT',    accent: '#7B6FFF' },
    ASSAULT:     { label: 'ASSAULT',     genre: 'HIP-HOP',    accent: '#FF4F4F' },
    BRUISER:     { label: 'BRUISER',     genre: 'ROCK',       accent: '#FF9D2E' },
  }

  const EQ_BAR_COUNT = 32
  const BPM_MIN = 60, BPM_MAX = 200

  // ── SVG ICONS ──────────────────────────────────────────
  const SVG = {
    prev: `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <polygon points="0,7 9,1 9,13"/><rect x="10" y="1" width="3" height="12"/>
    </svg>`,
    next: `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <polygon points="14,7 5,1 5,13"/><rect x="1" y="1" width="3" height="12"/>
    </svg>`,
    play: `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <polygon points="2,1 13,7 2,13"/>
    </svg>`,
    pause: `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="1" width="4" height="12"/><rect x="9" y="1" width="4" height="12"/>
    </svg>`,
    stop: `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <rect x="0" y="0" width="10" height="10"/>
    </svg>`,
  }

  // ── STATE ───────────────────────────────────────────────
  let state = {
    trackName: '---',
    artist: '---',
    album: '---',
    artUrl: '',
    isPlaying: false,
    progressPct: 0,
    elapsed: '0:00',
    duration: '0:00',
    volume: 1,
    shuffle: false,
    repeat: false,
    bpm: 128,
    genreClass: 'INTERCEPTOR',
    isMini: false,
    queue: [],
  }

  let audioCtx = null, analyser = null, eqBars = []
  let animFrameId = null, warningCooldown = false, bassHitTimer = null
  let warningTimer = null, clockTimer = null
  let isDraggingThrottle = false, isDraggingMiniThrottle = false

  // ── SPOTIFY DOM SELECTORS (data-testid = more stable) ──
  const SEL = {
    trackName:    '[data-testid="context-item-info-title"]',
    artists:      '[data-testid="context-item-info-subtitles"] a',
    artImg:       '[data-testid="CoverSlotCollapsed--cover-art"] img, [data-testid="cover-art-image"]',
    playPause:    '[data-testid="control-button-playpause"]',
    skipPrev:     '[data-testid="control-button-skip-back"]',
    skipNext:     '[data-testid="control-button-skip-forward"]',
    progressBar:  '[data-testid="playback-progressbar"]',
    progressFill: '[data-testid="progress-bar-fill"], .progress-bar__fg',
    timeCurrent:  '[data-testid="playback-position"]',
    timeDuration: '[data-testid="playback-duration"]',
    volumeBar:    '[data-testid="volume-bar"] input[type="range"]',
    shuffle:      '[data-testid="control-button-shuffle"]',
    repeat:       '[data-testid="control-button-repeat"]',
    nowPlayingBar:'[data-testid="now-playing-bar"]',
    queueRows:    '[data-testid="tracklist-row"]',
  }

  // ── BUILD SHELL HTML ────────────────────────────────────
  function buildShell() {
    const shell = document.createElement('div')
    shell.id = 'cockpit-shell'
    shell.innerHTML = `
      <!-- STATUS BAR -->
      <div id="shell-status-bar">
        <div class="sf-status-seg">
          <span id="sf-status-class">CLASS: INTERCEPTOR</span>
          <span class="sf-status-pipe">|</span>
          <span id="sf-status-freq">FREQ: -- BPM</span>
        </div>
        <div class="sf-status-seg">
          <span class="sf-status-pipe">|</span>
          <div class="sf-signal-bars">
            <span style="height:4px"></span>
            <span style="height:6px"></span>
            <span style="height:9px"></span>
            <span style="height:7px"></span>
            <span style="height:10px"></span>
          </div>
          <span class="sf-status-pipe">|</span>
          <span id="sf-sysclock">SYS-CLOCK: --:--:--</span>
        </div>
        <div class="sf-status-seg">
          <span class="sf-status-pipe">|</span>
          <span id="sf-status-os">VANGUARD OS v2.4.1 // NOMINAL</span>
        </div>
      </div>

      <!-- LEFT PANEL -->
      <div id="shell-left-panel" class="sf-bracketed">
        <span class="sf-corner-tr"></span>
        <span class="sf-corner-bl"></span>

        <div class="sf-panel-section">
          <div class="sf-section-header">NAV // STAR-CHART</div>
          <div id="sf-nav-list">
            <div class="sf-nav-item active" data-target="home">
              <span class="sf-nav-badge">NAV</span>HOME
            </div>
            <div class="sf-nav-item" data-target="search">
              <span class="sf-nav-badge">SCN</span>TARGET SCAN
            </div>
            <div class="sf-nav-item" data-target="library">
              <span class="sf-nav-badge">LIB</span>STAR CHART
            </div>
          </div>
        </div>

        <div class="sf-panel-section">
          <div class="sf-section-header">MISSION // LOG</div>
          <div id="sf-mission-log">
            <div class="sf-log-item"><span class="sf-log-idx">T-001</span> ---</div>
            <div class="sf-log-item"><span class="sf-log-idx">T-002</span> ---</div>
            <div class="sf-log-item"><span class="sf-log-idx">T-003</span> ---</div>
            <div class="sf-log-item"><span class="sf-log-idx">T-004</span> ---</div>
            <div class="sf-log-item"><span class="sf-log-idx">T-005</span> ---</div>
          </div>
        </div>

        <div class="sf-panel-section">
          <div class="sf-section-header">SYS // STATUS</div>
          <div id="sf-sys-status">
            <div class="sf-sys-row">
              <div class="sf-sys-label"><span>HULL</span><span id="sf-hull-val">87%</span></div>
              <div class="sf-sys-track"><div class="sf-sys-fill" id="sf-fill-hull" style="width:87%"></div></div>
            </div>
            <div class="sf-sys-row">
              <div class="sf-sys-label"><span>SHIELD</span><span id="sf-shield-val">92%</span></div>
              <div class="sf-sys-track"><div class="sf-sys-fill" id="sf-fill-shield" style="width:92%"></div></div>
            </div>
            <div class="sf-sys-row">
              <div class="sf-sys-label"><span>FUEL</span><span id="sf-fuel-val">79%</span></div>
              <div class="sf-sys-track"><div class="sf-sys-fill" id="sf-fill-fuel" style="width:79%"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN VIEWPORT -->
      <div id="shell-main">
        <div id="sf-art-container" class="sf-bracketed sf-bracket-sm">
          <span class="sf-corner-tr" id="sf-art-tr"></span>
          <span class="sf-corner-bl" id="sf-art-bl"></span>
          <img id="shell-art-img" src="" alt="Album art" />
        </div>
        <div id="sf-tactical-label">TACTICAL DISPLAY // SECTOR SCAN</div>

        <div id="sf-track-info">
          <div id="sf-track-name">---</div>
          <div id="sf-track-artist">SIGNAL: ---</div>
          <div id="sf-track-album">SOURCE: ---</div>
        </div>

        <div id="sf-eq-strip"></div>
      </div>

      <!-- RIGHT PANEL -->
      <div id="shell-right-panel" class="sf-bracketed">
        <span class="sf-corner-tr"></span>
        <span class="sf-corner-bl"></span>

        <div id="sf-bpm-section">
          <canvas id="sf-bpm-canvas" width="120" height="120"></canvas>
          <div id="sf-bpm-label">ENGINE RPM</div>
          <div id="sf-bpm-value">-- BPM</div>
        </div>

        <div id="sf-genre-badge">
          <div id="sf-genre-class">CLASS: INTERCEPTOR</div>
          <div id="sf-genre-name">GENRE MATCH: ELECTRONIC</div>
        </div>

        <div id="sf-queue-section">
          <div id="sf-queue-header">NAV // ROUTE</div>
          <div id="sf-queue-route"></div>
        </div>
      </div>

      <!-- PROGRESS BAR -->
      <div id="shell-progress">
        <div id="sf-progress-fill"></div>
        <div id="sf-progress-head"></div>
        <div id="sf-route-label">ROUTE PROGRESS</div>
        <div class="sf-time" id="sf-time-elapsed">0:00</div>
        <div class="sf-time" id="sf-time-total">0:00</div>
      </div>

      <!-- CONTROLS -->
      <div id="shell-controls">
        <!-- Left: Throttle -->
        <div style="display:flex; align-items:center; gap:8px;">
          <div id="sf-throttle">
            <div id="sf-throttle-label">THROTTLE</div>
            <div id="sf-throttle-track">
              <div id="sf-throttle-handle"></div>
            </div>
            <div id="sf-throttle-value">100%</div>
          </div>
        </div>

        <!-- Center: Transport -->
        <div id="sf-transport">
          <button class="sf-skip-btn" id="sf-prev-btn" aria-label="Previous">${SVG.prev}</button>
          <button id="sf-play-btn" aria-label="Play/Pause">${SVG.play}</button>
          <button class="sf-skip-btn" id="sf-next-btn" aria-label="Next">${SVG.next}</button>
        </div>

        <!-- Right: Mode switches -->
        <div id="sf-mode-switches">
          <div class="sf-toggle" id="sf-shuffle-btn">RAND</div>
          <div class="sf-toggle" id="sf-repeat-btn">LOOP</div>
        </div>
      </div>
    `

    // Warning toast (outside shell so it's always on top)
    const toast = document.createElement('div')
    toast.id = 'sf-warning-toast'
    toast.textContent = '⚠ WARNING'

    document.body.appendChild(shell)
    document.body.appendChild(toast)
  }

  // ── BUILD MINIPLAYER ────────────────────────────────────
  function buildMini() {
    const mini = document.createElement('div')
    mini.id = 'cockpit-mini'
    mini.innerHTML = `
      <div id="mini-body">
        <img id="mini-art" src="" alt="" />
        <div id="mini-info">
          <div id="mini-track-name">---</div>
          <div id="mini-artist">SIGNAL: ---</div>
        </div>
        <div id="mini-controls">
          <div class="mini-btn" id="mini-prev">${SVG.prev}</div>
          <div class="mini-btn" id="mini-play">${SVG.play}</div>
          <div class="mini-btn" id="mini-next">${SVG.next}</div>
        </div>
        <div id="mini-throttle">
          <div id="mini-throttle-handle"></div>
        </div>
      </div>
      <div id="mini-progress-bar">
        <div id="mini-progress-fill"></div>
      </div>
    `
    document.body.appendChild(mini)
  }

  // ── HIDE SPOTIFY NATIVE UI ──────────────────────────────
  function hideNativeUI() {
    const main = document.getElementById('main')
    if (main) {
      main.style.opacity = '0'
      main.style.pointerEvents = 'none'
    }
    // Also target the root container
    const root = document.querySelector('.Root__top-container')
    if (root) {
      root.style.opacity = '0'
      root.style.pointerEvents = 'none'
    }
  }

  // ── STATE SYNC FROM SPOTIFY DOM ─────────────────────────
  function syncState() {
    try {
      // Track name
      const nameEl = document.querySelector(SEL.trackName)
      const newName = nameEl ? nameEl.textContent.trim() : '---'
      const trackChanged = newName !== state.trackName && newName !== '---'
      state.trackName = newName

      // Artist
      const artistEls = document.querySelectorAll(SEL.artists)
      state.artist = artistEls.length
        ? Array.from(artistEls).map(a => a.textContent.trim()).join(', ')
        : '---'

      // Album art
      const artEl = document.querySelector(SEL.artImg)
      const newArt = artEl ? artEl.src : ''
      if (newArt && newArt !== state.artUrl) {
        state.artUrl = newArt
        swapArt(newArt)
      }

      // Play state
      const playBtn = document.querySelector(SEL.playPause)
      state.isPlaying = playBtn
        ? (playBtn.getAttribute('aria-label') || '').toLowerCase().includes('pause')
        : false

      // Progress
      const progressBar = document.querySelector(SEL.progressBar)
      if (progressBar) {
        const now = parseFloat(progressBar.getAttribute('aria-valuenow') || 0)
        const max = parseFloat(progressBar.getAttribute('aria-valuemax') || 1)
        state.progressPct = max > 0 ? (now / max) * 100 : 0
      }

      // Times
      const tCurrent  = document.querySelector(SEL.timeCurrent)
      const tDuration = document.querySelector(SEL.timeDuration)
      state.elapsed  = tCurrent  ? tCurrent.textContent.trim()  : '0:00'
      state.duration = tDuration ? tDuration.textContent.trim() : '0:00'

      // Volume
      const volEl = document.querySelector(SEL.volumeBar)
      if (volEl) state.volume = parseFloat(volEl.value || 1)

      // Shuffle / Repeat
      const shuffleEl = document.querySelector(SEL.shuffle)
      const repeatEl  = document.querySelector(SEL.repeat)
      state.shuffle = shuffleEl
        ? (shuffleEl.getAttribute('aria-checked') === 'true' || shuffleEl.classList.contains('active'))
        : false
      state.repeat = repeatEl
        ? (repeatEl.getAttribute('aria-checked') === 'true' || repeatEl.classList.contains('active'))
        : false

      // Queue
      const queueEls = document.querySelectorAll(SEL.queueRows)
      state.queue = Array.from(queueEls).slice(0, 5).map(row => {
        const nameEl = row.querySelector('[data-testid="tracklist-row__track-name"]')
        return { name: nameEl ? nameEl.textContent.trim() : '?' }
      })

      // On track change: trigger genre detect + mission log update + art animation
      if (trackChanged) onTrackChange()

    } catch (e) {
      // Selector broke after Spotify update — only this field goes dark
      console.warn('[VANGUARD] Sync error:', e.message)
    }

    renderShell()
  }

  // ── RENDER SHELL FROM STATE ─────────────────────────────
  function renderShell() {
    // Track name
    const nameEl = document.getElementById('sf-track-name')
    if (nameEl) nameEl.textContent = state.trackName

    // Artist / Album
    const artistEl = document.getElementById('sf-track-artist')
    if (artistEl) artistEl.textContent = `SIGNAL: ${state.artist}`

    // Play button icon
    const playBtn = document.getElementById('sf-play-btn')
    if (playBtn) {
      playBtn.innerHTML = state.isPlaying ? SVG.pause : SVG.play
      playBtn.classList.toggle('playing', state.isPlaying)
    }

    // Mini play button
    const miniPlay = document.getElementById('mini-play')
    if (miniPlay) miniPlay.innerHTML = state.isPlaying ? SVG.pause : SVG.play

    // Progress
    const fill = document.getElementById('sf-progress-fill')
    const head = document.getElementById('sf-progress-head')
    if (fill) fill.style.width = state.progressPct + '%'
    if (head) head.style.left  = state.progressPct + '%'

    const elapsed  = document.getElementById('sf-time-elapsed')
    const total    = document.getElementById('sf-time-total')
    if (elapsed) elapsed.textContent = state.elapsed
    if (total)   total.textContent   = state.duration

    // Mini progress
    const miniFill = document.getElementById('mini-progress-fill')
    if (miniFill) miniFill.style.width = state.progressPct + '%'

    // Throttle handle position
    if (!isDraggingThrottle) setThrottleVisual(state.volume, 'sf-throttle-track', 'sf-throttle-handle', 'sf-throttle-value')
    if (!isDraggingMiniThrottle) setThrottleVisual(state.volume, 'mini-throttle', 'mini-throttle-handle', null)

    // Shuffle / Repeat toggles
    const shuffleBtn = document.getElementById('sf-shuffle-btn')
    const repeatBtn  = document.getElementById('sf-repeat-btn')
    if (shuffleBtn) shuffleBtn.classList.toggle('on', state.shuffle)
    if (repeatBtn)  repeatBtn.classList.toggle('on', state.repeat)

    // Queue waypoints
    renderQueue()

    // Mini track / artist
    const miniName   = document.getElementById('mini-track-name')
    const miniArtist = document.getElementById('mini-artist')
    if (miniName)   miniName.textContent   = state.trackName
    if (miniArtist) miniArtist.textContent = `SIGNAL: ${state.artist}`
  }

  // ── ART SWAP WITH FADE ──────────────────────────────────
  function swapArt(url) {
    const img     = document.getElementById('shell-art-img')
    const miniArt = document.getElementById('mini-art')
    if (!img) return

    img.classList.add('fading')
    setTimeout(() => {
      img.src = url
      img.classList.remove('fading')
      if (miniArt) miniArt.src = url
    }, 200)
  }

  // ── QUEUE RENDER ─────────────────────────────────────────
  function renderQueue() {
    const route = document.getElementById('sf-queue-route')
    if (!route) return

    const tracks = state.trackName !== '---'
      ? [{ name: state.trackName, current: true }, ...state.queue.slice(0, 3)]
      : []

    if (tracks.length === 0) return
    route.innerHTML = ''

    tracks.forEach((t, i) => {
      const wp = document.createElement('div')
      wp.className = 'sf-waypoint' + (t.current ? ' current' : '')
      wp.style.animationDelay = (i * 80) + 'ms'
      const nameEl = document.createElement('div')
      nameEl.className = 'sf-waypoint-name'
      nameEl.textContent = t.name
      wp.appendChild(nameEl)
      route.appendChild(wp)
    })
  }

  // ── THROTTLE VISUAL ──────────────────────────────────────
  function setThrottleVisual(vol, trackId, handleId, valueId) {
    const track  = document.getElementById(trackId)
    const handle = document.getElementById(handleId)
    if (!track || !handle) return
    const trackH = track.offsetHeight || 40
    const handleH = handle.offsetHeight || 8
    const topPx = (1 - vol) * (trackH - handleH)
    handle.style.top = Math.max(0, topPx) + 'px'
    if (valueId) {
      const valEl = document.getElementById(valueId)
      if (valEl) valEl.textContent = Math.round(vol * 100) + '%'
    }
  }

  // ── SET SPOTIFY VOLUME ──────────────────────────────────
  function setSpotifyVolume(pct) {
    const volBar = document.querySelector(SEL.volumeBar)
    if (!volBar) return
    const nativeInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    nativeInput.set.call(volBar, pct)
    volBar.dispatchEvent(new Event('input', { bubbles: true }))
    volBar.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // ── CLICK-THROUGH TO SPOTIFY ─────────────────────────────
  function clickSpotify(selector) {
    const el = document.querySelector(selector)
    if (el) el.click()
  }

  function scrubProgress(e) {
    const bar = document.getElementById('shell-progress')
    if (!bar) return
    const rect  = bar.getBoundingClientRect()
    const pct   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const nativeBar = document.querySelector(SEL.progressBar)
    if (nativeBar) {
      const max = parseFloat(nativeBar.getAttribute('aria-valuemax') || 1)
      // Simulate click on native bar at equivalent position
      const nRect = nativeBar.getBoundingClientRect()
      const fakeX = nRect.left + pct * nRect.width
      const fakeY = nRect.top + nRect.height / 2
      nativeBar.dispatchEvent(new MouseEvent('mousedown', { clientX: fakeX, clientY: fakeY, bubbles: true }))
      nativeBar.dispatchEvent(new MouseEvent('mouseup',   { clientX: fakeX, clientY: fakeY, bubbles: true }))
    }
  }

  // ── BPM GAUGE CANVAS ────────────────────────────────────
  function drawBPMGauge(bpm) {
    const canvas = document.getElementById('sf-bpm-canvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = 60, cy = 60, r = 50

    ctx.clearRect(0, 0, 120, 120)

    // Outer ring
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#0A2E3A'
    ctx.lineWidth = 2
    ctx.stroke()

    // Tick marks + labels
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

      const lx = cx + (r - 16) * Math.cos(angle)
      const ly = cy + (r - 16) * Math.sin(angle)
      ctx.fillStyle = '#3A6A7A'
      ctx.font = '7px "Share Tech Mono", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(t), lx, ly)
    })

    // Needle — transition done via redraw on BPM change
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

    // Update readout
    const bpmVal = document.getElementById('sf-bpm-value')
    if (bpmVal) bpmVal.textContent = bpm > 0 ? `${Math.round(bpm)} BPM` : '-- BPM'

    const freqEl = document.getElementById('sf-status-freq')
    if (freqEl) freqEl.textContent = `FREQ: ${Math.round(bpm)} BPM`
  }

  function bpmToAngle(bpm) {
    const pct = (bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)
    return -220 + pct * 260
  }

  // ── GENRE DETECTION ──────────────────────────────────────
  async function detectGenre() {
    try {
      // Try Spotify's Web Playback SDK state
      if (window.Spotify && window.Spotify.Player) {
        // SDK available — can't call getCurrentState without a player instance
        // Fall through to audio-features attempt
      }

      // Try audio-features via Spotify's own token from localStorage
      const token = getSpotifyToken()
      if (!token) return setGenreClass('INTERCEPTOR')

      // Get current track ID from Spotify's state
      const trackId = getCurrentTrackId()
      if (!trackId) return setGenreClass('INTERCEPTOR')

      const res = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return setGenreClass('INTERCEPTOR')

      const af = await res.json()
      state.bpm = af.tempo || 128
      drawBPMGauge(state.bpm)

      // Map to ship class per spec
      let cls = 'INTERCEPTOR'
      if (af.energy > 0.7 && af.tempo > 130)             cls = 'ASSAULT'
      else if (af.energy > 0.8 && af.valence > 0.5)      cls = 'BRUISER'
      else if (af.acousticness > 0.6 || af.energy < 0.4) cls = 'DRIFTER'

      setGenreClass(cls)
    } catch {
      setGenreClass('INTERCEPTOR')
    }
  }

  function getSpotifyToken() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        if (key.includes('accessToken') || key.includes('access_token')) {
          const raw = localStorage.getItem(key)
          const val = JSON.parse(raw)
          const token = val?.accessToken || val?.access_token || val
          if (typeof token === 'string' && token.length > 20) return token
        }
      }
    } catch {}
    return null
  }

  function getCurrentTrackId() {
    try {
      // Try now-playing bar's data attributes or context
      const artEl = document.querySelector('[data-testid="CoverSlotCollapsed--cover-art"] img')
      if (artEl && artEl.src) {
        // Spotify art URLs contain the track ID: /ab67616d.../trackid
        const match = artEl.src.match(/spotify\.com\/image\/([a-zA-Z0-9]+)/)
        // That's the image ID not track ID — look elsewhere
      }
      // Try the track link href
      const trackLink = document.querySelector('[data-testid="context-item-info-title"]')
      if (trackLink) {
        const href = trackLink.closest('a')?.href || ''
        const match = href.match(/track\/([a-zA-Z0-9]+)/)
        if (match) return match[1]
      }
    } catch {}
    return null
  }

  function setGenreClass(cls) {
    if (cls === state.genreClass) return
    state.genreClass = cls
    const g = GENRE_CLASSES[cls]

    document.documentElement.style.setProperty('--genre-accent', g.accent)

    const badge = document.getElementById('sf-genre-badge')
    if (badge) {
      badge.style.opacity = '0'
      setTimeout(() => {
        document.getElementById('sf-genre-class').textContent = `CLASS: ${g.label}`
        document.getElementById('sf-genre-name').textContent  = `GENRE MATCH: ${g.genre}`
        badge.style.borderLeftColor = g.accent
        badge.style.background = hexAlpha(g.accent, 0.1)
        badge.style.opacity = '1'
      }, 300)
    }

    const statusClass = document.getElementById('sf-status-class')
    if (statusClass) {
      statusClass.textContent = `CLASS: ${g.label}`
      statusClass.style.color = g.accent
    }
  }

  // ── EQ VISUALIZER ────────────────────────────────────────
  function buildEQBars() {
    const strip = document.getElementById('sf-eq-strip')
    if (!strip || eqBars.length) return
    for (let i = 0; i < EQ_BAR_COUNT; i++) {
      const bar = document.createElement('div')
      bar.className = 'sf-eq-bar'
      bar.style.height = '4px'
      strip.appendChild(bar)
      eqBars.push(bar)
    }
  }

  async function setupAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.75

      const mediaEl = document.querySelector('audio')
      if (mediaEl) {
        const src = audioCtx.createMediaElementSource(mediaEl)
        src.connect(analyser)
        analyser.connect(audioCtx.destination)
        startEQLoop()
        return
      }
    } catch {}
    startSimulatedEQ()
  }

  function startEQLoop() {
    const data = new Uint8Array(analyser.frequencyBinCount)
    const binsPerBar = Math.floor(data.length / EQ_BAR_COUNT)

    function tick() {
      animFrameId = requestAnimationFrame(tick)
      analyser.getByteFrequencyData(data)
      let bassEnergy = 0
      eqBars.forEach((bar, i) => {
        const start = i * binsPerBar
        let sum = 0
        for (let j = start; j < start + binsPerBar; j++) sum += data[j]
        const avg = sum / binsPerBar
        bar.style.height = Math.max(4, (avg / 255) * 56) + 'px'
        if (i < 4) bassEnergy = Math.max(bassEnergy, avg / 255)
      })
      if (bassEnergy > 0.7) triggerBassWarning()
    }
    tick()
  }

  function startSimulatedEQ() {
    const phases = eqBars.map(() => Math.random() * Math.PI * 2)
    const speeds = eqBars.map(() => 1.5 + Math.random() * 2.5)
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

  // ── WARNING SYSTEM ──────────────────────────────────────
  function triggerBassWarning() {
    if (warningCooldown) return
    warningCooldown = true
    setTimeout(() => { warningCooldown = false }, 500) // 500ms cooldown

    const shell = document.getElementById('cockpit-shell')
    const toast = document.getElementById('sf-warning-toast')

    if (shell) {
      shell.classList.add('sf-bass-hit')
      if (bassHitTimer) clearTimeout(bassHitTimer)
      bassHitTimer = setTimeout(() => shell.classList.remove('sf-bass-hit'), 300)
    }

    if (toast) {
      toast.classList.add('active')
      if (warningTimer) clearTimeout(warningTimer)
      warningTimer = setTimeout(() => toast.classList.remove('active'), 800)
    }
  }

  // ── SYSCLOCK ─────────────────────────────────────────────
  function startClock() {
    function tick() {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      const el = document.getElementById('sf-sysclock')
      if (el) el.textContent = `SYS-CLOCK: ${hh}:${mm}:${ss}`
    }
    tick()
    clockTimer = setInterval(tick, 1000)
  }

  // ── ON TRACK CHANGE ──────────────────────────────────────
  let missionLog = []

  function onTrackChange() {
    // Mission log — prepend new track
    if (state.trackName && state.trackName !== '---') {
      missionLog.unshift(state.trackName)
      if (missionLog.length > 5) missionLog.pop()
      renderMissionLog()
    }
    detectGenre()
  }

  function renderMissionLog() {
    const log = document.getElementById('sf-mission-log')
    if (!log) return
    const items = log.querySelectorAll('.sf-log-item')
    items.forEach((item, i) => {
      const track = missionLog[i] || '---'
      item.innerHTML = `<span class="sf-log-idx">T-00${i+1}</span> ${track.substring(0, 18)}`
    })
  }

  // ── THROTTLE DRAG LOGIC ──────────────────────────────────
  function setupThrottleDrag(trackId, handleId, valueId, isMini) {
    const track = document.getElementById(trackId)
    if (!track) return

    track.addEventListener('mousedown', e => {
      if (isMini) isDraggingMiniThrottle = true
      else isDraggingThrottle = true
      handleThrottleDrag(e, track, handleId, valueId)
    })

    document.addEventListener('mousemove', e => {
      if (isMini ? !isDraggingMiniThrottle : !isDraggingThrottle) return
      handleThrottleDrag(e, track, handleId, valueId)
    })

    document.addEventListener('mouseup', () => {
      if (isMini) isDraggingMiniThrottle = false
      else isDraggingThrottle = false
    })
  }

  function handleThrottleDrag(e, track, handleId, valueId) {
    const rect = track.getBoundingClientRect()
    const pct  = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setThrottleVisual(pct, track.id, handleId, valueId)
    setSpotifyVolume(pct)
    state.volume = pct
  }

  // ── MINIPLAYER DETECTION ─────────────────────────────────
  function observeMiniplayerMode() {
    const obs = new MutationObserver(() => {
      // Detect if Spotify switched to miniplayer by checking body/root class
      const isMini = document.body.classList.contains('is-mini-player')
        || !!document.querySelector('[data-testid="mini-player"]')

      const shell = document.getElementById('cockpit-shell')
      const mini  = document.getElementById('cockpit-mini')
      if (!shell || !mini) return

      if (isMini !== state.isMini) {
        state.isMini = isMini
        if (isMini) {
          shell.style.display = 'none'
          mini.classList.add('visible')
        } else {
          shell.style.display = 'grid'
          mini.classList.remove('visible')
        }
      }
    })
    obs.observe(document.body, { attributes: true, childList: true, subtree: false })
  }

  // ── BIND SHELL CONTROLS TO SPOTIFY ───────────────────────
  function bindControls() {
    // Transport
    document.getElementById('sf-prev-btn')?.addEventListener('click', () => clickSpotify(SEL.skipPrev))
    document.getElementById('sf-next-btn')?.addEventListener('click', () => clickSpotify(SEL.skipNext))
    document.getElementById('sf-play-btn')?.addEventListener('click', () => clickSpotify(SEL.playPause))

    // Mini transport
    document.getElementById('mini-prev')?.addEventListener('click', () => clickSpotify(SEL.skipPrev))
    document.getElementById('mini-next')?.addEventListener('click', () => clickSpotify(SEL.skipNext))
    document.getElementById('mini-play')?.addEventListener('click', () => clickSpotify(SEL.playPause))

    // Shuffle / Repeat
    document.getElementById('sf-shuffle-btn')?.addEventListener('click', () => clickSpotify(SEL.shuffle))
    document.getElementById('sf-repeat-btn')?.addEventListener('click',  () => clickSpotify(SEL.repeat))

    // Progress bar scrubbing
    const progress = document.getElementById('shell-progress')
    if (progress) progress.addEventListener('click', scrubProgress)

    // Throttle drag
    setupThrottleDrag('sf-throttle-track', 'sf-throttle-handle', 'sf-throttle-value', false)
    setupThrottleDrag('mini-throttle',      'mini-throttle-handle', null,              true)

    // Nav items click-through to hidden Spotify nav
    document.querySelectorAll('.sf-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.sf-nav-item').forEach(i => i.classList.remove('active'))
        item.classList.add('active')
        // Show Spotify's UI temporarily to navigate
        const main = document.getElementById('main')
        if (main) {
          main.style.opacity = '0.01'
          main.style.pointerEvents = 'auto'
          const target = item.dataset.target
          const navLink = document.querySelector(`[data-testid="nav-item-${target}"], a[href="/${target}"]`)
          if (navLink) navLink.click()
          setTimeout(() => {
            main.style.opacity = '0'
            main.style.pointerEvents = 'none'
          }, 300)
        }
      })
    })
  }

  // ── MUTATION OBSERVER — watch Spotify's player ───────────
  function startObserver() {
    // Sync on an interval — more reliable than trying to observe every Spotify state node
    setInterval(syncState, 500)

    // Also observe the now-playing bar specifically
    const bar = document.querySelector(SEL.nowPlayingBar)
    if (bar) {
      const obs = new MutationObserver(syncState)
      obs.observe(bar, { childList: true, subtree: true, attributes: true, characterData: true })
    }
  }

  // ── HELPERS ──────────────────────────────────────────────
  function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  // ── BOOT ─────────────────────────────────────────────────
  async function boot() {
    console.log('[VANGUARD OS v2.4.1] Initializing...')

    // Wait for Spotify's main element to exist
    await new Promise(resolve => {
      if (document.getElementById('main')) return resolve()
      const obs = new MutationObserver(() => {
        if (document.getElementById('main')) { obs.disconnect(); resolve() }
      })
      obs.observe(document.body, { childList: true, subtree: true })
      setTimeout(resolve, 10000)
    })

    // Build overlay
    buildShell()
    buildMini()
    hideNativeUI()

    // Build EQ bars
    buildEQBars()

    // Bind controls
    bindControls()

    // Start clock
    startClock()

    // Draw initial BPM gauge
    drawBPMGauge(128)

    // Start state sync
    startObserver()

    // Start audio
    setTimeout(setupAudio, 1000)

    // Miniplayer detection
    observeMiniplayerMode()

    // Initial sync
    setTimeout(syncState, 800)

    console.log('[VANGUARD OS v2.4.1] // NOMINAL')
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }

})()