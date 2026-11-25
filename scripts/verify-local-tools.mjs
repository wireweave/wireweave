#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(root, 'packages/cli/dist/index.js')
const [command = 'doctor', feature = 'all'] = process.argv.slice(2)
const features = ['parse', 'render', 'export', 'app', 'all']
assert.ok(process.argv.length <= 4, 'Unexpected command arguments')
assert.ok(
  ['doctor', 'drive'].includes(command),
  'Usage: verify-local-tools.mjs doctor|drive [parse|render|export|app|all]',
)
assert.ok(features.includes(feature), `Unknown feature: ${feature}`)

function execute(args, cwd = root) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  })
  if (result.error) throw result.error
  assert.equal(result.signal, null, `Command terminated by ${result.signal}`)
  return { args, status: result.status, stdout: result.stdout, stderr: result.stderr }
}

function doctor() {
  const required = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).engines.node
  const floor = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(required)
  assert.ok(floor, `Unsupported Node engine range: ${required}`)
  const actual = process.versions.node.split('.').map(Number)
  let comparison = 0
  for (let index = 0; index < actual.length && comparison === 0; index++) {
    comparison = actual[index] - Number(floor[index + 1])
  }
  assert.ok(comparison >= 0, `Node ${required} is required`)
  assert.ok(existsSync(cli), 'Missing built CLI; run pnpm install --frozen-lockfile and pnpm build')
  const freshness = execute([join(root, 'scripts/dist-freshness-gate.mjs'), '--check'])
  assert.equal(freshness.status, 0, freshness.stderr || freshness.stdout)
  const version = execute([cli, '--version'])
  assert.equal(version.status, 0, version.stderr)
  assert.ok(version.stdout.trim(), 'CLI did not report a version')
  return { node: process.version, cliVersion: version.stdout.trim(), freshness: freshness.stdout }
}

