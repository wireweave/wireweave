// Bind a verified release to registry bytes and recover only its exact Git tags.
// Changesets remains the version/publish owner. This CLI never publishes npm packages.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { gunzipSync } from 'node:zlib'

import { publishedPackages } from './published-packages.mjs'
import {
  packPackage,
  packageManagerEnvironment,
  runCommand,
  smoke,
  withTemporaryConsumer,
} from './mcp-package-smoke.mjs'

const REGISTRY = 'https://registry.npmjs.org/'
const LIMIT = 128 * 1024 * 1024
const hash = (data) => createHash('sha256').update(data).digest('hex')
const digest = (data) => `sha512-${createHash('sha512').update(data).digest('base64')}`
const SHA = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/
const SRI = /^sha512-[A-Za-z0-9+/]{86}==$/
// Promotion requires an explicit policy change, never automatic pre-exit.
export const RELEASE_POLICY = Object.freeze({
  main: { coreMajor: 3, channel: 'latest' },
  develop: { coreMajor: 4, channel: 'beta' },
})

export function assertReleasePolicy({ branch, coreVersion, preState = null, versioned = false }) {
  const policy = RELEASE_POLICY[branch]
  assert.ok(policy, 'Unsupported release branch')
  assert.equal(
    Number(coreVersion.split('.')[0]),
    policy.coreMajor,
    `${branch} requires Core ${policy.coreMajor}; promotion is not authorized`,
  )
  if (branch === 'main') {
    assert.equal(preState, null, 'main must not automatically exit prerelease mode')
    assert.match(coreVersion, /^3\.\d+\.\d+$/, 'main requires stable Core 3')
  } else {
    if (versioned || preState !== null) {
      assert.equal(preState?.mode, 'pre', 'develop requires active prerelease mode')
      assert.equal(preState?.tag, 'beta', 'develop requires beta prerelease tag')
    }
    if (versioned)
      assert.match(coreVersion, /^4\.\d+\.\d+-beta\.\d+$/, 'develop requires beta Core 4')
  }
  return policy
}

export function assertPublishInputs(manifest) {
  const hooks = [
    'prepublishOnly',
    'prepublish',
    'prepack',
    'prepare',
    'postpack',
    'publish',
    'postpublish',
  ]
  for (const hook of hooks)
    assert.ok(
      !manifest.scripts?.[hook],
      `${manifest.name}: publish lifecycle mutator ${hook} is forbidden`,
    )
  assert.ok(
    !manifest.publishConfig?.registry ||
      new globalThis.URL(manifest.publishConfig.registry).href === REGISTRY,
    'Unexpected publication registry',
  )
}

// pnpm 11 makePublishDependencies asynchronously inserts dependency-map keys.
// Normalize ONLY these unordered name->range maps. Preserve every surrounding
// byte, including exports/imports condition order, other fields and whitespace.
export function normalizeManifestDependencies(bytes) {
  const text = bytes.toString('utf8')
  assert.ok(Buffer.from(text).equals(bytes), 'Manifest is not UTF-8')
  JSON.parse(text)
  const maps = new Set([
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ])
  const seen = new Set()
  const pieces = []
  let cursor = 0
  let depth = 0
  const stringEnd = (start) => {
    for (let index = start + 1; index < text.length; index++) {
      if (text[index] === '\\') index++
      else if (text[index] === '"') return index + 1
    }
    throw new Error('Unterminated JSON string')
  }
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '"') {
      const end = stringEnd(index)
      const key = JSON.parse(text.slice(index, end))
      let start = end
      while (/\s/.test(text[start] ?? '') && start < text.length) start++
      if (depth === 1 && maps.has(key) && text[start] === ':') {
        assert.ok(!seen.has(key), 'Duplicate manifest dependency map')
        seen.add(key)
        start++
        while (/\s/.test(text[start] ?? '') && start < text.length) start++
        assert.equal(text[start], '{', 'Dependency map must be an object')
        let finish = start
        let nesting = 0
        do {
          if (text[finish] === '"') {
            finish = stringEnd(finish)
            continue
          }
          if (text[finish] === '{' || text[finish] === '[') nesting++
          if (text[finish] === '}' || text[finish] === ']') nesting--
          finish++
        } while (nesting > 0 && finish < text.length)
        const map = JSON.parse(text.slice(start, finish))
        assert.ok(
          Object.values(map).every((value) => typeof value === 'string'),
          'Dependency ranges must be strings',
        )
        const normalized = Object.fromEntries(
          Object.keys(map)
            .sort()
            .map((name) => [name, map[name]]),
        )
        pieces.push(text.slice(cursor, start), JSON.stringify(normalized))
        cursor = finish
        index = finish - 1
      } else index = end - 1
    } else if (text[index] === '{' || text[index] === '[') depth++
    else if (text[index] === '}' || text[index] === ']') depth--
  }
  pieces.push(text.slice(cursor))
  return Buffer.from(pieces.join(''))
}

