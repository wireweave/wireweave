// Run after rebuilding the runtime dependency closure:
//   node scripts/mcp-package-smoke.mjs
// After deployment, verify the exact registry release against this checkout:
//   node scripts/mcp-package-smoke.mjs --published 1.8.2-beta.13
// Only installation contacts the public npm registry. The executable receives
// no credentials and runs with outbound I/O denied. Nothing is published.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { clearTimeout, setTimeout } from 'node:timers'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

import { publishedPackages } from './published-packages.mjs'
import { PACKAGE_NAME, probeInstalled } from './mcp-package-smoke-client.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

export function packageManagerEnvironment(scratch, { offline = false } = {}) {
  // npm and pnpm 11 have distinct configuration prefixes. Keep both explicit;
  // the caller's pnpm lifecycle/PATH must not decide whether hooks can run.
  return {
    PATH: process.env.PATH,
    TMPDIR: scratch,
    CI: 'true',
    npm_config_ignore_scripts: 'true',
    pnpm_config_ignore_scripts: 'true',
    npm_config_offline: String(offline),
    pnpm_config_offline: String(offline),
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_registry: 'https://registry.npmjs.org/',
    pnpm_config_registry: 'https://registry.npmjs.org/',
    npm_config_userconfig: join(scratch, 'user.npmrc'),
    pnpm_config_userconfig: join(scratch, 'user.npmrc'),
    npm_config_globalconfig: join(scratch, 'global.npmrc'),
    npm_config_cache: join(scratch, 'npm-cache'),
    pnpm_config_store_dir: join(scratch, 'pnpm-store'),
  }
}

export function packPackage(packageDir, destination, env, signal) {
  return runCommand(
    'pnpm',
    ['--config.ignore-scripts=true', 'pack', '--pack-destination', destination],
    {
      cwd: packageDir,
      env,
      signal,
    },
  )
}

export function runtimeClosure(packages, name = PACKAGE_NAME) {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]))
  const visited = new Set()
  const result = []
  function visit(current) {
    if (visited.has(current)) return
    const pkg = byName.get(current)
    assert.ok(pkg, `Missing publishable workspace dependency ${current}`)
    visited.add(current)
    const dependencies = {
      ...pkg.manifest.peerDependencies,
      ...pkg.manifest.optionalDependencies,
      ...pkg.manifest.dependencies,
    }
    for (const [dependency, range] of Object.entries(dependencies).sort()) {
      if (byName.has(dependency) || range.startsWith('workspace:')) visit(dependency)
    }
    result.push(pkg)
  }
  visit(name)
  return result
}

export function expectedCatalog(source) {
  // Read the canonical JSON input, independently of either generated adapter
  // or the installed bundle. A missing catalog cannot become empty coverage.
  const catalog = JSON.parse(source)
  assert.equal(catalog.schemaVersion, 1, 'Unsupported expected catalog schema')
  assert.ok(Array.isArray(catalog.tools), 'Expected catalog has no tools array')
  const names = catalog.tools.map((tool) => tool.name)
  assert.ok(
    names.includes('wireweave_parse') && names.includes('wireweave_render_html_code'),
    'Expected catalog is missing local parse/render',
  )
  assert.equal(new Set(names).size, names.length, 'Expected catalog has duplicate names')
  return names.sort()
}

