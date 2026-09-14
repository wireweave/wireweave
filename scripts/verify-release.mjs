// One verification contract for pull requests and the versioned release tree.
// This orchestrates existing checks; it never versions, commits, or publishes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

import { publishedPackages } from './published-packages.mjs'
import { runCommand } from './mcp-package-smoke.mjs'
import { validateArtifacts } from './release-registry.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

export function verificationScope(packages) {
  assert.ok(packages.length > 0, 'No publishable packages: release coverage would be empty')
  assert.equal(new Set(packages.map((pkg) => pkg.name)).size, packages.length, 'Duplicate packages')
  const core = packages.find((pkg) => pkg.name === '@wireweave/core')
  assert.ok(core?.manifest, 'Published Core manifest is required to select release coverage')
  const scripts = core.manifest.scripts ?? {}
  const coreSyncChecks = Object.keys(scripts)
    .filter((name) => /^check:.+-sync$/.test(name))
    .sort()
  assert.ok(coreSyncChecks.length > 0, 'Core generated-source coverage would be empty')
  assert.ok(coreSyncChecks.includes('check:parser-sync'), 'Core must declare check:parser-sync')
  for (const name of coreSyncChecks) {
    assert.ok(
      typeof scripts[name] === 'string' && scripts[name].trim(),
      `Empty Core check: ${name}`,
    )
  }
  const exports = core.manifest.publishConfig?.exports ?? core.manifest.exports
  assert.ok(
    exports && typeof exports === 'object' && !Array.isArray(exports),
    'Core public exports are required',
  )
  const hasSpec = Object.hasOwn(exports, './spec') && exports['./spec'] !== null
  if (!hasSpec) {
    assert.ok(
      coreSyncChecks.includes('check:icons-sync'),
      'Core without public ./spec must declare check:icons-sync',
    )
  }
  return {
    coreSyncChecks,
    generatedArtifacts: {
      profile: hasSpec ? 'spec-generated-convention' : 'parser-icons-owner-checks',
      basis: hasSpec
        ? 'Core publishes ./spec'
        : 'Core has no public ./spec; parser and icons owner checks are mandatory',
      postBuildGate: hasSpec ? 'scripts/generated-artifacts-gate.mjs' : null,
    },
  }
}

export function verificationPlan(packages) {
  const scope = verificationScope(packages)
  const pnpm = (id, ...args) => ({ id, command: 'pnpm', args })
  const node = (id, ...args) => ({ id, command: process.execPath, args })
  return [
    pnpm('tool-catalog', 'run', 'tool-catalog:check'),
    // Build rewrites these committed files, so staleness must be checked first.
    ...scope.coreSyncChecks.map((name) =>
      pnpm(
        `generated-${name.slice('check:'.length, -'-sync'.length)}`,
        '--filter',
        '@wireweave/core',
        'run',
        name,
      ),
    ),
    pnpm('build', 'run', 'build'),
    ...(scope.generatedArtifacts.postBuildGate
      ? [
          pnpm('syntax', '-r', '--if-present', 'run', 'build:syntax'),
          node('generated-artifacts', scope.generatedArtifacts.postBuildGate),
        ]
      : []),
    pnpm('dist-freshness', 'run', 'dist:check'),
    pnpm('typecheck', 'run', 'typecheck'),
    pnpm('lint', 'run', 'lint'),
    pnpm('format', 'run', 'format:check'),
    // Root test owns test:gates exactly once; do not run that suite again here.
    pnpm('tests', 'run', 'test'),
    pnpm('dependency-audit', 'audit', '--audit-level', 'low'),
    node('packaging-coverage', 'scripts/packaging-gate.mjs', '--check'),
    ...[...packages]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((pkg) => pnpm(`publint:${pkg.name}`, '--filter', pkg.name, 'run', 'publint')),
    pnpm('tarballs', 'run', 'tarball:check'),
    pnpm('side-effects', 'run', 'sideeffects:check'),
    node('release-artifacts', 'scripts/release-registry.mjs', 'capture'),
    pnpm('installed-mcp', '--silent', 'run', 'mcp:smoke'),
  ]
}

