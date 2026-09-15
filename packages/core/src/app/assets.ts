import { digestBytesV4 } from '../parser/v4-lexical'
import type { JsonObject, JsonValue } from '../parser/v4-types'

export type AppAssetMediaType =
  'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml' | 'font/woff2'

export interface ValidatedAppAsset {
  readonly id: string
  readonly mediaType: AppAssetMediaType
  readonly digest: string
  readonly byteLength: number
  readonly base64: string
}

export interface AssetValidationIssue {
  readonly key: string
  readonly details: JsonObject
}

export interface ValidatedAppAssets {
  readonly assets: ReadonlyMap<string, ValidatedAppAsset>
  readonly issues: readonly AssetValidationIssue[]
}

const assetId = /^[A-Za-z_][A-Za-z0-9_-]{0,127}$/
const digest = /^sha256:[0-9a-f]{64}$/
const base64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const mediaTypes = new Set<AppAssetMediaType>([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'font/woff2',
])
const MAX_ASSET_BYTES = 16 * 1024 * 1024
const MAX_TOTAL_ASSET_BYTES = 32 * 1024 * 1024

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function string(value: JsonValue | undefined): value is string {
  return typeof value === 'string'
}

function bytesEqual(bytes: Uint8Array, expected: readonly number[]): boolean {
  return bytes.length >= expected.length && expected.every((value, index) => bytes[index] === value)
}

function uint16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)
}

function uint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) * 0x1000000 +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  )
}

function uint32Le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) +
    ((bytes[offset + 1] ?? 0) << 8) +
    ((bytes[offset + 2] ?? 0) << 16) +
    (bytes[offset + 3] ?? 0) * 0x1000000
  )
}

/** Decode the schema's canonical base64 alphabet without relying on Node or browser globals. */
function decodeBase64(value: string): Uint8Array | undefined {
  if (!base64.test(value) || value.length % 4 !== 0) return undefined
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const bytes = new Uint8Array((value.length / 4) * 3 - padding)
  let output = 0
  for (let index = 0; index < value.length; index += 4) {
    const quartet = value.slice(index, index + 4)
    const values = [...quartet].map((character) =>
      character === '='
        ? 0
        : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(character),
    )
    if (values.some((item) => item < 0)) return undefined
    const packed =
      ((values[0] ?? 0) << 18) |
      ((values[1] ?? 0) << 12) |
      ((values[2] ?? 0) << 6) |
      (values[3] ?? 0)
    if (output < bytes.length) bytes[output++] = (packed >>> 16) & 0xff
    if (output < bytes.length) bytes[output++] = (packed >>> 8) & 0xff
    if (output < bytes.length) bytes[output++] = packed & 0xff
  }
  return bytes
}

