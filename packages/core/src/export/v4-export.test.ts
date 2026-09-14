import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import { createAppBundle, linkApp, type AppResult, type LinkedApp } from '../app'
import { renderToSvg } from '../renderer'
import { exportToFigma } from './figma'

const corpus = JSON.parse(
  readFileSync(new URL('../../../../docs/spec/examples.json', import.meta.url), 'utf8'),
) as {
  valid: { id: string; source: string; moduleSources: Record<string, string> }[]
}

function unwrap<T>(result: AppResult<T>): T {
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.value
}

function linkedFixture(id = 'minimal-navigation'): LinkedApp {
  const fixture = corpus.valid.find((candidate) => candidate.id === id)!
  const document = parse(fixture.source, {
    languageVersion: '4.0.0',
    sourceId: `${id}.wf`,
  })
  return unwrap(
    linkApp(
      unwrap(
        createAppBundle([document], {
          id: document.app.id,
          entry: document.app.entry!,
          profile: document.app.profile,
          states: document.states,
          registry: document.registry,
          fixtures: document.fixtures,
          moduleSources: fixture.moduleSources,
        }),
      ),
    ),
  )
}

describe('v4 semantic exports', () => {
  it('keeps the legacy SVG return contract while adding the LinkedApp overload', () => {
    const legacy = renderToSvg(parse('page Home { text "Hello" }'))
    expect(legacy.svg).toContain('<foreignObject')
    expect('ok' in legacy).toBe(false)

    const linked = linkedFixture()
    const first = renderToSvg(linked, {
      id: 'wireweave-static-svg-v1',
      screens: 'all',
      width: 800,
      height: 600,
      gap: 40,
      background: '#ffffff',
    })
    const second = renderToSvg(linked, {
      id: 'wireweave-static-svg-v1',
      screens: 'all',
      width: 800,
      height: 600,
      gap: 40,
      background: '#ffffff',
    })
    expect(first).toEqual(second)
    const artifact = unwrap(first)
    expect(artifact.kind).toBe('V4SvgArtifact')
    expect(artifact.svg).not.toContain('<foreignObject')
    expect(artifact.svg).toContain('data-wf-identity=')
    expect(artifact.manifest.boardRoutes.length).toBeGreaterThan(1)
    expect(artifact.manifest.sourceMap.length).toBeGreaterThan(0)
    expect(artifact.manifest.lossReport.length).toBeGreaterThan(0)
    expect(artifact.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'WW_EXPORT_STATIC_INTERACTION' }),
    )
  })

  it('emits deterministic Figma mappings with linked identity and explicit losses', () => {
    const linked = linkedFixture()
    const profile = {
      id: 'wireweave-figma-mapping-v1' as const,
      target: 'figma-plugin-json-v1' as const,
      screens: 'all' as const,
    }
    const first = exportToFigma(linked, profile)
    const second = exportToFigma(linked, profile)
    expect(first).toEqual(second)
    const artifact = unwrap(first)
    expect(artifact.kind).toBe('FigmaMappingArtifact')
    expect(artifact.mappings.length).toBe(artifact.sourceMap.length)
    expect(artifact.mappings[0]).toEqual(
      expect.objectContaining({ renderedId: expect.any(String), figmaId: expect.any(String) }),
    )
    const mapped = artifact.document.children?.flatMap((canvas) => canvas.children ?? []) ?? []
    expect(mapped[0]?.wireweaveMetadata?.identity).toBeDefined()
    expect(artifact.lossReport.length).toBeGreaterThan(0)
    expect(artifact.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'WW_EXPORT_FIGMA_INTERACTION' }),
    )
  })

  it('rejects forged linked models and invalid export profiles as structured results', () => {
    const linked = linkedFixture()
    const forged = structuredClone(linked)
    const svg = renderToSvg(forged, { id: 'wireweave-static-svg-v1' })
    expect(svg.ok).toBe(false)
    if (!svg.ok) expect(svg.diagnostics[0]?.code).toBe('WW_SCHEMA')

    const figma = exportToFigma(linked, {
      id: 'wireweave-figma-mapping-v1',
      target: 'figma-plugin-json-v1',
      screens: 'selected',
      board: { namespace: 'missing', id: 'missing' },
    })
    expect(figma.ok).toBe(false)
    if (!figma.ok) expect(figma.diagnostics[0]?.code).toBe('WW_EXPORT_BOARD')
  })
})
