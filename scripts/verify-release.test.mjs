import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { verificationPlan, verificationScope, verifyRelease } from './verify-release.mjs'
import { runCommand, withTemporaryConsumer } from './mcp-package-smoke.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const core = {
  name: '@wireweave/core',
  manifest: {
    exports: { '.': './dist/index.js', './spec': './dist/spec.js' },
    scripts: {
      'check:parser-sync': 'node scripts/check-generated-parser.mjs',
      'check:spec-sync': 'node scripts/check-generated-spec.mjs',
      'check:icons-sync': 'node scripts/check-generated-icons.mjs',
      'check:icon-names-sync': 'node scripts/check-generated-icon-names.mjs',
    },
  },
}
const packages = [core, { name: '@wireweave/mcp-server' }, { name: '@wireweave/sdk' }]
const smokeEvidence = { schemaVersion: 1, ok: true, version: '1.2.3', toolCount: 32 }
const artifactEvidence = (scope) =>
  scope.map((pkg) => {
    const files = [{ path: 'package.json', size: 1, mode: 0o644, sha256: 'f'.repeat(64) }]
    return {
      name: pkg.name,
      version: '1.2.3',
      normalization: 'dependency-map-order-v1',
      files,
      contentSha256: createHash('sha256').update(JSON.stringify(files)).digest('hex'),
      integrity: `sha512-${'A'.repeat(86)}==`,
    }
  })
const outputFor = (step, scope = packages) => {
  if (step.id === 'installed-mcp') return JSON.stringify(smokeEvidence)
  if (step.id === 'release-artifacts') return JSON.stringify(artifactEvidence(scope))
  return 'fixture check passed\n'
}
const publish = readFileSync(join(ROOT, '.github/workflows/publish.yml'), 'utf8')
const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8')

test('all release checks run once, generated sources precede build, and artifact checks follow it', () => {
  const plan = verificationPlan(packages)
  const ids = plan.map((step) => step.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of [
    'tool-catalog',
    'generated-parser',
    'generated-spec',
    'generated-icons',
    'generated-icon-names',
  ]) {
    assert.ok(ids.indexOf(id) < ids.indexOf('build'))
  }
  for (const id of [
    'syntax',
    'generated-artifacts',
    'dist-freshness',
    'typecheck',
    'lint',
    'format',
    'tests',
    'dependency-audit',
    'packaging-coverage',
    'tarballs',
    'side-effects',
    'release-artifacts',
    'installed-mcp',
  ]) {
    assert.ok(ids.indexOf(id) > ids.indexOf('build'), `${id} must follow build`)
  }
  assert.equal(ids.at(-1), 'installed-mcp')
  assert.deepEqual(plan.find((step) => step.id === 'dependency-audit').args, [
    'audit',
    '--audit-level',
    'low',
  ])
  assert.deepEqual(
    plan.filter((step) => step.args.includes('test')).map((step) => step.args),
    [['run', 'test']],
  )
  assert.ok(
    plan.every(
      (step) =>
        !step.args.includes('test:gates') &&
        !step.args.includes('release:verify') &&
        !step.args.includes('publish'),
    ),
  )
  const root = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert.equal(root.scripts.test.match(/test:gates/g)?.length, 1)
  assert.doesNotMatch(root.scripts['test:gates'], /release:verify|verify-release\.mjs(?:\s|$)/)
})

test('publint coverage follows every published package and fails on empty or duplicate scope', () => {
  const plan = verificationPlan([...packages, { name: '@wireweave/new-package' }])
  assert.equal(plan.filter((step) => step.id.startsWith('publint:')).length, 4)
  assert.throws(() => verificationPlan([]), /coverage would be empty/)
  assert.throws(() => verificationPlan([packages[0], packages[0]]), /Duplicate packages/)
})

