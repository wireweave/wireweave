import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { gzipSync } from 'node:zlib'

import {
  artifactFromTarball,
  assertSameArtifact,
  assertReleasePolicy,
  assertPublishInputs,
  captureArtifacts,
  fetchRegistry,
  inspectRegistryArtifact,
  normalizeManifestDependencies,
  parseTags,
  prepareIntent,
  recheckArtifacts,
  recoverTags,
  retryTransient,
  transientInstallError,
  transientRegistryError,
  validateArtifacts,
  verifyPublishedMcp,
  verifyRegistry,
} from './release-registry.mjs'
import { withTemporaryConsumer } from './mcp-package-smoke.mjs'

const COMMIT = 'a'.repeat(40)
const TREE = 'b'.repeat(40)
const OLD = 'c'.repeat(40)
const ROOT = new globalThis.URL('../', import.meta.url)
const PACKAGE_MANAGER = JSON.parse(
  readFileSync(new globalThis.URL('package.json', ROOT), 'utf8'),
).packageManager
const noSleep = async () => {}

function archive(entries, { corruptChecksum = false } = {}) {
  const blocks = entries.flatMap(({ path, text = '', type = '0', mode = 0o644 }) => {
    const header = Buffer.alloc(512)
    const content = Buffer.from(text)
    header.write(path)
    header.write(`${mode.toString(8).padStart(7, '0')}\0`, 100)
    header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124)
    header.write(type, 156)
    header.fill(32, 148, 156)
    const checksum = header.reduce((sum, byte) => sum + byte, 0)
    header.write(`${(checksum + Number(corruptChecksum)).toString(8).padStart(6, '0')}\0 `, 148)
    return [header, content, Buffer.alloc((512 - (content.length % 512)) % 512)]
  })
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]))
}

function packageArchive(name = '@wireweave/core', version = '3.0.1', entries = []) {
  return archive([
    { path: 'package/package.json', text: JSON.stringify({ name, version }) },
    ...entries,
  ])
}

function fixture(branch = 'main') {
  const artifacts = ['core', 'sdk', 'mcp-server'].map((name) =>
    artifactFromTarball(
      packageArchive(
        `@wireweave/${name}`,
        name === 'core'
          ? branch === 'main'
            ? '3.0.1'
            : '4.0.0-beta.1'
          : branch === 'main'
            ? '1.2.3'
            : '1.2.3-beta.1',
      ),
    ),
  )
  return {
    verification: {
      ok: true,
      verifiedTree: TREE,
      releaseArtifacts: artifacts,
      installedMcp: {
        artifacts: artifacts.map((a) => ({
          name: a.name,
          version: a.version,
          tarballIntegrity: a.integrity,
        })),
      },
    },
    currentArtifacts: artifacts,
    branch,
    commit: COMMIT,
    tree: TREE,
    preState: branch === 'main' ? null : { mode: 'pre', tag: 'beta' },
    remoteTags: new Map(),
    inspect: async () => ({ artifact: null, tags: {}, versions: ['0.1.0'] }),
  }
}

const present = async (artifact) => ({
  artifact,
  tags: { [artifact.channel ?? 'latest']: artifact.version },
  versions: ['0.1.0', artifact.version],
})
const proofFor = (intent) => verifyRegistry(intent, { inspect: present, sleep: noSleep })

test('regular archive preserves manifest bytes and executable permissions', () => {
  const bytes = packageArchive(undefined, undefined, [
    { path: 'package/bin.js', text: '#!/usr/bin/env node\n', mode: 0o755 },
  ])
  const artifact = artifactFromTarball(bytes)
  assert.equal(artifact.files.find((f) => f.path === 'bin.js').mode, 0o755)
  assert.equal(
    artifact.files.find((f) => f.path === 'package.json').size,
    JSON.stringify({ name: '@wireweave/core', version: '3.0.1' }).length,
  )
  assertSameArtifact(artifact, artifactFromTarball(bytes))
  assert.throws(
    () => assertSameArtifact(artifact, artifactFromTarball(packageArchive())),
    /immutable package content differs/,
  )
})