// Never extract an untrusted archive to disk. The per-file fingerprint covers
// paths, permissions and payloads; raw SHA-512 separately binds registry/install bytes.
export function artifactFromTarball(bytes) {
  const tar = gunzipSync(bytes, { maxOutputLength: LIMIT })
  const files = []
  const seen = new Set()
  let manifest
  let pax = {}
  let ended = false
  const string = (buffer) => buffer.toString('utf8').replace(/\0.*$/s, '')
  const octal = (buffer) => {
    const value = string(buffer).trim()
    assert.match(value, /^[0-7]+$/, 'Unsupported tar numeric field')
    return Number.parseInt(value, 8)
  }
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) {
      assert.ok(
        tar.subarray(offset).every((byte) => byte === 0),
        'Data after tar terminator',
      )
      ended = true
      break
    }
    const checksum = header.reduce(
      (sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte),
      0,
    )
    assert.equal(octal(header.subarray(148, 156)), checksum, 'Invalid tar checksum')
    const size = octal(header.subarray(124, 136))
    const type = header[156]
    const payload = tar.subarray(offset + 512, offset + 512 + size)
    assert.equal(payload.length, size, 'Truncated tar payload')
    offset += 512 + Math.ceil(size / 512) * 512
    assert.ok(offset <= tar.length, 'Truncated tar padding')
    if (type === 120) {
      assert.equal(Object.keys(pax).length, 0, 'Consecutive PAX headers')
      for (let index = 0; index < payload.length;) {
        const space = payload.indexOf(32, index)
        assert.ok(space > index, 'Invalid PAX length')
        const length = Number(payload.subarray(index, space).toString())
        assert.ok(
          Number.isSafeInteger(length) &&
            length > space - index + 2 &&
            index + length <= payload.length,
          'Invalid PAX record',
        )
        const record = payload.subarray(space + 1, index + length).toString('utf8')
        assert.ok(record.endsWith('\n') && record.includes('='), 'Invalid PAX value')
        const split = record.indexOf('=')
        const key = record.slice(0, split)
        assert.ok(
          ['path', 'mtime', 'atime', 'ctime', 'uid', 'gid', 'uname', 'gname'].includes(key),
          `Unsupported PAX key ${key}`,
        )
        assert.ok(!Object.hasOwn(pax, key), 'Duplicate PAX key')
        pax[key] = record.slice(split + 1, -1)
        index += length
      }
      continue
    }
    const prefix = string(header.subarray(345, 500))
    const path = pax.path ?? `${prefix ? `${prefix}/` : ''}${string(header.subarray(0, 100))}`
    pax = {}
    assert.ok(
      path.startsWith('package/') &&
        !path.includes('\\') &&
        [...path].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127),
      `Unsafe tar path ${path}`,
    )
    const relative = path.slice('package/'.length).replace(/\/$/, '')
    assert.ok(
      relative && relative.split('/').every((part) => part && part !== '.' && part !== '..'),
      `Unsafe tar path ${path}`,
    )
    assert.ok(!seen.has(relative), `Duplicate tar path ${relative}`)
    seen.add(relative)
    if (type === 53) {
      assert.equal(size, 0, 'Nonempty tar directory')
      continue
    }
    assert.ok(type === 0 || type === 48, `Unsupported tar entry type ${type}: ${relative}`)
    const mode = octal(header.subarray(100, 108))
    assert.equal(mode & ~0o777, 0, 'Special tar permissions are forbidden')
    const content = relative === 'package.json' ? normalizeManifestDependencies(payload) : payload
    files.push({ path: relative, mode, size: content.length, sha256: hash(content) })
    if (relative === 'package.json') manifest = JSON.parse(payload.toString('utf8'))
  }
  assert.ok(ended && Object.keys(pax).length === 0, 'Unterminated tar archive')
  assert.ok(
    manifest?.name && manifest?.version && files.length > 0,
    'Missing packed package manifest',
  )
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return {
    name: manifest.name,
    version: manifest.version,
    normalization: 'dependency-map-order-v1',
    files,
    contentSha256: hash(JSON.stringify(files)),
    integrity: digest(bytes),
  }
}

