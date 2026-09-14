// Loaded before the installed executable, including on Node 22 where the
// permission model does not yet cover network. A caught denial still fails the
// parent probe: it observes the marker on stderr independently of tool results.
import { createRequire, syncBuiltinESMExports } from 'node:module'

const require = createRequire(import.meta.url)
const stderr = process.stderr.write.bind(process.stderr)
const deny = (name) =>
  function denied() {
    stderr(`[MCP_SMOKE_NETWORK_DENIED] ${name}\n`)
    const error = new Error(`Outbound I/O forbidden by MCP package smoke: ${name}`)
    error.code = 'MCP_SMOKE_NETWORK_DENIED'
    throw error
  }

for (const [module, methods] of [
  ['node:http', ['request', 'get']],
  ['node:https', ['request', 'get']],
  ['node:http2', ['connect']],
  ['node:net', ['connect', 'createConnection']],
  ['node:tls', ['connect']],
  ['node:dgram', ['createSocket']],
  [
    'node:child_process',
    ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'],
  ],
  ['node:worker_threads', ['Worker']],
]) {
  const api = require(module)
  for (const method of methods) api[method] = deny(`${module}.${method}`)
}
require('node:net').Socket.prototype.connect = deny('net.Socket.connect')
for (const module of ['node:dns', 'node:dns/promises']) {
  const api = require(module)
  for (const name of Object.keys(api)) {
    if (/^(lookup|resolve|reverse)/.test(name) && typeof api[name] === 'function') {
      api[name] = deny(`${module}.${name}`)
    }
  }
  if (api.Resolver) {
    for (const name of Object.getOwnPropertyNames(api.Resolver.prototype)) {
      if (/^(resolve|reverse)/.test(name)) {
        api.Resolver.prototype[name] = deny(`${module}.Resolver.${name}`)
      }
    }
  }
}
for (const name of ['fetch', 'WebSocket', 'EventSource']) {
  if (name in globalThis) globalThis[name] = deny(name)
}
syncBuiltinESMExports()