test('only dependency-map key order is normalized; version/value/exports/imports order remain significant', () => {
  const manifest = {
    name: '@wireweave/sdk',
    version: '1.2.3',
    exports: { '.': { import: './a.js', default: './b.js' } },
    imports: { '#a': { node: './a.js', default: './b.js' } },
    gitHead: COMMIT,
  }
  for (const key of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    const original = {
      ...manifest,
      [key]: { '@wireweave/core': '3.0.1', '@wireweave/ux-rules': '1.0.0' },
    }
    const reordered = {
      ...original,
      [key]: { '@wireweave/ux-rules': '1.0.0', '@wireweave/core': '3.0.1' },
    }
    const pack = (value) =>
      artifactFromTarball(
        archive([{ path: 'package/package.json', text: JSON.stringify(value, null, 2) }]),
      )
    assertSameArtifact(pack(original), pack(reordered))
    assert.notEqual(pack(original).integrity, pack(reordered).integrity)
    for (const changed of [
      { ...original, version: '1.2.4' },
      { ...original, [key]: { ...original[key], '@wireweave/core': '3.0.2' } },
      { ...original, exports: { '.': { default: './b.js', import: './a.js' } } },
      { ...original, imports: { '#a': { default: './b.js', node: './a.js' } } },
      { ...original, gitHead: OLD },
    ])
      assert.throws(() => assertSameArtifact(pack(original), pack(changed)))
  }
  const untouched = Buffer.from(' { "name" : "fixture", "exports": {"z":"z", "a":"a"} }\n')
  assert.ok(normalizeManifestDependencies(untouched).equals(untouched))
})

test('PAX long paths are supported with byte-counted records', () => {
  const path = `package/${'long/'.repeat(25)}file.js`
  const record = `path=${path}\n`
  let length = Buffer.byteLength(record) + 3
  while (String(length).length + 1 + Buffer.byteLength(record) !== length)
    length = String(length).length + 1 + Buffer.byteLength(record)
  const artifact = artifactFromTarball(
    packageArchive(undefined, undefined, [
      { path: 'PaxHeader', type: 'x', text: `${length} ${record}` },
      { path: 'package/placeholder', text: 'export {}' },
    ]),
  )
  assert.ok(artifact.files.some((f) => f.path === path.slice(8)))
})

for (const [entry, message] of [
  [{ path: 'package/../escape', text: '' }, /Unsafe tar path/],
  [{ path: '/absolute', text: '' }, /Unsafe tar path/],
  [{ path: 'package/a\\b', text: '' }, /Unsafe tar path/],
  [{ path: 'package/a', type: '2' }, /Unsupported tar entry/],
  [{ path: 'package/a', mode: 0o4755 }, /Special tar permissions/],
  [{ path: 'package/package.json', text: '{}' }, /Duplicate tar path/],
  [{ path: 'PaxHeader', type: 'x', text: '99 path=a\n' }, /Invalid PAX record/],
  [{ path: 'PaxHeader', type: 'x', text: '12 size=123\n' }, /Unsupported PAX key/],
])
  test(`archive rejects ${JSON.stringify(entry)}`, () =>
    assert.throws(
      () => artifactFromTarball(packageArchive(undefined, undefined, [entry])),
      message,
    ))

test('bad checksums, absent manifests and truncated archives fail closed', () => {
  assert.throws(
    () =>
      artifactFromTarball(
        archive([{ path: 'package/package.json', text: '{}' }], { corruptChecksum: true }),
      ),
    /checksum/,
  )
  assert.throws(
    () => artifactFromTarball(archive([{ path: 'package/index.js' }])),
    /Missing packed/,
  )
  assert.throws(() => artifactFromTarball(gzipSync(Buffer.alloc(10))), /Unterminated/)
})

test('real pnpm pack emits reproducible bytes with lifecycle disabled, without publication', async () => {
  await withTemporaryConsumer(async (scratch) => {
    const path = join(scratch, 'package')
    mkdirSync(path)
    const manifest = {
      name: '@wireweave/core',
      version: '3.0.1',
      packageManager: PACKAGE_MANAGER,
      files: ['index.js'],
    }
    writeFileSync(join(path, 'package.json'), JSON.stringify(manifest))
    writeFileSync(join(path, 'index.js'), 'export const value = 1\n')
    const packages = [{ name: manifest.name, path, manifest }]
    const first = await captureArtifacts(packages)
    const second = await captureArtifacts(packages)
    assertSameArtifact(first[0], second[0])
  })
})