function validSvg(bytes: Uint8Array): boolean {
  let source: string
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return false
  }
  const trimmed = source.trim()
  if (!/^(?:<\?xml\b[^>]*>\s*)?<svg(?:\s|>)/i.test(trimmed) || !/<\/svg\s*>\s*$/i.test(trimmed))
    return false
  if (/<(?:script|foreignObject|iframe|object|embed)(?:\s|>)/i.test(source)) return false
  if (/<!DOCTYPE|<!ENTITY|\b(?:on[a-z][a-z0-9:_-]*)\s*=/i.test(source)) return false
  if (/@import\b/i.test(source)) return false
  const hrefs = /(?:xlink:)?(?:href|src)\s*=\s*(['"])(.*?)\1/gi
  for (const match of source.matchAll(hrefs))
    if (!(match[2] ?? '').trim().startsWith('#')) return false
  const urls = /url\(\s*(['"]?)(.*?)\1\s*\)/gi
  for (const match of source.matchAll(urls))
    if (!(match[2] ?? '').trim().startsWith('#')) return false
  return true
}

function validMediaType(bytes: Uint8Array, mediaType: AppAssetMediaType): boolean {
  if (mediaType === 'image/png')
    return (
      bytes.length >= 24 &&
      bytesEqual(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
      uint32(bytes, 8) === 13 &&
      bytesEqual(bytes.slice(12), [0x49, 0x48, 0x44, 0x52]) &&
      uint32(bytes, 16) > 0 &&
      uint32(bytes, 20) > 0
    )
  if (mediaType === 'image/jpeg') return bytesEqual(bytes, [0xff, 0xd8, 0xff])
  if (mediaType === 'image/webp')
    return (
      bytes.length >= 12 &&
      bytesEqual(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      uint32Le(bytes, 4) === bytes.length - 8 &&
      bytesEqual(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
    )
  if (mediaType === 'font/woff2')
    return (() => {
      if (
        bytes.length < 48 ||
        !bytesEqual(bytes, [0x77, 0x4f, 0x46, 0x32]) ||
        uint32(bytes, 8) !== bytes.length ||
        uint16(bytes, 12) === 0 ||
        uint16(bytes, 14) !== 0 ||
        uint32(bytes, 16) === 0
      )
        return false
      const range = (offset: number, length: number): boolean =>
        length === 0 ? offset === 0 : offset >= 48 && offset + length <= bytes.length
      return (
        range(uint32(bytes, 28), uint32(bytes, 32)) && range(uint32(bytes, 40), uint32(bytes, 44))
      )
    })()
  return validSvg(bytes)
}

function issue(key: string, index: number, extra: JsonObject = {}): AssetValidationIssue {
  return { key, details: { index, ...extra } }
}

export function validateAppAssets(profile: JsonObject): ValidatedAppAssets {
  const assets = new Map<string, ValidatedAppAsset>()
  const seenIds = new Set<string>()
  const issues: AssetValidationIssue[] = []
  const raw = profile.assets
  if (raw !== undefined && !Array.isArray(raw)) {
    issues.push({ key: 'app.assets-shape', details: {} })
  }
  const entries = Array.isArray(raw) ? raw : []
  if (entries.length > 10000)
    issues.push({ key: 'app.assets-count', details: { count: entries.length } })
  let totalBytes = 0
  for (const [index, value] of entries.entries()) {
    if (!object(value)) {
      issues.push(issue('app.asset-shape', index))
      continue
    }
    const id = value.id
    const mediaType = value.mediaType
    const expectedDigest = value.digest
    const byteLength = value.byteLength
    const encoded = value.base64
    if (!string(id) || !assetId.test(id)) {
      issues.push(issue('app.asset-id', index))
      continue
    }
    if (seenIds.has(id)) {
      issues.push(issue('app.asset-duplicate', index, { id }))
      continue
    }
    seenIds.add(id)
    if (!string(mediaType) || !mediaTypes.has(mediaType as AppAssetMediaType)) {
      issues.push(issue('app.asset-media-type', index, { id }))
      continue
    }
    if (!string(expectedDigest) || !digest.test(expectedDigest)) {
      issues.push(issue('app.asset-digest', index, { id }))
      continue
    }
    if (
      typeof byteLength !== 'number' ||
      !Number.isInteger(byteLength) ||
      byteLength < 0 ||
      byteLength > MAX_ASSET_BYTES
    ) {
      issues.push(issue('app.asset-byte-length', index, { id }))
      continue
    }
    if (!string(encoded)) {
      issues.push(issue('app.asset-base64', index, { id }))
      continue
    }
    const bytes = decodeBase64(encoded)
    if (bytes === undefined) {
      issues.push(issue('app.asset-base64', index, { id }))
      continue
    }
    if (bytes.byteLength !== byteLength) {
      issues.push(issue('app.asset-byte-length-mismatch', index, { id }))
      continue
    }
    if (digestBytesV4(bytes) !== expectedDigest) {
      issues.push(issue('app.asset-digest-mismatch', index, { id }))
      continue
    }
    if (!validMediaType(bytes, mediaType as AppAssetMediaType)) {
      issues.push(issue('app.asset-content', index, { id, mediaType }))
      continue
    }
    totalBytes += bytes.byteLength
    if (totalBytes > MAX_TOTAL_ASSET_BYTES) {
      issues.push({ key: 'app.asset-total-byte-limit', details: { limit: MAX_TOTAL_ASSET_BYTES } })
      break
    }
    assets.set(id, {
      id,
      mediaType: mediaType as AppAssetMediaType,
      digest: expectedDigest,
      byteLength,
      base64: encoded,
    })
  }
  if (profile.fontAssetId !== undefined) {
    if (!string(profile.fontAssetId) || !assetId.test(profile.fontAssetId)) {
      issues.push({ key: 'app.font-asset-id', details: {} })
    } else {
      const font = assets.get(profile.fontAssetId)
      if (font === undefined || font.mediaType !== 'font/woff2')
        issues.push({ key: 'app.font-asset-missing', details: { id: profile.fontAssetId } })
    }
  }
  return { assets, issues }
}
