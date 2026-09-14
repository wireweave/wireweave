import assert from 'node:assert/strict'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { setTimeout } from 'node:timers'
import { fileURLToPath } from 'node:url'

import {
  expectedCatalog,
  packageManagerEnvironment,
  packPackage,
  parseOptions,
  runCommand,
  runtimeClosure,
  withTemporaryConsumer,
} from './mcp-package-smoke.mjs'
import { installedExecutable, PACKAGE_NAME, probeInstalled } from './mcp-package-smoke-client.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const EXPECTED = ['wireweave_parse', 'wireweave_render_html_code']
const manifest = { name: PACKAGE_NAME, version: '1.2.3', bin: { 'wireweave-mcp': 'server.mjs' } }

function makeConsumer(consumer, mode = 'ok', override = {}) {
  const target = join(consumer, 'node_modules', PACKAGE_NAME)
  const bin = join(consumer, 'node_modules', '.bin')
  mkdirSync(target, { recursive: true })
  mkdirSync(bin, { recursive: true })
  writeFileSync(join(target, 'package.json'), JSON.stringify({ ...manifest, ...override }))
  writeFileSync(join(target, 'fixture-mode'), mode)
  copyFileSync(join(ROOT, 'scripts/fixtures/mcp-smoke-server.mjs'), join(target, 'server.mjs'))
  chmodSync(join(target, 'server.mjs'), 0o755)
  symlinkSync(join(target, 'server.mjs'), join(bin, 'wireweave-mcp'))
  return {
    consumer,
    expectedManifest: manifest,
    expectedNames: EXPECTED,
    sdkManifestPath: join(ROOT, 'packages/mcp-server/package.json'),
  }
}

test('real MCP Client completes initialize, paginated discovery, parse and render', async () => {
  for (const mode of ['ok', 'pagination']) {
    await withTemporaryConsumer(async (consumer) => {
      const result = await probeInstalled(makeConsumer(consumer, mode))
      assert.equal(result.version, '1.2.3')
      assert.equal(result.toolCount, 2)
      assert.equal(result.network, 'blocked')
      assert.equal(result.credentials, 'absent')
      assert.ok(result.frames >= 4)
      assert.match(result.catalogSha256, /^[a-f0-9]{64}$/)
    })
  }
})

for (const [mode, error] of [
  ['version', /Initialize version/],
  ['annotations', /missing boolean/],
  ['string-hint', /boolean|validation|invalid_type/i],
  ['catalog', /expected catalog/],
  ['duplicate', /Duplicate tool/],
  ['cursor-loop', /Invalid catalog pagination/],
  ['stdout', /isolation failed/],
  ['json-stdout', /isolation failed/],
  ['partial-stdout', /isolation failed/],
  ['shutdown-exit', /isolation failed/],
  ['tool-failure', /parse failed/],
  ['empty-ast', /no page AST/],
  ['wrong-render', /Render lost source/],
  ['network-fetch', /isolation failed/],
  ['network-http', /isolation failed/],
  ['network-socket', /isolation failed/],
  ['network-dns', /isolation failed/],
  ['network-udp', /isolation failed/],
  ['network-websocket', /isolation failed/],
  ['network-worker', /isolation failed/],
]) {
  test(`rejects ${mode} in an independent executable fixture`, async () => {
    await withTemporaryConsumer(async (consumer) => {
      await assert.rejects(probeInstalled(makeConsumer(consumer, mode)), error)
    })
  })
}

test('a stalled executable is bounded and cleaned up', async () => {
  let path
  const started = Date.now()
  await withTemporaryConsumer(async (consumer) => {
    path = consumer
    await assert.rejects(
      probeInstalled({ ...makeConsumer(consumer, 'timeout'), timeoutMs: 250 }),
      /timed out|timeout/i,
    )
  })
  assert.ok(Date.now() - started < 3000)
  assert.equal(existsSync(path), false)
})

test('interruption closes a live probe and pre-aborted probes never spawn', async () => {
  await withTemporaryConsumer(async (consumer) => {
    const options = makeConsumer(consumer, 'timeout')
    const controller = new globalThis.AbortController()
    const abort = setTimeout(() => controller.abort(), 100)
    abort.unref()
    await assert.rejects(probeInstalled({ ...options, signal: controller.signal }), /closed|abort/i)
    await assert.rejects(probeInstalled({ ...options, signal: controller.signal }), /abort/i)
  })
})

test('missing bin declaration, missing file and missing executable permission fail before handshake', async () => {
  for (const override of [
    { bin: {} },
    { bin: { 'wireweave-mcp': 'missing.js' } },
    { version: '9.0.0' },
  ]) {
    await withTemporaryConsumer(async (consumer) => {
      makeConsumer(consumer, 'ok', override)
      assert.throws(
        () => installedExecutable(consumer, manifest),
        /bin declaration|ENOENT|version mismatch/,
      )
    })
  }
  await withTemporaryConsumer(async (consumer) => {
    makeConsumer(consumer)
    chmodSync(join(consumer, 'node_modules', PACKAGE_NAME, 'server.mjs'), 0o644)
    assert.throws(() => installedExecutable(consumer, manifest), /EACCES/)
  })
})