export function runCommand(command, args, { cwd, env, timeoutMs = 60000, signal } = {}) {
  signal?.throwIfAborted()
  return new Promise((done, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let failure
    const stop = (reason) => {
      failure ??= reason
      try {
        if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL')
        else child.kill('SIGKILL')
      } catch (error) {
        if (error.code !== 'ESRCH') failure = error
      }
    }
    const timer = setTimeout(
      () => stop(new Error(`${command} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    )
    const abort = () => stop(new Error(`${command} interrupted`))
    signal?.addEventListener('abort', abort, { once: true })
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8')
      if (stdout.length > 16 * 1024 * 1024) stop(new Error(`${command} output limit exceeded`))
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8')
      if (stderr.length > 16 * 1024 * 1024)
        stop(new Error(`${command} error output limit exceeded`))
    })
    child.once('error', (error) => {
      failure = error
    })
    child.once('close', (code) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (failure) reject(failure)
      else if (code !== 0)
        reject(new Error(`${command} exited ${code}: ${stderr.slice(-8000)}${stdout.slice(-2000)}`))
      else done(stdout)
    })
  })
}

export async function withTemporaryConsumer(operation) {
  const scratch = mkdtempSync(join(tmpdir(), 'wireweave-mcp-smoke-'))
  try {
    return await operation(scratch)
  } finally {
    // The exact directory returned by mkdtemp is the only cleanup target.
    rmSync(scratch, { recursive: true, force: true })
  }
}

export function parseOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      published: { type: 'string' },
      'timeout-ms': { type: 'string', default: '15000' },
      'install-timeout-ms': { type: 'string', default: '180000' },
      help: { type: 'boolean', short: 'h' },
    },
  })
  if (values.published !== undefined) {
    assert.match(
      values.published,
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/,
      '--published requires an exact version, not a tag or range',
    )
  }
  for (const key of ['timeout-ms', 'install-timeout-ms']) {
    assert.ok(
      /^\d+$/.test(values[key]) && Number(values[key]) >= 100 && Number(values[key]) <= 600000,
      `Invalid ${key} (100–600000)`,
    )
  }
  return {
    published: values.published,
    timeoutMs: Number(values['timeout-ms']),
    installTimeoutMs: Number(values['install-timeout-ms']),
    help: values.help,
  }
}

export async function smoke(options, signal) {
  assert.equal(resolve(process.cwd()), ROOT, `Run from repository root: ${ROOT}`)
  const catalogSource = readFileSync(join(ROOT, 'packages/sdk/src/tool-catalog.json'), 'utf8')
  const expectedNames = expectedCatalog(catalogSource)
  const closure = runtimeClosure(publishedPackages())
  return withTemporaryConsumer(async (scratch) => {
    const consumer = join(scratch, 'consumer')
    const tarballs = join(scratch, 'tarballs')
    mkdirSync(consumer)
    mkdirSync(tarballs)
    const env = packageManagerEnvironment(scratch)
    const artifacts = []
    const dependencies = {}
    let expectedManifest
    if (options.published) {
      dependencies[PACKAGE_NAME] = options.published
      expectedManifest = { name: PACKAGE_NAME, version: options.published }
    } else {
      for (const pkg of closure) {
        const before = new Set(readdirSync(tarballs))
        await packPackage(join(ROOT, pkg.path), tarballs, env, signal)
        const added = readdirSync(tarballs).filter(
          (name) => !before.has(name) && name.endsWith('.tgz'),
        )
        assert.equal(added.length, 1, `Expected one tarball for ${pkg.name}`)
        const tarball = join(tarballs, added[0])
        const packedJson = await runCommand('tar', ['-xzOf', tarball, 'package/package.json'], {
          env,
          signal,
        })
        const manifest = JSON.parse(packedJson)
        assert.equal(manifest.name, pkg.name, 'Packed package name mismatch')
        assert.equal(manifest.version, pkg.manifest.version, 'Packed package version mismatch')
        for (const map of [
          manifest.dependencies,
          manifest.optionalDependencies,
          manifest.peerDependencies,
        ]) {
          assert.ok(
            !Object.values(map ?? {}).some((range) => /^(workspace:|link:)/.test(range)),
            `${pkg.name}: unresolved workspace dependency`,
          )
        }
        dependencies[pkg.name] = `file:${tarball}`
        artifacts.push({
          name: pkg.name,
          version: manifest.version,
          tarballFile: added[0],
          tarballSha256: sha256(readFileSync(tarball)),
          tarballIntegrity: `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`,
          manifestSha256: sha256(packedJson),
        })
        if (pkg.name === PACKAGE_NAME) expectedManifest = manifest
      }
    }
    writeFileSync(
      join(consumer, 'package.json'),
      JSON.stringify(
        { name: 'wireweave-mcp-clean-consumer', version: '0.0.0', private: true, dependencies },
        null,
        2,
      ),
    )
    await runCommand(
      'npm',
      ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'],
      { cwd: consumer, env, timeoutMs: options.installTimeoutMs, signal },
    )
    await runCommand('npm', ['ls', '--omit=dev', '--all', '--json'], { cwd: consumer, env, signal })
    const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'))
    if (!options.published) {
      for (const entry of artifacts) {
        const installed = Object.entries(lock.packages).filter(([path]) =>
          path.endsWith(`node_modules/${entry.name}`),
        )
        assert.ok(installed.length > 0, `${entry.name}: absent from installed closure`)
        for (const [path, item] of installed) {
          assert.equal(item.version, entry.version, `${path}: wrong runtime version`)
          assert.ok(
            item.resolved?.startsWith('file:') && item.resolved.endsWith(`/${entry.tarballFile}`),
            `${path}: workspace dependency escaped to registry`,
          )
          assert.equal(
            item.integrity,
            entry.tarballIntegrity,
            `${path}: installed tarball differs from packed artifact`,
          )
        }
      }
    }
    const probe = await probeInstalled({
      consumer,
      expectedManifest,
      expectedNames,
      timeoutMs: options.timeoutMs,
      signal,
    })
    const installedPackages = Object.entries(lock.packages)
      .filter(([path]) => path.includes('node_modules/'))
      .map(([path, item]) => ({ path, version: item.version, integrity: item.integrity }))
    return {
      schemaVersion: 1,
      ok: true,
      mode: options.published ? 'published' : 'workspace-tarballs',
      node: process.version,
      expectedCatalogSha256: sha256(catalogSource),
      artifacts,
      installedPackages,
      ...probe,
    }
  })
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const controller = new globalThis.AbortController()
  const interrupt = () => controller.abort()
  process.once('SIGINT', interrupt)
  process.once('SIGTERM', interrupt)
  try {
    const options = parseOptions(process.argv.slice(2))
    if (options.help)
      console.log(
        'Usage: node scripts/mcp-package-smoke.mjs [--published EXACT_VERSION] [--timeout-ms 15000] [--install-timeout-ms 180000]\nRun from the repo root after build. Installs with lifecycle disabled; cleans temporary files on success/failure. Emits JSON release evidence.',
      )
    else console.log(JSON.stringify(await smoke(options, controller.signal), null, 2))
  } catch (error) {
    console.error(JSON.stringify({ schemaVersion: 1, ok: false, error: error.message }))
    process.exitCode = 1
  } finally {
    process.removeListener('SIGINT', interrupt)
    process.removeListener('SIGTERM', interrupt)
  }
}