export function assertSameArtifact(expected, actual) {
  assert.equal(actual.name, expected.name, 'Artifact package name differs')
  assert.equal(actual.version, expected.version, `${expected.name}: artifact version differs`)
  assert.equal(actual.normalization, expected.normalization, 'Artifact normalization differs')
  assert.deepEqual(
    actual.files,
    expected.files,
    `${expected.name}@${expected.version}: immutable package content differs`,
  )
  assert.equal(actual.contentSha256, expected.contentSha256, 'Artifact fingerprint differs')
}

export async function captureArtifacts(packages = publishedPackages()) {
  assert.ok(packages.length > 0, 'Empty release artifact scope')
  return withTemporaryConsumer(async (scratch) => {
    const env = packageManagerEnvironment(scratch)
    const artifacts = []
    for (const pkg of packages) {
      assertPublishInputs(pkg.manifest)
      const target = join(scratch, String(artifacts.length))
      mkdirSync(target)
      await packPackage(resolve(pkg.path), target, env)
      const files = readdirSync(target)
      assert.equal(files.length, 1, `Expected one packed artifact for ${pkg.name}`)
      const artifact = artifactFromTarball(readFileSync(join(target, files[0])))
      assert.equal(artifact.name, pkg.name)
      assert.equal(artifact.version, pkg.manifest.version)
      artifacts.push(artifact)
    }
    return artifacts
  })
}

export function transientRegistryError(error, { allow404 = false } = {}) {
  return (
    (allow404 && error.status === 404) ||
    [408, 429, 500, 502, 503, 504].includes(error.status) ||
    ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'].includes(
      error.cause?.code ?? error.code,
    ) ||
    error.name === 'TimeoutError'
  )
}

export async function retryTransient(
  operation,
  {
    allow404 = false,
    attempts = 4,
    sleep = delay,
    onRetry = () => {},
    classify = transientRegistryError,
  } = {},
) {
  assert.ok(Number.isInteger(attempts) && attempts >= 1 && attempts <= 6, 'Invalid retry bound')
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === attempts || !classify(error, { allow404 })) throw error
      onRetry({ attempt, status: error.status, code: error.cause?.code ?? error.code })
      await sleep(1000 * 2 ** (attempt - 1))
    }
  }
}

export async function fetchRegistry(
  url,
  {
    json = true,
    allow404 = false,
    attempts = 4,
    fetch = globalThis.fetch,
    onRetry = () => {},
    timeoutMs = 15000,
  } = {},
) {
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 15000)
  const target = new globalThis.URL(url)
  assert.ok(
    target.origin === REGISTRY.slice(0, -1) && !target.username && !target.password,
    'Unexpected registry authority',
  )
  return retryTransient(
    async () => {
      const response = await fetch(target.href, {
        redirect: 'error',
        signal: globalThis.AbortSignal.timeout(timeoutMs),
        headers: {
          accept: json ? 'application/json' : 'application/octet-stream',
          'cache-control': 'no-cache',
        },
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw Object.assign(new Error(`Registry HTTP ${response.status}: ${target.pathname}`), {
          status: response.status,
        })
      }
      const chunks = []
      let size = 0
      for await (const chunk of response.body) {
        size += chunk.length
        assert.ok(size <= LIMIT, 'Registry response exceeds byte limit')
        chunks.push(chunk)
      }
      const bytes = Buffer.concat(chunks)
      return json ? JSON.parse(bytes.toString('utf8')) : bytes
    },
    { allow404, attempts, onRetry },
  )
}

