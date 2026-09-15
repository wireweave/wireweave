import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { getV4SourceSpan, parse, type ParsedDocument } from '../parser'
import {
  compileApp,
  createAppBundle,
  linkApp,
  linkAndCompileApp,
  renderSite,
  type AppArtifact,
  type AppBundle,
  type AppResult,
  type CreateAppBundleOptions,
  type LinkedApp,
  type RuntimeSnapshot,
} from './index'

const corpus = JSON.parse(
  readFileSync(new URL('../../../../docs/spec/examples.json', import.meta.url), 'utf8'),
) as {
  valid: { id: string; source: string; moduleSources: Record<string, string> }[]
}
const hash = (text: string): string => `sha256:${createHash('sha256').update(text).digest('hex')}`
function value<T>(result: AppResult<T>): T {
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.value
}
function options(parsed: ParsedDocument, source: string): CreateAppBundleOptions {
  const moduleSources: Record<string, string> = {}
  for (const module of parsed.modules) {
    const span = getV4SourceSpan(module)!
    const bytes = source.slice(span.start, span.end)
    moduleSources[module.id] = hash(bytes) === module.sourceDigest ? bytes : source
  }
  return {
    id: parsed.app.id,
    entry: parsed.app.entry!,
    profile: parsed.app.profile,
    states: parsed.states,
    registry: parsed.registry,
    fixtures: parsed.fixtures,
    moduleSources,
  }
}
function bundle(source: string): AppBundle {
  const parsed = parse(source, { languageVersion: '4.0.0', sourceId: 'test.wf' })
  return value(createAppBundle([parsed], options(parsed, source)))
}
const app = (body: string, attrs = ''): string =>
  `app demo entry={namespace=main,id=home} ${attrs} { module main namespace=main { ${body} } }`
const page = (body = '', attrs = ''): string => `page "Home" id=home ${attrs} { ${body} }`
function failure(result: AppResult<unknown>, code: string): void {
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error('Expected failure')
  expect(result.value).toBeNull()
  expect(result.html).toBeNull()
  expect(
    result.diagnostics.some((item) => item.code === code),
    JSON.stringify(result.diagnostics),
  ).toBe(true)
}
function browser(artifact: AppArtifact, hash = ''): { dom: JSDOM; errors: Error[] } {
  const errors: Error[] = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => errors.push(error))
  const dom = new JSDOM(artifact.html, {
    url: `https://app.test/${hash}`,
    runScripts: 'dangerously',
    virtualConsole,
  })
  return { dom, errors }
}

const trace = (
  dom: JSDOM,
): { operationId: string; executionClass: string; result: string; diagnostic: string | null }[] =>
  JSON.parse(dom.window.document.querySelector('#wf-runtime-trace')!.textContent) as {
    operationId: string
    executionClass: string
    result: string
    diagnostic: string | null
  }[]