test('closure includes transitive, optional and peer workspace runtime dependencies but not dev dependencies', () => {
  const pkg = (name, fields = {}) => ({ name, manifest: { name, ...fields } })
  const inventory = [
    pkg(PACKAGE_NAME, {
      dependencies: { sdk: 'workspace:*', external: '^1' },
      devDependencies: { unused: 'workspace:*' },
    }),
    pkg('sdk', {
      optionalDependencies: { optional: 'workspace:*' },
      peerDependencies: { peer: 'workspace:*' },
    }),
    pkg('optional', { dependencies: { core: 'workspace:*' } }),
    pkg('peer', { dependencies: { core: 'workspace:*' } }),
    pkg('core'),
    pkg('unused'),
  ]
  const names = runtimeClosure(inventory).map((item) => item.name)
  assert.deepEqual([...names].sort(), [PACKAGE_NAME, 'sdk', 'optional', 'peer', 'core'].sort())
  assert.ok(names.indexOf('core') < names.indexOf('sdk'))
  assert.throws(() => runtimeClosure([inventory[0]]), /Missing publishable workspace/)
})

test('expected catalog is read from source, fails closed on empty shape or duplicate tools', () => {
  const source = readFileSync(join(ROOT, 'packages/sdk/src/tool-catalog.json'), 'utf8')
  assert.ok(expectedCatalog(source).length >= 2)
  assert.throws(() => expectedCatalog('{"schemaVersion":1,"tools":[]}'), /missing local parse/)
  const duplicated = JSON.parse(source)
  duplicated.tools.push({ name: 'wireweave_parse' })
  assert.throws(() => expectedCatalog(JSON.stringify(duplicated)), /duplicate names/)
})

test('published verification requires exact versions and bounded numeric timeouts', () => {
  assert.equal(parseOptions(['--published', '1.2.3-beta.4']).published, '1.2.3-beta.4')
  for (const version of [
    'latest',
    'beta',
    '^1.2.3',
    'https://example.invalid',
    '../file.tgz',
    '01.2.3',
  ]) {
    assert.throws(() => parseOptions(['--published', version]), /exact version/)
  }
  for (const duration of ['NaN', '-1', '0', '100.2', '600001']) {
    assert.throws(() => parseOptions([`--timeout-ms=${duration}`]), /Invalid timeout/)
  }
})

test('temporary consumer is removed even on failed install/probe', async () => {
  let path
  await assert.rejects(
    withTemporaryConsumer(async (consumer) => {
      path = consumer
      writeFileSync(join(consumer, 'partial-install'), 'fixture')
      throw new Error('simulated installation failure')
    }),
    /simulated installation failure/,
  )
  assert.equal(existsSync(path), false)
})

test('command execution is bounded and failures carry actionable diagnostics', async () => {
  await assert.rejects(
    runCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 100 }),
    /timed out/,
  )
  await assert.rejects(
    runCommand(process.execPath, [
      '-e',
      'process.stderr.write("fixture failure"); process.exit(7)',
    ]),
    /exited 7: fixture failure/,
  )
  await assert.rejects(runCommand('/nonexistent/wireweave-bin', []), /ENOENT/)
})

test('pnpm tarball installs offline into a clean production consumer without running lifecycle scripts', async () => {
  await withTemporaryConsumer(async (scratch) => {
    const packageDir = join(scratch, 'package')
    const tarballs = join(scratch, 'tarballs')
    const consumer = join(scratch, 'consumer')
    for (const dir of [packageDir, tarballs, consumer]) mkdirSync(dir)
    copyFileSync(
      join(ROOT, 'scripts/fixtures/mcp-smoke-server.mjs'),
      join(packageDir, 'server.mjs'),
    )
    chmodSync(join(packageDir, 'server.mjs'), 0o755)
    writeFileSync(join(packageDir, 'fixture-mode'), 'ok')
    writeFileSync(
      join(packageDir, 'package.json'),
      JSON.stringify({
        ...manifest,
        packageManager: JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).packageManager,
        scripts: Object.fromEntries(
          ['prepack', 'postpack', 'preinstall', 'install', 'postinstall'].map((hook) => [
            hook,
            'node -e "process.exit(91)"',
          ]),
        ),
      }),
    )
    const env = packageManagerEnvironment(scratch, { offline: true })
    await packPackage(packageDir, tarballs, env)
    const files = readdirSync(tarballs)
    assert.equal(files.length, 1)
    writeFileSync(
      join(consumer, 'package.json'),
      JSON.stringify({
        private: true,
        dependencies: { [PACKAGE_NAME]: `file:${join(tarballs, files[0])}` },
      }),
    )
    await runCommand(
      'npm',
      ['install', '--offline', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'],
      { cwd: consumer, env },
    )
    const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'))
    assert.match(lock.packages[`node_modules/${PACKAGE_NAME}`].resolved, /^file:.*\.tgz$/)
    assert.match(lock.packages[`node_modules/${PACKAGE_NAME}`].integrity, /^sha512-/)
    const result = await probeInstalled({
      consumer,
      expectedManifest: manifest,
      expectedNames: EXPECTED,
      sdkManifestPath: join(ROOT, 'packages/mcp-server/package.json'),
    })
    assert.equal(result.version, manifest.version)
  })
})