export function parseTags(output) {
  const tags = new Map()
  for (const line of output.trim().split('\n').filter(Boolean)) {
    const [sha, ref] = line.split(/\s+/)
    assert.match(sha, SHA, 'Invalid tag object ID')
    assert.ok(ref?.startsWith('refs/tags/'), 'Invalid tag reference')
    const name = ref.slice('refs/tags/'.length).replace(/\^\{\}$/, '')
    const entry = tags.get(name) ?? {}
    const key = ref.endsWith('^{}') ? 'commit' : 'object'
    assert.ok(!entry[key], `Duplicate tag reference ${ref}`)
    entry[key] = sha
    tags.set(name, entry)
  }
  return new Map(
    [...tags].map(([name, entry]) => {
      assert.ok(entry.object, `Missing tag object ${name}`)
      return [name, entry.commit ?? entry.object]
    }),
  )
}

export function branchChannel(branch) {
  assert.ok(RELEASE_POLICY[branch], 'Unsupported release branch')
  return RELEASE_POLICY[branch].channel
}

export function validateArtifacts(artifacts) {
  assert.ok(Array.isArray(artifacts) && artifacts.length > 0, 'Empty artifact evidence')
  assert.equal(
    new Set(artifacts.map((a) => a.name)).size,
    artifacts.length,
    'Duplicate release packages',
  )
  for (const artifact of artifacts) {
    assert.match(artifact.name, /^@wireweave\/[a-z0-9][a-z0-9-]*$/, 'Unexpected release package')
    assert.match(artifact.version, /^\d+\.\d+\.\d+(?:-beta\.\d+)?$/, 'Unsupported release version')
    assert.equal(artifact.normalization, 'dependency-map-order-v1')
    assert.ok(artifact.files?.length > 0, 'Empty file evidence')
    assert.equal(
      artifact.contentSha256,
      hash(JSON.stringify(artifact.files)),
      'Corrupt artifact evidence',
    )
    assert.match(artifact.integrity, SRI, 'Missing artifact SHA-512 integrity')
  }
}

export async function inspectRegistryArtifact(
  expected,
  { read = fetchRegistry, allow404 = false, channel } = {},
) {
  let doc
  try {
    doc = await read(`${REGISTRY}${encodeURIComponent(expected.name)}`)
  } catch (error) {
    if (error.status !== 404) throw error
    return { artifact: null, tags: {}, versions: [] }
  }
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  assert.ok(record(doc), 'Malformed registry package metadata')
  assert.equal(doc.name, expected.name, 'Registry package name mismatch')
  assert.ok(record(doc.versions), 'Malformed registry version inventory')
  const tags = doc['dist-tags']
  assert.ok(record(tags), 'Malformed registry channel inventory')
  for (const [versionKey, entry] of Object.entries(doc.versions)) {
    assert.ok(record(entry), `Malformed registry version entry: ${versionKey}`)
    assert.equal(entry.name, expected.name, 'Registry inventory package name mismatch')
    assert.equal(entry.version, versionKey, 'Registry inventory version mismatch')
  }
  for (const version of Object.values(tags)) {
    assert.ok(
      typeof version === 'string' && Object.hasOwn(doc.versions, version),
      'Registry channel refers to an unknown version',
    )
  }
  const versions = Object.keys(doc.versions)
  if (!Object.hasOwn(doc.versions, expected.version)) return { artifact: null, tags, versions }
  const version = doc.versions[expected.version]
  assert.equal(version.name, expected.name, 'Registry name mismatch')
  assert.equal(version.version, expected.version, 'Registry version mismatch')
  if (channel !== undefined)
    assert.equal(tags[channel], expected.version, `${expected.name}: ${channel} channel differs`)
  assert.match(version.dist?.integrity ?? '', SRI, 'Missing registry SHA-512 integrity')
  const bytes = await read(version.dist.tarball, { json: false, allow404 })
  assert.equal(digest(bytes), version.dist.integrity, 'Registry tarball integrity mismatch')
  const actual = artifactFromTarball(bytes)
  assertSameArtifact(expected, actual)
  return { artifact: actual, tags, versions }
}

