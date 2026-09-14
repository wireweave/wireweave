import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import ts from 'typescript'
import generator from './generate-icons.cjs'
import { formatGeneratedSource } from './format-generated.mjs'

const { loadIcons, validateIconData, assertNoRemovedGlyphs, run } = generator
const SCRIPT = new URL('./generate-icons.cjs', import.meta.url)
const GLYPH = [['path', { d: 'M1 2h3' }]]

/**
 * Each fixture is an independent installed-ESM tree, not a mocked parser or loader.
 * @param {import('node:test').TestContext} context
 * @param {Record<string, unknown>} [icons]
 */
function fixture(context, icons = { zebra: GLYPH, house: GLYPH }) {
  const root = mkdtempSync(join(tmpdir(), 'wireweave-core3-icons-'))
  context.after(() => rmSync(root, { recursive: true, force: true }))
  const iconsDir = join(root, 'icons')
  mkdirSync(iconsDir)
  writeFileSync(join(root, 'package.json'), '{"type":"module"}')
  writeFileSync(join(root, '.prettierrc.json'), '{"semi":false,"singleQuote":true}')
  /** @type {string[]} */
  const exports = []
  for (const [name, data] of Object.entries(icons)) {
    writeFileSync(join(iconsDir, name + '.js'), 'export default ' + JSON.stringify(data) + '\n')
    exports.push('export { default as Icon' + exports.length + ' } from "./icons/' + name + '.js";')
  }
  const index = join(root, 'iconsAndAliases.js')
  writeFileSync(index, exports.join('\n'))
  return { root, iconsDir, index, outputFile: join(root, 'output.ts') }
}

await test('sorts filenames deterministically and retains the Core 3 circle-help glyph', async (context) => {
  const fixtureA = fixture(context, { zebra: GLYPH, house: GLYPH })
  const fixtureB = fixture(context, { house: GLYPH, zebra: GLYPH })
  const a = await loadIcons(fixtureA.iconsDir)
  const b = await loadIcons(fixtureB.iconsDir)
  assert.deepEqual(a, b)
  assert.deepEqual(Object.keys(a), ['circle-help', 'house', 'zebra'])
  assert.deepEqual(a['circle-help'], [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }],
    ['path', { d: 'M12 17h.01' }],
  ])
})

await test('writer is canonical and idempotent; a successful check does not write', async (context) => {
  const options = fixture(context)
  assert.deepEqual(await run(options), { count: 3, changed: true })
  const text = readFileSync(options.outputFile, 'utf8')
  const before = statSync(options.outputFile)
  assert.match(text, /Total icons: 3/)
  assert.match(text, /export type IconElement = \[string, Record<string, string>\]\n/)
  assert.deepEqual(await run(options), { count: 3, changed: false })
  assert.deepEqual(await run({ ...options, check: true }), { count: 3, changed: false })
  assert.equal(readFileSync(options.outputFile, 'utf8'), text)
  assert.equal(statSync(options.outputFile).mtimeMs, before.mtimeMs)
})

await test('stale check fails without changing bytes or metadata', async (context) => {
  const options = fixture(context)
  await run(options)
  writeFileSync(options.outputFile, readFileSync(options.outputFile, 'utf8') + '// drift\n')
  const text = readFileSync(options.outputFile, 'utf8')
  const before = statSync(options.outputFile)
  await assert.rejects(run({ ...options, check: true }), /missing or stale/)
  assert.equal(readFileSync(options.outputFile, 'utf8'), text)
  assert.equal(statSync(options.outputFile).mtimeMs, before.mtimeMs)
})

await test('missing check does not create an output directory', async (context) => {
  const options = fixture(context)
  const before = readdirSync(options.root)
  await assert.rejects(
    run({ ...options, check: true, outputFile: join(options.root, 'missing/icons.ts') }),
    /missing or stale/,
  )
  assert.deepEqual(readdirSync(options.root), before)
})

