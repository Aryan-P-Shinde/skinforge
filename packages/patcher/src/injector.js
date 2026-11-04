// import fs from 'fs-extra'
// import path from 'path'
// import AdmZip from 'adm-zip'

// const INJECTION_MARKER     = '/* skinforge:injected */'
// const INJECTION_END_MARKER = '/* skinforge:end */'

// /**
//  * Injects the skin into xpui.spa (zip) or xpui.js (legacy flat file).
//  */
// export async function inject(xpuiPath, skinDir, skinManifest, mode = 'spa') {
//   if (mode === 'spa') {
//     return injectSpa(xpuiPath, skinDir, skinManifest)
//   }
//   return injectJs(xpuiPath, skinDir, skinManifest)
// }

// /**
//  * Modern path: xpui.spa is a zip.
//  *
//  * Strategy: read the skin CSS and JS as raw strings, then:
//  *   1. Copy them as new entries inside the zip (skinforge-skin.css / skinforge-skin.js)
//  *   2. Append a small bootstrap to xpui-snapshot.js (or xpui.js) that creates
//  *      a <link> and <script> pointing to those same-origin zip entries.
//  *
//  * Why not file:// URLs: Spotify's Chromium shell blocks them via CSP.
//  * Bundling into the zip puts the assets on the same origin as xpui itself,
//  * so they load without any CSP issue.
//  */
// async function injectSpa(spaPath, skinDir, skinManifest) {
//   const zip = new AdmZip(spaPath)

//   // Identify the JS entry — modern Spotify ships xpui-snapshot.js
//   const jsEntry = zip.getEntry('xpui-snapshot.js') || zip.getEntry('xpui.js')
//   if (!jsEntry) {
//     throw new Error(`Could not find xpui-snapshot.js or xpui.js inside xpui.spa.`)
//   }
//   const entryName = jsEntry.entryName   // preserve exact name for updateFile

//   const content = jsEntry.getData().toString('utf8')
//   if (content.includes(INJECTION_MARKER)) {
//     throw new Error(`Already patched. Run 'skinforge remove' before applying a new skin.`)
//   }

//   // Read skin assets as raw strings and bundle them into the zip
//   const cssRaw = await fs.readFile(path.join(skinDir, skinManifest.css), 'utf8')
//   const jsRaw  = await fs.readFile(path.join(skinDir, skinManifest.js),  'utf8')

//   const CSS_ENTRY = 'skinforge-skin.css'
//   const JS_ENTRY  = 'skinforge-skin.js'
//   zip.addFile(CSS_ENTRY, Buffer.from(cssRaw, 'utf8'))
//   zip.addFile(JS_ENTRY,  Buffer.from(jsRaw,  'utf8'))

//   // Patch the JS entry to bootstrap the bundled assets
//   const patched = content + buildInjectionBlock(CSS_ENTRY, JS_ENTRY, skinManifest.name)
//   zip.updateFile(entryName, Buffer.from(patched, 'utf8'))

//   zip.writeZip(spaPath)
//   return { injected: true, mode: 'spa' }
// }

// /**
//  * Legacy path: xpui.js is a plain file.
//  * Copy skin assets alongside xpui.js (same directory = same origin).
//  */
// async function injectJs(xpuiPath, skinDir, skinManifest) {
//   const content = await fs.readFile(xpuiPath, 'utf8')
//   if (content.includes(INJECTION_MARKER)) {
//     throw new Error(`Already patched. Run 'skinforge remove' before applying a new skin.`)
//   }

//   const appsDir = path.dirname(xpuiPath)
//   await fs.copy(path.join(skinDir, skinManifest.css), path.join(appsDir, 'skinforge-skin.css'))
//   await fs.copy(path.join(skinDir, skinManifest.js),  path.join(appsDir, 'skinforge-skin.js'))

//   const patched = content + buildInjectionBlock('skinforge-skin.css', 'skinforge-skin.js', skinManifest.name)
//   await fs.writeFile(xpuiPath, patched, 'utf8')
//   return { injected: true, mode: 'js' }
// }

// /**
//  * Removes skinforge injection from xpui.spa or xpui.js.
//  */
// export async function eject(xpuiPath, mode = 'spa') {
//   if (mode === 'spa') {
//     const zip = new AdmZip(xpuiPath)
//     const jsEntry = zip.getEntry('xpui-snapshot.js') || zip.getEntry('xpui.js')
//     if (!jsEntry) throw new Error(`Could not find JS entry inside xpui.spa.`)

//     const entryName = jsEntry.entryName
//     const content   = jsEntry.getData().toString('utf8')

//     const start = content.indexOf(INJECTION_MARKER)
//     if (start === -1) throw new Error(`No skinforge injection found. Nothing to remove.`)
//     const end     = content.indexOf(INJECTION_END_MARKER)
//     const cleaned = content.slice(0, start) + content.slice(end + INJECTION_END_MARKER.length)