export async function prepareIntent({
  verification,
  currentArtifacts,
  branch,
  commit,
  tree,
  preState = null,
  remoteTags,
  inspect = inspectRegistryArtifact,
}) {
  assert.equal(verification.ok, true, 'Release verification did not pass')
  assert.equal(verification.verifiedTree, tree, 'Verified Git tree differs')
  assert.match(commit, SHA)
  assert.match(tree, SHA)
  const channel = branchChannel(branch)
  validateArtifacts(verification.releaseArtifacts)
  validateArtifacts(currentArtifacts)
  assertReleasePolicy({
    branch,
    coreVersion: currentArtifacts.find((a) => a.name === '@wireweave/core')?.version ?? '',
    preState,
    versioned: true,
  })
  assert.deepEqual(
    currentArtifacts.map((a) => a.name),
    verification.releaseArtifacts.map((a) => a.name),
    'Release package inventory changed',
  )
  const artifacts = []
  for (const [index, expected] of verification.releaseArtifacts.entries()) {
    assertSameArtifact(expected, currentArtifacts[index])
    const prerelease = expected.version.includes('-')
    assert.ok(branch !== 'main' || !prerelease, 'main cannot release prerelease versions')
    const observed = await inspect(expected)
    const existing = observed.artifact !== null
    if (existing) assertSameArtifact(expected, observed.artifact)
    if (branch === 'develop' && !existing)
      assert.ok(
        observed.versions.some((v) => /^\d+\.\d+\.\d+$/.test(v)),
        `${expected.name}: beta publication requires stable registry history; Changesets only-pre can select latest`,
      )
    // Stable packages unchanged on develop are not beta releases or publish candidates.
    assert.ok(
      branch !== 'develop' || prerelease || existing,
      'develop cannot publish a new stable version',
    )
    const targetChannel = branch === 'develop' && !prerelease ? 'latest' : channel
    if (existing)
      assert.equal(
        observed.tags[targetChannel],
        expected.version,
        `${expected.name}: ${targetChannel} channel differs`,
      )
    const tag = `${expected.name}@${expected.version}`
    const previousTag = remoteTags.get(tag)
    if (!existing && previousTag)
      assert.equal(previousTag, commit, `${tag}: conflicting existing Git tag`)
    artifacts.push({
      ...expected,
      channel: targetChannel,
      state: existing ? 'existing-identical' : 'new',
      tag,
      tagCommit: previousTag ?? commit,
    })
  }
  const runtimeNames = verification.installedMcp.artifacts.map((a) => a.name)
  assert.ok(runtimeNames.includes('@wireweave/mcp-server'), 'Missing MCP runtime evidence')
  for (const runtime of verification.installedMcp.artifacts) {
    const expected = artifacts.find((a) => a.name === runtime.name)
    assert.ok(expected, 'Unknown verified runtime package')
    assert.equal(runtime.version, expected.version)
    assert.match(runtime.tarballIntegrity, SRI, 'Missing verified MCP tarball integrity')
  }
  return {
    schemaVersion: 1,
    kind: 'publication-intent',
    commit,
    tree,
    branch,
    channel,
    preState,
    artifacts,
    runtimeNames,
  }
}

