#!/usr/bin/env node
// Independent protocol fixture: no Wireweave or SDK implementation is imported.
// The consumer's fixture-mode file selects a defect; all responses use the same
// wire protocol that the real MCP Client validates in the package smoke gate.
import { readFileSync } from 'node:fs'
import { request } from 'node:http'
import { Socket } from 'node:net'
import { createSocket } from 'node:dgram'
import { lookup } from 'node:dns/promises'
import { createInterface } from 'node:readline'
import { URL } from 'node:url'
import { Worker } from 'node:worker_threads'

const mode = readFileSync(new URL('./fixture-mode', import.meta.url), 'utf8')
const marker = 'Installed package verified'
const names = ['wireweave_parse', 'wireweave_render_html_code']
const send = (id, result) =>
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`)
if (Object.keys(process.env).some((name) => /API_KEY|TOKEN|SECRET|PASSWORD/.test(name)))
  process.exit(75)
if (mode === 'stdout') process.stdout.write('Listening on stdio\n')
if (mode === 'json-stdout') process.stdout.write('{"hello":"world"}\n')

for await (const line of createInterface({ input: process.stdin })) {
  const message = JSON.parse(line)
  if (!('id' in message) || mode === 'timeout') continue
  if (message.method === 'initialize') {
    send(message.id, {
      protocolVersion: message.params.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: 'fixture', version: mode === 'version' ? '0.0.0' : '1.2.3' },
    })
  } else if (message.method === 'tools/list') {
    const tools = names.map((name) => ({
      name,
      inputSchema: {
        type: 'object',
        properties: { source: { type: 'string' } },
        required: ['source'],
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    }))
    if (mode === 'annotations') delete tools[0].annotations
    if (mode === 'string-hint') tools[0].annotations.readOnlyHint = 'true'
    if (mode === 'catalog') tools.pop()
    if (mode === 'duplicate') tools.push(tools[0])
    if (mode === 'pagination' && !message.params?.cursor)
      send(message.id, { tools: tools.slice(0, 1), nextCursor: 'next' })
    else if (mode === 'pagination') send(message.id, { tools: tools.slice(1) })
    else send(message.id, { tools, ...(mode === 'cursor-loop' ? { nextCursor: 'next' } : {}) })
  } else if (message.method === 'tools/call') {
    if (mode.startsWith('network-')) {
      try {
        if (mode === 'network-fetch') await globalThis.fetch('https://example.invalid')
        if (mode === 'network-http') request('http://example.invalid')
        if (mode === 'network-socket') new Socket().connect(80, '127.0.0.1')
        if (mode === 'network-dns') await lookup('example.invalid')
        if (mode === 'network-udp') createSocket('udp4')
        if (mode === 'network-websocket') new globalThis.WebSocket('ws://example.invalid')
        if (mode === 'network-worker') new Worker('0', { eval: true })
      } catch {
        /* Deliberately swallow the error: the parent must still fail. */
      }
    }
    const parsed = {
      success: true,
      ast: { children: [{ type: 'Page', children: [{ type: 'Text', content: marker }] }] },
    }
    const rendered = { success: true, html: `<html><body>${marker}</body></html>` }
    const result = message.params.name === names[0] ? parsed : rendered
    if (mode === 'tool-failure') result.success = false
    if (mode === 'empty-ast' && result.ast) result.ast.children = []
    if (mode === 'wrong-render' && result.html) result.html = '<html><body>Lost text</body></html>'
    send(message.id, { content: [{ type: 'text', text: JSON.stringify(result) }] })
  }
}
if (mode === 'partial-stdout') process.stdout.write('unframed trailing bytes')
if (mode === 'shutdown-exit') process.exitCode = 2
