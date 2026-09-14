import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compileFunction, runInNewContext } from 'node:vm'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const core = join(root, 'packages/core')
const coreRequire = createRequire(join(core, 'package.json'))
const tsupRequire = createRequire(coreRequire.resolve('tsup'))
const { build, transform } = tsupRequire('esbuild')
const { rollup } = tsupRequire('rollup')
const { JSDOM, VirtualConsole } = coreRequire('jsdom')
const manifest = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8'))
const configPath = join(core, 'tsup.config.ts')
const { code: configCode } = await transform(readFileSync(configPath, 'utf8'), {
  loader: 'ts',
  format: 'cjs',
  target: 'node22',
})
const configModule = { exports: {} }
compileFunction(configCode, ['module', 'exports', 'require'], { filename: configPath })(
  configModule,
  configModule.exports,
  coreRequire,
)
const config = configModule.exports.default
const fixture = JSON.parse(readFileSync(join(root, 'docs/spec/examples.json'), 'utf8')).valid.find(
  ({ id }) => id === 'minimal-navigation',
)
assert.ok(fixture, 'The canonical navigation fixture must exist')

// Read existing dist only. Building here would race other workspace gate tests.
const entries = (condition) =>
  Object.entries(manifest.publishConfig.exports).map(([subpath, conditions]) => [
    subpath,
    resolve(core, conditions[condition].default),
  ])
const value = (result) => {
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
  return result.value
}

test('production tree shaking is conservative and scoped to generated sibling chunks', () => {
  assert.equal(manifest.sideEffects, false)
  assert.equal(config.target, 'es2019')
  assert.equal(config.splitting, true)
  assert.equal(config.treeshake.preset, 'safest')
  for (const extension of ['js', 'mjs', 'cjs']) {
    assert.equal(config.treeshake.moduleSideEffects(`./chunk-ABCD0123.${extension}`, true), false)
  }
  for (const id of [
    'external-init',
    './setup.js',
    '../chunk-ABCD0123.js',
    './nested/chunk-ABCD0123.js',
    '/tmp/chunk-ABCD0123.js',
    'package/chunk-ABCD0123.js',
    './chunk-lowercase.js',
    './chunk-ABCD0123.css',
    './chunk-ABCD0123.js/extra',
  ]) {
    assert.equal(config.treeshake.moduleSideEffects(id, true), true, id)
  }
})

test('only empty generated chunk artifacts are removed before Rollup', () => {
  const callbacks = []
  for (const plugin of config.esbuildPlugins) {
    plugin.setup({ onEnd: (callback) => callbacks.push(callback) })
  }
  assert.ok(callbacks.length > 0)
  const file = (name, contents = '') => ({
    path: join(core, 'dist', name),
    contents: new globalThis.TextEncoder().encode(contents),
  })
  const retained = [
    file('index.js'),
    file('setup.js'),
    file('chunk-lowercase.js'),
    file('chunk-HELPER01.js', 'export const helper = () => 42'),
    file('chunk-MAP00001.js.map'),
  ]
  const result = {
    outputFiles: [...retained, file('chunk-EMPTY001.js'), file('chunk-EMPTY002.cjs')],
  }
  for (const callback of callbacks) {
    callback(result)
    assert.doesNotThrow(() => callback({}))
  }
  assert.deepEqual(result.outputFiles, retained)
})

