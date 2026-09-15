import { V4ParseError, type JsonObject, type JsonValue, type V4SourceSpan } from './v4-types'

export interface V4Token {
  kind: 'word' | 'string' | 'value' | 'punctuation' | 'end'
  text: string
  value: JsonValue
  span: V4SourceSpan
}

export function failV4(
  code: string,
  span: V4SourceSpan,
  messageKey: string,
  details: JsonObject = {},
  path = '',
  phase: 'parse' | 'schema' = 'parse',
): never {
  throw new V4ParseError([
    {
      severity: 'error',
      code,
      phase,
      sourceId: span.sourceId,
      start: span.start,
      end: span.end,
      path,
      messageKey,
      details,
      related: [],
    },
  ])
}

function unpairedSurrogate(value: string): number {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return index - 1
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return index
  }
  return -1
}

const numeric = '-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?'
const unitPattern = new RegExp(`^(${numeric})(px|%|em|rem|vh|vw)$`)
const numberPattern = new RegExp(`^${numeric}$`)

/** Tokens retain offsets in the original source; no newline or BOM rewrite shifts spans. */
export function tokenizeV4(source: string, sourceId: string): V4Token[] {
  let offset = 0
  let line = 1
  let column = 1
  const tokens: V4Token[] = []
  const point = (): V4SourceSpan => ({
    sourceId,
    start: offset,
    end: offset,
    startLine: line,
    startColumn: column,
    endLine: line,
    endColumn: column,
  })
  const spanFrom = (start: V4SourceSpan): V4SourceSpan => ({
    ...start,
    end: offset,
    endLine: line,
    endColumn: column,
  })
  const advance = (): string => {
    if (offset === source.length) return ''
    const character = source[offset++] ?? ''
    if (character === '\r') {
      line++
      column = 1
    } else if (character === '\n') {
      if (source[offset - 2] !== '\r') line++
      column = 1
    } else column++
    return character
  }
  const add = (kind: V4Token['kind'], value: JsonValue, start: V4SourceSpan): void => {
    if (tokens.length >= 2_000_000) failV4('WW_LIMIT', start, 'parse.token-limit')
    tokens.push({ kind, text: source.slice(start.start, offset), value, span: spanFrom(start) })
  }
  const invalidOffset = unpairedSurrogate(source)
  if (invalidOffset !== -1) {
    while (offset < invalidOffset) advance()
    const start = point()
    advance()
    failV4('WW_ENCODING', spanFrom(start), 'parse.lone-surrogate')
  }
  if (new TextEncoder().encode(source).byteLength > 64 * 1024 * 1024) {
    failV4('WW_LIMIT', point(), 'parse.source-byte-limit')
  }
  if (source[0] === '\ufeff') advance()
  while (offset < source.length) {
    if (/[ \t\r\n]/.test(source[offset] ?? '')) {
      advance()
      continue
    }
    const start = point()
    const next = source.slice(offset, offset + 2)
    if (next === '//') {
      while (offset < source.length && !/[\r\n]/.test(source[offset] ?? '')) advance()
      continue
    }
    if (next === '/*') {
      advance()
      advance()
      while (offset < source.length && source.slice(offset, offset + 2) !== '*/') advance()
      if (offset === source.length)
        failV4('WW_SYNTAX', spanFrom(start), 'parse.unterminated-comment')
      advance()
      advance()
      continue
    }
    const character = source[offset]
    if (character === '"' || character === "'") {
      const quote = advance()
      let value = ''
      let closed = false
      while (offset < source.length) {
        const current = advance()
        if (current === quote) {
          closed = true
          break
        }
        if (current === '\r' || current === '\n') {
          failV4('WW_SYNTAX', spanFrom(start), 'parse.newline-in-string')
        }
        if (current !== '\\') {
          value += current
          continue
        }
        const escaped = advance()
        if (escaped === 'u') {
          const hex = source.slice(offset, offset + 4)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            failV4('WW_SYNTAX', spanFrom(start), 'parse.invalid-unicode-escape')
          }
          for (let index = 0; index < 4; index++) advance()
          value += String.fromCharCode(Number.parseInt(hex, 16))
        } else {
          const escapes: Record<string, string> = {
            '"': '"',
            "'": "'",
            '\\': '\\',
            '/': '/',
            b: '\b',
            f: '\f',
            n: '\n',
            r: '\r',
            t: '\t',
          }
          if (!Object.hasOwn(escapes, escaped)) {
            failV4('WW_SYNTAX', spanFrom(start), 'parse.invalid-escape')
          }
          value += escapes[escaped]
        }
      }
      if (!closed) failV4('WW_SYNTAX', spanFrom(start), 'parse.unterminated-string')
      if (unpairedSurrogate(value) !== -1)
        failV4('WW_ENCODING', spanFrom(start), 'parse.lone-surrogate')
      add('string', value, start)
      continue
    }
    if (character !== undefined && '{}[](),=;:'.includes(character)) {
      add('punctuation', advance(), start)
      continue
    }
    while (offset < source.length) {
      const current = source[offset] ?? ''
      if (/[ \t\r\n{}[\](),=;:'"]/.test(current)) break
      if (source.slice(offset, offset + 2) === '//' || source.slice(offset, offset + 2) === '/*')
        break
      advance()
    }
    const text = source.slice(start.start, offset)
    const unit = unitPattern.exec(text)
    if (unit !== null) {
      const value = Number(unit[1])
      if (!Number.isFinite(value)) failV4('WW_SYNTAX', spanFrom(start), 'parse.non-finite-number')
      add('value', { value: value === 0 ? 0 : value, unit: unit[2] ?? '' }, start)
    } else if (numberPattern.test(text)) {
      const value = Number(text)
      if (!Number.isFinite(value)) failV4('WW_SYNTAX', spanFrom(start), 'parse.non-finite-number')
      add('value', value === 0 ? 0 : value, start)
    } else if (text === 'true' || text === 'false' || text === 'null') {
      add('value', text === 'null' ? null : text === 'true', start)
    } else if (/^(?:[A-Za-z_][A-Za-z0-9_-]*|\d+[A-Za-z][A-Za-z0-9-]*)$/.test(text)) {
      if (text === 'NaN' || text === 'Infinity') {
        failV4('WW_SYNTAX', spanFrom(start), 'parse.non-finite-number')
      }
      add('word', text, start)
    } else failV4('WW_SYNTAX', spanFrom(start), 'parse.invalid-token')
  }
  tokens.push({ kind: 'end', text: '', value: null, span: point() })
  return tokens
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

/** Synchronous SHA-256 over bytes; independent of Node, WebCrypto, and I/O. */
export function digestBytesV4(bytes: Uint8Array): string {
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, Math.floor(bytes.length / 0x20000000))
  view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0)
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]
  const words = new Uint32Array(64)
  const rotate = (value: number, count: number): number =>
    (value >>> count) | (value << (32 - count))
  for (let block = 0; block < padded.length; block += 64) {
    for (let index = 0; index < 16; index++) words[index] = view.getUint32(block + index * 4)
    for (let index = 16; index < 64; index++) {
      const x = words[index - 15] ?? 0
      const y = words[index - 2] ?? 0
      words[index] =
        ((words[index - 16] ?? 0) +
          (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) +
          (words[index - 7] ?? 0) +
          (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) >>>
        0
    }
    let [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] = hash
    for (let index = 0; index < 64; index++) {
      const t1 =
        (h +
          (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
          ((e & f) ^ (~e & g)) +
          (SHA256_K[index] ?? 0) +
          (words[index] ?? 0)) >>>
        0
      const t2 =
        ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
      h = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    for (const [index, value] of [a, b, c, d, e, f, g, h].entries()) {
      hash[index] = ((hash[index] ?? 0) + value) >>> 0
    }
  }
  return `sha256:${hash.map((value) => value.toString(16).padStart(8, '0')).join('')}`
}

/** Synchronous SHA-256 over UTF-8 bytes; independent of Node, WebCrypto, and I/O. */
export function digestV4(source: string): string {
  return digestBytesV4(new TextEncoder().encode(source))
}
