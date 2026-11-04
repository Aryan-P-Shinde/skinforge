import fs from 'fs'
import path from 'path'
import os from 'os'

const CANDIDATE_PATHS = {
  win32: [
    path.join(os.homedir(), 'AppData', 'Roaming', 'Spotify', 'Apps'),
    path.join(os.homedir(), 'AppData', 'Local', 'Spotify', 'Apps'),
  ],
  darwin: [
    path.join(os.homedir(), 'Library', 'Application Support', 'Spotify', 'Apps'),
    '/Applications/Spotify.app/Contents/Resources/Apps',
  ],
  linux: [
    path.join(os.homedir(), '.config', 'spotify', 'Apps'),
    '/usr/share/spotify/Apps',
    '/usr/local/share/spotify/Apps',
    path.join(os.homedir(), 'snap', 'spotify', 'current', '.config', 'spotify', 'Apps'),
    path.join(os.homedir(), '.var', 'app', 'com.spotify.Client', 'config', 'spotify', 'Apps'),
  ],
}

/**
 * Finds Spotify's Apps directory.
 * Returns { appsDir, spaPath, mode: 'spa' | 'js' }
 * 
 * Modern Spotify ships xpui.spa (a zip containing xpui.js).
 * Older versions shipped xpui.js directly.
 * We handle both.
 */
export function findSpotify() {
  const platform = process.platform
  const candidates = CANDIDATE_PATHS[platform]

  if (!candidates) {
    throw new Error(`Unsupported platform: ${platform}`)
  }

  for (const appsDir of candidates) {
    // Modern: xpui.spa
    const spaPath = path.join(appsDir, 'xpui.spa')
    if (fs.existsSync(spaPath)) {
      return { appsDir, xpuiPath: spaPath, mode: 'spa' }
    }
    // Legacy: xpui.js
    const jsPath = path.join(appsDir, 'xpui.js')
    if (fs.existsSync(jsPath)) {
      return { appsDir, xpuiPath: jsPath, mode: 'js' }
    }
  }

  // Microsoft Store detection
  if (platform === 'win32') {
    const storeBase = 'C:\\Program Files\\WindowsApps'
    try {
      const entries = fs.readdirSync(storeBase)
      const spotifyStore = entries.find(e => e.startsWith('SpotifyAB.SpotifyMusic'))
      if (spotifyStore) {
        throw new Error(
          `Spotify is installed from the Microsoft Store.\n\n` +
          `The WindowsApps folder is locked by Windows and cannot be patched.\n\n` +
          `Fix:\n` +
          `  1. Uninstall Spotify from Settings → Apps\n` +
          `  2. Download the direct installer from https://spotify.com/download\n` +
          `  3. Run skinforge again`
        )
      }
    } catch (e) {
      if (e.message.includes('Microsoft Store')) throw e
    }
  }

  throw new Error(
    `Could not find Spotify installation.\n` +
    `Searched:\n${candidates.map(p => `  ${p}`).join('\n')}\n\n` +
    `If Spotify is installed in a custom location, set the SPOTIFY_PATH ` +
    `environment variable to the Apps directory containing xpui.spa.`
  )
}