for (const [condition, format] of [
  ['import', 'esm'],
  ['require', 'cjs'],
]) {
  test(`${format}: normalization retains bound helpers and executes external initialization`, async () => {
    const entry = '/virtual/entry.js'
    const warnings = []
    const bundle = await rollup({
      input: entry,
      treeshake: config.treeshake,
      makeAbsoluteExternalsRelative: false,
      preserveEntrySignatures: 'exports-only',
      onwarn: (warning) => warnings.push(warning),
      // Match tsup's per-output-chunk Rollup boundary: other modules are external.
      plugins: [
        {
          name: 'per-chunk-fixture',
          resolveId: (id) => (id === entry ? id : false),
          load: () => `
          import './chunk-UNUSED01.js';
          import './setup.js';
          import 'external-init';
          import { used } from './chunk-HELPER01.js';
          export const result = used + 1;
        `,
        },
      ],
    })
    let normalized
    try {
      normalized = (await bundle.generate({ format })).output[0].code
    } finally {
      await bundle.close()
    }
    assert.deepEqual(warnings, [])
    assert.doesNotMatch(normalized, /chunk-UNUSED01/)
    assert.match(normalized, /chunk-HELPER01/)
    const modules = {
      './setup.js': "globalThis.trace.push('setup')",
      'external-init': "globalThis.trace.push('external')",
      './chunk-HELPER01.js': 'export const used = 41',
    }
    const consumer = await build({
      stdin: { contents: normalized, sourcefile: 'normalized.js', resolveDir: root },
      bundle: true,
      write: false,
      platform: 'node',
      format: 'cjs',
      logLevel: 'silent',
      plugins: [
        {
          name: 'initialization-fixtures',
          setup(build) {
            build.onResolve({ filter: /.*/ }, ({ path }) => ({ path, namespace: 'fixture' }))
            build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => {
              assert.ok(Object.hasOwn(modules, path), `Unexpected dependency: ${path}`)
              return { contents: modules[path] }
            })
          },
        },
      ],
    })
    assert.deepEqual(consumer.warnings, [])
    const context = { module: { exports: {} }, trace: [] }
    context.exports = context.module.exports
    runInNewContext(consumer.outputFiles[0].text, context)
    assert.deepEqual(context.trace, ['setup', 'external'])
    assert.equal(context.module.exports.result, 42)
  })

  test(`${format}: all published subpaths bundle without warnings or dangling chunks`, async () => {
    const entryPoints = entries(condition).map(([, entry]) => entry)
    for (const entry of entryPoints) assert.ok(readFileSync(entry).byteLength > 0, entry)
    const consumer = await build({
      entryPoints,
      outdir: join(core, 'dist', 'unused-in-memory-consumer'),
      bundle: true,
      write: false,
      platform: 'node',
      format,
      target: 'node22',
      logLevel: 'silent',
    })
    assert.deepEqual(consumer.warnings, [])
    assert.equal(consumer.outputFiles.length, entryPoints.length)
    for (const output of consumer.outputFiles) assert.ok(output.contents.byteLength > 0)
    for (const name of readdirSync(join(core, 'dist')).filter((name) =>
      /^chunk-.*\.(?:js|cjs)$/.test(name),
    )) {
      assert.ok(
        readFileSync(join(core, 'dist', name), 'utf8')
          .trim()
          .replace(/['"]use strict['"];?/, '')
          .trim(),
        name,
      )
    }
  })

  test(`${format}: root and subpaths share identity, provenance and a working browser runtime`, async () => {
    const modules = Object.fromEntries(
      await Promise.all(
        entries(condition).map(async ([subpath, entry]) => [
          subpath,
          condition === 'import' ? await import(pathToFileURL(entry).href) : coreRequire(entry),
        ]),
      ),
    )
    const api = modules['.']
    for (const [subpath, module] of Object.entries(modules).filter(
      ([subpath]) => subpath !== '.',
    )) {
      const shared = Object.keys(module).filter(
        (name) => name in api && !(subpath === './app' && name === 'renderSite'),
      )
      assert.ok(shared.length > 0, subpath)
      for (const name of shared) assert.equal(module[name], api[name], `${subpath}:${name}`)
    }
    const app = modules['./app']
    assert.equal(app.renderSite, api.renderAppSite)
    const parsed = api.parse(fixture.source, {
      languageVersion: '4.0.0',
      sourceId: 'bundle-fixture.wf',
    })
    for (const module of parsed.modules) {
      const span = modules['./parser'].getV4SourceSpan(module)
      assert.ok(span, 'Parser metadata must survive a root/subpath boundary')
      assert.equal(fixture.source.slice(span.start, span.end), fixture.moduleSources[module.id])
    }
    const candidate = value(
      api.createAppBundle([parsed], {
        id: parsed.app.id,
        entry: parsed.app.entry,
        profile: parsed.app.profile,
        states: parsed.states,
        registry: parsed.registry,
        fixtures: parsed.fixtures,
        moduleSources: fixture.moduleSources,
      }),
    )
    const linked = value(app.linkApp(candidate))
    const artifact = value(api.compileApp(linked))
    assert.equal(value(app.compileApp(linked)), artifact)
    assert.equal(artifact.sourceMap, linked.sourceMap)
    for (const result of [
      app.linkApp(JSON.parse(JSON.stringify(candidate))),
      api.compileApp(JSON.parse(JSON.stringify(linked))),
    ]) {
      assert.equal(result.ok, false)
      assert.ok(result.diagnostics.some(({ code }) => code === 'WW_SCHEMA'))
    }
    assert.match(artifact.html, /<!DOCTYPE html>/)
    const errors = []
    const virtualConsole = new VirtualConsole()
    virtualConsole.on('jsdomError', (error) => errors.push(error.message))
    const dom = new JSDOM(artifact.html, {
      runScripts: 'dangerously',
      url: 'https://bundle.test/',
      virtualConsole,
    })
    try {
      const document = dom.window.document
      const visible = () =>
        [...document.querySelectorAll('[data-wf-screen]:not([hidden])')].map((node) =>
          node.getAttribute('data-wf-screen'),
        )
      assert.equal(typeof dom.window.wireweaveRuntime.snapshot, 'function')
      assert.deepEqual(visible(), ['#wf/main/home'])
      assert.match(document.querySelector('[data-wf-screen]:not([hidden])').textContent, /Catalog/)
      for (const [localId, route] of [
        ['settingsLink', '#wf/main/settings'],
        ['homeLink', '#wf/main/home'],
      ]) {
        const entry = artifact.sourceMap.find(({ identity }) => identity.localId === localId)
        assert.ok(entry, localId)
        const element = document.getElementById(entry.renderedId)
        assert.ok(element, localId)
        element.click()
        assert.deepEqual(visible(), [route])
      }
      assert.deepEqual(errors, [])
    } finally {
      dom.window.close()
    }
  })

  test(`${format}: each published entry imports without observable mutations`, (t) => {
    const scratch = mkdtempSync(join(tmpdir(), 'wireweave-core-bundle-effects-'))
    t.after(() => rmSync(scratch, { recursive: true, force: true }))
    for (const [index, [subpath, entry]] of entries(condition).entries()) {
      const reportPath = join(scratch, `${index}.json`)
      const child = spawnSync(
        process.execPath,
        [join(root, 'scripts/packaging-gate.mjs'), '--probe', entry, reportPath],
        {
          cwd: root,
          encoding: 'utf8',
          timeout: 30_000,
          maxBuffer: 8 * 1024 * 1024,
        },
      )
      assert.equal(child.error, undefined, subpath)
      assert.equal(child.status, 0, `${subpath}: ${child.stderr}`)
      assert.equal(child.stdout, '', subpath)
      assert.equal(child.stderr, '', subpath)
      const report = JSON.parse(readFileSync(reportPath, 'utf8'))
      assert.equal(report.failure, null, subpath)
      // Loader filesystem reads are observations, not import-time mutations.
      assert.deepEqual(
        report.effects.filter(({ kind }) => kind === 'MUTATION'),
        [],
        subpath,
      )
    }
  })
}
