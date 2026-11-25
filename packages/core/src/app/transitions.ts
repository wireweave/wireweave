import type { JsonObject } from '../parser/v4-types'
import {
  asObjects,
  freeze,
  getLinkedAppData,
  object,
  type LinkedApp,
  type ScreenReference,
  type SourceMapEntry,
} from './v4'

export type LinkedTransitionTarget =
  | {
      readonly kind: 'screen'
      readonly route: Readonly<ScreenReference>
      readonly history: 'push' | 'replace'
    }
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'history'; readonly direction: 'back' | 'forward' }
  | { readonly kind: 'reset'; readonly route: Readonly<ScreenReference> }

export interface LinkedTransition {
  readonly source: Readonly<SourceMapEntry>
  readonly handlerId: string
  readonly event: string
  readonly key?: string
  readonly guard?: Readonly<JsonObject>
  readonly operationId: string
  readonly executionClass: 'executable'
  readonly after: readonly string[]
  readonly onFailure: 'stop' | 'continue'
  readonly obligationRefs: readonly string[]
  readonly target: LinkedTransitionTarget
}

export interface LinkedTransitionGraph {
  readonly modelDigest: string
  readonly nodes: readonly {
    readonly route: Readonly<ScreenReference>
    readonly renderedId: string
    readonly variants: readonly string[]
  }[]
  readonly edges: readonly LinkedTransition[]
}

function transitionTarget(
  effect: JsonObject,
  entry: Readonly<ScreenReference>,
): LinkedTransitionTarget | undefined {
  switch (effect.kind) {
    case 'navigate': {
      const target = effect.target
      if (!object(target)) return undefined
      if (target.kind === 'url') return { kind: 'url', url: target.url as string }
      if (target.kind !== 'screen') return undefined
      return {
        kind: 'screen',
        route: { ...(target.screen as unknown as ScreenReference) },
        history: effect.history === 'replace' ? 'replace' : 'push',
      }
    }
    case 'navigateBack':
      return { kind: 'history', direction: 'back' }
    case 'navigateForward':
      return { kind: 'history', direction: 'forward' }
    case 'resetScenario':
      return { kind: 'reset', route: entry }
    default:
      return undefined
  }
}

/** Inspect authored route operations from Core's linked model without running them. */
export function extractTransitions(linked: LinkedApp): LinkedTransitionGraph {
  const data = getLinkedAppData(linked)
  if (!data) throw new TypeError('Expected a LinkedApp produced by Core')

  const sources = new Map(data.sourceMap.map((source) => [source.renderedId, source]))
  const edges: LinkedTransition[] = []
  for (const { node, renderedId } of data.nodes) {
    const source = sources.get(renderedId)!
    for (const handler of asObjects(node.attributes.on)) {
      for (const operation of asObjects(handler.operations)) {
        if (operation.executionClass !== 'executable' || !object(operation.effect)) continue
        const target = transitionTarget(operation.effect, data.bundle.entry)
        if (!target) continue
        edges.push({
          source,
          handlerId: handler.id as string,
          event: handler.event as string,
          ...(typeof handler.key === 'string' ? { key: handler.key } : {}),
          ...(object(handler.guard) ? { guard: structuredClone(handler.guard) } : {}),
          operationId: operation.id as string,
          executionClass: operation.executionClass,
          after: [...(operation.after as string[])],
          onFailure: operation.onFailure === 'continue' ? 'continue' : 'stop',
          obligationRefs: [...(operation.obligationRefs as string[])],
          target,
        })
      }
    }
  }
  return freeze({
    modelDigest: linked.digest,
    nodes: data.screens.map((screen) => ({
      route: { ...screen.route },
      renderedId: screen.children[0].renderedId,
      variants: [...((screen.owner.definition.attributes.variants ?? []) as string[])],
    })),
    edges,
  })
}
