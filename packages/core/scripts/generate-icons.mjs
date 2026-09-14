/**
 * Generate the icon dataset from the installed lucide package.
 *
 * This generator must stay wired to a script someone runs (`build:icons`, and
 * `check:icons-sync` in `pretest`). A generator that is declared but never
 * called cannot corrupt anything, which is exactly why it rots unnoticed: the
 * file it claims to own drifts under hand edits while still carrying a "do not
 * edit manually" header, and the damage lands on whoever finally wires it up.
 * If this is ever unhooked, delete it rather than leaving it declared.
 *
 * Three properties make running it on every build safe:
 *
 *   1. It imports each icon module and takes its default export, which is
 *      lucide's published contract (`export { X as default }`). Recovering the
 *      data by matching source text instead — e.g. a non-greedy capture up to
 *      the first `];` — truncates any icon whose data contains that sequence,
 *      and turns a change in lucide's dist formatting into wrong artwork rather
 *      than an error. Importing has no format to break against.
 *
 *   2. Keys are sorted. `readdirSync` order is filesystem dependent — it
 *      differs from a plain sort at 1042 of 1666 positions on this machine — so
 *      emitting in directory order makes committed output and CI output
 *      disagree for reasons having nothing to do with the data. Sorting is what
 *      lets `--check` mean something.
 *
 *   3. `--check` exists, so the committed dataset drifting from the installed
 *      lucide version is observable rather than merely possible.
 *
 * Local additions are NOT written here; they come from icon-overrides.mjs, so
 * regeneration cannot drop them. See that file for why.
 *
 * Usage: node scripts/generate-icons.mjs [--check]
 *   --check  exit non-zero if the committed dataset is stale (no write)
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import ts from 'typescript'

import { RENAMED_GLYPHS } from './icon-overrides.mjs'
import { formatGeneratedSource } from './format-generated.mjs'

/** @typedef {[string, Record<string, string>][]} IconData */
/** @typedef {Record<string, IconData>} IconCatalog */

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const LUCIDE_ICONS_DIR = join(PACKAGE_ROOT, 'node_modules/lucide/dist/esm/icons')
export const OUTPUT_PATH = join(PACKAGE_ROOT, 'src/icons/lucide-icons.generated.ts')
const SVG_TAGS = new Set(['path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect'])

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  throw new Error(`[generate-icons] ${message}`)
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @param {unknown} value @param {string} name @returns {asserts value is IconData} */
export function validateIconData(value, name) {
  if (!Array.isArray(value) || value.length === 0) fail('Empty or invalid icon: ' + name)
  for (const element of /** @type {unknown[]} */ (value)) {
    if (!Array.isArray(element) || element.length !== 2) fail('Invalid element: ' + name)
    /** @type {unknown} */
    const tag = element[0]
    /** @type {unknown} */
    const attributes = element[1]
    if (typeof tag !== 'string' || !SVG_TAGS.has(tag) || !isRecord(attributes)) {
      fail('Invalid SVG element: ' + name)
    }
    if (
      Object.keys(attributes).length === 0 ||
      Object.entries(attributes).some(
        ([key, item]) => !/^[a-zA-Z][a-zA-Z0-9:._-]*$/.test(key) || typeof item !== 'string',
      )
    )
      fail('Invalid SVG attributes: ' + name)
  }
}

/**
 * Read every icon lucide ships, keyed by its module name.
 *
 * The key is the filename rather than the exported identifier because the
 * filename is already kebab-case and is what authors write in `.wf` source;
 * deriving it from the PascalCase export would mean re-implementing lucide's
 * own casing rules and getting them subtly wrong for names like `a-arrow-down`.
 *
 * The official export index anchors completeness independently of directory
 * enumeration. Missing, unindexed or malformed modules fail before any write.
 * @param {string} iconsDir
 * @returns {Promise<IconCatalog>}
 */
async function readVendorIcons(iconsDir) {
  let files
  try {
    files = readdirSync(iconsDir)
  } catch {
    fail(
      `cannot read ${relative(PACKAGE_ROOT, iconsDir)}.\n` +
        'The `lucide` devDependency provides it -- run `pnpm install`.',
    )
  }

  const names = files.filter((file) => file.endsWith('.js')).map((file) => file.slice(0, -3))
  if (names.length === 0) fail('Lucide installation contains zero icon files')
  /** @type {unknown} */
  const exported = await import(pathToFileURL(join(iconsDir, '../iconsAndAliases.js')).href)
  if (!isRecord(exported)) fail('Invalid Lucide export index')
  const inventory = new Set(Object.values(exported))
  if (inventory.size === 0) fail('Lucide export index contains zero icons')
  for (const value of inventory) validateIconData(value, 'export index')

  /** @type {IconCatalog} */
  const icons = {}
  for (const name of names.sort()) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) fail('Invalid icon filename: ' + name)
    // A dynamic specifier types the namespace `any`, so it is contained as
    // `unknown` and narrowed explicitly rather than trusted. lucide's published
    // contract is `export { X as default }`; anything else fails loudly here
    // instead of emitting a broken glyph.
    /** @type {unknown} */
    const module = await import(pathToFileURL(join(iconsDir, `${name}.js`)).href)
    if (!isRecord(module) || !Object.hasOwn(module, 'default'))
      fail(`lucide icon "${name}" has no default export`)
    const data = module.default
    validateIconData(data, name)
    if (!inventory.has(data)) fail('Icon missing from Lucide export index: ' + name)
    icons[name] = data
  }
  const collected = new Set(Object.values(icons))
  if (
    inventory.size !== collected.size ||
    [...inventory].some((data) => !collected.has(/** @type {IconData} */ (data)))
  )
    fail('Partial Lucide icon extraction; refusing to generate')
  return icons
}