export async function verifyRelease({
  packages,
  execute,
  reportPath,
  revision = null,
  verifiedTree = null,
  progress = () => {},
}) {
  const plan = verificationPlan(packages)
  const report = {
    schemaVersion: 1,
    ok: false,
    node: process.version,
    revision,
    verifiedTree,
    scope: verificationScope(packages),
    steps: [],
  }
  const save = () => {
    if (!reportPath) return
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }
  save()
  for (const step of plan) {
    const started = Date.now()
    progress('start', step)
    try {
      const output = await execute(step)
      if (step.id === 'release-artifacts') {
        const artifacts = JSON.parse(output)
        validateArtifacts(artifacts)
        assert.deepEqual(
          artifacts.map((a) => a.name).sort(),
          packages.map((pkg) => pkg.name).sort(),
          'Incomplete release artifact scope',
        )
        report.releaseArtifacts = artifacts
      }
      if (step.id === 'installed-mcp') {
        const evidence = JSON.parse(output)
        assert.equal(evidence.schemaVersion, 1, 'Unknown MCP smoke evidence schema')
        assert.equal(evidence.ok, true, 'Installed MCP smoke did not pass')
        assert.ok(
          evidence.toolCount > 0 && typeof evidence.version === 'string',
          'Empty MCP smoke evidence',
        )
        report.installedMcp = evidence
      }
      report.steps.push({
        ...step,
        ok: true,
        elapsedMs: Date.now() - started,
        outputSha256: sha256(output),
      })
      progress('pass', step, output)
    } catch (error) {
      report.steps.push({
        ...step,
        ok: false,
        elapsedMs: Date.now() - started,
        error: error.message,
      })
      save()
      throw new Error(`Release verification failed at ${step.id}: ${error.message}`, {
        cause: error,
      })
    }
    save()
  }
  report.ok = true
  save()
  return report
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const controller = new globalThis.AbortController()
  const interrupt = () => controller.abort()
  process.once('SIGINT', interrupt)
  process.once('SIGTERM', interrupt)
  try {
    assert.notEqual(
      process.env.WIREWEAVE_RELEASE_VERIFY_ACTIVE,
      '1',
      'Recursive release verification is forbidden',
    )
    assert.equal(resolve(process.cwd()), ROOT, `Run from repository root: ${ROOT}`)
    const { values } = parseArgs({
      options: {
        report: { type: 'string', default: '.local/release-evidence/verification.json' },
        help: { type: 'boolean', short: 'h' },
      },
    })
    if (values.help) {
      console.log(
        'Usage: node scripts/verify-release.mjs [--report .local/release-evidence/verification.json]\nRebuilds and verifies the current versioned tree. Does not commit or publish.',
      )
    } else {
      const env = { ...process.env, WIREWEAVE_RELEASE_VERIFY_ACTIVE: '1' }
      const revision = (
        await runCommand('git', ['rev-parse', 'HEAD'], { cwd: ROOT, signal: controller.signal })
      ).trim()
      await verifyRelease({
        packages: publishedPackages(),
        revision,
        verifiedTree: process.env.WIREWEAVE_TESTED_TREE ?? null,
        reportPath: resolve(values.report),
        execute: (step) =>
          runCommand(step.command, step.args, {
            cwd: ROOT,
            env,
            timeoutMs: 900000,
            signal: controller.signal,
          }),
        progress: (phase, step, output) => {
          console.log(`[release:verify] ${phase}: ${step.id}`)
          if (output) process.stdout.write(output)
        },
      })
      console.log(`[release:verify] All checks passed. Evidence: ${values.report}`)
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    process.removeListener('SIGINT', interrupt)
    process.removeListener('SIGTERM', interrupt)
  }
}
