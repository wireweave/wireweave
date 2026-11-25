import { describe, expect, it } from 'vitest'
import examples from '../../../../docs/spec/examples.json'
import { extractTransitions as appExtractor, type AppResult, type LinkedApp } from './index'
import {
  compileApp,
  createAppBundle,
  createRuntime,
  extractTransitions,
  getV4SourceSpan,
  linkApp,
  parse,
  printV4Module,
  reduceEvent,
} from '../index'

const options = { languageVersion: '4.0.0' }
function value<T>(result: AppResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.value
}

function linkFixture(id: string) {
  const fixture = examples.valid.find((item) => item.id === id)!
  const parsed = parse(fixture.source, options)
  return value(
    linkApp(
      value(
        createAppBundle([parsed], {
          ...parsed.app,
          entry: parsed.app.entry!,
          states: parsed.states,
          registry: parsed.registry,
          fixtures: parsed.fixtures,
          moduleSources: Object.fromEntries(
            Object.entries(fixture.moduleSources).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          ),
        }),
      ),
    ),
  )
}

describe('public linked V4 transitions', () => {
  it('matches compiled operation identities and the destination the runtime reaches', () => {
    const linked = linkFixture('minimal-navigation')
    const graph = extractTransitions(linked)
    expect(appExtractor).toBe(extractTransitions)
    expect(graph.modelDigest).toBe(linked.digest)
    expect(graph.edges).toHaveLength(2)
    expect(graph.edges[0]).toMatchObject({
      source: { identity: { localId: 'settingsLink' }, moduleId: 'main' },
      event: 'click',
      handlerId: 'shorthand_click',
      operationId: 'primary_click',
      executionClass: 'executable',
      target: {
        kind: 'screen',
        route: { namespace: 'main', id: 'settings' },
        history: 'push',
      },
    })
    const edge = graph.edges[0]
    const artifact = value(compileApp(linked))
    expect(graph.nodes.map(({ route, renderedId }) => ({ route, renderedId }))).toEqual(
      artifact.screenIndex,
    )
    expect(artifact.operationIndex).toContainEqual(
      expect.objectContaining({
        renderedId: edge.source.renderedId,
        handlerId: edge.handlerId,
        operationId: edge.operationId,
      }),
    )
    const initial = createRuntime(linked)
    const next = reduceEvent(initial, {
      kind: 'event',
      source: edge.source.identity,
      event: 'click',
    })
    expect(next.route).toEqual({ namespace: 'main', id: 'settings' })
    expect(initial.route).toEqual({ namespace: 'main', id: 'home' })
    expect(extractTransitions(linked)).toEqual(graph)
    expect(Object.isFrozen(graph.edges[0]?.target)).toBe(true)
  })

  it('retains dependencies and exact component invocation provenance', () => {
    const mixed = extractTransitions(linkFixture('mixed-submit-and-obligation'))
    expect(mixed.edges.find((edge) => edge.operationId === 'enterDashboard')).toMatchObject({
      event: 'submit',
      handlerId: 'login',
      after: ['authenticate'],
      onFailure: 'stop',
    })
    expect(mixed.edges.some((edge) => edge.operationId === 'authenticate')).toBe(false)

    const reuse = extractTransitions(linkFixture('imported-shell-component'))
    const edge = reuse.edges.find((item) => item.source.identity.localId === 'continue')
    expect(edge?.source.identity.instancePath).toEqual([{ kind: 'use', id: 'orderSummary' }])
    expect(edge?.source.invocationSources.length).toBeGreaterThan(0)
  })

  it('projects fixed, guarded, external, history and reset operations from a disjoint module', () => {
    const baseText =
      'module base namespace=base { export page home; page "Home" id=home variants=["reviewed"] {} }'
    const base = parse(baseText, options)
    const candidate = parse(
      `module review namespace=review {
      import existing from="base" digest="${base.modules[0].sourceDigest}" symbols=[{kind=page,id=home}]
      page "New screen" id=review {
        link "Label is not a route" id=returnHome navigate="existing::home"
        link "Plain external link" id=plain href="https://example.org/plain"
        button "Go back" id=goBack action=back
        button "Go" id=go on=[{id=guarded,event=click,guard={op=eq,left={literal=true},right={literal=true}},operations=[
          {id=reviewed,executionClass=executable,effect={kind=navigate,target={kind=screen,screen={namespace=base,id=home,variant=reviewed}},history=replace},after=[],onFailure=stop,obligationRefs=[]},
          {id=external,executionClass=executable,effect={kind=navigate,target={kind=url,url="https://example.org/help"},history=push},after=[reviewed],onFailure=stop,obligationRefs=[]},
          {id=reset,executionClass=executable,effect={kind=resetScenario},after=[external],onFailure=stop,obligationRefs=[]}
        ],concurrency=drop}]
      }
    }`,
      options,
    )
    const printed = printV4Module(candidate)
    const reparsed = parse(printed, options)
    const span = getV4SourceSpan(reparsed.modules[0])!
    const linked = value(
      linkApp(
        value(
          createAppBundle([base, reparsed], {
            id: 'orders',
            entry: { namespace: 'base', id: 'home' },
            profile: base.app.profile,
            states: base.states,
            registry: base.registry,
            fixtures: base.fixtures,
            moduleSources: { base: baseText, review: printed.slice(span.start, span.end) },
          }),
        ),
      ),
    )
    const graph = extractTransitions(linked)
    expect(graph.nodes[0]?.variants).toEqual(['reviewed'])
    expect(graph.edges.map((edge) => edge.target)).toEqual([
      { kind: 'screen', route: { namespace: 'base', id: 'home' }, history: 'push' },
      { kind: 'history', direction: 'back' },
      {
        kind: 'screen',
        route: { namespace: 'base', id: 'home', variant: 'reviewed' },
        history: 'replace',
      },
      { kind: 'url', url: 'https://example.org/help' },
      { kind: 'reset', route: { namespace: 'base', id: 'home' } },
    ])
    expect(graph.edges[2]?.guard).toEqual({
      op: 'eq',
      left: { literal: true },
      right: { literal: true },
    })
    expect(graph.edges[4]?.after).toEqual(['external'])
    expect(value(compileApp(linked)).html).toContain('New screen')
  })

  it('rejects a detached or fabricated LinkedApp', () => {
    const linked = linkFixture('minimal-navigation')
    expect(() => extractTransitions(structuredClone(linked))).toThrow(TypeError)
    expect(() => extractTransitions({ kind: 'LinkedApp' } as LinkedApp)).toThrow(TypeError)
  })
})