test('Core major, prerelease mode and tag cannot implicitly promote or select rc/latest', () => {
  assertReleasePolicy({ branch: 'main', coreVersion: '3.0.1' })
  assertReleasePolicy({
    branch: 'develop',
    coreVersion: '4.0.0-beta.1',
    preState: { mode: 'pre', tag: 'beta' },
    versioned: true,
  })
  for (const input of [
    { branch: 'main', coreVersion: '4.0.0' },
    { branch: 'main', coreVersion: '3.0.1', preState: { mode: 'exit', tag: 'beta' } },
    { branch: 'develop', coreVersion: '4.0.0-beta.1', preState: { mode: 'exit', tag: 'beta' } },
    { branch: 'develop', coreVersion: '4.0.0-beta.1', preState: { mode: 'pre', tag: 'rc' } },
    { branch: 'develop', coreVersion: '3.0.0' },
    { branch: 'feature', coreVersion: '4.0.0' },
  ])
    assert.throws(() => assertReleasePolicy({ ...input, versioned: true }))
})

test('every publication lifecycle mutator and non-public registry is rejected', () => {
  for (const hook of [
    'prepublishOnly',
    'prepublish',
    'prepack',
    'prepare',
    'postpack',
    'publish',
    'postpublish',
  ])
    assert.throws(
      () => assertPublishInputs({ name: 'fixture', scripts: { [hook]: 'node modify.js' } }),
      /mutator/,
    )
  assert.throws(
    () => assertPublishInputs({ publishConfig: { registry: 'https://other.invalid' } }),
    /registry/,
  )
  assertPublishInputs({ scripts: { build: 'node build.js' }, publishConfig: { tag: 'beta' } })
})

test('existing version with changed bytes fails while an identical retry preserves a historical tag', async () => {
  const input = fixture()
  input.inspect = present
  input.remoteTags.set('@wireweave/core@3.0.1', OLD)
  const intent = await prepareIntent(input)
  assert.equal(intent.artifacts[0].state, 'existing-identical')
  assert.equal(intent.artifacts[0].tagCommit, OLD)
  await assert.rejects(
    prepareIntent({
      ...input,
      inspect: async (artifact) => ({
        ...(await present(artifact)),
        artifact: artifactFromTarball(
          packageArchive(artifact.name, artifact.version, [
            { path: 'package/changed.js', text: 'changed' },
          ]),
        ),
      }),
    }),
    /immutable package content differs/,
  )
  await assert.rejects(
    prepareIntent({ ...fixture(), remoteTags: input.remoteTags }),
    /conflicting existing Git tag/,
  )
})

test('beta without stable registry history and wrong existing channel fail before publication', async () => {
  await assert.rejects(
    prepareIntent({
      ...fixture('develop'),
      inspect: async () => ({ artifact: null, tags: {}, versions: ['1.0.0-beta.1'] }),
    }),
    /requires stable registry history/,
  )
  await assert.rejects(
    prepareIntent({
      ...fixture(),
      inspect: async (artifact) => ({ artifact, tags: { latest: '99.0.0' } }),
    }),
    /channel differs/,
  )
  await prepareIntent(fixture('develop'))
})

test('artifact scope, tree and installed smoke evidence cannot change between verification and intent', async () => {
  assert.throws(() => validateArtifacts([]), /Empty/)
  const input = fixture()
  await assert.rejects(prepareIntent({ ...input, tree: OLD }), /tree differs/)
  await assert.rejects(
    prepareIntent({ ...input, currentArtifacts: input.currentArtifacts.slice(1) }),
  )
  const corrupt = globalThis.structuredClone(input.verification)
  corrupt.installedMcp.artifacts[0].tarballIntegrity = 'wrong'
  await assert.rejects(
    prepareIntent({ ...input, verification: corrupt }),
    /Missing verified MCP tarball integrity/,
  )
})

test('registry validates both metadata integrity and the downloaded bytes, without trusting gitHead', async () => {
  const bytes = packageArchive()
  const expected = artifactFromTarball(bytes)
  const doc = {
    name: expected.name,
    versions: {
      '3.0.1': {
        name: expected.name,
        version: expected.version,
        gitHead: 'untrusted',
        dist: { integrity: expected.integrity, tarball: 'https://registry.npmjs.org/fixture.tgz' },
      },
    },
    'dist-tags': { latest: '3.0.1' },
  }
  const read = async (_, options = {}) => (options.json === false ? bytes : doc)
  assertSameArtifact(expected, (await inspectRegistryArtifact(expected, { read })).artifact)
  await assert.rejects(
    inspectRegistryArtifact(expected, {
      read: async (_, options = {}) =>
        options.json === false ? packageArchive(undefined, '3.0.2') : doc,
    }),
    /integrity mismatch/,
  )
  const wrongDoc = globalThis.structuredClone(doc)
  wrongDoc.versions['3.0.1'].dist.integrity = `sha512-${'A'.repeat(86)}==`
  await assert.rejects(
    inspectRegistryArtifact(expected, {
      read: async (_, options = {}) => (options.json === false ? bytes : wrongDoc),
    }),
    /integrity mismatch/,
  )
  const missingTar = async (_, options = {}) => {
    if (options.json === false) throw Object.assign(new Error('missing tar'), { status: 404 })
    return doc
  }
  await assert.rejects(inspectRegistryArtifact(expected, { read: missingTar }), /missing tar/)
})