export function validateIntent(intent) {
  assert.equal(intent.schemaVersion, 1)
  assert.equal(intent.kind, 'publication-intent')
  assert.match(intent.commit, SHA)
  assert.match(intent.tree, SHA)
  assert.equal(intent.channel, branchChannel(intent.branch))
  validateArtifacts(intent.artifacts)
  assertReleasePolicy({
    branch: intent.branch,
    coreVersion: intent.artifacts.find((a) => a.name === '@wireweave/core')?.version ?? '',
    preState: intent.preState,
    versioned: true,
  })
  for (const artifact of intent.artifacts) {
    assert.equal(artifact.tag, `${artifact.name}@${artifact.version}`)
    assert.match(artifact.tagCommit, SHA)
    assert.equal(
      artifact.channel,
      intent.branch === 'develop' && !artifact.version.includes('-') ? 'latest' : intent.channel,
    )
    assert.ok(['new', 'existing-identical'].includes(artifact.state))
    if (artifact.state === 'new')
      assert.equal(artifact.tagCommit, intent.commit, 'New release tag must bind the tested commit')
  }
  assert.ok(
    intent.runtimeNames?.includes('@wireweave/mcp-server'),
    'Missing runtime closure evidence',
  )
}

export async function verifyRegistry(
  intent,
  {
    inspect = inspectRegistryArtifact,
    sleep = delay,
    onRetry = () => {},
    now = () => globalThis.performance.now(),
    timeoutMs = 20 * 60 * 1000,
    pollIntervalMs = 15000,
  } = {},
) {
  validateIntent(intent)
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 1200000)
  assert.ok(Number.isInteger(pollIntervalMs) && pollIntervalMs > 0 && pollIntervalMs <= 60000)
  const deadline = now() + timeoutMs
  const verified = new Map()
  const pending = () => intent.artifacts.filter((a) => !verified.has(a.name))
  const expired = () =>
    Object.assign(
      new Error(
        `Registry availability deadline exceeded: ${pending()
          .map((a) => `${a.name}@${a.version}`)
          .join(', ')}; resume verification with the original publication intent, do not republish`,
      ),
      { code: 'REGISTRY_AVAILABILITY_TIMEOUT' },
    )
  const remaining = () => {
    const ms = Math.ceil(deadline - now())
    if (ms <= 0) throw expired()
    return ms
  }
  // npm publish-time scanning can delay installation for 15+ minutes. One
  // deadline covers the whole release; confirmed packages are not downloaded again.
  // A round bound also guarantees termination with a stalled/injected clock.
  const maxRounds = Math.ceil(timeoutMs / pollIntervalMs) + 1
  for (let round = 1; verified.size < intent.artifacts.length; round++) {
    if (round > maxRounds || now() >= deadline) throw expired()
    for (const expected of pending()) {
      let result
      try {
        result = await retryTransient(
          async () => {
            remaining()
            // Transport retries stay short and never multiply fetch retries.
            return inspect(expected, {
              channel: expected.channel,
              read: (url, options) =>
                fetchRegistry(url, {
                  ...options,
                  attempts: 1,
                  timeoutMs: Math.min(15000, remaining()),
                }),
            })
          },
          { sleep: (ms) => sleep(Math.min(ms, remaining())), onRetry },
        )
      } catch (error) {
        if (error.status === 404) continue // Metadata may precede tarball availability.
        throw error
      }
      if (!result.artifact) continue
      // Invalid content, authentication and channels never enter the availability wait.
      assertSameArtifact(expected, result.artifact)
      assert.equal(
        result.tags[expected.channel],
        expected.version,
        `${expected.name}: ${expected.channel} channel differs`,
      )
      verified.set(expected.name, {
        name: expected.name,
        version: expected.version,
        integrity: result.artifact.integrity,
        contentSha256: result.artifact.contentSha256,
        channel: expected.channel,
      })
    }
    if (now() >= deadline) throw expired()
    if (verified.size === intent.artifacts.length) break
    if (round === maxRounds) throw expired()
    const remainingMs = deadline - now()
    onRetry({
      phase: 'publication-availability',
      round,
      remainingMs,
      pending: pending().map((a) => `${a.name}@${a.version}`),
    })
    await sleep(Math.min(pollIntervalMs, remainingMs))
  }
  return {
    schemaVersion: 1,
    ok: true,
    commit: intent.commit,
    intentSha256: hash(JSON.stringify(intent)),
    artifacts: intent.artifacts.map((a) => verified.get(a.name)),
  }
}

