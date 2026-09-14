/**
 * Generate Core 3's public icon data from the installed Lucide ESM exports.
 * --check compares canonical bytes without creating directories or writing files.
 */
const fs = /** @type {typeof import('node:fs')} */ (require('node:fs'))
const path = /** @type {typeof import('node:path')} */ (require('node:path'))
const { pathToFileURL } = /** @type {typeof import('node:url')} */ (require('node:url'))
const ts = /** @type {typeof import('typescript')} */ (require('typescript'))

/** @typedef {[string, Record<string, string>][]} IconData */
/** @typedef {Record<string, IconData>} IconCatalog */

const OUTPUT_FILE = path.join(__dirname, '../src/icons/lucide-icons.ts')
const SVG_TAGS = new Set(['path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect'])

/**
 * Core 3 historically publishes this glyph under both names. It is retained
 * explicitly, not read back from the generated output (which would hide drift).
 * Its geometry matches Lucide 0.562.0's circle-question-mark.
 * @type {IconCatalog}
 */
const RETAINED_ICONS = {
  'circle-help': [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }],
    ['path', { d: 'M12 17h.01' }],
  ],
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @param {unknown} value @param {string} name @returns {asserts value is IconData} */
function validateIconData(value, name) {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Empty or invalid icon: ' + name)
  for (const element of /** @type {unknown[]} */ (value)) {
    if (!Array.isArray(element) || element.length !== 2) throw new Error('Invalid element: ' + name)
    /** @type {unknown} */
    const tag = element[0]
    /** @type {unknown} */
    const attributes = element[1]
    if (typeof tag !== 'string' || !SVG_TAGS.has(tag) || !isRecord(attributes)) {
      throw new Error('Invalid SVG element: ' + name)
    }
    if (
      Object.keys(attributes).length === 0 ||
      Object.entries(attributes).some(
        ([key, item]) => !/^[a-zA-Z][a-zA-Z0-9:._-]*$/.test(key) || typeof item !== 'string',
      )
    )
      throw new Error('Invalid SVG attributes: ' + name)
  }
}

/** @returns {string} */
function installedIconsDir() {
  const manifest = require.resolve('lucide/package.json')
  return path.join(path.dirname(manifest), 'dist/esm/icons')
}

/**
 * The official export index independently anchors completeness. Reading only a
 * directory could silently accept a partial installation; missing index imports
 * or a disagreement between index and directory are fatal before any write.
 * @param {string} [iconsDir]
 * @returns {Promise<IconCatalog>}
 */
async function loadIcons(iconsDir = installedIconsDir()) {
  const files = fs
    .readdirSync(iconsDir)
    .filter((file) => file.endsWith('.js'))
    .sort()
  if (files.length === 0) throw new Error('Lucide installation contains zero icon files')
  const exported = /** @type {unknown} */ (
    await import(pathToFileURL(path.join(iconsDir, '../iconsAndAliases.js')).href)
  )
  if (!isRecord(exported)) throw new Error('Invalid Lucide export index')
  const inventory = new Set(Object.values(exported))
  if (inventory.size === 0) throw new Error('Lucide export index contains zero icons')
  for (const value of inventory) validateIconData(value, 'export index')
  /** @type {IconCatalog} */
  const icons = {}
  for (const file of files) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.js$/.test(file)) {
      throw new Error('Invalid icon filename: ' + file)
    }
    const name = file.slice(0, -3)
    const imported = /** @type {unknown} */ (
      await import(pathToFileURL(path.join(iconsDir, file)).href)
    )
    if (!isRecord(imported)) throw new Error('Invalid icon module: ' + file)
    const data = imported.default
    validateIconData(data, name)
    if (!inventory.has(data)) throw new Error('Icon missing from Lucide export index: ' + file)
    icons[name] = data
  }
  const collected = new Set(Object.values(icons))
  if (
    inventory.size !== collected.size ||
    [...inventory].some((data) => !collected.has(/** @type {IconData} */ (data)))
  )
    throw new Error('Partial Lucide icon extraction; refusing to generate')
  for (const [name, data] of Object.entries(RETAINED_ICONS)) {
    if (Object.hasOwn(icons, name) && JSON.stringify(icons[name]) !== JSON.stringify(data)) {
      throw new Error('Retained Core 3 glyph conflicts with installed Lucide: ' + name)
    }
    icons[name] = data
  }
  return Object.fromEntries(
    Object.keys(icons)
      .sort()
      .map((name) => [name, icons[name]]),
  )
}

/**
 * Protect any additional retained glyph from accidental removal by a writer.
 * Parse the declaration structurally; never execute an artifact as generator input.
 * @param {string} source
 * @param {IconCatalog} icons
 */