const health = doctor()
if (command === 'doctor') {
  console.log(JSON.stringify(health, null, 2))
} else {
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' })
  assert.equal(git.status, 0, 'Cannot identify source HEAD')
  const evidenceRoot = join(root, '.local/verification')
  mkdirSync(evidenceRoot, { recursive: true })
  const evidence = mkdtempSync(join(evidenceRoot, 'cli-'))
  const scratch = mkdtempSync(join(evidence, 'scratch-'))
  const transcript = []
  const report = {
    ok: false,
    feature,
    head: git.stdout.trim(),
    ...health,
    checks: [],
  }
  const run = (...args) => {
    const result = execute([cli, ...args], scratch)
    transcript.push(result)
    return result
  }
  const input = join(scratch, 'proof.wf')
  const source = 'page "Harness proof" { text "Saved proof" button "Continue" }\n'
  try {
    writeFileSync(input, source)
    writeFileSync(join(evidence, 'input.wf'), source)
    if (feature === 'parse' || feature === 'all') {
      const parsed = run('parse', input)
      assert.equal(parsed.status, 0, parsed.stderr)
      const payload = JSON.parse(parsed.stdout)
      assert.equal(payload.pageCount, 1)
      assert.equal(payload.ast.children[0].title, 'Harness proof')
      assert.equal(payload.ast.children[0].children[0].content, 'Saved proof')
      const invalid = join(scratch, 'invalid.wf')
      writeFileSync(invalid, 'page { ??? }\n')
      const rejected = run('parse', invalid)
      assert.equal(rejected.status, 1, 'Invalid DSL must be rejected')
      assert.match(rejected.stderr, /parse failed/)
      const valid = run('validate', input, '--strict')
      assert.equal(valid.status, 0, valid.stderr)
      assert.match(valid.stdout, /pages: 1/)
      writeFileSync(join(evidence, 'parsed.json'), parsed.stdout)
      report.checks.push('parse valid DSL, reject invalid DSL, strict validation')
    }
    if (feature === 'render' || feature === 'all') {
      const output = join(evidence, 'proof.html')
      const rendered = run('render', input, '--full-document', '-o', output)
      assert.equal(rendered.status, 0, rendered.stderr)
      const html = readFileSync(output, 'utf8')
      assert.match(html, /<!doctype html>/i)
      assert.match(html, /Saved proof/)
      assert.match(html, /<button\b[^>]*>[^]*?Continue/)
      report.checks.push('render complete HTML file containing authored content and button')
    }
    if (feature === 'export' || feature === 'all') {
      const output = join(evidence, 'export.json')
      const exported = run('export-json', input, '-o', output)
      assert.equal(exported.status, 0, exported.stderr)
      const payload = JSON.parse(readFileSync(output, 'utf8'))
      assert.equal(payload.success, true)
      assert.equal(payload.pages.length, 1)
      assert.equal(payload.pages[0].content, 'Harness proof')
      assert.equal(payload.pages[0].children[1].type, 'button')
      assert.equal(payload.pages[0].children[1].content, 'Continue')
      report.checks.push('export JSON file preserving page, text and button content')
    }
    if (feature === 'app' || feature === 'all') {
      const require = createRequire(join(root, 'packages/sdk/package.json'))
      const { parse, printV4Module } = require('@wireweave/core')
      const {
        createAppBundle,
        linkApp,
        compileApp,
        createRuntime,
        extractTransitions,
        reduceEvent,
      } = require('@wireweave/core/app')
      const corpus = JSON.parse(readFileSync(join(root, 'docs/spec/examples.json'), 'utf8'))
      const fixture = corpus.valid.find((item) => item.id === 'minimal-navigation')
      assert.ok(fixture, 'Canonical minimal-navigation fixture is required')
      writeFileSync(join(evidence, 'app.wf'), fixture.source)
      const parsed = parse(fixture.source, { languageVersion: '4.0.0', sourceId: 'app.wf' })
      const moduleOptions = { languageVersion: '4.0.0', sourceId: 'main.wf' }
      const module = parse(fixture.moduleSources.main, moduleOptions)
      const canonicalModule = printV4Module(module)
      const reparsedModule = parse(canonicalModule, moduleOptions)
      const { sourceDigest: _firstDigest, ...originalSemantics } = module.modules[0]
      const { sourceDigest: _secondDigest, ...printedSemantics } = reparsedModule.modules[0]
      assert.deepEqual(printedSemantics, originalSemantics)
      assert.equal(printV4Module(reparsedModule), canonicalModule)
      assert.throws(() => printV4Module(parsed), TypeError)
      report.checks.push('public Core 4 explicit module parse/print round-trip')
      const unwrap = (result) => {
        assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
        return result.value
      }
      const bundle = unwrap(
        createAppBundle([parsed], {
          id: parsed.app.id,
          entry: parsed.app.entry,
          profile: parsed.app.profile,
          states: parsed.states,
          registry: parsed.registry,
          fixtures: parsed.fixtures,
          moduleSources: fixture.moduleSources,
        }),
      )
      const linked = unwrap(linkApp(bundle))
      const artifact = unwrap(compileApp(linked))
      assert.equal(
        artifact.manifest.htmlDigest,
        `sha256:${createHash('sha256').update(artifact.html).digest('hex')}`,
      )
      assert.equal(
        unwrap(compileApp(linked)).html,
        artifact.html,
        'Repeated compilation must preserve bytes',
      )
      const initial = createRuntime(linked)
      assert.deepEqual(initial.route, { namespace: 'main', id: 'home' })
      const transitions = extractTransitions(linked)
      assert.equal(transitions.modelDigest, artifact.modelDigest)
      const transition = (id, target) => {
        const edge = transitions.edges.find((item) => item.source.identity.localId === id)
        assert.ok(edge, `Missing authored route operation: ${id}`)
        assert.deepEqual(edge.target, { kind: 'screen', route: target, history: 'push' })
        return edge.source.identity
      }
      const settings = reduceEvent(initial, {
        kind: 'event',
        source: transition('settingsLink', { namespace: 'main', id: 'settings' }),
        event: 'click',
      })
      assert.deepEqual(settings.route, { namespace: 'main', id: 'settings' })
      const returned = reduceEvent(settings, {
        kind: 'event',
        source: transition('homeLink', { namespace: 'main', id: 'home' }),
        event: 'click',
      })
      assert.deepEqual(returned.route, { namespace: 'main', id: 'home' })
      assert.deepEqual(
        initial.route,
        { namespace: 'main', id: 'home' },
        'Runtime input must not mutate prior state',
      )
      writeFileSync(join(evidence, 'app.html'), artifact.html)
      writeFileSync(
        join(evidence, 'app.json'),
        `${JSON.stringify({ fixture: fixture.id, manifest: artifact.manifest, actions: ['settingsLink:click', 'homeLink:click'], routes: [initial.route, settings.route, returned.route] }, null, 2)}\n`,
      )
      report.checks.push(
        'public Core 4 AppBundle compile/digest, linked transitions and authored runtime Home -> Settings -> Home',
      )
    }
    report.ok = true
  } catch (error) {
    report.error = error.message
    process.exitCode = 1
  } finally {
    rmSync(scratch, { recursive: true, force: true })
    report.scratchRemoved = !existsSync(scratch)
    writeFileSync(join(evidence, 'commands.json'), `${JSON.stringify(transcript, null, 2)}\n`)
    writeFileSync(join(evidence, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify({ ...report, evidence }, null, 2))
  }
}