test('Core sync coverage comes from every declared owner check in deterministic order', () => {
  const extended = {
    ...core,
    manifest: {
      ...core.manifest,
      scripts: { ...core.manifest.scripts, 'check:additional-sync': 'node scripts/additional.mjs' },
    },
  }
  const scope = verificationScope([extended])
  assert.deepEqual(scope.coreSyncChecks, Object.keys(extended.manifest.scripts).sort())
  assert.deepEqual(
    verificationPlan([extended])
      .filter((step) => step.id.startsWith('generated-') && step.id !== 'generated-artifacts')
      .map((step) => step.args.at(-1)),
    scope.coreSyncChecks,
  )
  assert.equal(scope.generatedArtifacts.profile, 'spec-generated-convention')
  assert.equal(scope.generatedArtifacts.postBuildGate, 'scripts/generated-artifacts-gate.mjs')
})

test('Core 3 explicitly uses mandatory parser/icons owner coverage without the Core 4 convention gate', async () => {
  const stable = {
    ...core,
    manifest: {
      exports: { '.': './dist/index.js' },
      scripts: { 'check:icons-sync': 'node icons.mjs', 'check:parser-sync': 'node parser.mjs' },
    },
  }
  const report = await verifyRelease({
    packages: [stable],
    execute: async (step) => outputFor(step, [stable]),
  })
  assert.equal(report.ok, true)
  assert.deepEqual(report.scope.coreSyncChecks, ['check:icons-sync', 'check:parser-sync'])
  assert.equal(report.scope.generatedArtifacts.profile, 'parser-icons-owner-checks')
  assert.equal(report.scope.generatedArtifacts.postBuildGate, null)
  const ids = report.steps.map((step) => step.id)
  assert.ok(!ids.includes('generated-artifacts') && !ids.includes('syntax'))
  for (const id of ['generated-parser', 'generated-icons'])
    assert.ok(ids.indexOf(id) < ids.indexOf('build'))
})

test('published exports, not development exports or filesystem presence, select the artifact scheme', () => {
  const packageWith = (exports, publishedExports) => ({
    ...core,
    manifest: { ...core.manifest, exports, publishConfig: { exports: publishedExports } },
  })
  assert.equal(
    verificationScope([packageWith({ '.': './src/index.ts' }, core.manifest.exports)])
      .generatedArtifacts.profile,
    'spec-generated-convention',
  )
  assert.equal(
    verificationScope([packageWith(core.manifest.exports, { '.': './dist/index.js' })])
      .generatedArtifacts.profile,
    'parser-icons-owner-checks',
  )
})

test('missing Core, empty coverage, missing mandatory checks and empty commands fail closed', () => {
  assert.throws(() => verificationPlan(packages.slice(1)), /Published Core manifest is required/)
  for (const [manifest, message] of [
    [{ ...core.manifest, scripts: {} }, /coverage would be empty/],
    [
      { ...core.manifest, scripts: { 'check:icons-sync': 'node icons.mjs' } },
      /must declare check:parser-sync/,
    ],
    [
      { exports: { '.': './dist/index.js' }, scripts: { 'check:parser-sync': 'node parser.mjs' } },
      /must declare check:icons-sync/,
    ],
    [
      { ...core.manifest, scripts: { ...core.manifest.scripts, 'check:spec-sync': '' } },
      /Empty Core check/,
    ],
    [{ scripts: core.manifest.scripts }, /Core public exports are required/],
  ])
    assert.throws(() => verificationPlan([{ ...core, manifest }]), message)
})

test('complete evidence records exact commands, hashes, revision, tree and installed package result', async () => {
  await withTemporaryConsumer(async (scratch) => {
    const reportPath = join(scratch, 'release.json')
    const calls = []
    const report = await verifyRelease({
      packages,
      reportPath,
      revision: 'commit',
      verifiedTree: 'tree',
      execute: async (step) => {
        calls.push(step.id)
        return outputFor(step)
      },
    })
    assert.deepEqual(
      calls,
      verificationPlan(packages).map((step) => step.id),
    )
    assert.equal(report.ok, true)
    assert.equal(report.revision, 'commit')
    assert.equal(report.verifiedTree, 'tree')
    assert.deepEqual(report.scope, verificationScope(packages))
    assert.deepEqual(report.installedMcp, smokeEvidence)
    assert.deepEqual(report.releaseArtifacts, artifactEvidence(packages))
    assert.ok(report.steps.every((step) => step.ok && /^[a-f0-9]{64}$/.test(step.outputSha256)))
    assert.deepEqual(JSON.parse(readFileSync(reportPath, 'utf8')), report)
  })
})

