import type { JsonObject } from './v4-types'

/** JCS key order and ECMAScript scalar serialization; never expands references. */
export function jcs(value: unknown, depth = 0, ancestors = new Set<object>()): string {
  if (depth > 512) throw new TypeError('JSON nesting limit')
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite JSON number')
    return JSON.stringify(value)
  }
  if (typeof value !== 'object' || value === null || ancestors.has(value))
    throw new TypeError('Invalid or cyclic JSON value')
  ancestors.add(value)
  try {
    if (Array.isArray(value))
      return `[${value.map((item) => jcs(item, depth + 1, ancestors)).join(',')}]`
    if (Object.prototype.toString.call(value) !== '[object Object]')
      throw new TypeError('Invalid JSON object')
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${jcs((value as JsonObject)[key], depth + 1, ancestors)}`,
      )
      .join(',')}}`
  } finally {
    ancestors.delete(value)
  }
}
