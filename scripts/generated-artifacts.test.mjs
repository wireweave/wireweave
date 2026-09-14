import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath, URL } from 'node:url'
import { compileFunction } from 'node:vm'

const gatePath = fileURLToPath(new URL('./generated-artifacts-gate.mjs', import.meta.url))
const source = readFileSync(gatePath, 'utf8')
const importStatement = "import { execFileSync } from 'node:child_process'"
assert.equal(
  source.split(importStatement).length,
  2,
  'The executable Git boundary must be explicit',
)
// Execute the production gate, replacing only process/console and the Git seam.
// Fixtures never initialize repositories, stage files, create commits or mutate HEAD.
const execute = compileFunction(
  source.replace(importStatement, ''),
  ['execFileSync', 'process', 'console'],
  { filename: gatePath },
)
const artifact = 'packages/example/catalog.generated.json'
const queries = [
  'ls-files',
  'ls-files --others --exclude-standard',
  'ls-files --others --ignored --exclude-standard',
  'status --porcelain=v1',
]

function runGate({ tracked = [artifact], untracked = [], ignored = [], changed = [] } = {}) {
  const outputs = [tracked, untracked, ignored, changed]
  const calls = []
  const stdout = []
  const stderr = []
  const stopped = {}
  let status = 0
  try {
    execute(
      (command, args) => {
        assert.equal(command, 'git')
        const separator = args.indexOf('--')
        assert.ok(separator > 0)
        assert.equal(args.slice(0, separator).join(' '), queries[calls.length])
        calls.push(args.slice(separator + 1))
        // Git can leak an ignored nested repository regardless of pathspec.
        // Deliberately return it verbatim so the production boundary is tested.
        return outputs[calls.length - 1].join('\n') + '\n'
      },
      {
        exit(code) {
          status = code
          throw stopped
        },
      },
      { log: (text) => stdout.push(text), error: (text) => stderr.push(text) },
    )
  } catch (error) {
    if (error !== stopped) throw error
  }
  assert.equal(calls.length, 4, 'Every artifact state must be observed')
  return { status, stdout: stdout.join('\n'), stderr: stderr.join('\n'), scopes: calls }
}

test('fresh tracked artifacts pass and all queries exclude only the root disposable directory', () => {
  const result = runGate()
  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.match(result.stdout, /1 generated artifact\(s\) tracked and in sync/)
  assert.ok(result.stdout.includes(artifact))
  for (const scope of result.scopes) {
    assert.ok(scope.includes('*.generated.*'))
    assert.ok(scope.includes(':(top,exclude).local/**'))
    assert.ok(scope.includes(':!*node_modules/*'))
    assert.ok(scope.includes(':!*/dist/*'))
    assert.ok(scope.includes(':!dist/*'))
  }
})

test('an empty fixture fails instead of producing a vacuous success', () => {
  const result = runGate({ tracked: [] })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /No files matched the generated-artifact convention/)
  assert.equal(result.stdout, '')
})

test('temporary nested repositories and local artifacts cannot pollute the observation scope', () => {
  const result = runGate({
    tracked: [artifact, '.local/cache/catalog.generated.json'],
    untracked: ['.local/screenshots/demo.generated.svg'],
    ignored: ['.local/releases/stable/', '".local/releases/quoted\\tworktree/"'],
  })
  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
  assert.match(result.stdout, /1 generated artifact\(s\) tracked and in sync/)
  assert.doesNotMatch(result.stdout, /\.local/)
})

test('only local temporary output still counts as empty coverage and fails', () => {
  const result = runGate({
    tracked: ['.local/cache/catalog.generated.json'],
    ignored: ['.local/releases/stable/'],
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /No files matched/)
  assert.equal(result.stdout, '')
})

test('untracked real generated files still fail alongside a temporary worktree', () => {
  const result = runGate({ untracked: [artifact], ignored: ['.local/releases/stable/'] })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Generated artifacts are not tracked by git/)
  assert.ok(result.stderr.includes(artifact))
  assert.equal(result.stdout, '')
})

for (const path of [
  artifact,
  '.local-tools/catalog.generated.json',
  '.local.generated.json',
  'packages/example/.local/catalog.generated.json',
  'packages/ignored-nested-repository/',
]) {
  test(`ignored in-scope output still fails: ${path}`, () => {
    const result = runGate({ ignored: [path, '.local/releases/stable/'] })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Generated artifacts are excluded by .gitignore/)
    assert.ok(result.stderr.includes(path))
    assert.doesNotMatch(result.stderr, /\.local\/releases\/stable/)
    assert.equal(result.stdout, '')
  })
}

for (const status of [' M', 'M ', ' D', 'D ']) {
  test(`tracked artifacts retain the ${JSON.stringify(status)} failure guard`, () => {
    const result = runGate({ changed: [`${status} ${artifact}`] })
    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      status.includes('D') ? /missing from the working tree/ : /are stale/,
    )
    assert.ok(result.stderr.includes(artifact))
    assert.equal(result.stdout, '')
  })
}

test('a Git failure propagates instead of passing without evidence', () => {
  const failure = new Error('Git cannot read the index')
  assert.throws(
    () =>
      execute(
        () => {
          throw failure
        },
        {
          exit() {
            assert.fail('Unexpected exit')
          },
        },
        {
          log() {
            assert.fail('Unexpected success')
          },
          error() {
            assert.fail('Unexpected reclassification')
          },
        },
      ),
    (error) => error === failure,
  )
})