for (const failure of verificationPlan(packages)) {
  test(`failure at ${failure.id} prevents every later release check`, async () => {
    const called = []
    await assert.rejects(
      verifyRelease({
        packages,
        execute: async (step) => {
          called.push(step.id)
          if (step.id === failure.id) throw new Error('injected failure')
          return outputFor(step)
        },
      }),
      new RegExp(`failed at ${failure.id}`),
    )
    assert.equal(called.at(-1), failure.id)
    assert.equal(
      called.length,
      verificationPlan(packages).findIndex((step) => step.id === failure.id) + 1,
    )
  })
}

test('failed checks preserve failure evidence and malformed MCP evidence cannot pass', async () => {
  await withTemporaryConsumer(async (scratch) => {
    const reportPath = join(scratch, 'failed.json')
    await assert.rejects(
      verifyRelease({
        packages,
        reportPath,
        execute: async () => {
          throw new Error('failed audit fixture')
        },
      }),
    )
    const report = JSON.parse(readFileSync(reportPath, 'utf8'))
    assert.equal(report.ok, false)
    assert.equal(report.steps[0].ok, false)
  })
  for (const evidence of [
    'not json',
    '{}',
    JSON.stringify({ ...smokeEvidence, ok: false }),
    JSON.stringify({ ...smokeEvidence, toolCount: 0 }),
  ]) {
    await assert.rejects(
      verifyRelease({
        packages,
        execute: async (step) => (step.id === 'installed-mcp' ? evidence : outputFor(step)),
      }),
      /failed at installed-mcp/,
    )
  }
})

test('recursive CLI execution fails before running commands', async () => {
  await assert.rejects(
    runCommand(process.execPath, ['scripts/verify-release.mjs'], {
      cwd: ROOT,
      env: { PATH: process.env.PATH, WIREWEAVE_RELEASE_VERIFY_ACTIVE: '1' },
    }),
    /Recursive release verification/,
  )
})

function stepBody(name) {
  const lines = publish.split('\n')
  const start = lines.indexOf(`      - name: ${name}`)
  assert.ok(start >= 0, `Missing workflow step ${name}`)
  const following = lines.findIndex(
    (line, index) => index > start && line.startsWith('      - name:'),
  )
  const block = lines.slice(start, following < 0 ? lines.length : following)
  const run = block.indexOf('        run: |')
  assert.ok(run >= 0, `Missing shell body for ${name}`)
  return block
    .slice(run + 1)
    .map((line) => line.slice(10))
    .join('\n')
}

test('both workflows share release verification and publish preserves branch/OIDC policy', () => {
  for (const workflow of [ci, publish]) {
    assert.equal(workflow.match(/run: pnpm release:verify /g)?.length, 1)
    assert.match(workflow, /if: always\(\)/)
    assert.match(workflow, /include-hidden-files: true/)
    assert.match(workflow, /node-version-file: \.nvmrc/)
  }
  const order = [
    'Prepare versioned tree',
    'Verify exact versioned tree',
    'Commit verified versions and push without rebasing',
    'Bind publication intent to verified artifacts',
    'Preserve immutable intent before publication',
    'Publish verified packages',
    'Verify registry content and release channels',
    'Recover exact release tags without rewriting history',
    'Verify published MCP exact version',
    'Sync released main into develop',
  ]
  const positions = order.map((name) => publish.indexOf(`- name: ${name}`))
  assert.ok(
    positions.every(
      (position, index) => position >= 0 && (!index || position > positions[index - 1]),
    ),
  )
  assert.match(publish, /branches: \[main, develop\]/)
  assert.match(publish, /id-token: write/)
  assert.match(publish, /NPM_CONFIG_PROVENANCE: 'true'/)
  assert.match(stepBody('Prepare versioned tree'), /changeset pre enter beta/)
  assert.doesNotMatch(stepBody('Prepare versioned tree'), /changeset pre exit/)
  assert.match(stepBody('Prepare versioned tree'), /release-registry\.mjs policy/)
  assert.match(stepBody('Publish verified packages'), /release-registry\.mjs recheck/)
  assert.match(
    stepBody('Verify published MCP exact version'),
    /release-registry\.mjs smoke .*--registry-proof/,
  )
  assert.match(publish, /pnpm_config_ignore_scripts: 'true'/)
  assert.doesNotMatch(publish, /git pull|--rebase|--ours|--theirs|git rm|--force|continue-on-error/)
  assert.match(stepBody('Commit verified versions and push without rebasing'), /git write-tree/)
  assert.match(stepBody('Publish verified packages'), /HEAD\^\{tree\}/)
})

