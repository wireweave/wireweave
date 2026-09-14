import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import {
  loadIcons,
  validateIconData,
  assertNoRemovedGlyphs,
  run,
  OUTPUT_PATH,
} from './generate-icons.mjs'
const SCRIPT = new URL('./generate-icons.mjs', import.meta.url)
const GLYPH = [['path', { d: 'M1 2h3' }]]

/**
 * Each fixture is an independent installed-ESM tree, not a mocked parser or loader.
 * @param {import('node:test').TestContext} context
 * @param {Record<string, unknown>} [icons]
 */
function fixture(context, icons = { zebra: GLYPH, house: GLYPH, 'circle-question-mark': GLYPH }) {
  const root = mkdtempSync(join(tmpdir(), 'wireweave-core4-icons-'))
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
  return { root, iconsDir, index, outputFile: join(root, 'lucide-icons.generated.ts') }
}

await test('sorts filenames deterministically and retains the current vendor glyph via Core 4 overrides', async (context) => {
  const fixtureA = fixture(context)
  const fixtureB = fixture(context, { 'circle-question-mark': GLYPH, house: GLYPH, zebra: GLYPH })
  const a = await loadIcons(fixtureA.iconsDir)
  const b = await loadIcons(fixtureB.iconsDir)
  assert.deepEqual(a, b)
  assert.deepEqual(Object.keys(a), ['circle-help', 'circle-question-mark', 'house', 'zebra'])
  assert.strictEqual(a['circle-help'], a['circle-question-mark'])
  assert.deepEqual(a['circle-help'], GLYPH)
})

await test('writer is canonical and idempotent; a successful check does not write', async (context) => {
  const options = fixture(context)
  assert.deepEqual(await run(options), { count: 4, changed: true })
  const text = readFileSync(options.outputFile, 'utf8')
  const before = statSync(options.outputFile)
  assert.match(text, /Total icons: 4/)
  assert.match(text, /export type IconElement = \[string, Record<string, string>\]\n/)
  assert.deepEqual(await run(options), { count: 4, changed: false })
  assert.deepEqual(await run({ ...options, check: true }), { count: 4, changed: false })
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
  await assert.rejects(run(options), /retains "circle-help", but lucide now ships it/)
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

await test('missing override targets fail without changing the dataset', async (context) => {
  const options = fixture(context, { house: GLYPH })
  writeFileSync(options.outputFile, 'sentinel')
  await assert.rejects(run(options), /which lucide no longer ships/)
  assert.equal(readFileSync(options.outputFile, 'utf8'), 'sentinel')
})

await test('invalid module filenames fail before changing the dataset', async (context) => {
  const options = fixture(context, { 'Bad-Name': GLYPH })
  writeFileSync(options.outputFile, 'sentinel')
  await assert.rejects(run(options), /Invalid icon filename/)
  assert.equal(readFileSync(options.outputFile, 'utf8'), 'sentinel')
})

await test('regeneration leaves Core 4 wrapper bytes and its aliases/rendering API intact', async (context) => {
  const options = fixture(context, {
    house: GLYPH,
    'square-plus': GLYPH,
    'pencil-line': GLYPH,
    'circle-question-mark': GLYPH,
    ellipsis: GLYPH,
    'ellipsis-vertical': GLYPH,
  })
  const wrapperSource = readFileSync(
    new URL('../src/icons/lucide-icons.ts', import.meta.url),
    'utf8',
  )
  const wrapperPath = join(options.root, 'lucide-icons.ts')
  writeFileSync(wrapperPath, wrapperSource)
  const before = statSync(wrapperPath)
  assert.ok(OUTPUT_PATH.endsWith('/src/icons/lucide-icons.generated.ts'))
  await run(options)
  assert.equal(readFileSync(wrapperPath, 'utf8'), wrapperSource)
  assert.equal(statSync(wrapperPath).mtimeMs, before.mtimeMs)
  const datasetSource = readFileSync(options.outputFile, 'utf8')
  assert.doesNotMatch(datasetSource, /export function getIconData|export function renderIconSvg/)
  /** @param {string} text */
  const transpile = (text) =>
    ts.transpileModule(text, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText
  writeFileSync(join(options.root, 'lucide-icons.generated.mjs'), transpile(datasetSource))
  const modulePath = join(options.root, 'wrapper.mjs')
  writeFileSync(
    modulePath,
    transpile(wrapperSource).replaceAll('./lucide-icons.generated', './lucide-icons.generated.mjs'),
  )
  /** @type {unknown} */
  const namespace = await import(pathToFileURL(modulePath).href)
  const wrapper = /** @type {{
    getIconData(name: string): unknown,
    renderIconSvg(data: unknown, size: number, strokeWidth: number, className: string, styleAttr: string): string,
    renderUnknownIconSvg(className: string, size: number, styleAttr: string): string
  }} */ (namespace)
  for (const name of [
    'home',
    'plusSquare',
    'edit-3',
    'circleHelp',
    'help-circle',
    'dots',
    'moreHorizontal',
    'dots-vertical',
  ])
    assert.deepEqual(wrapper.getIconData(name), GLYPH)
  assert.equal(wrapper.getIconData('missing-icon'), undefined)
  const svg = wrapper.renderIconSvg(GLYPH, 99, 3, 'wf-icon-lg', ' style="width:18px"')
  assert.match(svg, /stroke-width="3"/)
  assert.match(svg, /class="wf-icon-lg" style="width:18px"/)
  assert.doesNotMatch(svg, /width="99"|height="99"/)
  assert.match(wrapper.renderUnknownIconSvg('unknown', 20, ''), /stroke-dasharray="4 2"/)
})

await test('unknown CLI options fail without writing the installed artifact', () => {
  const before = readFileSync(OUTPUT_PATH)
  const metadata = statSync(OUTPUT_PATH)
  const result = spawnSync(process.execPath, [fileURLToPath(SCRIPT), '--typo'], {
    cwd: dirname(fileURLToPath(SCRIPT)),
    encoding: 'utf8',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /usage:/)
  assert.deepEqual(readFileSync(OUTPUT_PATH), before)
  assert.equal(statSync(OUTPUT_PATH).mtimeMs, metadata.mtimeMs)
})