describe('canonical AppBundle contract', () => {
  it.each(corpus.valid)('$id completes the actual canonical pipeline', (fixture) => {
    const parsed = parse(fixture.source, { languageVersion: '4.0.0', sourceId: `${fixture.id}.wf` })
    const candidate = value(
      createAppBundle([parsed], {
        ...options(parsed, fixture.source),
        moduleSources: fixture.moduleSources,
      }),
    )
    const linked = value(linkApp(candidate))
    const artifact = value(compileApp(linked))
    expect(artifact.html).toContain('<!DOCTYPE html>')
    expect(artifact.manifest.htmlDigest).toBe(hash(artifact.html))
    expect(value(compileApp(linked))).toBe(artifact)
    expect(value(renderSite(candidate))).toEqual(artifact)
    expect(value(linkAndCompileApp(candidate))).toEqual(artifact)
    expect(artifact.sourceMap).toBe(linked.sourceMap)
    const { dom, errors } = browser(artifact)
    expect(errors.map((error) => error.message)).toEqual([])
    expect(dom.window.document.querySelectorAll('[data-wf-screen]:not([hidden])')).toHaveLength(1)
    dom.window.close()
  })

  it('rejects forged bundle and linked JSON even when its public shape matches', () => {
    const candidate = bundle(app(page()))
    const linked = value(linkApp(candidate))
    expect(Object.isFrozen(candidate.modules[0].definitions)).toBe(true)
    failure(linkApp(JSON.parse(JSON.stringify(candidate)) as AppBundle), 'WW_SCHEMA')
    failure(compileApp(JSON.parse(JSON.stringify(linked)) as LinkedApp), 'WW_SCHEMA')
    failure(
      compileApp(parse(app(page()), { languageVersion: '4.0.0' }) as unknown as LinkedApp),
      'WW_SCHEMA',
    )
  })

  it('recovers exact source addresses from verified bytes across parser instances and JSON boundaries', () => {
    const fixture = corpus.valid.find((fixture) => fixture.id === 'imported-shell-component')!
    const parsed = parse(fixture.source, { languageVersion: '4.0.0', sourceId: 'outer.wf' })
    const input = options(parsed, fixture.source)
    const original = value(renderSite(value(createAppBundle([parsed], input))))
    const transported = value(renderSite(value(createAppBundle([structuredClone(parsed)], input))))
    expect(transported).toEqual(original)
    expect(transported.sourceMap.every((entry) => entry.source.end > entry.source.start)).toBe(true)
  })

  it.each([
    ['duplicate page', page() + page(), 'WW_DUPLICATE_ID'],
    ['missing entry', 'page "Other" id=other {}', 'WW_ROUTE'],
    ['missing route', page('link "Missing" id=missing navigate=absent'), 'WW_REFERENCE'],
    ['direct cycle', 'component A { use A id=self }' + page('use A id=instance'), 'WW_CYCLE'],
    [
      'unused indirect cycle',
      'component A { use B id=b } component B { use A id=a }' + page(),
      'WW_CYCLE',
    ],
  ])('rejects %s without partial HTML', (_name, body, code) => {
    const candidate = bundle(app(body))
    failure(linkApp(candidate), code)
    failure(renderSite(candidate), code)
    expect(linkApp(candidate)).toEqual(linkApp(candidate))
  })
})