await test('zero icons fail closed without overwriting existing output', async (context) => {
  const options = fixture(context, {})
  writeFileSync(options.outputFile, 'sentinel')
  await assert.rejects(run(options), /zero icon files/)
  assert.equal(readFileSync(options.outputFile, 'utf8'), 'sentinel')
})

await test('a partial installation fails even when remaining icon files are valid', async (context) => {
  const options = fixture(context)
  rmSync(join(options.iconsDir, 'zebra.js'))
  writeFileSync(options.outputFile, 'sentinel')
  await assert.rejects(run(options), /Cannot find module/)
  assert.equal(readFileSync(options.outputFile, 'utf8'), 'sentinel')
})

await test('an unindexed icon cannot be silently added to the catalog', async (context) => {
  const options = fixture(context)
  writeFileSync(join(options.iconsDir, 'orphan.js'), 'export default ' + JSON.stringify(GLYPH))
  await assert.rejects(run(options), /missing from Lucide export index/)
})

await test('the index cannot reference data absent from enumerated default exports', async (context) => {
  const options = fixture(context)
  writeFileSync(
    options.index,
    readFileSync(options.index, 'utf8') + '\nexport const Detached = ' + JSON.stringify(GLYPH),
  )
  await assert.rejects(run(options), /Partial Lucide icon extraction/)
})

await test('zero exported icons and malformed export modules are fatal', async (context) => {
  const empty = fixture(context)
  writeFileSync(empty.index, 'export {}')
  await assert.rejects(run(empty), /zero icons/)
  const malformed = fixture(context)
  writeFileSync(join(malformed.iconsDir, 'zebra.js'), 'not valid javascript !')
  await assert.rejects(run(malformed), SyntaxError)
})

for (const [label, value] of Object.entries({
  null: null,
  empty: [],
  scalar: 'path',
  tuple: [['path']],
  script: [['script', { src: 'bad' }]],
  attributes: [['path', []]],
  missingAttributes: [['path', {}]],
  number: [['path', { d: 1 }]],
  attributeName: [['path', { 'bad key': 'value' }]],
})) {
  await test('invalid icon data is rejected: ' + label, () => {
    assert.throws(() => validateIconData(value, 'fixture'), /invalid|Invalid/)
  })
}

await test('malformed default-export data fails before writing', async (context) => {
  const options = fixture(context, { house: GLYPH, zebra: [] })
  writeFileSync(options.outputFile, 'sentinel')
  await assert.rejects(run(options), /invalid icon/)
  assert.equal(readFileSync(options.outputFile, 'utf8'), 'sentinel')
})

await test('a retained glyph conflict is reported rather than silently replaced', async (context) => {
  const options = fixture(context, { 'circle-help': GLYPH })
  await assert.rejects(run(options), /Retained Core 3 glyph conflicts/)
})

await test('writer refuses to drop an unaccounted manual glyph', async (context) => {
  const options = fixture(context)
  const source = 'export const lucideIcons = { custom: [] }\n'
  writeFileSync(options.outputFile, source)
  await assert.rejects(run(options), /Unaccounted retained glyphs: custom/)
  assert.equal(readFileSync(options.outputFile, 'utf8'), source)
})

await test('uninspectable declarations fail closed', () => {
  assert.throws(() => assertNoRemovedGlyphs('export const other = {}', {}), /Cannot inspect/)
  assert.throws(
    () => assertNoRemovedGlyphs('export const lucideIcons = { ...other }', {}),
    /Cannot inspect/,
  )
})

