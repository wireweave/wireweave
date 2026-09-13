import { defineConfig } from 'vitepress'
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LanguageRegistration } from 'shiki'

const configDirectory = dirname(fileURLToPath(import.meta.url))
const specDirectory = resolve(configDirectory, '../spec')
const schema = JSON.parse(readFileSync(resolve(specDirectory, 'schema.json'), 'utf8')) as {
  'x-vocabulary': Record<string, { attributes: string[] }>
}
const generatedLanguage = JSON.parse(
  readFileSync(resolve(configDirectory, 'wireframe.tmLanguage.generated.json'), 'utf8'),
) as LanguageRegistration
const keywords = [
  ...Object.keys(schema['x-vocabulary']),
  'app',
  'module',
  'import',
  'export',
  'language',
  'layout',
  'component',
  'use',
  'fill',
  'slot',
  'repeat',
  'columns',
  'item',
  'group',
]
const attributes = [
  ...new Set(Object.values(schema['x-vocabulary']).flatMap((item) => item.attributes)),
]
const wireframeLanguage: LanguageRegistration = {
  ...generatedLanguage,
  aliases: ['wf', 'wire'],
  patterns: [
    { name: 'keyword.control.wireframe', match: `\\b(?:${keywords.join('|')})\\b` },
    {
      name: 'entity.other.attribute-name.wireframe',
      match: `\\b(?:${attributes.join('|')})(?=\\s*=)`,
    },
    ...generatedLanguage.patterns,
  ],
}
const downloads = ['language.ebnf', 'schema.json', 'examples.json']

export default defineConfig({
  title: 'Wireweave',
  description: 'Wireweave language 4.0: deterministic UI structure, behavior and neutral HTML.',
  lang: 'en',
  cleanUrls: true,
  srcExclude: [
    '**/CLAUDE.md',
    '**/README.md',
    '**/CHANGELOG.md',
    '**/TODO*.md',
    'guide/**',
    'reference/**',
    'releases/**',
    'mcp/**',
    'ko/**',
    'ja/**',
  ],
  // VitePress classifies .ebnf as an HTML page; admit only this real copied asset.
  ignoreDeadLinks: [
    (url) =>
      ['/spec/language.ebnf', './language.ebnf'].includes(url) &&
      statSync(resolve(specDirectory, 'language.ebnf')).isFile(),
  ],
  sitemap: { hostname: 'https://docs.wireweave.org' },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Wireweave language contracts' }],
    ['meta', { property: 'og:image', content: 'https://docs.wireweave.org/og-image.png' }],
  ],
  markdown: { languages: [wireframeLanguage] },
  themeConfig: {
    logo: '/logo.svg',
    outline: { level: [2, 3], label: 'On this page' },
    nav: [
      { text: 'Language 4.0', link: '/spec/LANGUAGE' },
      { text: 'Runtime', link: '/spec/RUNTIME' },
      { text: 'Tools', link: '/spec/TOOLING' },
    ],
    sidebar: [
      {
        text: 'Language contracts',
        items: [
          { text: 'Language and semantics', link: '/spec/LANGUAGE' },
          { text: 'Runtime and HTML', link: '/spec/RUNTIME' },
          { text: 'Tools and integrations', link: '/spec/TOOLING' },
        ],
      },
      {
        text: 'Machine-readable contracts',
        items: downloads.map((name) => ({ text: name, link: `/spec/${name}` })),
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/wireweave/wireweave' }],
    footer: { message: 'MIT licensed. Local search; no analytics or visitor tracking.' },
    search: { provider: 'local' },
  },
  buildEnd(site) {
    const outputDirectory = resolve(site.outDir, 'spec')
    mkdirSync(outputDirectory, { recursive: true })
    for (const name of downloads) {
      copyFileSync(resolve(specDirectory, name), resolve(outputDirectory, name))
    }
  },
})