test('only a valid absent version or package 404 counts as unpublished', async () => {
  const expected = artifactFromTarball(packageArchive())
  const doc = {
    name: expected.name,
    versions: { '3.0.0': { name: expected.name, version: '3.0.0' } },
    'dist-tags': { latest: '3.0.0' },
  }
  assert.deepEqual(await inspectRegistryArtifact(expected, { read: async () => doc }), {
    artifact: null,
    tags: { latest: '3.0.0' },
    versions: ['3.0.0'],
  })
  assert.deepEqual(
    await inspectRegistryArtifact(expected, {
      read: async () => {
        throw Object.assign(new Error('missing package'), { status: 404 })
      },
    }),
    { artifact: null, tags: {}, versions: [] },
  )
  for (const malformed of [
    null,
    [],
    { ...doc, name: '@wireweave/unrelated' },
    { ...doc, versions: [] },
    { ...doc, versions: null },
    { ...doc, versions: { ...doc.versions, [expected.version]: null } },
    { ...doc, versions: { ...doc.versions, [expected.version]: false } },
    { ...doc, versions: { '3.0.0': { name: '@wireweave/unrelated', version: '3.0.0' } } },
    { ...doc, versions: { '3.0.0': { name: expected.name, version: '3.0.1' } } },
    { ...doc, 'dist-tags': [] },
    { ...doc, 'dist-tags': null },
    { ...doc, 'dist-tags': { latest: null } },
    { ...doc, 'dist-tags': { latest: '99.0.0' } },
  ]) {
    await assert.rejects(
      inspectRegistryArtifact(expected, { read: async () => malformed }),
      /[Mm]alformed|[Mm]ismatch|unknown version/,
    )
  }
})

test('retry classification is bounded, transient only; wrong bytes/auth/schema never retry', async () => {
  for (const status of [404, 408, 429, 500, 502, 503, 504])
    assert.ok(transientRegistryError({ status }, { allow404: true }))
  for (const status of [400, 401, 403, 409, 422])
    assert.ok(!transientRegistryError({ status }, { allow404: true }))
  assert.ok(!transientRegistryError({ status: 404 }))
  let calls = 0
  const waits = []
  await assert.rejects(
    retryTransient(
      async () => {
        calls++
        throw Object.assign(new Error('unavailable'), { status: 503 })
      },
      { sleep: async (ms) => waits.push(ms) },
    ),
    /unavailable/,
  )
  assert.equal(calls, 4)
  assert.deepEqual(waits, [1000, 2000, 4000])
  calls = 0
  await assert.rejects(
    retryTransient(
      async () => {
        calls++
        throw new Error('wrong bytes')
      },
      { sleep: noSleep },
    ),
    /wrong bytes/,
  )
  assert.equal(calls, 1)
})

test('fetch is credential-free, bounded and rejects redirect authorities', async () => {
  let options
  const result = await fetchRegistry('https://registry.npmjs.org/fixture', {
    fetch: async (_, input) => {
      options = input
      return new globalThis.Response('{"ok":true}')
    },
  })
  assert.equal(result.ok, true)
  assert.equal(options.redirect, 'error')
  assert.ok(options.signal)
  assert.ok(!Object.hasOwn(options.headers, 'authorization'))
  await assert.rejects(fetchRegistry('https://other.invalid/fixture'), /authority/)
  await assert.rejects(fetchRegistry('https://user:secret@registry.npmjs.org/fixture'), /authority/)
})

test('postpublication checks every artifact; delayed visibility retries but wrong channel does not', async () => {
  const intent = await prepareIntent(fixture('develop'))
  let calls = 0
  const proof = await verifyRegistry(intent, {
    sleep: noSleep,
    inspect: async (artifact) => {
      calls++
      return calls === 1 ? { artifact: null } : present(artifact)
    },
  })
  assert.equal(proof.artifacts.length, 3)
  assert.equal(calls, 4)
  calls = 0
  await assert.rejects(
    verifyRegistry(intent, {
      sleep: noSleep,
      inspect: async (artifact) => {
        calls++
        return { artifact, tags: { beta: 'wrong' } }
      },
    }),
    /channel differs/,
  )
  assert.equal(calls, 1)
})

