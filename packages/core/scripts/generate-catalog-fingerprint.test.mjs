import assert from 'node:assert/strict'
import { test } from 'node:test'

import { canonicalCatalogJson } from './generate-catalog-fingerprint.mjs'

await test('sorts object keys while preserving catalog array order and description bytes', () => {
  const first = { title: '한글 e\u0301', values: ['b', 'a'] }
  const second = { values: ['b', 'a'], title: first.title }
  assert.equal(canonicalCatalogJson(first), '{"title":"한글 e\u0301","values":["b","a"]}')
  assert.equal(canonicalCatalogJson(first), canonicalCatalogJson(second))
  assert.notEqual(
    canonicalCatalogJson(first),
    canonicalCatalogJson({ ...first, values: ['a', 'b'] }),
  )
  assert.notEqual(canonicalCatalogJson(first), canonicalCatalogJson({ ...first, title: '한글 é' }))
  assert.equal(
    canonicalCatalogJson([first, first]),
    `[${canonicalCatalogJson(first)},${canonicalCatalogJson(first)}]`,
  )
})

await test('rejects values that ordinary JSON serialization could drop or coerce', () => {
  const cycle = {}
  cycle.self = cycle
  for (const value of [
    { attribute: undefined },
    [undefined],
    Array(1),
    [NaN],
    { value: Infinity },
    { [Symbol('field')]: 1 },
    { callback() {} },
    {
      get value() {
        return 1
      },
    },
    new Map(),
    1n,
    cycle,
  ]) {
    assert.throws(() => canonicalCatalogJson(value), /Non-JSON catalog value/)
  }
})