describe('canonical admission and dependency closure', () => {
  it('checks exact original bytes and never trusts modified normalized modules', () => {
    const source = app(page())
    const parsed = parse(source, { languageVersion: '4.0.0' })
    const input = options(parsed, source)
    failure(createAppBundle([parsed], { ...input, moduleSources: {} }), 'WW_IMPORT')
    failure(
      createAppBundle([parsed], {
        ...input,
        moduleSources: { main: input.moduleSources.main + '\n' },
      }),
      'WW_IMPORT',
    )
    parsed.modules[0].namespace = 'forged'
    failure(createAppBundle([parsed], input), 'WW_IMPORT')
    failure(createAppBundle([parsed], { ...input, id: 'demo {} app injected' }), 'WW_SCHEMA')
  })
  it('orders bundle admission diagnostics by module input order', () => {
    const first = parse('module z namespace=z { page "Z" id=z {} }', {
        languageVersion: '4.0.0',
        sourceId: 'z.wf',
      }),
      second = parse('module a namespace=a { page "A" id=a {} }', {
        languageVersion: '4.0.0',
        sourceId: 'a.wf',
      })
    const result = createAppBundle([first, second], {
      id: 'demo',
      entry: { namespace: 'z', id: 'z' },
      profile: first.app.profile,
      states: [],
      fixtures: [],
      registry: first.registry,
      moduleSources: {},
    })
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected missing source bytes')
    expect(result.diagnostics.map(({ sourceId, messageKey }) => [sourceId, messageKey])).toEqual([
      ['z.wf', 'app.missing-source-bytes'],
      ['a.wf', 'app.missing-source-bytes'],
      ['app', 'app.module-count'],
    ])
  })

  it.each(['digest', 'export', 'symbol', 'module'])(
    'rejects a missing import %s contract',
    (kind) => {
      const shared = `module library namespace=lib { ${kind === 'export' ? '' : 'export component Card;'} component Card { text "Shared" } }`
      const importedDigest = kind === 'digest' ? hash('different') : hash(shared)
      const id = kind === 'symbol' ? 'Missing' : 'Card'
      const source = `app demo entry={namespace=main,id=home} { ${shared}
      module main namespace=main { import common from="${kind === 'module' ? 'missing' : 'library'}" digest="${importedDigest}" symbols=[{kind=component,id=${id}}]
      ${page('use Card from="common" id=sharedCard')} } }`
      failure(renderSite(bundle(source)), 'WW_IMPORT')
    },
  )

  it('checks registry digest, obligation references, and precise source binding targets', () => {
    const fixture = corpus.valid.find((fixture) => fixture.id === 'mixed-submit-and-obligation')!
    const parsed = parse(fixture.source, { languageVersion: '4.0.0' })
    const input = options(parsed, fixture.source)
    failure(
      renderSite(
        value(
          createAppBundle([parsed], {
            ...input,
            registry: { ...input.registry, digest: hash('wrong') },
          }),
        ),
      ),
      'WW_REGISTRY',
    )
    for (const mutate of [
      (entries: ParsedDocument['registry']['entries']) => {
        entries[0].requirementRefs = [
          { kind: 'Requirement', namespace: 'missing', id: entries[1].id },
        ]
      },
      (entries: ParsedDocument['registry']['entries']) => {
        entries[0].bindings = [
          {
            scope: 'definition',
            moduleId: 'main',
            definitionKind: 'page',
            definitionId: 'home',
            targetKind: 'operation',
            elementId: 'loginForm',
            operationId: 'missing',
          },
        ]
      },
      (entries: ParsedDocument['registry']['entries']) => {
        entries[0].failureCases = []
      },
    ]) {
      const entries = structuredClone(input.registry.entries)
      mutate(entries)
      const canonical = (value: unknown): string =>
        Array.isArray(value)
          ? `[${value.map(canonical).join(',')}]`
          : value !== null && typeof value === 'object'
            ? `{${Object.keys(value)
                .sort()
                .map(
                  (key) =>
                    `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
                )
                .join(',')}}`
            : JSON.stringify(value)
      failure(
        renderSite(
          value(
            createAppBundle([parsed], {
              ...input,
              registry: { schemaVersion: '1.0.0', entries, digest: hash(canonical(entries)) },
            }),
          ),
        ),
        'WW_REGISTRY',
      )
    }
  })

  it.each([
    ['missing form', 'button "Save" id=save buttonType=submit form=absent', 'WW_REFERENCE'],
    [
      'missing state',
      'input "Name" id=name bind={state="app:missing",property=value,update=input}',
      'WW_STATE',
    ],
    ['unsafe link', 'link "Go" id=go href="javascript:alert(1)"', 'WW_REFERENCE'],
    [
      'unresolved image bytes',
      'image src="https://example.test/image.png" alt="Remote"',
      'WW_ASSET',
    ],
    ['unnamed control', 'input id=name', 'WW_ACCESSIBILITY'],
    [
      'missing obligation',
      'button "Save" id=save obligationRefs=["01993000-0000-7000-8000-000000000999"]',
      'WW_REGISTRY',
    ],
  ])('fails closed for %s', (_name, body, code) => {
    failure(renderSite(bundle(app(page(body)))), code)
  })

  it('detects a 6,000-definition cycle with an explicit traversal stack', () => {
    const definitions = Array.from(
      { length: 6000 },
      (_, index) => `component C${index} { use C${(index + 1) % 6000} id=next }`,
    ).join('\n')
    const candidate = bundle(app(definitions + page()))
    failure(linkApp(candidate), 'WW_CYCLE')
  })
})

describe('the actual exported document', () => {
  it('routes an authored link, an authored button, and unknown addresses', async () => {
    const artifact = value(
      renderSite(
        bundle(
          app(
            page('link "Settings" id=settingsLink navigate=settings') +
              'page "Settings" id=settings { button "Home" id=homeButton navigate=home }',
          ),
        ),
      ),
    )
    const { dom, errors } = browser(artifact)
    const document = dom.window.document
    const link = document.querySelector<HTMLAnchorElement>('a[data-wf-navigate]')!
    expect(link.getAttribute('href')).toBe('#wf/main/settings')
    link.click()
    expect(
      document.querySelector('[data-wf-screen]:not([hidden])')?.getAttribute('data-wf-screen'),
    ).toBe('#wf/main/settings')
    document.querySelector<HTMLButtonElement>('button')!.click()
    expect(
      document.querySelector('[data-wf-screen]:not([hidden])')?.getAttribute('data-wf-screen'),
    ).toBe('#wf/main/home')
    const changed = new Promise<void>((resolve) =>
      dom.window.addEventListener('hashchange', () => resolve(), { once: true }),
    )
    dom.window.location.hash = '#wf/main/absent'
    await changed
    expect(document.querySelectorAll('[data-wf-screen]:not([hidden])')).toHaveLength(0)
    expect(document.querySelector<HTMLElement>('[data-wf-route-error]')?.hidden).toBe(false)
    expect(document.querySelector('[data-wf-route-error] a')?.getAttribute('href')).toBe(
      '#wf/main/home',
    )
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('binds native input to shared state, outcomes and accessibility names', () => {
    const source = app(
      page(`input "Name" id=name bind={state="app:name",property=value,update=input}
      input "Mirror" id=mirror bind={state="app:name",property=value,update=input}
      button "Continue" id=continue enabledWhen={op=eq,left={state="app:name"},right={literal="Ada"}}
      alert "Ready" id=ready visibleWhen={op=eq,left={state="app:name"},right={literal="Ada"}}`),
      'states=[{id=name,type=string,initial="",lifetime=session,sensitive=false}]',
    )
    const { dom, errors } = browser(value(renderSite(bundle(source))))
    const document = dom.window.document
    const inputs = document.querySelectorAll<HTMLInputElement>('input')
    const button = document.querySelector<HTMLButtonElement>('button')!
    const alert = document.querySelector<HTMLElement>('[data-wf-kind=alert]')!
    expect(button.disabled).toBe(true)
    expect(alert.hidden).toBe(true)
    expect(document.querySelector('label')?.getAttribute('for')).toBe(inputs[0].id)
    inputs[0].value = 'Ada'
    inputs[0].dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    expect(inputs[1].value).toBe('Ada')
    expect(button.disabled).toBe(false)
    expect(alert.hidden).toBe(false)
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('preserves native focus transfer between controls during projection', () => {
    const { dom, errors } = browser(
      value(renderSite(bundle(app(page('input "First" id=first input "Second" id=second'))))),
    )
    const inputs = dom.window.document.querySelectorAll<HTMLInputElement>('input')
    inputs[0].focus()
    inputs[1].focus()
    expect(dom.window.document.activeElement).toBe(inputs[1])
    inputs[1].value = 'second value'
    inputs[1].dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    expect(inputs[0].value).toBe('')
    expect(inputs[1].value).toBe('second value')
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('retains pending native edits until the declared change commit', () => {
    const text = app(
      page(
        'checkbox "Enabled" id=enabled bind={state="app:enabled",property=checked,update=change} input "Name" id=name bind={state="app:name",property=value,update=change}',
      ),
      'states=[{id=enabled,type=boolean,initial=false,lifetime=session,sensitive=false},{id=name,type=string,initial="",lifetime=session,sensitive=false}]',
    )
    const { dom, errors } = browser(value(renderSite(bundle(text))))
    const document = dom.window.document,
      checkbox = document.querySelector<HTMLInputElement>('input[type=checkbox]')!,
      input = document.querySelector<HTMLInputElement>('input[type=text]')!
    checkbox.click()
    expect(checkbox.checked).toBe(true)
    input.value = 'pending'
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    expect(input.value).toBe('pending')
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    expect(input.value).toBe('pending')
    expect(errors).toEqual([])
    dom.window.close()
  })

  it.each(['checkbox', 'switch', 'radio'])(
    'preserves native %s activation and click/input/change handler order',
    (kind) => {
      const handlers = ['click', 'input', 'change']
        .map(
          (event) =>
            `{id=${event},event=${event},operations=[{id=count${event},executionClass=executable,effect={kind=set,state="app:count",value={call=add,args=[{state="app:count"},{literal=1}]}},after=[],onFailure=stop,obligationRefs=[]}],concurrency=drop}`,
        )
        .join(',')
      const isRadio = kind === 'radio'
      const text = app(
        page(
          `${kind} "Enabled" id=enabled ${isRadio ? 'value="chosen"' : ''} bind={state="app:selected",property=${isRadio ? 'value' : 'checked'},update=change} on=[${handlers}]`,
        ),
        `states=[{id=selected,type=${isRadio ? 'string' : 'boolean'},initial=${isRadio ? '"other"' : 'false'},lifetime=session,sensitive=false},{id=count,type=number,initial=0,lifetime=session,sensitive=false}]`,
      )
      const { dom, errors } = browser(value(renderSite(bundle(text))))
      const input = dom.window.document.querySelector<HTMLInputElement>('input')!
      const runtime = (
        dom.window as unknown as {
          wireweaveRuntime: { snapshot(): RuntimeSnapshot }
        }
      ).wireweaveRuntime
      input.click()
      expect(input.checked).toBe(true)
      expect(runtime.snapshot().states['app:selected']).toBe(isRadio ? 'chosen' : true)
      expect(runtime.snapshot().states['app:count']).toBe(3)
      expect(trace(dom).map((entry) => entry.operationId)).toEqual([
        'countclick',
        'countinput',
        'countchange',
      ])
      input.click()
      expect(input.checked).toBe(isRadio)
      expect(runtime.snapshot().states['app:selected']).toBe(isRadio ? 'chosen' : false)
      expect(runtime.snapshot().states['app:count']).toBe(isRadio ? 4 : 6)
      expect(errors).toEqual([])
      dom.window.close()
    },
  )

  it('validates the form, executes error/success fixtures and follows only successful authentication', () => {
    const fixture = corpus.valid.find((fixture) => fixture.id === 'mixed-submit-and-obligation')!
    const artifact = value(renderSite(bundle(fixture.source)))
    const { dom, errors } = browser(artifact)
    const document = dom.window.document
    const form = document.querySelector<HTMLFormElement>('form')!
    const button = document.querySelector<HTMLButtonElement>('button[type=submit]')!
    const input = document.querySelector<HTMLInputElement>('input')!
    expect(button.form).toBe(form)
    button.click()
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(form.querySelector<HTMLElement>('[role=alert]')!.hidden).toBe(false)
    const driver = (
      dom.window as unknown as {
        wireweaveRuntime: { pause(): void; advanceClock(ms: number): void }
      }
    ).wireweaveRuntime
    driver.pause()
    input.value = 'ada@example.test'
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    const password = document.querySelector<HTMLInputElement>('input[type=password]')!
    password.value = 'example'
    password.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    button.click()
    expect(form.getAttribute('aria-busy')).toBe('true')
    driver.advanceClock(30)
    expect(
      document.querySelector('#wireweave-app')?.getAttribute('data-wf-runtime-diagnostic'),
    ).toBe('fixture-error')
    expect(
      document.querySelector('[data-wf-screen]:not([hidden])')?.getAttribute('data-wf-screen'),
    ).toBe('#wf/main/home')
    expect(artifact.operationIndex.map((operation) => operation.operationId)).toContain(
      'authenticate',
    )
    expect(
      artifact.manifest.unsupportedOperations.map((operation) => operation.operationId),
    ).not.toContain('authenticate')
    button.click()
    driver.advanceClock(30)
    expect(
      document.querySelector('[data-wf-screen]:not([hidden])')?.getAttribute('data-wf-screen'),
    ).toBe('#wf/main/settings')
    expect(
      trace(dom).some(
        (entry) => entry.executionClass === 'simulated' && entry.result === 'succeeded',
      ),
    ).toBe(true)
    expect(
      JSON.parse(document.querySelector('#wf-model')!.textContent).registry.entries,
    ).toHaveLength(2)
    expect(document.querySelectorAll('[data-wf-requirement]')).toHaveLength(2)
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('projects pending fixture work to the initiating control and its owning regions', () => {
    const source = app(
      page(
        'button "Run" id=run on=[{id=click,event=click,concurrency=drop,operations=[{id=request,executionClass=simulated,effect={kind=simulate,fixtureRef=response,resultState="app:result",statusState="app:status",errorState="app:error",timeoutMs=50},after=[],onFailure=stop,obligationRefs=[]}]}]',
      ),
      'states=[{id=result,type=record,initial={},lifetime=session,sensitive=false},{id=status,type=string,initial="idle",lifetime=session,sensitive=false},{id=error,type=record,initial={},lifetime=session,sensitive=false}] fixtures=[{id=response,steps=[{delayMs=20,outcome=success,value={ok=true}}],exhaustion=error}]',
    )
    const { dom, errors } = browser(value(renderSite(bundle(source))))
    const document = dom.window.document,
      root = document.getElementById('wireweave-app')!,
      button = document.querySelector<HTMLButtonElement>('[data-wf-kind=button]')!,
      pageRegion = document.querySelector<HTMLElement>('[data-wf-kind=page]')!
    const driver = (
      dom.window as unknown as {
        wireweaveRuntime: { pause(): void; advanceClock(ms: number): void }
      }
    ).wireweaveRuntime
    driver.pause()
    button.click()
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.getAttribute('data-wf-pending')).toBe('true')
    expect(pageRegion.getAttribute('aria-busy')).toBe('true')
    expect(root.getAttribute('aria-busy')).toBe('true')
    driver.advanceClock(20)
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(button.hasAttribute('data-wf-pending')).toBe(false)
    expect(pageRegion.hasAttribute('aria-busy')).toBe(false)
    expect(root.getAttribute('aria-busy')).toBe('false')
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('retains one imported shell and the caller-owned fill source identity', () => {
    const fixture = corpus.valid.find((fixture) => fixture.id === 'imported-shell-component')!
    const artifact = value(renderSite(bundle(fixture.source)))
    const { dom, errors } = browser(artifact)
    const document = dom.window.document
    const shell = document.querySelector('[data-wf-shell]')!
    expect(document.querySelectorAll('[data-wf-shell]')).toHaveLength(1)
    const fill = artifact.sourceMap.find((entry) => entry.identity.localId === 'continue')!
    expect(fill.identity).toMatchObject({
      namespace: 'main',
      definitionKind: 'page',
      definitionId: 'home',
      instancePath: [{ kind: 'use', id: 'orderSummary' }],
    })
    expect(
      fixture.moduleSources[fill.moduleId].slice(fill.source.start, fill.source.end),
    ).toContain('link "Continue"')
    expect(fill.source.sourceId).toBe(`${fill.moduleId}.wf`)
    expect(fill.invocationSources).toHaveLength(1)
    document.getElementById(fill.renderedId)!.click()
    expect(document.querySelector('[data-wf-shell]')).toBe(shell)
    expect(
      shell.querySelector('[data-wf-screen]:not([hidden])')?.getAttribute('data-wf-screen'),
    ).toBe('#wf/main/settings')
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('separates repeated source instances and honors an explicit entry variant', () => {
    const fixture = corpus.valid.find((fixture) => fixture.id === 'variants-and-repeat')!
    const source = fixture.source.replace('id="home"}', 'id="home",variant="ready"}')
    const artifact = value(renderSite(bundle(source)))
    const { dom, errors } = browser(artifact)
    const cards = artifact.sourceMap.filter((entry) =>
      entry.identity.instancePath.some((step) => step.kind === 'repeat'),
    )
    expect(new Set(cards.map((entry) => entry.renderedId)).size).toBe(cards.length)
    expect(
      [...dom.window.document.querySelectorAll<HTMLElement>('[data-wf-when]')]
        .filter((node) => !node.hidden)
        .map((node) => node.textContent),
    ).toEqual(['Ready'])
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('resolves imported navigation aliases to the target namespace', () => {
    const shared =
      'module library namespace=actual { export page settings; page "Settings" id=settings {} }'
    const source = `app demo entry={namespace=main,id=home} { ${shared} module main namespace=main {
      import common from="library" digest="${hash(shared)}" symbols=[{kind=page,id=settings}]
      ${page('link "Settings" id=go navigate="common::settings"')} } }`
    const { dom, errors } = browser(value(renderSite(bundle(source))))
    expect(dom.window.document.querySelector('a[data-wf-navigate]')?.getAttribute('href')).toBe(
      '#wf/actual/settings',
    )
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('keeps reusable component instances and repeated controls distinct without splitting component state', () => {
    const source =
      app(`component Field states=[{id=value,type=string,initial="",lifetime=session,sensitive=false}] {
      repeat 2 id=fields { input "Value" id=value bind={state="component:value",property=value,update=input} }
    } ${page('use Field id=one use Field id=two')}`)
    const artifact = value(renderSite(bundle(source)))
    const { dom, errors } = browser(artifact)
    const inputs = dom.window.document.querySelectorAll<HTMLInputElement>('input')
    expect(inputs).toHaveLength(4)
    inputs[0].value = 'Shared within one instance'
    inputs[0].dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    expect(inputs[1].value).toBe('Shared within one instance')
    expect(inputs[2].value).toBe('')
    expect(new Set([...inputs].map((input) => input.id)).size).toBe(4)
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('escapes registry and text script delimiters and pins the exact runtime CSP hash', () => {
    const source = app(page('text "</script><img src=x onerror=alert(1)>"'))
    const artifact = value(renderSite(bundle(source)))
    const { dom, errors } = browser(artifact)
    const document = dom.window.document
    expect(document.querySelectorAll('img')).toHaveLength(0)
    expect(document.querySelector('[data-wf-kind=text]')?.textContent).toBe(
      '</script><img src=x onerror=alert(1)>',
    )
    const script = document.querySelector('script:not([type])')!.textContent
    const runtimeHash = createHash('sha256').update(script).digest('base64')
    expect(
      document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content'),
    ).toContain(`script-src 'sha256-${runtimeHash}'`)
    expect(artifact.runtimeDigest).toBe(hash(script))
    expect(errors).toEqual([])
    dom.window.close()
  })
})

describe('native executable operations', () => {
  it('runs the filter/sort corpus against rendered rows and records real operation results', () => {
    const fixture = corpus.valid.find((fixture) => fixture.id === 'bound-input-filter-sort')!
    const artifact = value(renderSite(bundle(fixture.source)))
    const { dom, errors } = browser(artifact)
    const document = dom.window.document
    const rows = (): string[] =>
      [...document.querySelectorAll('tbody tr')].map((row) => row.textContent)
    expect(rows()).toEqual(['B', 'A'])
    document.querySelector<HTMLButtonElement>('button')!.click()
    expect(rows()).toEqual(['A', 'B'])
    const input = document.querySelector<HTMLInputElement>('input')!
    input.value = 'a'
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    expect(rows()).toEqual(['A'])
    input.value = ''
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    expect(rows()).toEqual(['B', 'A'])
    expect(trace(dom).map(({ operationId, result }) => ({ operationId, result }))).toEqual([
      { operationId: 'sortRows', result: 'succeeded' },
      { operationId: 'filterRows', result: 'succeeded' },
      { operationId: 'filterRows', result: 'succeeded' },
    ])
    expect(artifact.manifest.unsupportedOperations).toEqual([])
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('commits the exit corpus state before navigation and restores the page through browser Back', async () => {
    const fixture = corpus.valid.find((fixture) => fixture.id === 'exit-saves-session-state')!
    const parsed = parse(fixture.source, { languageVersion: '4.0.0' })
    const settings = parsed.modules[0].definitions.find(
      (definition) => definition.id === 'settings',
    )!
    const span = getV4SourceSpan(settings)!
    const source =
      fixture.source.slice(0, span.end - 1) +
      'input "Departures" id=counter readonly=true bind={state="app:departures",property=value,update=input}' +
      fixture.source.slice(span.end - 1)
    const { dom, errors } = browser(value(renderSite(bundle(source))))
    dom.window.document
      .querySelector<HTMLAnchorElement>('[data-wf-screen]:not([hidden]) a[data-wf-navigate]')!
      .click()
    expect(
      dom.window.document.querySelector<HTMLInputElement>('input')!.value,
      JSON.stringify(trace(dom)),
    ).toBe('1')
    expect(trace(dom).some((item) => item.result === 'succeeded')).toBe(true)
    const back = new Promise<void>((resolve) =>
      dom.window.addEventListener('hashchange', () => resolve(), { once: true }),
    )
    dom.window.history.back()
    await back
    expect(
      dom.window.document
        .querySelector('[data-wf-screen]:not([hidden])')
        ?.getAttribute('data-wf-screen'),
    ).toBe('#wf/main/home')
    expect(dom.window.document.activeElement?.getAttribute('data-wf-kind')).toBe('page')
    expect(errors).toEqual([])
    dom.window.close()
  })

  it('sets, clears and resets state and rolls back a failed sequence', () => {
    const operation = (id: string, effect: string, after = '[]'): string =>
      `{id=${id},executionClass=executable,effect=${effect},after=${after},onFailure=stop,obligationRefs=[]}`
    const button = (id: string, operations: string): string =>
      `button "${id}" id=${id} on=[{id=click,event=click,operations=[${operations}],concurrency=drop}]`
    const source = app(
      page(`input "Name" id=name readonly=true bind={state="app:name",property=value,update=input}
      ${button('setName', operation('write', '{kind=set,state="app:name",value={literal="Ada"}}'))}
      ${button('clearName', operation('clear', '{kind=set,state="app:name",value={literal=""}}'))}
      ${button('resetName', operation('reset', '{kind=reset,state="app:name"}'))}
      ${button('failing', operation('write', '{kind=set,state="app:name",value={literal="Changed"}}') + ',' + operation('fail', '{kind=set,state="app:name",value={call=divide,args=[{literal=1},{literal=0}]}}', '[write]'))}`),
      'states=[{id=name,type=string,initial="Initial",lifetime=session,sensitive=false}]',
    )
    const { dom, errors } = browser(value(renderSite(bundle(source))))
    const document = dom.window.document
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')]
    const input = document.querySelector<HTMLInputElement>('input')!
    buttons[0].click()
    expect(input.value).toBe('Ada')
    buttons[1].click()
    expect(input.value).toBe('')
    buttons[2].click()
    expect(input.value).toBe('Initial')
    buttons[3].click()
    expect(input.value).toBe('Initial')
    expect(
      trace(dom)
        .slice(-2)
        .map((item) => item.result),
    ).toEqual(['cancelled', 'failed'])
    expect(trace(dom).at(-1)?.diagnostic).toBe('division-by-zero')
    expect(errors).toEqual([])
    dom.window.close()
  })
})