// Exercise the actual workflow shell with Git/pnpm replaced by deterministic
// functions. These tests never call a remote, change Git state, or publish.
const shellFixture = `
git() {
  case "$1" in
    rev-parse) if [ "$2" = HEAD ]; then echo "$FIXTURE_HEAD"; else echo "$FIXTURE_TREE"; fi ;;
    write-tree) echo "$FIXTURE_TREE" ;;
    status) if [ "$FIXTURE_DIRTY" = 1 ]; then echo ' M fixture'; fi ;;
    diff) if [ "$FIXTURE_DIRTY" = 1 ]; then return 1; fi ;;
    ls-files|remote|fetch|checkout) : ;;
    ls-remote) printf '%s\\trefs/heads/develop\\n' "$FIXTURE_REMOTE" ;;
    push) echo PUSH_ATTEMPT; return "$FIXTURE_PUSH_STATUS" ;;
    merge) return "$FIXTURE_MERGE_STATUS" ;;
    commit) echo COMMIT_ATTEMPT ;;
    *) echo 'unexpected Git command' >&2; return 90 ;;
  esac
}
pnpm() { echo PUBLISH_CALLED; }
node() { if [ "$FIXTURE_RECHECK_STATUS" = 1 ]; then return 1; fi; }
`

function runWorkflowStep(name, overrides = {}) {
  return runCommand('bash', ['-e', '-o', 'pipefail', '-c', shellFixture + stepBody(name)], {
    env: {
      PATH: process.env.PATH,
      GITHUB_REF_NAME: 'develop',
      GITHUB_SHA: 'commit',
      RELEASE_SHA: 'commit',
      VERIFIED_TREE: 'tree',
      FIXTURE_HEAD: 'commit',
      FIXTURE_TREE: 'tree',
      FIXTURE_REMOTE: 'commit',
      FIXTURE_DIRTY: '0',
      FIXTURE_PUSH_STATUS: '0',
      FIXTURE_MERGE_STATUS: '0',
      FIXTURE_RECHECK_STATUS: '0',
      ...overrides,
    },
  })
}

test('unchanged verified tree reaches publication', async () => {
  assert.match(await runWorkflowStep('Publish verified packages'), /PUBLISH_CALLED/)
})

for (const overrides of [
  { FIXTURE_REMOTE: 'advanced' },
  { FIXTURE_HEAD: 'different' },
  { FIXTURE_TREE: 'changed' },
  { FIXTURE_DIRTY: '1' },
  { FIXTURE_RECHECK_STATUS: '1' },
]) {
  test(`publication fails closed for ${JSON.stringify(overrides)}`, async () => {
    await assert.rejects(
      runWorkflowStep('Publish verified packages', overrides),
      (error) => !error.message.includes('PUBLISH_CALLED'),
    )
  })
}

test('a branch race stops version commit and a rejected push never retries', async () => {
  const step = 'Commit verified versions and push without rebasing'
  await assert.rejects(
    runWorkflowStep(step, { FIXTURE_REMOTE: 'advanced' }),
    (error) => !/COMMIT_ATTEMPT|PUSH_ATTEMPT/.test(error.message),
  )
  await assert.rejects(
    runWorkflowStep(step, { FIXTURE_PUSH_STATUS: '1' }),
    (error) => error.message.match(/PUSH_ATTEMPT/g)?.length === 1,
  )
})

test('sync conflicts stop before push without choosing file contents', async () => {
  await assert.rejects(
    runWorkflowStep('Sync released main into develop', { FIXTURE_MERGE_STATUS: '1' }),
    (error) =>
      error.message.includes('manual resolution') && !error.message.includes('PUSH_ATTEMPT'),
  )
})