function assertNoRemovedGlyphs(source, icons) {
  const ast = ts.createSourceFile(OUTPUT_FILE, source, ts.ScriptTarget.Latest, true)
  const declarations = ast.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [],
  )
  const declaration = declarations.find(
    (entry) => ts.isIdentifier(entry.name) && entry.name.text === 'lucideIcons',
  )
  if (!declaration?.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
    throw new Error('Cannot inspect existing lucideIcons declaration; refusing to overwrite')
  }
  const names = declaration.initializer.properties.map((property) => {
    if (
      !ts.isPropertyAssignment(property) ||
      !(ts.isStringLiteral(property.name) || ts.isIdentifier(property.name))
    )
      throw new Error('Cannot inspect existing glyph name; refusing to overwrite')
    return property.name.text
  })
  const removed = names.filter((name) => !Object.hasOwn(icons, name))
  if (removed.length > 0) throw new Error('Unaccounted retained glyphs: ' + removed.join(', '))
}

/** @param {IconCatalog} icons @returns {string} */
function renderSource(icons) {
  return `/**
 * Lucide Icons Data
 *
 * Auto-generated from lucide package.
 * Do not edit manually.
 *
 * Total icons: ${Object.keys(icons).length}
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

export const lucideIcons: Record<string, IconData> = ${JSON.stringify(icons, null, 2)}\n\n/**
 * Get icon data by name
 */
// Common icon name aliases (old name -> new lucide name)
const iconAliases: Record<string, string> = {
  home: 'house',
  'plus-square': 'square-plus',
  'minus-square': 'square-minus',
  'x-square': 'square-x',
  'check-square': 'square-check',
  edit: 'pencil',
  'edit-2': 'pencil',
  'edit-3': 'pencil-line',
  trash: 'trash-2',
  delete: 'trash-2',
  close: 'x',
  menu: 'menu',
  hamburger: 'menu',
  dots: 'more-horizontal',
  'dots-vertical': 'more-vertical',
  cog: 'settings',
  gear: 'settings',
}

export function getIconData(name: string): IconData | undefined {
  // Try exact match first
  if (lucideIcons[name]) {
    return lucideIcons[name]
  }

  // Try alias lookup
  if (iconAliases[name] && lucideIcons[iconAliases[name]]) {
    return lucideIcons[iconAliases[name]]
  }

  // Try converting camelCase to kebab-case
  const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  if (lucideIcons[kebabName]) {
    return lucideIcons[kebabName]
  }

  // Try alias with kebab-case
  if (iconAliases[kebabName] && lucideIcons[iconAliases[kebabName]]) {
    return lucideIcons[iconAliases[kebabName]]
  }

  // Try converting kebab-case to exact icon name format
  return undefined
}

/**
 * Render icon data to SVG string
 */
export function renderIconSvg(
  data: IconData,
  _size: number = 24, // size is now controlled by CSS, this param is kept for API compatibility
  strokeWidth: number = 2,
  className: string = '',
  styleAttr: string = '', // Optional inline style for custom px sizes
): string {
  const elements = data
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([key, value]) => \`\${key}="\${value}"\`)
        .join(' ')
      return \`<\${tag} \${attrStr} />\`
    })
    .join('')

  // Size is controlled by CSS classes (.wf-icon-xs, .wf-icon-sm, etc.)
  // or inline style for custom px sizes
  // This ensures CSS rules can override the size reliably
  // (especially important in VSCode markdown preview's foreignObject environment)
  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="\${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="\${className}"\${styleAttr}>\${elements}</svg>\`
}
`
}

/**
 * @param {{ check?: boolean, outputFile?: string, iconsDir?: string }} [options]
 * @returns {Promise<{count: number, changed: boolean}>}
 */
async function run({ check = false, outputFile = OUTPUT_FILE, iconsDir } = {}) {
  const icons = await loadIcons(iconsDir)
  const { formatGeneratedSource } = await import('./format-generated.mjs')
  const generated = await formatGeneratedSource(renderSource(icons), outputFile)
  const current = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf8') : undefined
  if (check) {
    if (current !== generated)
      throw new Error(
        'Generated icons are missing or stale; run pnpm --filter @wireweave/core build:icons',
      )
    return { count: Object.keys(icons).length, changed: false }
  }
  if (current !== undefined) assertNoRemovedGlyphs(current, icons)
  if (current !== generated) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true })
    fs.writeFileSync(outputFile, generated)
  }
  return { count: Object.keys(icons).length, changed: current !== generated }
}

module.exports = { loadIcons, validateIconData, assertNoRemovedGlyphs, run }

if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    console.error('usage: node scripts/generate-icons.cjs [--check]')
    process.exitCode = 1
  } else {
    run({ check: args[0] === '--check' })
      .then(({ count, changed }) =>
        console.log(
          (args[0] === '--check' ? 'Checked' : changed ? 'Generated' : 'Unchanged') +
            ' ' +
            count +
            ' icons: ' +
            OUTPUT_FILE,
        ),
      )
      .catch((error) => {
        console.error(
          '[generate-icons] ' + (error instanceof Error ? error.message : String(error)),
        )
        process.exitCode = 1
      })
  }
}
