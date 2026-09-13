import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getV4SourceSpan, parse } from '../parser'
import type { JsonObject, JsonValue } from '../parser/v4-types'
import { getLinkedAppData } from './v4'
import {
  advanceClock,
  compileApp,
  createAppBundle,
  createRuntime,
  linkApp,
  reduceEvent,
  resetRuntime,
  type AppResult,
  type LinkedApp,
  type RuntimeInput,
  type RuntimeSnapshot,
  type ScreenReference,
} from './index'

const corpus = JSON.parse(
  readFileSync(new URL('../../../../docs/spec/examples.json', import.meta.url), 'utf8'),
) as {
  valid: { id: string; source: string; moduleSources: Record<string, string> }[]
  runtimeCases: {
    id: string
    exampleId: string
    steps: {
      input: RuntimeInput
      expect: {
        states?: Record<string, JsonValue>
        route?: ScreenReference
        pendingRequests?: number
        reservedStates?: number
      }
    }[]
  }[]
}
function unwrap<T>(result: AppResult<T>): T {
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.value
}
function admitted(source: string): AppResult<LinkedApp> {
  const parsed = parse(source, { languageVersion: '4.0.0' })
  const moduleSources = Object.fromEntries(
    parsed.modules.map((module) => {
      const span = getV4SourceSpan(module)!
      const bytes = source.slice(span.start, span.end)
      return [
        module.id,
        'sha256:' + createHash('sha256').update(bytes).digest('hex') === module.sourceDigest
          ? bytes
          : source,
      ]
    }),
  )
  return linkApp(
    unwrap(
      createAppBundle([parsed], {
        id: parsed.app.id,
        entry: parsed.app.entry!,
        profile: parsed.app.profile,
        states: parsed.states,
        fixtures: parsed.fixtures,
        registry: parsed.registry,
        moduleSources,
      }),
    ),
  )
}
function linked(source: string): LinkedApp {
  return unwrap(admitted(source))
}
function observed(snapshot: RuntimeSnapshot, app: LinkedApp, ref: string): JsonValue | undefined {
  if (ref.startsWith('app:')) return snapshot.states[ref]
  const node = getLinkedAppData(app)!.nodes.find(
    (node) =>
      node.identity.instanceRoot.namespace === snapshot.route?.namespace &&
      node.identity.instanceRoot.id === snapshot.route?.id &&
      node.stateBindings[ref],
  )
  return node ? snapshot.states[node.stateBindings[ref].key] : undefined
}
const source = (app: LinkedApp, id: string) =>
  app.sourceMap.find((entry) => entry.identity.localId === id)!.identity
const click = (snapshot: RuntimeSnapshot, app: LinkedApp, id: string) =>
  reduceEvent(snapshot, { kind: 'event', source: source(app, id), event: 'click' })