export function assertRegistryProof(intent, proof) {
  validateIntent(intent)
  assert.equal(proof.ok, true, 'Registry verification failed')
  assert.equal(proof.commit, intent.commit)
  assert.equal(
    proof.intentSha256,
    hash(JSON.stringify(intent)),
    'Registry proof belongs to a different intent',
  )
  assert.deepEqual(
    proof.artifacts.map((a) => [a.name, a.version, a.contentSha256, a.channel]),
    intent.artifacts.map((a) => [a.name, a.version, a.contentSha256, a.channel]),
  )
  for (const artifact of proof.artifacts) assert.match(artifact.integrity, SRI)
}

export async function recoverTags(intent, proof, { execute = runCommand } = {}) {
  assertRegistryProof(intent, proof)
  await execute('git', ['remote', '-v'])
  const remote = parseTags(await execute('git', ['ls-remote', '--tags', 'origin']))
  const localLines = await execute('git', [
    'for-each-ref',
    '--format=%(objectname) %(refname)%0a%(*objectname) %(refname)^{}',
    'refs/tags',
  ])
  const local = parseTags(
    localLines
      .split('\n')
      .filter((line) => /^[a-f0-9]+\s/.test(line))
      .join('\n'),
  )
  const missing = []
  // Check all conflicts before creating or pushing any tag. Existing tags are never overwritten.
  for (const artifact of intent.artifacts) {
    for (const tags of [remote, local])
      if (tags.has(artifact.tag))
        assert.equal(
          tags.get(artifact.tag),
          artifact.tagCommit,
          `${artifact.tag}: conflicting Git tag`,
        )
    if (!remote.has(artifact.tag)) missing.push(artifact)
  }
  for (const artifact of missing) {
    assert.equal(
      (await execute('git', ['rev-parse', `${artifact.tagCommit}^{commit}`])).trim(),
      artifact.tagCommit,
      'Tag commit is unavailable',
    )
    if (!local.has(artifact.tag))
      await execute('git', ['tag', '-a', artifact.tag, artifact.tagCommit, '-m', artifact.tag])
  }
  if (missing.length)
    await execute('git', [
      'push',
      '--atomic',
      'origin',
      ...missing.map((a) => `refs/tags/${a.tag}:refs/tags/${a.tag}`),
    ])
  return {
    schemaVersion: 1,
    ok: true,
    commit: intent.commit,
    tags: intent.artifacts.map((a) => ({ name: a.tag, commit: a.tagCommit })),
  }
}

export function transientInstallError(error) {
  return (
    /^npm exited \d+:/.test(error.message) &&
    /npm (?:error|ERR!) code (?:E404|ETARGET|ECONNRESET|ETIMEDOUT|EAI_AGAIN|E408|E429|E500|E502|E503|E504)\b/.test(
      error.message,
    )
  )
}

export async function verifyPublishedMcp(
  intent,
  proof,
  { probe = smoke, sleep = delay, onRetry = () => {} } = {},
) {
  assertRegistryProof(intent, proof)
  const mcp = intent.artifacts.find((a) => a.name === '@wireweave/mcp-server')
  assert.ok(mcp, 'Missing MCP release artifact')
  const result = await retryTransient(
    () => probe({ published: mcp.version, timeoutMs: 15000, installTimeoutMs: 180000 }),
    { attempts: 3, sleep, onRetry, classify: transientInstallError },
  )
  assert.equal(result.ok, true)
  assert.equal(result.version, mcp.version)
  assert.ok(result.toolCount > 0, 'Empty installed MCP evidence')
  for (const name of intent.runtimeNames) {
    const expected = proof.artifacts.find((a) => a.name === name)
    assert.ok(expected, `Missing runtime artifact ${name}`)
    const installed = result.installedPackages.filter((a) =>
      a.path.endsWith(`node_modules/${name}`),
    )
    assert.ok(installed.length > 0, `Missing installed runtime package ${name}`)
    for (const item of installed) {
      assert.equal(item.version, expected.version, `${name}: installed runtime version differs`)
      assert.equal(
        item.integrity,
        expected.integrity,
        `${name}: installed registry artifact differs`,
      )
    }
  }
  return { ...result, intentSha256: proof.intentSha256, commit: intent.commit }
}