function clockFixture() {
  let elapsed = 0
  const waits = []
  return {
    waits,
    now: () => elapsed,
    sleep: async (ms) => {
      waits.push(ms)
      elapsed += ms
    },
  }
}

test('publication scanning may take 16 minutes; only pending artifacts are polled in one budget', async () => {
  const intent = await prepareIntent(fixture())
  const clock = clockFixture()
  const calls = new Map()
  const events = []
  const proof = await verifyRegistry(intent, {
    ...clock,
    onRetry: (event) => events.push(event),
    inspect: async (artifact) => {
      calls.set(artifact.name, (calls.get(artifact.name) ?? 0) + 1)
      const readyAt = artifact.name.endsWith('/core') ? 16 * 60000 : 0
      return clock.now() < readyAt ? { artifact: null } : present(artifact)
    },
  })
  assert.equal(clock.now(), 16 * 60000)
  assert.equal(calls.get('@wireweave/core'), 65)
  assert.equal(calls.get('@wireweave/sdk'), 1)
  assert.equal(calls.get('@wireweave/mcp-server'), 1)
  assert.deepEqual(
    proof.artifacts.map((a) => a.name),
    intent.artifacts.map((a) => a.name),
  )
  assert.equal(events.length, 64)
  assert.equal(events[0].phase, 'publication-availability')
  assert.deepEqual(events[0].pending, ['@wireweave/core@3.0.1'])
})

test('unavailable packages share a deadline, with a round bound even if the clock stalls', async () => {
  const intent = await prepareIntent(fixture())
  for (const clock of [clockFixture(), { now: () => 0, sleep: noSleep }]) {
    let calls = 0
    await assert.rejects(
      verifyRegistry(intent, {
        ...clock,
        timeoutMs: 45000,
        inspect: async () => {
          calls++
          return { artifact: null }
        },
      }),
      (error) =>
        error.code === 'REGISTRY_AVAILABILITY_TIMEOUT' && /do not republish/.test(error.message),
    )
    assert.ok(calls <= 12)
    assert.ok(clock.now() <= 45000)
  }
})

test('tarball 404 waits for availability but exhausted network retries and auth errors do not', async () => {
  const intent = await prepareIntent(fixture())
  const clock = clockFixture()
  let calls = 0
  await verifyRegistry(intent, {
    ...clock,
    inspect: async (artifact) => {
      if (++calls === 1) throw Object.assign(new Error('tarball pending'), { status: 404 })
      return present(artifact)
    },
  })
  assert.equal(calls, 4)
  assert.deepEqual(clock.waits, [15000])
  for (const status of [401, 403, 503]) {
    const clock = clockFixture()
    let calls = 0
    await assert.rejects(
      verifyRegistry(intent, {
        ...clock,
        inspect: async () => {
          calls++
          throw Object.assign(new Error('registry failure'), { status })
        },
      }),
      /registry failure/,
    )
    assert.equal(calls, status === 503 ? 4 : 1)
    assert.deepEqual(clock.waits, status === 503 ? [1000, 2000, 4000] : [])
  }
})

test('an unavailable first package cannot hide a later invalid artifact or channel', async () => {
  const intent = await prepareIntent(fixture())
  for (const invalidContent of [true, false]) {
    const clock = clockFixture()
    let calls = 0
    await assert.rejects(
      verifyRegistry(intent, {
        ...clock,
        inspect: async (artifact) => {
          if (++calls === 1) return { artifact: null }
          return {
            artifact: invalidContent ? { ...artifact, contentSha256: 'wrong' } : artifact,
            tags: { latest: 'wrong' },
          }
        },
      }),
      invalidContent ? /Artifact fingerprint differs/ : /channel differs/,
    )
    assert.equal(calls, 2)
    assert.deepEqual(clock.waits, [])
  }
})

test('network retry cannot start another inspection after the shared deadline', async () => {
  const intent = await prepareIntent(fixture())
  const clock = clockFixture()
  let calls = 0
  await assert.rejects(
    verifyRegistry(intent, {
      ...clock,
      timeoutMs: 1000,
      inspect: async () => {
        calls++
        throw Object.assign(new Error('unavailable'), { status: 503 })
      },
    }),
    { code: 'REGISTRY_AVAILABILITY_TIMEOUT' },
  )
  assert.equal(calls, 1)
})