/**
 * Add the retained names from icon-overrides.mjs, resolved against the vendor
 * data so no artwork is stored twice.
 *
 * @param {IconCatalog} vendor
 * @returns {IconCatalog}
 */
function applyOverrides(vendor) {
  const merged = { ...vendor }
  for (const [name, target] of Object.entries(RENAMED_GLYPHS)) {
    if (Object.hasOwn(vendor, name))
      fail(
        `icon-overrides.mjs retains "${name}", but lucide now ships it. ` +
          'Remove the entry -- the vendor data should win.',
      )
    if (!Object.hasOwn(vendor, target))
      fail(
        `icon-overrides.mjs maps "${name}" to "${target}", which lucide no longer ships. ` +
          "Point it at the glyph's current name.",
      )
    merged[name] = vendor[target]
  }
  return Object.fromEntries(
    Object.keys(merged)
      .sort()
      .map((name) => [name, merged[name]]),
  )
}

/** @param {string} [iconsDir] @returns {Promise<IconCatalog>} */
export async function loadIcons(iconsDir = LUCIDE_ICONS_DIR) {
  return applyOverrides(await readVendorIcons(iconsDir))
}

/**
 * Retained names must be inputs in icon-overrides.mjs, not hand edits that the
 * next build silently deletes. Inspect the dataset without executing it.
 * @param {string} source
 * @param {IconCatalog} icons
 */
export function assertNoRemovedGlyphs(source, icons) {
  const ast = ts.createSourceFile(OUTPUT_PATH, source, ts.ScriptTarget.Latest, true)
  const declarations = ast.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [],
  )
  const declaration = declarations.find(
    (entry) => ts.isIdentifier(entry.name) && entry.name.text === 'lucideIcons',
  )
  if (!declaration?.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
    fail('Cannot inspect existing lucideIcons declaration; refusing to overwrite')
  }
  const names = declaration.initializer.properties.map((property) => {
    if (
      !ts.isPropertyAssignment(property) ||
      !(ts.isStringLiteral(property.name) || ts.isIdentifier(property.name))
    )
      fail('Cannot inspect existing glyph name; refusing to overwrite')
    return property.name.text
  })
  const removed = names.filter((name) => !Object.hasOwn(icons, name))
  if (removed.length > 0) fail('Unaccounted retained glyphs: ' + removed.join(', '))
}

/**
 * @param {IconCatalog} icons
 * @param {string} outputFile
 * @returns {Promise<string>}
 */
async function renderModule(icons, outputFile) {
  const source = `/**
 * GENERATED FILE -- DO NOT EDIT.
 *
 * The icon dataset, generated from the installed \`lucide\` package by
 * \`scripts/generate-icons.mjs\` (\`pnpm build:icons\`). Names kept beyond what
 * lucide ships come from \`scripts/icon-overrides.mjs\`; add them there, never
 * here, or the next regeneration deletes them.
 *
 * Total icons: ${Object.keys(icons).length}
 *
 * The lookup, alias and rendering code that consumes this lives in
 * \`./lucide-icons.ts\` and is hand-written.
 *
 * @license ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023
 * as part of Feather (MIT). All other copyright (c) for Lucide are held
 * by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * @see https://lucide.dev
 */

export type IconElement = [string, Record<string, string>]
export type IconData = IconElement[]

export const lucideIcons: Record<string, IconData> = ${JSON.stringify(icons, null, 2)}
`

  // Formatted with the repo's own prettier config rather than emitted
  // pre-formatted. Two reasons: the pre-commit hook would reformat it anyway
  // and leave --check permanently red, and scripts/extract-icon-names.mjs
  // parses this file line by line expecting prettier's exact key style.
  return formatGeneratedSource(source, outputFile)
}

/**
 * Generate only the dataset; the lookup/rendering wrapper is never an output.
 * @param {{check?: boolean, outputFile?: string, iconsDir?: string}} [options]
 * @returns {Promise<{count: number, changed: boolean}>}
 */
export async function run({ check = false, outputFile = OUTPUT_PATH, iconsDir } = {}) {
  const icons = await loadIcons(iconsDir)
  const generated = await renderModule(icons, outputFile)
  let current
  try {
    current = readFileSync(outputFile, 'utf8')
  } catch (error) {
    if (!isRecord(error) || error.code !== 'ENOENT') throw error
  }
  if (check) {
    if (current !== generated)
      fail(`${relative(PACKAGE_ROOT, outputFile)} is missing or stale -- run \`pnpm build:icons\``)
    return { count: Object.keys(icons).length, changed: false }
  }
  if (current !== undefined) assertNoRemovedGlyphs(current, icons)
  if (current !== generated) {
    mkdirSync(dirname(outputFile), { recursive: true })
    writeFileSync(outputFile, generated)
  }
  return { count: Object.keys(icons).length, changed: current !== generated }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check'))
    fail('usage: node scripts/generate-icons.mjs [--check]')
  const result = await run({ check: args[0] === '--check' })
  console.log(
    `[generate-icons] ${args[0] === '--check' ? 'checked' : result.changed ? 'wrote' : 'unchanged'} ${relative(PACKAGE_ROOT, OUTPUT_PATH)} (${result.count} icons)`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