export async function recheckArtifacts(
  intent,
  { capture = captureArtifacts, execute = runCommand } = {},
) {
  validateIntent(intent)
  assert.equal(
    (await execute('git', ['rev-parse', 'HEAD'])).trim(),
    intent.commit,
    'Release commit changed',
  )
  assert.equal(
    (await execute('git', ['rev-parse', 'HEAD^{tree}'])).trim(),
    intent.tree,
    'Release tree changed',
  )
  assert.equal(
    (await execute('git', ['status', '--porcelain'])).trim(),
    '',
    'Release worktree changed',
  )
  const current = await capture()
  validateArtifacts(current)
  assert.deepEqual(
    current.map((a) => a.name),
    intent.artifacts.map((a) => a.name),
    'Artifact inventory changed',
  )
  intent.artifacts.forEach((expected, index) => assertSameArtifact(expected, current[index]))
  return {
    schemaVersion: 1,
    ok: true,
    commit: intent.commit,
    intentSha256: hash(JSON.stringify(intent)),
  }
}

function sourcePolicy(branch, versioned) {
  let preState = null
  try {
    preState = JSON.parse(readFileSync('.changeset/pre.json', 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const core = JSON.parse(readFileSync('packages/core/package.json', 'utf8'))
  assertReleasePolicy({ branch, coreVersion: core.version, preState, versioned })
  return preState
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  let reportPath
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        ...Object.fromEntries(
          ['verification', 'intent', 'registry-proof', 'branch', 'commit', 'report'].map((key) => [
            key,
            { type: 'string' },
          ]),
        ),
        versioned: { type: 'boolean' },
      },
    })
    reportPath = values.report
    const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
    const onRetry = (event) => console.error(`[release-registry] retry ${JSON.stringify(event)}`)
    let result
    switch (positionals.join(' ')) {
      case 'capture':
        result = await captureArtifacts()
        break
      case 'policy':
        result = { ok: true, preState: sourcePolicy(values.branch, values.versioned) }
        break
      case 'preflight': {
        await runCommand('git', ['remote', '-v'])
        const tree = (await runCommand('git', ['rev-parse', `${values.commit}^{tree}`])).trim()
        assert.equal((await runCommand('git', ['rev-parse', 'HEAD'])).trim(), values.commit)
        assert.equal((await runCommand('git', ['status', '--porcelain'])).trim(), '')
        result = await prepareIntent({
          verification: read(values.verification),
          currentArtifacts: await captureArtifacts(),
          branch: values.branch,
          commit: values.commit,
          tree,
          preState: sourcePolicy(values.branch, true),
          remoteTags: parseTags(await runCommand('git', ['ls-remote', '--tags', 'origin'])),
        })
        break
      }
      case 'verify':
        result = await verifyRegistry(read(values.intent), { onRetry })
        break
      case 'recheck': {
        const intent = read(values.intent)
        assert.deepEqual(
          sourcePolicy(intent.branch, true),
          intent.preState,
          'Prerelease state changed',
        )
        result = await recheckArtifacts(intent)
        break
      }
      case 'tags':
        result = await recoverTags(read(values.intent), read(values['registry-proof']))
        break
      case 'smoke':
        result = await verifyPublishedMcp(read(values.intent), read(values['registry-proof']), {
          onRetry,
        })
        break
      default:
        throw new Error(
          'Usage: release-registry.mjs policy|capture|preflight|recheck|verify|tags|smoke [--versioned] [--verification FILE] [--intent FILE] [--registry-proof FILE] [--branch main|develop] [--commit SHA] [--report FILE]. Only tags writes Git tags and pushes; never publishes npm packages.',
        )
    }
    if (reportPath) {
      mkdirSync(dirname(reportPath), { recursive: true })
      writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`)
    }
    console.log(JSON.stringify(result))
  } catch (error) {
    const result = { schemaVersion: 1, ok: false, error: error.message }
    if (reportPath) {
      mkdirSync(dirname(reportPath), { recursive: true })
      writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`)
    }
    console.error(JSON.stringify(result))
    process.exitCode = 1
  }
}