function gitFixture({ local = '', remote = '', rejectPush = false } = {}) {
  const calls = []
  return {
    calls,
    execute: async (command, args) => {
      assert.equal(command, 'git')
      calls.push(args)
      if (args[0] === 'ls-remote') return remote
      if (args[0] === 'for-each-ref') return local
      if (args[0] === 'rev-parse')
        return args[1].startsWith('HEAD')
          ? args[1].includes('tree')
            ? TREE
            : COMMIT
          : args[1].split('^')[0]
      if (args[0] === 'push' && rejectPush) throw new Error('rejected push')
      return ''
    },
  }
}

test('tag recovery recreates public tags absent on fresh runners at the frozen exact commit', async () => {
  const intent = await prepareIntent(fixture())
  const proof = await proofFor(intent)
  const git = gitFixture()
  await recoverTags(intent, proof, git)
  assert.equal(git.calls.filter((args) => args[0] === 'tag').length, 3)
  assert.ok(git.calls.filter((args) => args[0] === 'tag').every((args) => args[3] === COMMIT))
  assert.deepEqual(git.calls.at(-1).slice(0, 3), ['push', '--atomic', 'origin'])
  assert.ok(!git.calls.flat().includes('--force'))
  const tags = intent.artifacts.map((a) => `${a.tagCommit}\trefs/tags/${a.tag}`).join('\n')
  const again = gitFixture({ remote: tags })
  await recoverTags(intent, proof, again)
  assert.ok(again.calls.every((args) => !['push', 'tag'].includes(args[0])))
})

test('retry of a NEW release rejects conflicting tags, including after a registry success', async () => {
  const intent = await prepareIntent(fixture())
  const proof = await proofFor(intent)
  for (const side of ['local', 'remote']) {
    const git = gitFixture({ [side]: `${OLD}\trefs/tags/${intent.artifacts[0].tag}` })
    await assert.rejects(recoverTags(intent, proof, git), /conflicting Git tag/)
    assert.ok(git.calls.every((args) => !['push', 'tag'].includes(args[0])))
  }
  const rejected = gitFixture({ rejectPush: true })
  await assert.rejects(recoverTags(intent, proof, rejected), /rejected push/)
  assert.equal(rejected.calls.filter((args) => args[0] === 'push').length, 1)
  assert.throws(() => parseTags(`${COMMIT}\trefs/tags/a^{}\n`), /Missing tag object/)
  assert.equal(parseTags(`${OLD}\trefs/tags/a\n${COMMIT}\trefs/tags/a^{}\n`).get('a'), COMMIT)
})

test('last-moment dist mutation or changed Git state cannot reach publication', async () => {
  const input = fixture()
  const intent = await prepareIntent(input)
  const git = gitFixture()
  await recheckArtifacts(intent, { ...git, capture: async () => input.currentArtifacts })
  const changed = globalThis.structuredClone(input.currentArtifacts)
  changed[0] = artifactFromTarball(
    packageArchive(changed[0].name, changed[0].version, [{ path: 'package/changed.js' }]),
  )
  await assert.rejects(
    recheckArtifacts(intent, { ...git, capture: async () => changed }),
    /immutable package content differs/,
  )
})

test('installed MCP retry is restricted to npm transport errors and binds its entire runtime closure', async () => {
  assert.ok(transientInstallError(new Error('npm exited 1: npm error code E404')))
  assert.ok(!transientInstallError(new Error('npm exited 1: npm error code E401')))
  assert.ok(!transientInstallError(new Error('MCP version mismatch E404')))
  const intent = await prepareIntent(fixture())
  const proof = await proofFor(intent)
  const result = {
    ok: true,
    version: '1.2.3',
    toolCount: 32,
    installedPackages: proof.artifacts.map((a) => ({
      path: `node_modules/${a.name}`,
      version: a.version,
      integrity: a.integrity,
    })),
  }
  let calls = 0
  await verifyPublishedMcp(intent, proof, {
    sleep: noSleep,
    probe: async () => {
      if (++calls === 1) throw new Error('npm exited 1: npm error code ETARGET')
      return result
    },
  })
  assert.equal(calls, 2)
  const wrong = globalThis.structuredClone(result)
  wrong.installedPackages[0].integrity = 'wrong'
  await assert.rejects(
    verifyPublishedMcp(intent, proof, { sleep: noSleep, probe: async () => wrong }),
    /installed registry artifact differs/,
  )
})
