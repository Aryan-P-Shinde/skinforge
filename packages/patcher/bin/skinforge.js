#!/usr/bin/env node
import { program } from 'commander'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs-extra'

import { findSpotify }                          from '../src/locator.js'
import { backup, restore, hashFile, isPatched } from '../src/backup.js'
import { inject, eject }                        from '../src/injector.js'
import { readState, writeState, clearState }    from '../src/state.js'

program
  .name('skinforge')
  .description('Apply and manage Spotify desktop skins')
  .version('0.1.0')

// ─── apply ────────────────────────────────────────────────
program
  .command('apply <skinPath>')
  .description('Apply a skin to Spotify.')
  .action(async (skinPath) => {
    try {
      console.log(chalk.cyan('\n  skinforge — applying skin\n'))

      const manifestPath = path.resolve(skinPath, 'manifest.json')
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error(`No manifest.json found in ${skinPath}`)
      }
      const manifest = await fs.readJson(manifestPath)
      for (const key of ['name', 'css', 'js']) {
        if (!manifest[key]) throw new Error(`manifest.json missing field: "${key}"`)
      }
      console.log(chalk.gray(`  Skin      : ${manifest.name}`))

      process.stdout.write(chalk.gray('  Locating Spotify...'))
      const { xpuiPath, mode } = findSpotify()
      console.log(chalk.green(` found (${mode} mode)`))
      console.log(chalk.gray(`  xpui file : ${xpuiPath}`))

      if (await isPatched(xpuiPath, mode)) {
        console.log(chalk.yellow('\n  Already patched. Run "skinforge remove" first.\n'))
        process.exit(1)
      }

      process.stdout.write(chalk.gray('  Backing up...'))
      const { alreadyExisted } = await backup(xpuiPath)
      console.log(chalk.green(alreadyExisted ? ' backup exists' : ' done'))

      const hashBefore = await hashFile(xpuiPath)

      process.stdout.write(chalk.gray('  Injecting skin...'))
      await inject(xpuiPath, path.resolve(skinPath), manifest, mode)
      console.log(chalk.green(' done'))

      await writeState({
        skinName: manifest.name,
        skinDir:  path.resolve(skinPath),
        xpuiPath,
        xpuiHash: hashBefore,
        mode,
      })

      console.log(chalk.green(`\n  ✓ ${manifest.name} applied. Restart Spotify to see it.\n`))

    } catch (err) {
      console.error(chalk.red(`\n  ✗ ${err.message}\n`))
      process.exit(1)
    }
  })

// ─── remove ───────────────────────────────────────────────
program
  .command('remove')
  .description('Remove the current skin and restore Spotify.')
  .action(async () => {
    try {
      console.log(chalk.cyan('\n  skinforge — removing skin\n'))

      const { xpuiPath, mode } = findSpotify()

      if (!(await isPatched(xpuiPath, mode))) {
        console.log(chalk.yellow('  No active skin patch found.\n'))
        process.exit(0)
      }

      process.stdout.write(chalk.gray('  Restoring from backup...'))
      await restore(xpuiPath)
      console.log(chalk.green(' done'))

      await clearState()
      console.log(chalk.green('\n  ✓ Skin removed. Restart Spotify.\n'))

    } catch (err) {
      console.error(chalk.red(`\n  ✗ ${err.message}\n`))
      process.exit(1)
    }
  })

// ─── status ───────────────────────────────────────────────
program
  .command('status')
  .description('Show what skin is currently applied.')
  .action(async () => {
    try {
      console.log(chalk.cyan('\n  skinforge — status\n'))

      const { xpuiPath, mode } = findSpotify()
      const state   = await readState()
      const patched = await isPatched(xpuiPath, mode)

      if (!state || !patched) {
        console.log(chalk.gray('  No skin currently applied.\n'))
        process.exit(0)
      }

      const currentHash = await hashFile(xpuiPath)
      const updated = state.xpuiHash !== currentHash

      console.log(chalk.gray(`  Active skin : ${state.skinName}`))
      console.log(chalk.gray(`  Applied at  : ${state.appliedAt}`))
      console.log(chalk.gray(`  Mode        : ${mode}`))

      if (updated) {
        console.log(chalk.yellow('\n  ⚠ Spotify has updated. Re-apply the skin.\n'))
      } else {
        console.log(chalk.green('\n  ✓ Skin is active and up to date.\n'))
      }

    } catch (err) {
      console.error(chalk.red(`\n  ✗ ${err.message}\n`))
      process.exit(1)
    }
  })

program.parse()
