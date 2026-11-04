import fs from 'fs-extra'
import crypto from 'crypto'
import AdmZip from 'adm-zip'

export async function backup(xpuiPath) {
  const bakPath = xpuiPath + '.bak'
  if (await fs.pathExists(bakPath)) {
    return { bakPath, alreadyExisted: true }
  }
  await fs.copy(xpuiPath, bakPath)
  return { bakPath, alreadyExisted: false }
}

export async function restore(xpuiPath) {
  const bakPath = xpuiPath + '.bak'
  if (!(await fs.pathExists(bakPath))) {
    throw new Error(`No backup found at ${bakPath}. Cannot restore.`)
  }
  await fs.copy(bakPath, xpuiPath, { overwrite: true })
  await fs.remove(bakPath)
  return { restored: true }
}

export async function hashFile(filePath) {
  const content = await fs.readFile(filePath)
  return crypto.createHash('sha256').update(content).digest('hex')
}

export async function isPatched(xpuiPath, mode = 'spa') {
  try {
    if (mode === 'spa') {
      const zip = new AdmZip(xpuiPath)
      // Must check the actual entry name, not hardcode 'xpui.js'
      const jsEntry = zip.getEntry('xpui-snapshot.js') || zip.getEntry('xpui.js')
      if (!jsEntry) return false
      const content = jsEntry.getData().toString('utf8')
      return content.includes('/* skinforge:injected */')
    }
    const content = await fs.readFile(xpuiPath, 'utf8')
    return content.includes('/* skinforge:injected */')
  } catch {
    return false
  }
}