import fs from 'fs-extra'
import path from 'path'
import os from 'os'

const STATE_DIR  = path.join(os.homedir(), '.skinforge')
const STATE_FILE = path.join(STATE_DIR, 'state.json')

/**
 * Reads the current state from ~/.skinforge/state.json.
 * Returns null if no skin is applied or state doesn't exist yet.
 */
export async function readState() {
  if (!(await fs.pathExists(STATE_FILE))) return null
  try {
    return await fs.readJson(STATE_FILE)
  } catch {
    return null
  }
}

/**
 * Writes state after a successful patch.
 * Records enough info to detect Spotify updates and re-patch if needed.
 */
export async function writeState({ skinName, skinDir, xpuiPath, xpuiHash }) {
  await fs.ensureDir(STATE_DIR)
  const state = {
    skinName,
    skinDir,
    xpuiPath,
    xpuiHash,          // hash of xpui.js at time of patching
    appliedAt: new Date().toISOString(),
  }
  await fs.writeJson(STATE_FILE, state, { spaces: 2 })
  return state
}

/**
 * Clears state after a successful restore/uninstall.
 */
export async function clearState() {
  if (await fs.pathExists(STATE_FILE)) {
    await fs.remove(STATE_FILE)
  }
}

/**
 * Checks if Spotify has updated since the last patch
 * by comparing the current xpui.js hash against the stored one.
 * If true, the skin needs to be re-applied.
 */
export async function spotifyUpdated(currentHash) {
  const state = await readState()
  if (!state) return false
  return state.xpuiHash !== currentHash
}