//     zip.updateFile(entryName, Buffer.from(cleaned, 'utf8'))

//     // Remove bundled skin assets
//     for (const asset of ['skinforge-skin.css', 'skinforge-skin.js']) {
//       if (zip.getEntry(asset)) zip.deleteFile(asset)
//     }

//     zip.writeZip(xpuiPath)
//     return { ejected: true }
//   }

//   // Legacy flat file
//   const content = await fs.readFile(xpuiPath, 'utf8')
//   const start   = content.indexOf(INJECTION_MARKER)
//   if (start === -1) throw new Error(`No skinforge injection found. Nothing to remove.`)
//   const end     = content.indexOf(INJECTION_END_MARKER)
//   const cleaned = content.slice(0, start) + content.slice(end + INJECTION_END_MARKER.length)
//   await fs.writeFile(xpuiPath, cleaned, 'utf8')

//   const appsDir = path.dirname(xpuiPath)
//   for (const asset of ['skinforge-skin.css', 'skinforge-skin.js']) {
//     const p = path.join(appsDir, asset)
//     if (await fs.pathExists(p)) await fs.remove(p)
//   }

//   return { ejected: true }
// }

// /**
//  * Builds the JS bootstrap appended to xpui-snapshot.js.
//  *
//  * Uses relative paths — same-origin inside the zip / same directory for legacy.
//  * Never uses file:// URLs (blocked by Spotify's Chromium CSP).
//  *
//  * CSS is loaded via <link rel="stylesheet">.
//  * JS is fetched as text and eval'd via a dynamic <script> to sidestep
//  * script-src restrictions that block external script[src].
//  */
// function buildInjectionBlock(cssEntry, jsEntry, skinName) {
//   return `

// ${INJECTION_MARKER}
// ;(function skinforgeInit() {
//   'use strict';
//   function mount() {
//     var link = document.createElement('link');
//     link.rel  = 'stylesheet';
//     link.type = 'text/css';
//     link.href = './${cssEntry}';
//     document.head.appendChild(link);

//     fetch('./${jsEntry}')
//       .then(function(r) { return r.text(); })
//       .then(function(code) {
//         var s = document.createElement('script');
//         s.textContent = code;
//         document.head.appendChild(s);
//       })
//       .catch(function(e) { console.warn('[skinforge] Failed to load skin JS:', e); });

//     console.log('[skinforge] Skin loaded: ${skinName}');
//   }

//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', mount);
//   } else {
//     mount();
//   }
// })();
// ${INJECTION_END_MARKER}
// `
// }


import fs from 'fs-extra'
import path from 'path'
import AdmZip from 'adm-zip'

const INJECTION_MARKER     = '/* skinforge:injected */'
const INJECTION_END_MARKER = '/* skinforge:end */'

/**
 * Injects the skin into xpui.spa (zip) or xpui.js (legacy flat file).
 */
export async function inject(xpuiPath, skinDir, skinManifest, mode = 'spa') {
  if (mode === 'spa') {
    return injectSpa(xpuiPath, skinDir, skinManifest)
  }
  return injectJs(xpuiPath, skinDir, skinManifest)
}

/**
 * Modern path: xpui.spa is a zip.
 *
 * Strategy: read the skin CSS and JS as raw strings, then:
 *   1. Copy them as new entries inside the zip (skinforge-skin.css / skinforge-skin.js)
 *   2. Append a small bootstrap to xpui-snapshot.js (or xpui.js) that creates
 *      a <link> and <script> pointing to those same-origin zip entries.
 *
 * Why not file:// URLs: Spotify's Chromium shell blocks them via CSP.
 * Bundling into the zip puts the assets on the same origin as xpui itself,
 * so they load without any CSP issue.
 */
async function injectSpa(spaPath, skinDir, skinManifest) {
  const zip = new AdmZip(spaPath)

  // Identify the JS entry — modern Spotify ships xpui-snapshot.js
  const jsEntry = zip.getEntry('xpui-snapshot.js') || zip.getEntry('xpui.js')
  if (!jsEntry) {
    throw new Error(`Could not find xpui-snapshot.js or xpui.js inside xpui.spa.`)
  }
  const entryName = jsEntry.entryName   // preserve exact name for updateFile

  const content = jsEntry.getData().toString('utf8')
  if (content.includes(INJECTION_MARKER)) {
    throw new Error(`Already patched. Run 'skinforge remove' before applying a new skin.`)
  }

  // Read skin assets as raw strings and bundle them into the zip
  // Concatenate manifest.css + optional extraCss files into one bundled CSS
  const cssFiles = [skinManifest.css, ...(skinManifest.extraCss || [])]
  const cssRaw = (await Promise.all(
    cssFiles.map(f => fs.readFile(path.join(skinDir, f), 'utf8'))
  )).join('\n')
  const jsRaw  = await fs.readFile(path.join(skinDir, skinManifest.js),  'utf8')

  const CSS_ENTRY = 'skinforge-skin.css'
  const JS_ENTRY  = 'skinforge-skin.js'
  zip.addFile(CSS_ENTRY, Buffer.from(cssRaw, 'utf8'))
  zip.addFile(JS_ENTRY,  Buffer.from(jsRaw,  'utf8'))

  // Patch the JS entry to bootstrap the bundled assets
  const patched = content + buildInjectionBlock(CSS_ENTRY, JS_ENTRY, skinManifest.name)
  zip.updateFile(entryName, Buffer.from(patched, 'utf8'))

  zip.writeZip(spaPath)
  return { injected: true, mode: 'spa' }
}