function dsl(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(dsl).join(',')}]`
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .map(([key, value]) => `${key}=${dsl(value)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
const operation = (id: string, effect: JsonObject, extra: JsonObject = {}): JsonObject => ({
  id,
  executionClass:
    effect.kind === 'simulate'
      ? 'simulated'
      : effect.kind === 'specify'
        ? 'specified'
        : 'executable',
  effect,
  after: [],
  onFailure: 'stop',
  obligationRefs: [],
  ...extra,
})
const control = (id: string, operations: JsonObject[], concurrency = 'drop'): string =>
  `button "${id}" id=${id} on=${dsl([{ id: 'click', event: 'click', operations, concurrency }])}`
const state = (
  id: string,
  type: string,
  initial: JsonValue,
  lifetime = 'session',
  sensitive = false,
): JsonObject => ({ id, type, initial, lifetime, sensitive })
const appSource = (
  body: string,
  states: JsonObject[] = [],
  fixtures: JsonObject[] = [],
  extra = '',
): string =>
  `app demo entry={namespace=main,id=home} states=${dsl(states)} fixtures=${dsl(fixtures)} { module main namespace=main { page "Home" id=home { ${body} } ${extra} } }`
const simulation = operation('request', {
  kind: 'simulate',
  fixtureRef: 'response',
  resultState: 'app:result',
  statusState: 'app:status',
  errorState: 'app:error',
  timeoutMs: 50,
})
const outputs = [
  state('result', 'record', {}),
  state('status', 'string', 'idle'),
  state('error', 'record', {}),
]
const fixture = (steps: JsonObject[], exhaustion = 'error'): JsonObject => ({
  id: 'response',
  steps,
  exhaustion,
})

describe('the canonical virtual-clock conformance corpus', () => {
  it.each(corpus.runtimeCases)(
    '$id executes the real reducer and matches exact observations',
    (testCase) => {
      const example = corpus.valid.find((example) => example.id === testCase.exampleId)!
      const app = linked(example.source)
      const run = (): RuntimeSnapshot => {
        let snapshot = createRuntime(app)
        for (const step of testCase.steps) {
          const before = JSON.stringify(snapshot)
          const next = reduceEvent(snapshot, step.input)
          expect(JSON.stringify(snapshot)).toBe(before)
          snapshot = next
          for (const [ref, value] of Object.entries(step.expect.states ?? {}))
            expect(
              observed(snapshot, app, ref),
              `${testCase.id}: ${ref}; ${JSON.stringify(snapshot.trace.slice(-3))}`,
            ).toEqual(value)
          if (step.expect.route) expect(snapshot.route).toEqual(step.expect.route)
          if (step.expect.pendingRequests !== undefined)
            expect(Object.keys(snapshot.requests)).toHaveLength(step.expect.pendingRequests)
          if (step.expect.reservedStates !== undefined)
            expect(Object.keys(snapshot.reservations)).toHaveLength(step.expect.reservedStates)
        }
        return snapshot
      }
      expect(run()).toEqual(run())
    },
  )
  it('rejects forged runtime snapshots and preserves source provenance', () => {
    const app = linked(appSource('text "Home"'))
    const snapshot = createRuntime(app)
    expect(Object.isFrozen(snapshot.states)).toBe(true)
    expect(() =>
      reduceEvent(JSON.parse(JSON.stringify(snapshot)) as RuntimeSnapshot, { kind: 'reset' }),
    ).toThrow('Untrusted RuntimeSnapshot')
    expect(unwrap(compileApp(app)).sourceMap).toBe(app.sourceMap)
  })
})

describe('fixture ordering, reservations, cancellation and reset', () => {
  it.each([
    ['success', 10, 'succeeded'],
    ['error', 10, 'failed'],
    ['timeout', 0, 'failed'],
    ['success', 50, 'failed'],
  ] as const)('%s at %i ms has the declared completion semantics', (outcome, delayMs, status) => {
    const app = linked(
      appSource(control('run', [simulation]), outputs, [
        fixture([{ delayMs, outcome, value: { data: 1 } }]),
      ]),
    )
    let snapshot = click(createRuntime(app), app, 'run')
    expect(snapshot.states['app:status']).toBe('pending')
    expect(Object.keys(snapshot.reservations)).toHaveLength(3)
    snapshot = advanceClock(snapshot, outcome === 'timeout' || delayMs === 50 ? 50 : 10)
    expect(snapshot.states['app:status']).toBe(status)
    expect(snapshot.states['app:result']).toEqual(status === 'succeeded' ? { data: 1 } : {})
    expect(Object.keys(snapshot.reservations)).toHaveLength(0)
    if (delayMs === 50)
      expect(
        snapshot.trace
          .filter((entry) => entry.operationId === 'request')
          .some((entry) => entry.diagnostic === 'timeout'),
      ).toBe(true)
  })
  it('queues a zero-delay completion after the initiating transaction', () => {
    const app = linked(
      appSource(control('run', [simulation]), outputs, [
        fixture([{ delayMs: 0, outcome: 'success', value: { ok: true } }]),
      ]),
    )
    const pending = click(createRuntime(app), app, 'run')
    expect(pending.states['app:status']).toBe('pending')
    expect(advanceClock(pending, 0).states['app:status']).toBe('succeeded')
  })
  it.each(['error', 'repeat-last'])(
    'honors exhaustion=%s without inventing a fixture step',
    (exhaustion) => {
      const app = linked(
        appSource(control('run', [simulation]), outputs, [
          fixture([{ delayMs: 0, outcome: 'success', value: { result: 1 } }], exhaustion),
        ]),
      )
      let snapshot = advanceClock(click(createRuntime(app), app, 'run'), 0)
      snapshot = advanceClock(click(snapshot, app, 'run'), 0)
      expect(snapshot.states['app:status']).toBe(exhaustion === 'error' ? 'failed' : 'succeeded')
      if (exhaustion === 'error')
        expect(snapshot.states['app:error']).toEqual({
          code: 'fixture-exhausted',
          value: null,
          operationId: 'request',
        })
    },
  )
  it.each(['drop', 'queue'])('handles duplicate activation with concurrency=%s', (concurrency) => {
    const app = linked(
      appSource(control('run', [simulation], concurrency), outputs, [
        fixture([{ delayMs: 10, outcome: 'success', value: { ok: true } }], 'repeat-last'),
      ]),
    )
    let snapshot = click(createRuntime(app), app, 'run')
    snapshot = click(snapshot, app, 'run')
    expect(Object.keys(snapshot.requests)).toHaveLength(1)
    if (concurrency === 'drop') expect(snapshot.trace.at(-1)?.result).toBe('busy')
    else expect(snapshot.queue).toHaveLength(1)
    snapshot = advanceClock(snapshot, 10)
    expect(Object.keys(snapshot.requests)).toHaveLength(concurrency === 'queue' ? 1 : 0)
    snapshot = advanceClock(snapshot, 10)
    expect(Object.keys(snapshot.requests)).toHaveLength(0)
    expect(snapshot.fixtureCursors.response).toBe(concurrency === 'queue' ? 2 : 1)
  })
  it('prevents writes to reserved state and releases reservations on reset', () => {
    const app = linked(
      appSource(
        control('run', [simulation]) +
          control('overwrite', [
            operation('write', {
              kind: 'set',
              state: 'app:result',
              value: { literal: { forged: true } },
            }),
          ]),
        outputs,
        [fixture([{ delayMs: 10, outcome: 'success', value: {} }])],
      ),
    )
    let snapshot = click(createRuntime(app), app, 'run')
    snapshot = click(snapshot, app, 'overwrite')
    expect(snapshot.states['app:result']).toEqual({})
    expect(snapshot.trace.at(-1)?.diagnostic).toBe('state-busy')
    const reset = resetRuntime(snapshot)
    expect(reset.resetGeneration).toBe(snapshot.resetGeneration + 1)
    expect(reset.states['app:status']).toBe('idle')
    expect(reset.requests).toEqual({})
    expect(reset.reservations).toEqual({})
    expect(reset.scheduled).toEqual([])
    expect(reset.fixtureCursors).toEqual({})
    expect(advanceClock(reset, 50).states['app:status']).toBe('idle')
  })
  it('does not roll back an earlier committed segment when the continuation fails', () => {
    const app = linked(
      appSource(
        control('run', [
          operation('prefix', { kind: 'set', state: 'app:count', value: { literal: 1 } }),
          simulation,
          operation(
            'bad',
            {
              kind: 'set',
              state: 'app:count',
              value: { call: 'divide', args: [{ literal: 1 }, { literal: 0 }] },
            },
            { after: ['request'] },
          ),
        ]),
        [...outputs, state('count', 'number', 0)],
        [fixture([{ delayMs: 0, outcome: 'success', value: { accepted: true } }])],
      ),
    )
    const done = advanceClock(click(createRuntime(app), app, 'run'), 0)
    expect(done.states['app:count']).toBe(1)
    expect(done.states['app:status']).toBe('succeeded')
    expect(done.states['app:result']).toEqual({ accepted: true })
    expect(done.trace.at(-1)?.diagnostic).toBe('division-by-zero')
  })
})

describe('state lifetime, history, overlays and Unicode', () => {
  it('resets mount state and retains session state while moving through typed history', () => {
    const source = `app demo entry={namespace=main,id=home} { module main namespace=main { page "Home" id=home states=${dsl([state('mounted', 'number', 0, 'mount'), state('session', 'number', 0)])} { ${control('edit', [operation('mount', { kind: 'set', state: 'screen:mounted', value: { literal: 9 } }), operation('session', { kind: 'set', state: 'screen:session', value: { literal: 8 } })])} link "Next" id=next navigate=settings } page "Settings" id=settings { ${control('back', [operation('back', { kind: 'navigateBack' })])} } } }`
    const app = linked(source)
    let snapshot = click(createRuntime(app), app, 'edit')
    snapshot = click(snapshot, app, 'next')
    snapshot = click(snapshot, app, 'back')
    expect(observed(snapshot, app, 'screen:mounted')).toBe(0)
    expect(observed(snapshot, app, 'screen:session')).toBe(8)
    const boundary = click(snapshot, app, 'next')
    expect(boundary.route?.id).toBe('settings')
  })
  it('reports history boundaries and does not close an overlay as a substitute', () => {
    const app = linked(
      appSource(
        `${control('back', [operation('back', { kind: 'navigateBack' })])} button "Open" id=open opens=dialog modal "Dialog" id=dialog { button "Close" id=close action=close }`,
      ),
    )
    let snapshot = click(createRuntime(app), app, 'back')
    expect(snapshot.trace.at(-1)?.result).toBe('history-boundary')
    snapshot = click(snapshot, app, 'open')
    expect(snapshot.overlays).toHaveLength(1)
    expect(snapshot.focus).toBe(
      app.sourceMap.find((entry) => entry.identity.localId === 'close')!.renderedId,
    )
    snapshot = click(snapshot, app, 'close')
    expect(snapshot.overlays).toHaveLength(0)
    expect(snapshot.focus).toBe(
      app.sourceMap.find((entry) => entry.identity.localId === 'open')!.renderedId,
    )
  })
  it('executes declared vertical tab keys while skipping an explicitly disabled tab', () => {
    const app = linked(
      appSource(
        'tabs "Views" id=views vertical { tab "First" id=first {} tab "Unavailable" id=unavailable disabled {} tab "Last" id=last {} }',
      ),
    )
    const rendered = (id: string) =>
      app.sourceMap.find((entry) => entry.identity.localId === id)!.renderedId
    let snapshot = reduceEvent(createRuntime(app), {
      kind: 'event',
      source: source(app, 'first'),
      event: 'focus',
    })
    snapshot = reduceEvent(snapshot, {
      kind: 'event',
      source: source(app, 'first'),
      event: 'keydown',
      key: 'ArrowDown',
    })
    expect(snapshot.focus).toBe(rendered('last'))
    expect(snapshot.selection[rendered('views')]).toBe(0)
    snapshot = reduceEvent(snapshot, {
      kind: 'event',
      source: source(app, 'last'),
      event: 'keydown',
      key: ' ',
    })
    expect(snapshot.selection[rendered('views')]).toBe(2)
    expect(click(snapshot, app, 'unavailable').selection[rendered('views')]).toBe(2)
    expect(unwrap(compileApp(app)).html).toContain('aria-orientation="vertical"')
  })
  it.each([
    ['lower', 'ΟΣ', 'ος'],
    ['lower', 'ΟΣΑ', 'οσα'],
    ['lower', 'İ', 'i\u0307'],
    ['upper', 'Straße', 'STRASSE'],
    ['lower', '𐐀', '𐐨'],
    ['trim', '\u0085\u2003value\u3000', 'value'],
  ] as const)('executes pinned Unicode %s for %s', (call, input, expected) => {
    const app = linked(
      appSource(
        control('convert', [
          operation('convert', {
            kind: 'set',
            state: 'app:text',
            value: { call, args: [{ literal: input }] },
          }),
        ]),
        [state('text', 'string', '')],
      ),
    )
    expect(click(createRuntime(app), app, 'convert').states['app:text']).toBe(expected)
  })
  it('redacts sensitive event values and avoids their raw value digests', () => {
    const secret = 'unique-sensitive-password'
    const app = linked(
      appSource(
        'input "Password" id=password inputType=password bind={state="app:secret",property=value,update=input}',
        [state('secret', 'string', '', 'session', true)],
      ),
    )
    const snapshot = reduceEvent(createRuntime(app), {
      kind: 'event',
      source: source(app, 'password'),
      event: 'input',
      value: secret,
    })
    const trace = JSON.stringify(snapshot.trace)
    expect(trace).not.toContain(secret)
    expect(trace).not.toContain(createHash('sha256').update(secret).digest('hex'))
    expect(trace).toContain('[redacted]')
  })
})

describe('closed inputs, atomic failures and resource bounds', () => {
  it('rejects extra input fields and invalid clock ranges without changing authored state', () => {
    const app = linked(appSource('text "Home"'))
    const initial = createRuntime(app)
    const invalid = reduceEvent(initial, { kind: 'reset', extra: true } as unknown as RuntimeInput)
    expect(invalid.resetGeneration).toBe(0)
    expect(invalid.trace.at(-1)?.diagnostic).toBe('input-shape')
    for (const delta of [-1, 0.5, 600001, Infinity])
      expect(advanceClock(initial, delta).trace.at(-1)?.diagnostic).toBe('limit-clock')
    expect(advanceClock(initial, 600000).virtualTime).toBe(600000)
  })
  it('caps queued handler activations without dropping accepted work', () => {
    const app = linked(
      appSource(control('run', [simulation], 'queue'), outputs, [
        fixture([{ delayMs: 10, outcome: 'success', value: {} }], 'repeat-last'),
      ]),
    )
    let snapshot = click(createRuntime(app), app, 'run')
    for (let index = 0; index < 4096; index++) snapshot = click(snapshot, app, 'run')
    expect(snapshot.queue).toHaveLength(4096)
    const rejected = click(snapshot, app, 'run')
    expect(rejected.queue).toHaveLength(4096)
    expect(rejected.trace.at(-1)?.diagnostic).toBe('limit-queue')
    expect(Object.keys(rejected.requests)).toHaveLength(1)
  }, 30000)
  it('continues independent effects and skips dependencies of failed effects', () => {
    const app = linked(
      appSource(
        control('run', [
          operation(
            'fail',
            {
              kind: 'set',
              state: 'app:value',
              value: { call: 'divide', args: [{ literal: 1 }, { literal: 0 }] },
            },
            { onFailure: 'continue' },
          ),
          operation(
            'dependent',
            { kind: 'set', state: 'app:value', value: { literal: 5 } },
            { after: ['fail'] },
          ),
          operation('independent', { kind: 'set', state: 'app:value', value: { literal: 7 } }),
        ]),
        [state('value', 'number', 0)],
      ),
    )
    const snapshot = click(createRuntime(app), app, 'run')
    expect(snapshot.states['app:value']).toBe(7)
    expect(snapshot.trace.map((entry) => entry.result)).toEqual([
      'failed',
      'skipped-dependency',
      'succeeded',
    ])
  })
  it('preserves the whole route segment when exit fails after cancelling a request', () => {
    const exit = [
      {
        id: 'leave',
        event: 'exit',
        concurrency: 'drop',
        operations: [
          operation('reject', {
            kind: 'set',
            state: 'app:result',
            value: { call: 'divide', args: [{ literal: 1 }, { literal: 0 }] },
          }),
        ],
      },
    ]
    const sourceText = appSource(
      control('run', [simulation]) + 'link "Leave" id=leave navigate=next',
      outputs,
      [fixture([{ delayMs: 10, outcome: 'success', value: { ok: true } }])],
      'page "Next" id=next {}',
    ).replace('page "Home" id=home {', `page "Home" id=home on=${dsl(exit)} {`)
    const app = linked(sourceText)
    const pending = click(createRuntime(app), app, 'run'),
      rejected = click(pending, app, 'leave')
    expect(rejected.route?.id).toBe('home')
    expect(rejected.states['app:status']).toBe('pending')
    expect(rejected.requests).toEqual(pending.requests)
    expect(rejected.reservations).toEqual(pending.reservations)
    expect(advanceClock(rejected, 10).states['app:status']).toBe('succeeded')
  })
  it('records the exact stale operation source after unmount cancellation', () => {
    const app = linked(
      appSource(
        control('run', [simulation]) + 'link "Leave" id=leave navigate=next',
        outputs,
        [fixture([{ delayMs: 10, outcome: 'success', value: { ok: true } }])],
        'page "Next" id=next {}',
      ),
    )
    const done = advanceClock(click(click(createRuntime(app), app, 'run'), app, 'leave'), 10)
    expect(done.states['app:status']).toBe('cancelled')
    expect(done.trace.at(-1)).toMatchObject({
      operationId: 'request',
      executionClass: 'simulated',
      result: 'stale-response',
      source: source(app, 'run'),
    })
  })
  it('uses replace without extending the owned history range', () => {
    const app = linked(
      appSource(
        control('replace', [
          operation('go', {
            kind: 'navigate',
            target: { kind: 'screen', screen: { namespace: 'main', id: 'next' } },
            history: 'replace',
          }),
        ]),
        [],
        [],
        'page "Next" id=next {}',
      ),
    )
    const snapshot = click(createRuntime(app), app, 'replace')
    expect(snapshot.history).toHaveLength(1)
    expect(snapshot.route?.id).toBe('next')
    expect(snapshot.effects[0]?.kind).toBe('replace')
  })
})

describe('focus notifications and observed native focus', () => {
  it('runs observed focus/blur once and keeps programmatic focus transitions ordered', () => {
    const handlers = [
      {
        id: 'focus',
        event: 'focus',
        concurrency: 'drop',
        operations: [
          operation('countFocus', {
            kind: 'set',
            state: 'app:focused',
            value: { call: 'add', args: [{ state: 'app:focused' }, { literal: 1 }] },
          }),
        ],
      },
      {
        id: 'blur',
        event: 'blur',
        concurrency: 'drop',
        operations: [
          operation('countBlur', {
            kind: 'set',
            state: 'app:blurred',
            value: { call: 'add', args: [{ state: 'app:blurred' }, { literal: 1 }] },
          }),
        ],
      },
    ]
    const app = linked(
      appSource(
        `input "First" id=first on=${dsl(handlers)} input "Second" id=second ${control('focusFirst', [operation('focus', { kind: 'focus', target: { scope: 'screen', id: 'first' } })])}`,
        [state('focused', 'number', 0), state('blurred', 'number', 0)],
      ),
    )
    let snapshot = reduceEvent(createRuntime(app), {
      kind: 'event',
      source: source(app, 'first'),
      event: 'focus',
    })
    expect(snapshot.states['app:focused']).toBe(1)
    snapshot = reduceEvent(snapshot, { kind: 'event', source: source(app, 'first'), event: 'blur' })
    expect(snapshot.states['app:blurred']).toBe(1)
    expect(snapshot.focus).toBeNull()
    snapshot = reduceEvent(snapshot, {
      kind: 'event',
      source: source(app, 'second'),
      event: 'focus',
    })
    expect(snapshot.focus).toBe(
      app.sourceMap.find((entry) => entry.identity.localId === 'second')?.renderedId,
    )
    expect(click(createRuntime(app), app, 'focusFirst').states['app:focused']).toBe(1)
  })
})

describe('compile-time runtime admission', () => {
  const rejected = (source: string, code: string): void => {
    const result = admitted(source)
    expect(result.ok).toBe(false)
    if (result.ok) throw Error('Expected rejection')
    expect(result.value).toBeNull()
    expect(
      result.diagnostics.some((entry) => entry.code === code),
      JSON.stringify(result.diagnostics),
    ).toBe(true)
  }
  it.each([
    [
      'initial status',
      {
        ...simulation,
        effect: { ...(simulation.effect as JsonObject), statusState: 'app:result' },
      },
    ],
    [
      'overlapping result',
      { ...simulation, effect: { ...(simulation.effect as JsonObject), resultState: 'app:error' } },
    ],
  ])('rejects invalid fixture %s', (_label, op) =>
    rejected(
      appSource(control('run', [op]), outputs, [
        fixture([{ delayMs: 0, outcome: 'success', value: {} }]),
      ]),
      'WW_EFFECT',
    ),
  )
  it('rejects a fixture success with an incompatible result type', () =>
    rejected(
      appSource(control('run', [simulation]), outputs, [
        fixture([{ delayMs: 0, outcome: 'success', value: 'wrong' }]),
      ]),
      'WW_EFFECT',
    ))
  it.each([
    ['main {} main {}', 'WW_ACCESSIBILITY'],
    ['form id=form { input "A" id=a name=duplicate input "B" id=b name=duplicate }', 'WW_FORM'],
    ['modal "Dialog" id=dialog initialFocus=absent {}', 'WW_ACCESSIBILITY'],
    ['card id=card navigate=home { button "Nested" id=nested }', 'WW_ACCESSIBILITY'],
    ['row p=-1 {}', 'WW_LAYOUT'],
    ['text "Wrong" minW=200 maxW=100', 'WW_LAYOUT'],
    ['row align=left { button "Order" id=order }', 'WW_LAYOUT'],
    ['row order=1 { button "Order" id=order }', 'WW_ACCESSIBILITY'],
    ['text "Position" x=10', 'WW_LAYOUT'],
  ])('rejects invalid rendered semantics %s', (body, code) => rejected(appSource(body), code))
  it('rejects nested forms at the earliest parser admission boundary', () =>
    expect(() =>
      parse(appSource('form id=outer { form id=inner {} }'), { languageVersion: '4.0.0' }),
    ).toThrow('parse.nested-form'))
  it('accepts consistent fixed device/width-only frames and rejects conflicts', () => {
    expect(
      admitted(
        appSource('text "Home"').replace('id=home {', 'id=home device=desktop viewport=1440 {'),
      ).ok,
    ).toBe(true)
    rejected(
      appSource('text "Home"').replace('id=home {', 'id=home device=iphone14 {'),
      'WW_VIEWPORT',
    )
  })
  it('retains spacing precedence and fixed viewport units in scoped CSS', () => {
    const html = unwrap(
      compileApp(
        linked(
          appSource('row p=3 px=7 pl=2 gap=1 { col span=6 md=4 { text "Fixed" id=fixed w=10vw } }'),
        ),
      ),
    ).html
    expect(html).toContain('padding:12px;padding-inline:7px;padding-left:8px;gap:4px')
    expect(html).toContain('width:144px')
    expect(html).toContain('data-wf-tooling="view"')
    expect(html).not.toContain(' style=')
  })
  it('fails closed for non-decoded asset or font bytes and remote image URLs', () => {
    rejected(appSource('image id=logo src="https://example.test/logo.svg" alt="Logo"'), 'WW_ASSET')
    const sourceText = appSource('text "Home"').replace(
      'app demo ',
      `app demo profile={id=neutral-app,width=1440,height=900,language=en,entryPolicy=explicit,unknownRoute=error-view,clockStartMs=0,limits=standard-1,assets=[{id=font,mediaType="font/woff2",digest="sha256:${'0'.repeat(64)}",byteLength=3,base64="YWJj"}],fontAssetId=font,unicodeVersion="15.1.0"} `,
    )
    rejected(sourceText, 'WW_ASSET')
  })
})
