import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'

import { publishedPackages } from './published-packages.mjs'

test('package scripts cannot bypass the verified OIDC publication workflow', () => {
  const root = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  for (const manifest of [root, ...publishedPackages().map((pkg) => pkg.manifest)]) {
    for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
      assert.doesNotMatch(
        command,
        /\b(?:changeset|npm|pnpm)\s+publish\b|\brelease-it\b/,
        `${manifest.name} script ${name} bypasses the publication workflow`,
      )
    }
  }
  assert.equal(root.scripts['release:verify'], 'node scripts/verify-release.mjs')
})