/**
 * Legacy path: xpui.js is a plain file.
 * Copy skin assets alongside xpui.js (same directory = same origin).
 */
async function injectJs(xpuiPath, skinDir, skinManifest) {
  const content = await fs.readFile(xpuiPath, 'utf8')
  if (content.includes(INJECTION_MARKER)) {
    throw new Error(`Already patched. Run 'skinforge remove' before applying a new skin.`)
  }

  const appsDir = path.dirname(xpuiPath)
  const cssFiles = [skinManifest.css, ...(skinManifest.extraCss || [])]
  const cssRaw = (await Promise.all(
    cssFiles.map(f => fs.readFile(path.join(skinDir, f), 'utf8'))
  )).join('\n')
  await fs.writeFile(path.join(appsDir, 'skinforge-skin.css'), cssRaw, 'utf8')
  await fs.copy(path.join(skinDir, skinManifest.js),  path.join(appsDir, 'skinforge-skin.js'))

  const patched = content + buildInjectionBlock('skinforge-skin.css', 'skinforge-skin.js', skinManifest.name)
  await fs.writeFile(xpuiPath, patched, 'utf8')
  return { injected: true, mode: 'js' }
}

/**
 * Removes skinforge injection from xpui.spa or xpui.js.
 */
export async function eject(xpuiPath, mode = 'spa') {
  if (mode === 'spa') {
    const zip = new AdmZip(xpuiPath)
    const jsEntry = zip.getEntry('xpui-snapshot.js') || zip.getEntry('xpui.js')
    if (!jsEntry) throw new Error(`Could not find JS entry inside xpui.spa.`)

    const entryName = jsEntry.entryName
    const content   = jsEntry.getData().toString('utf8')

    const start = content.indexOf(INJECTION_MARKER)
    if (start === -1) throw new Error(`No skinforge injection found. Nothing to remove.`)
    const end     = content.indexOf(INJECTION_END_MARKER)
    const cleaned = content.slice(0, start) + content.slice(end + INJECTION_END_MARKER.length)

    zip.updateFile(entryName, Buffer.from(cleaned, 'utf8'))

    // Remove bundled skin assets
    for (const asset of ['skinforge-skin.css', 'skinforge-skin.js']) {
      if (zip.getEntry(asset)) zip.deleteFile(asset)
    }

    zip.writeZip(xpuiPath)
    return { ejected: true }
  }

  // Legacy flat file
  const content = await fs.readFile(xpuiPath, 'utf8')
  const start   = content.indexOf(INJECTION_MARKER)
  if (start === -1) throw new Error(`No skinforge injection found. Nothing to remove.`)
  const end     = content.indexOf(INJECTION_END_MARKER)
  const cleaned = content.slice(0, start) + content.slice(end + INJECTION_END_MARKER.length)
  await fs.writeFile(xpuiPath, cleaned, 'utf8')

  const appsDir = path.dirname(xpuiPath)
  for (const asset of ['skinforge-skin.css', 'skinforge-skin.js']) {
    const p = path.join(appsDir, asset)
    if (await fs.pathExists(p)) await fs.remove(p)
  }

  return { ejected: true }
}

/**
 * Builds the JS bootstrap appended to xpui-snapshot.js.
 *
 * Uses relative paths — same-origin inside the zip / same directory for legacy.
 * Never uses file:// URLs (blocked by Spotify's Chromium CSP).
 *
 * CSS is loaded via <link rel="stylesheet">.
 * JS is fetched as text and eval'd via a dynamic <script> to sidestep
 * script-src restrictions that block external script[src].
 */
function buildInjectionBlock(cssEntry, jsEntry, skinName) {
  return `

${INJECTION_MARKER}
;(function skinforgeInit() {
  'use strict';
  function mount() {
    var link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = './${cssEntry}';
    document.head.appendChild(link);

    fetch('./${jsEntry}')
      .then(function(r) { return r.text(); })
      .then(function(code) {
        var s = document.createElement('script');
        s.textContent = code;
        document.head.appendChild(s);
      })
      .catch(function(e) { console.warn('[skinforge] Failed to load skin JS:', e); });

    console.log('[skinforge] Skin loaded: ${skinName}');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
${INJECTION_END_MARKER}
`
}