await test('generated helpers preserve aliases, camel-case lookup and CSS-sized five-argument SVG API', async (context) => {
  const options = fixture(context, { house: GLYPH, 'square-plus': GLYPH, 'pencil-line': GLYPH })
  await run(options)
  const js = ts.transpileModule(readFileSync(options.outputFile, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText
  const modulePath = join(options.root, 'generated.mjs')
  writeFileSync(modulePath, js)
  /** @type {unknown} */
  const namespace = await import(pathToFileURL(modulePath).href)
  const generated = /** @type {{
   getIconData(name: string): unknown,
   renderIconSvg(data: unknown, size: number, strokeWidth: number, className: string, styleAttr: string): string
  }} */ (namespace)
  assert.deepEqual(generated.getIconData('home'), GLYPH)
  assert.deepEqual(generated.getIconData('plusSquare'), GLYPH)
  assert.deepEqual(generated.getIconData('edit-3'), GLYPH)
  assert.notEqual(generated.getIconData('circleHelp'), undefined)
  assert.equal(generated.getIconData('missing-icon'), undefined)
  const svg = generated.renderIconSvg(GLYPH, 99, 3, 'wf-icon-lg', ' style="width:18px"')
  assert.match(svg, /stroke-width="3"/)
  assert.match(svg, /class="wf-icon-lg" style="width:18px"/)
  assert.doesNotMatch(svg, /width="99"|height="99"/)
})

await test('unknown CLI options fail without writing the installed artifact', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(SCRIPT), '--typo'], {
    cwd: dirname(fileURLToPath(SCRIPT)),
    encoding: 'utf8',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /usage:/)
})

/** @param {import('node:test').TestContext} context */
async function parserFixture(context) {
  const { root } = fixture(context)
  const scripts = join(root, 'scripts')
  mkdirSync(scripts)
  for (const name of ['check-generated-parser.mjs', 'format-generated.mjs']) {
    writeFileSync(join(scripts, name), readFileSync(new URL('./' + name, import.meta.url)))
  }
  symlinkSync(
    fileURLToPath(new URL('../node_modules', import.meta.url)),
    join(root, 'node_modules'),
    'junction',
  )
  const build = 'peggy --format es -o generated-parser.js grammar.peggy'
  const manifest = join(root, 'package.json')
  writeFileSync(
    manifest,
    JSON.stringify({ name: 'parser-fixture', type: 'module', scripts: { 'build:grammar': build } }),
  )
  writeFileSync(join(root, 'grammar.peggy'), 'start = "hello"')
  const require = createRequire(import.meta.url)
  const peggy = join(dirname(require.resolve('peggy/package.json')), 'bin/peggy.js')
  const generated = spawnSync(
    process.execPath,
    [peggy, '--format', 'es', 'grammar.peggy', '-o', '-'],
    { cwd: root, encoding: 'utf8' },
  )
  assert.equal(generated.status, 0, generated.stderr)
  const artifact = join(root, 'generated-parser.js')
  writeFileSync(artifact, await formatGeneratedSource(generated.stdout, artifact))
  const check = () =>
    spawnSync(process.execPath, [join(scripts, 'check-generated-parser.mjs')], {
      cwd: root,
      encoding: 'utf8',
    })
  return { root, build, manifest, artifact, check }
}

await test('parser gate accepts canonical Peggy output without writing', async (context) => {
  const fixture = await parserFixture(context)
  const before = statSync(fixture.artifact)
  const bytes = readFileSync(fixture.artifact)
  const checked = fixture.check()
  assert.equal(checked.status, 0, checked.stderr)
  assert.deepEqual(readFileSync(fixture.artifact), bytes)
  assert.equal(statSync(fixture.artifact).mtimeMs, before.mtimeMs)
})

await test('parser gate detects drift without rewriting the artifact', async (context) => {
  const fixture = await parserFixture(context)
  writeFileSync(fixture.artifact, '// stale artifact\n')
  const checked = fixture.check()
  assert.equal(checked.status, 1)
  assert.match(checked.stderr, /generated parser is stale/)
  assert.equal(readFileSync(fixture.artifact, 'utf8'), '// stale artifact\n')
})

await test('parser gate rejects shell-chained manifests instead of interpreting a different generator', async (context) => {
  const fixture = await parserFixture(context)
  writeFileSync(
    fixture.manifest,
    JSON.stringify({
      name: 'parser-fixture',
      type: 'module',
      scripts: { 'build:grammar': fixture.build + ' && echo wrong' },
    }),
  )
  const checked = fixture.check()
  assert.equal(checked.status, 1)
  assert.match(checked.stderr, /shell syntax this gate cannot interpret/)
})
