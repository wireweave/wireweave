import type { LayoutDefinitionNode, PageNode, WireframeDocument } from '../ast'
import { renderSite as renderLegacySite } from '../renderer/site'
import type { SiteOptions } from '../renderer/site'
import { linkApp } from './linker'
import {
  getLinkedAppData,
  asObjects,
  diagnostic,
  failed,
  freeze,
  jcs,
  object,
  textValue,
} from './v4'
import { digestV4 } from '../parser/v4-lexical'
import type { JsonObject, JsonValue } from '../parser/v4-types'
import type {
  AppArtifact,
  AppBundle,
  AppResult,
  LinkedApp,
  LinkedData,
  ExpandedNode,
  ScreenReference,
  LinkedIdentity,
  StateBinding,
} from './v4'
import type {
  AppDocument,
  AppLinkDiagnostic,
  AppManifest,
  AppModuleInput,
  ResolvedAppLayout,
  ResolvedAppScreen,
} from './types'

/**
 * Options for {@link compileApp}.
 *
 * Application artifacts always use neutral annotation styling. The option is
 * intentionally omitted here so every compiler caller gets the same wireframe
 * presentation while legacy render entry points keep their historical default.
 *
 * @public
 */
export type CompileAppOptions = Omit<SiteOptions, 'annotationStyle'>

/** Result of linking modules and compiling the resulting application. @public */
export type AppCompileResult =
  | {
      ok: true
      document: AppDocument
      html: string
      diagnostics: readonly []
    }
  | {
      ok: false
      document: null
      html: null
      diagnostics: readonly AppLinkDiagnostic[]
    }

function layoutName(layout: ResolvedAppLayout): string {
  return layout.nodeId
}

function projectLayout(layout: ResolvedAppLayout): LayoutDefinitionNode {
  return { ...layout.node, name: layoutName(layout) }
}

function projectScreen(screen: ResolvedAppScreen): PageNode {
  const uses = screen.node.uses?.trim()
  if (uses === undefined || uses.length === 0) return { ...screen.node }

  const target = screen.references.find(
    (reference) => reference.kind === 'layout' && reference.id === uses,
  )
  return {
    ...screen.node,
    uses: target === undefined ? screen.node.uses : target.targetId,
  }
}

/**
 * Compile one linked application into a deterministic, self-contained HTML document.
 *
 * The linker has already expanded component invocations and resolved shared
 * layouts. This function only projects those resolved nodes into the generic
 * site compositor, using stable app identities for layout names so modules
 * cannot collide.
 *
 * @public
 * @example
 * `const html = compileApp(linked.document)`
 */
export function compileApp(document: LinkedApp): AppResult<AppArtifact>
export function compileApp(document: AppDocument, options?: CompileAppOptions): string
export function compileApp(
  document: AppDocument | LinkedApp,
  options: CompileAppOptions = {},
): string | AppResult<AppArtifact> {
  if (!('screens' in document)) return compileAppV4(document)
  const projected: WireframeDocument = {
    type: 'Document',
    children: [...document.layouts.map(projectLayout), ...document.screens.map(projectScreen)],
  }
  return renderLegacySite(projected, { ...options, annotationStyle: 'neutral' })
}

/**
 * Link application modules and compile them when linking succeeds.
 *
 * Linker diagnostics remain explicit and no partial HTML is emitted on failure.
 *
 * @public
 * @example
 * `const result = linkAndCompileApp(manifest, modules)`
 */
export function linkAndCompileApp(bundle: AppBundle): AppResult<AppArtifact>
export function linkAndCompileApp(
  manifest: AppManifest,
  modules: readonly AppModuleInput[],
  options?: CompileAppOptions,
): AppCompileResult
export function linkAndCompileApp(
  input: AppManifest | AppBundle,
  modules?: readonly AppModuleInput[],
  options: CompileAppOptions = {},
): AppCompileResult | AppResult<AppArtifact> {
  if (modules === undefined) {
    const linked = linkApp(input as AppBundle)
    return linked.ok ? compileApp(linked.value) : linked
  }
  const linked = linkApp(input as AppManifest, modules)
  if (!linked.ok) return { ...linked, html: null }
  return { ...linked, html: compileApp(linked.document, options) }
}

function escape(value: unknown): string {
  return textValue(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function attribute(name: string, value: unknown): string {
  return value === undefined || value === false
    ? ''
    : ` ${name}="${escape(value === true ? '' : value)}"`
}
function jsonBlock(value: unknown): string {
  return jcs(value).replace(/</g, '\\u003c')
}
function address(route: Readonly<ScreenReference>): string {
  return `#wf/${encodeURIComponent(route.namespace)}/${encodeURIComponent(route.id)}${route.variant === undefined ? '' : `?variant=${encodeURIComponent(route.variant)}`}`
}
function hashBase64(value: string): string {
  const hex = digestV4(value).slice(7),
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes = Array.from({ length: 32 }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  )
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const value = (bytes[index] << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0)
    output +=
      alphabet[(value >>> 18) & 63] +
      alphabet[(value >>> 12) & 63] +
      (index + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : '=') +
      (index + 2 < bytes.length ? alphabet[value & 63] : '=')
  }
  return output
}

class HtmlArtifact {
  readonly unsupported: { renderedId: string; handlerId: string; operationId: string }[] = []
  readonly rules: string[] = []
  constructor(
    readonly data: LinkedData,
    readonly program: RuntimeProgram,
  ) {}
  node(entry: ExpandedNode): string {
    const { node, renderedId } = entry
    const attrs = node.attributes
    const label = node.label ?? textValue(attrs.label ?? '')
    const children = (): string => entry.children.map((child) => this.node(child)).join('')
    let common =
      attribute('id', renderedId) +
      attribute('class', `wf-node wf-${node.kind} ${renderedId}`) +
      attribute('data-wf-kind', node.kind) +
      attribute('data-wf-source', entry.owner.module.id) +
      attribute('data-wf-identity', jcs(entry.identity)) +
      attribute(
        'data-wf-requirements',
        attrs.requirementRefs === undefined ? undefined : jcs(attrs.requirementRefs),
      ) +
      attribute(
        'data-wf-obligations',
        attrs.obligationRefs === undefined ? undefined : jcs(attrs.obligationRefs),
      ) +
      attribute('data-wf-on', attrs.on === undefined ? undefined : jcs(attrs.on)) +
      attribute('data-wf-bind', attrs.bind === undefined ? undefined : jcs(attrs.bind)) +
      attribute('data-wf-data', attrs.data === undefined ? undefined : jcs(attrs.data)) +
      attribute('data-wf-columns', attrs.columns === undefined ? undefined : jcs(attrs.columns)) +
      attribute(
        'data-wf-targets',
        entry.effectTargets === undefined ? undefined : jcs(entry.effectTargets),
      ) +
      attribute(
        'data-wf-visible-when',
        attrs.visibleWhen === undefined ? undefined : jcs(attrs.visibleWhen),
      ) +
      attribute(
        'data-wf-enabled-when',
        attrs.enabledWhen === undefined ? undefined : jcs(attrs.enabledWhen),
      ) +
      attribute('data-wf-when', attrs.when === undefined ? undefined : jcs(attrs.when)) +
      attribute('data-wf-state-bindings', jcs(entry.stateBindings)) +
      attribute('data-wf-navigate', entry.route === undefined ? undefined : address(entry.route)) +
      attribute('aria-label', attrs['aria-label'] ?? attrs.aria) +
      attribute('aria-busy', attrs.loading === true ? 'true' : undefined) +
      attribute(
        'data-wf-disabled',
        attrs.disabled === true || attrs.loading === true ? true : undefined,
      ) +
      attribute('data-wf-action', attrs.action)
    for (const handler of asObjects(attrs.on))
      for (const operation of asObjects(handler.operations)) {
        if (operation.executionClass === 'specified') {
          this.unsupported.push({
            renderedId,
            handlerId: textValue(handler.id),
            operationId: textValue(operation.id),
          })
        }
      }
    if (entry.slot) return `<div${common} data-wf-slot="${escape(entry.owner.key)}"></div>`
    this.layout(entry)
    const bound = object(attrs.bind) ? entry.stateBindings[textValue(attrs.bind.state)] : undefined
    const value = bound?.initial ?? attrs.value
    const disabled = attrs.disabled === true || attrs.loading === true
    const labelled = (control: string): string =>
      `<div class="wf-field" data-wf-field="${renderedId}">${label ? `<label for="${renderedId}">${escape(label)}</label>` : ''}${control}<span id="${renderedId}-error" role="alert" hidden></span></div>`
    const scalarAttrs =
      attribute('name', attrs.name) +
      attribute('disabled', disabled) +
      attribute('required', attrs.required) +
      attribute('readonly', attrs.readonly) +
      attribute('placeholder', attrs.placeholder) +
      attribute('autocomplete', attrs.autocomplete) +
      attribute('min', attrs.min) +
      attribute('max', attrs.max) +
      attribute('step', attrs.step) +
      attribute('data-wf-min-length', attrs.minLength) +
      attribute('data-wf-max-length', attrs.maxLength)
    if (node.kind === 'input' || ['checkbox', 'radio', 'switch', 'slider'].includes(node.kind)) {
      const type =
        node.kind === 'input'
          ? (attrs.inputType ?? 'text')
          : node.kind === 'switch'
            ? 'checkbox'
            : node.kind === 'slider'
              ? 'range'
              : node.kind
      return labelled(
        `<input${common}${scalarAttrs}${attribute('type', type)}${attribute('role', node.kind === 'switch' ? 'switch' : undefined)}${attribute('value', value)}${attribute('checked', bound?.type === 'boolean' ? bound.initial : attrs.checked)}>`,
      )
    }
    if (node.kind === 'textarea')
      return labelled(
        `<textarea${common}${scalarAttrs}${attribute('rows', attrs.rows)}>${escape(value ?? '')}</textarea>`,
      )
    if (node.kind === 'select')
      return labelled(
        `<select${common}${scalarAttrs}>${asObjects(attrs.options)
          .map(
            (option) =>
              `<option${attribute('value', option.value)}${attribute('selected', value === option.value)}${attribute('disabled', option.disabled)}>${escape(option.label)}</option>`,
          )
          .join('')}</select>`,
      )
    if (node.kind === 'button') {
      const form = entry.formTarget
      return `<button${common}${attribute('type', attrs.buttonType ?? (attrs.action === 'submit' ? 'submit' : 'button'))}${attribute('form', form)}${attribute('disabled', disabled)}>${escape(label || attrs.aria || attrs['aria-label'] || '')}</button>`
    }
    if (node.kind === 'link' || node.kind === 'nav-item' || node.kind === 'dropdown-item') {
      if (entry.route !== undefined || attrs.href !== undefined)
        return `<a${common}${attribute('href', entry.route === undefined ? attrs.href : address(entry.route))}${attribute('rel', attrs.href === undefined ? undefined : 'noopener noreferrer')}${attribute('target', attrs.external === true ? '_blank' : undefined)}>${escape(label)}</a>`
      return node.kind === 'dropdown-item'
        ? `<button${common} type="button" role="menuitem" tabindex="-1">${escape(label)}</button>`
        : `<span${common}>${escape(label)}</span>`
    }
    if (node.kind === 'form')
      return `<form${common} novalidate>${children()}<p data-wf-form-error role="alert" hidden></p></form>`
    if (node.kind === 'text') return `<p${common}>${escape(label)}</p>`
    if (node.kind === 'title') {
      const rank = typeof attrs.level === 'number' ? attrs.level : 2
      return `<h${rank}${common}>${escape(label)}</h${rank}>`
    }
    if (node.kind === 'divider') return `<hr${common}>`
    if (node.kind === 'image')
      return attrs.src === undefined
        ? `<div${common} role="img"${attribute('aria-label', attrs.alt ?? 'Image placeholder')}></div>`
        : `<img${common}${attribute('src', attrs.src)}${attribute('alt', attrs.alt ?? '')}>`
    if (
      node.kind === 'avatar' ||
      node.kind === 'icon' ||
      node.kind === 'badge' ||
      node.kind === 'marker'
    )
      return `<span${common}>${escape(node.number ?? (label || attrs.name || ''))}</span>`
    if (node.kind === 'progress')
      return `<progress${common}${attribute('value', attrs.indeterminate === true ? undefined : (value ?? 0))}${attribute('max', attrs.max ?? 100)}>${escape(label)}</progress>`
    if (node.kind === 'alert' || node.kind === 'toast' || node.kind === 'spinner')
      return `<p${common}${attribute('role', node.kind === 'alert' ? 'alert' : 'status')}>${escape(label)}${attrs.dismissible === true ? `<button type="button" data-wf-event-owner="${renderedId}" aria-label="Dismiss ${escape(label)}">Dismiss</button>` : ''}</p>`
    if (node.kind === 'accordion')
      return `<details${common}${attribute('open', attrs.expanded)}><summary>${escape(label)}</summary>${children()}</details>`
    if (['modal', 'drawer', 'popover'].includes(node.kind))
      return `<dialog${common}${attribute('aria-label', label)} tabindex="-1">${children()}</dialog>`
    if (node.kind === 'dropdown')
      return `<div${common}><button type="button" id="${renderedId}-trigger" data-wf-event-owner="${renderedId}" aria-haspopup="menu" aria-expanded="false" aria-controls="${renderedId}-menu">${escape(label)}</button><div id="${renderedId}-menu" role="menu" data-wf-overlay-body hidden>${children()}</div></div>`
    if (node.kind === 'tooltip')
      return `<div${common}>${children()}<span id="${renderedId}-tooltip" role="tooltip" hidden>${escape(label)}</span></div>`
    if (node.kind === 'table') {
      const columns = Array.isArray(attrs.columns) ? attrs.columns : []
      let rows = node.items ?? []
      if (object(attrs.data)) {
        const initial = entry.stateBindings[textValue(attrs.data.state)]?.initial
        if (Array.isArray(initial))
          rows = initial.map((record) =>
            columns.map((column) => (object(record) ? record[textValue(column)] : null)),
          )
      }
      return `<table${common}><thead><tr>${columns.map((column) => `<th scope="col">${escape(column)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${(Array.isArray(row) ? row : []).map((cell) => `<td>${escape(cell ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    }
    if (node.kind === 'list')
      return `<${attrs.ordered === true ? 'ol' : 'ul'}${common}>${children()}</${attrs.ordered === true ? 'ol' : 'ul'}>`
    if (node.kind === 'list-item')
      return `<li${common}>${escape(label)}${entry.children.length ? `<ul>${children()}</ul>` : ''}</li>`
    if (node.kind === 'tabs') {
      const tabs = entry.children.filter((child) => child.node.kind === 'tab')
      return `<div${common}><div role="tablist"${attribute('aria-label', label || 'Tabs')}${attribute('aria-orientation', attrs.vertical === true ? 'vertical' : 'horizontal')}>${tabs.map((tab) => `<button type="button" id="${tab.renderedId}-tab" data-wf-event-owner="${tab.renderedId}" role="tab" aria-controls="${tab.renderedId}" aria-selected="false" tabindex="-1">${escape(tab.node.label ?? tab.node.attributes.label ?? '')}</button>`).join('')}</div>${children()}</div>`
    }
    if (node.kind === 'tab')
      return `<section${common} role="tabpanel" aria-labelledby="${renderedId}-tab" tabindex="0">${children()}</section>`
    const tag =
      (
        {
          header: 'header',
          main: 'main',
          footer: 'footer',
          sidebar: 'aside',
          nav: 'nav',
          breadcrumb: 'nav',
          section: 'section',
          page: 'section',
          'annotation-item': 'section',
        } as Record<string, string>
      )[node.kind] ?? 'div'
    if (node.kind === 'page') common += ' tabindex="-1"'
    return `<${tag}${common}>${label ? `<span class="wf-label">${escape(label)}</span>` : ''}${children()}</${tag}>`
  }
  layout(entry: ExpandedNode): void {
    const a = entry.node.attributes,
      kind = entry.node.kind,
      profile = this.data.bundle.profile,
      styles: string[] = []
    const length = (value: JsonValue, axis: string, spacing = false): string => {
      if (typeof value === 'number')
        return `${spacing && [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].includes(value) ? value * 4 : value}px`
      if (object(value)) {
        const amount = Number(value.value)
        return value.unit === 'vh'
          ? `${(amount * Number(profile.height)) / 100}px`
          : value.unit === 'vw'
            ? `${(amount * Number(profile.width)) / 100}px`
            : value.unit === 'rem'
              ? `${amount * 16}px`
              : `${amount}${textValue(value.unit)}`
      }
      return value === 'full'
        ? '100%'
        : value === 'screen'
          ? `${Number(profile[axis])}px`
          : value === 'fit'
            ? 'fit-content'
            : 'auto'
    }
    for (const [key, css] of Object.entries({
      w: 'width',
      h: 'height',
      width: 'width',
      height: 'height',
      minW: 'min-width',
      maxW: 'max-width',
      minH: 'min-height',
      maxH: 'max-height',
    }))
      if (a[key] !== undefined)
        styles.push(`${css}:${length(a[key], css.includes('width') ? 'width' : 'height')}`)
    for (const [key, css] of Object.entries({
      p: 'padding',
      m: 'margin',
      px: 'padding-inline',
      py: 'padding-block',
      mx: 'margin-inline',
      my: 'margin-block',
      pt: 'padding-top',
      pr: 'padding-right',
      pb: 'padding-bottom',
      pl: 'padding-left',
      mt: 'margin-top',
      mr: 'margin-right',
      mb: 'margin-bottom',
      ml: 'margin-left',
      gap: 'gap',
    }))
      if (a[key] !== undefined) styles.push(`${css}:${length(a[key], 'width', true)}`)
    if (['row', 'col', 'stack'].includes(kind)) {
      styles.push(
        'display:flex',
        `flex-direction:${textValue(a.direction ?? (kind === 'row' ? 'row' : 'column'))}`,
        `flex-wrap:${a.wrap === true ? 'wrap' : 'nowrap'}`,
        `justify-content:${({ start: 'flex-start', end: 'flex-end', between: 'space-between', around: 'space-around', evenly: 'space-evenly' } as Record<string, string>)[textValue(a.justify)] ?? textValue(a.justify ?? 'flex-start')}`,
        `align-items:${({ start: 'flex-start', end: 'flex-end' } as Record<string, string>)[textValue(a.align)] ?? textValue(a.align ?? 'stretch')}`,
      )
    }
    if (a.flex !== undefined)
      styles.push(`flex-grow:${a.flex === true ? 1 : a.flex === false ? 0 : Number(a.flex)}`)
    if (kind === 'col' && entry.parent?.node.kind === 'row') {
      let span = Number(a.span ?? 12)
      for (const [key, width] of Object.entries({ sm: 576, md: 768, lg: 992, xl: 1200 }))
        if (Number(profile.width) >= width && a[key] !== undefined) span = Number(a[key])
      const gap = length(entry.parent.node.attributes.gap ?? 0, 'width', true)
      styles.push(
        `flex-basis:calc((100% - 11 * ${gap}) * ${span}/12 + ${span - 1} * ${gap})`,
        `max-width:calc((100% - 11 * ${gap}) * ${span}/12 + ${span - 1} * ${gap})`,
      )
    }
    if (a.order !== undefined) styles.push(`order:${Number(a.order)}`)
    if (a.scroll === true) styles.push('overflow:auto')
    if (kind !== 'page' && (a.x !== undefined || a.y !== undefined || a.anchor !== undefined)) {
      const anchor = textValue(a.anchor ?? 'top-left'),
        vertical = anchor === 'center' ? 'center' : anchor.split('-')[0],
        horizontal = anchor === 'center' ? 'center' : anchor.split('-')[1]
      styles.push(
        'position:absolute',
        `left:calc(${horizontal === 'center' ? '50%' : horizontal === 'right' ? '100%' : '0%'} + ${Number(a.x ?? 0)}px)`,
        `top:calc(${vertical === 'center' ? '50%' : vertical === 'bottom' ? '100%' : '0%'} + ${Number(a.y ?? 0)}px)`,
        `transform:translate(${horizontal === 'center' ? '-50%' : horizontal === 'right' ? '-100%' : '0'},${vertical === 'center' ? '-50%' : vertical === 'bottom' ? '-100%' : '0'})`,
      )
    }
    if (a.border === true || a.outline === true || a.bordered === true)
      styles.push('border:1px solid #71717a')
    if (a.ghost === true) styles.push('background:transparent', 'border-color:transparent')
    if (a.rounded === true || a.pill === true)
      styles.push(`border-radius:${a.pill === true ? '999px' : '4px'}`)
    if (a.muted === true) styles.push('color:#52525b')
    if (a.bg !== undefined || a.primary === true || a.secondary === true)
      styles.push('background:#f4f4f5')
    if (a.shadow !== undefined && a.shadow !== 'none')
      styles.push(
        `box-shadow:0 ${({ sm: 1, md: 2, lg: 4, xl: 8 } as Record<string, number>)[textValue(a.shadow)]}px ${({ sm: 1, md: 2, lg: 4, xl: 8 } as Record<string, number>)[textValue(a.shadow)]}px #71717a`,
      )
    if (a.bold === true || a.weight !== undefined)
      styles.push(
        `font-weight:${a.bold === true ? 700 : ({ normal: 400, medium: 500, semibold: 600, bold: 700 } as Record<string, number>)[textValue(a.weight)]}`,
      )
    if (typeof a.size === 'string') {
      const font = (
        { xs: 12, sm: 14, base: 16, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 } as Record<
          string,
          number
        >
      )[a.size]
      if (font) styles.push(`font-size:${font}px`)
      if (
        ['button', 'input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider'].includes(
          kind,
        )
      )
        styles.push(
          `min-height:${({ xs: 24, sm: 28, md: 36, lg: 44, xl: 52 } as Record<string, number>)[a.size] ?? 24}px`,
        )
    } else if (typeof a.size === 'number') styles.push(`width:${a.size}px`, `height:${a.size}px`)
    if (['text', 'title', 'link'].includes(kind) && a.align !== undefined)
      styles.push(`text-align:${textValue(a.align)}`)
    if (styles.length) this.rules.push(`#wireweave-app .${entry.renderedId}{${styles.join(';')}}`)
  }
  html(): string {
    const bundle = this.data.bundle
    const screens = this.data.screens
      .map(
        (screen) =>
          `<article data-wf-screen="${escape(address(screen.route))}"${attribute('data-wf-shell-ref', screen.shell)} hidden>${screen.children.map((node) => this.node(node)).join('')}</article>`,
      )
      .join('')
    const shells = this.data.shells
      .map(
        (shell) =>
          `<section data-wf-shell="${escape(shell.owner.key)}" hidden>${shell.children.map((node) => this.node(node)).join('')}</section>`,
      )
      .join('')
    const registryPanels = bundle.registry.entries
      .map(
        (entry) =>
          `<section data-wf-requirement="${escape(entry.id)}"><h3>${escape(entry.title)}</h3><p>${escape(entry.behavior ?? entry.trigger ?? '')}</p></section>`,
      )
      .join('')
    const css = `#wireweave-app{font:16px/1.5 system-ui,sans-serif;color:#18181b;background:white}#wireweave-app [hidden]{display:none!important}#wireweave-app *{box-sizing:border-box}#wireweave-app :focus-visible{outline:2px solid #18181b;outline-offset:2px}#wireweave-app button,#wireweave-app input,#wireweave-app select{min-height:24px;font:inherit}#wireweave-app .wf-row{display:flex;gap:0}#wireweave-app .wf-col{flex:1}#wireweave-app .wf-stack,#wireweave-app .wf-field{display:flex;flex-direction:column;gap:8px}#wireweave-app .wf-page,#wireweave-app [data-wf-shell]{width:${textValue(bundle.profile.width)}px;height:${textValue(bundle.profile.height)}px;overflow:auto}#wireweave-app .wf-card,#wireweave-app th,#wireweave-app td{border:1px solid #71717a;padding:8px}#wireweave-app .wf-relative{position:relative}#wireweave-app [data-wf-slot]{display:contents}${this.rules.join('')}#wireweave-app[data-wf-view=accessible] .wf-node,#wireweave-app[data-wf-view=accessible] [data-wf-shell]{position:static!important;transform:none!important;width:auto!important;height:auto!important;min-width:0!important;max-width:100%!important;min-height:0!important;overflow-wrap:anywhere;order:0!important}#wireweave-app[data-wf-view=accessible] .wf-row{flex-direction:column!important;flex-wrap:wrap!important}#wireweave-app[data-wf-view=accessible] .wf-col{flex-basis:auto!important}#wireweave-app .wf-field{min-width:0}#wireweave-app .wf-field input,#wireweave-app .wf-field textarea,#wireweave-app .wf-field select{max-width:100%}#wireweave-app [data-wf-field][hidden]{display:none!important}#wireweave-app [role=tablist]{display:flex;flex-wrap:wrap}#wireweave-app [role=tooltip]{background:#f4f4f5;border:1px solid #71717a}#wireweave-app dialog{color:#18181b;background:white;max-width:100%;max-height:100%;overflow:auto}`
    const runtimeData = this.program
    const csp = `default-src 'none'; script-src 'sha256-${hashBase64(NATIVE_RUNTIME)}'; style-src 'sha256-${hashBase64(css)}'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'`
    return `<!DOCTYPE html>\n<html lang="${escape(bundle.profile.language)}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escape(csp)}"><title>${escape(bundle.id)}</title><style>${css}</style></head><body><div id="wireweave-app">${shells}<div data-wf-screen-storage>${screens}</div><section data-wf-route-error role="alert" hidden><h1 tabindex="-1">Unknown screen</h1><p data-wf-invalid-address></p><a href="${escape(address(bundle.entry))}">Open entry screen</a></section><div role="group" aria-label="Execution view"><button type="button" data-wf-tooling="view">Switch fixed or accessible view</button><button type="button" data-wf-tooling="reset">Reset scenario</button></div><p data-wf-runtime-status role="status" aria-live="polite"></p><details data-wf-requirement-panel><summary>Implementation requirements</summary>${registryPanels}</details></div><script type="application/json" id="wf-model">${jsonBlock(bundle)}</script><script type="application/json" id="wf-source-map">${jsonBlock(this.data.sourceMap)}</script><script type="application/json" id="wf-runtime-data">${jsonBlock(runtimeData)}</script><script type="application/json" id="wf-runtime-trace">[]</script><script>${NATIVE_RUNTIME}</script></body></html>`
  }
}

export type RuntimeInput =
  | {
      kind: 'event'
      source: LinkedIdentity
      event: 'click' | 'input' | 'change' | 'submit' | 'keydown' | 'focus' | 'blur'
      value?: JsonValue
      checked?: boolean
      key?: string
    }
  | { kind: 'advanceClock'; deltaMs: number }
  | { kind: 'address'; fragment: string }
  | { kind: 'reset' }
interface RuntimeOperation {
  id: string
  executionClass: 'executable' | 'simulated' | 'specified'
  effect: JsonObject
  after: string[]
  onFailure: 'stop' | 'continue'
}
interface RuntimeHandler {
  id: string
  event: string
  key?: string
  guard?: JsonObject
  operations: RuntimeOperation[]
  concurrency: 'drop' | 'queue'
}
interface RuntimeNode {
  id: string
  identity: LinkedIdentity
  kind: string
  label: string
  parent: string | null
  root: string
  attributes: JsonObject
  bindings: Record<string, StateBinding>
  handlers: RuntimeHandler[]
  targets: Record<string, string>
  children: string[]
  form: string | null
}
interface UnicodeTables {
  lower: Record<string, string>
  upper: Record<string, string>
  cased: number[][]
  ignorable: number[][]
  whitespace: number[][]
}
interface RuntimeProgram {
  appId: string
  modelDigest: string
  profileDigest: string
  profile: JsonObject
  entry: ScreenReference
  nodes: RuntimeNode[]
  states: Record<string, StateBinding>
  screens: { route: ScreenReference; id: string; shell: string | null; variants: string[] }[]
  shells: { id: string; root: string; slot: string }[]
  fixtures: {
    id: string
    steps: { delayMs: number; outcome: string; value: JsonValue }[]
    exhaustion: string
  }[]
  unicode: UnicodeTables
}
export interface RuntimeTrace {
  schemaVersion: '1.0.0'
  appId: string
  modelDigest: string
  profileDigest: string
  sequence: number
  resetGeneration: number
  virtualTime: number
  route: ScreenReference | null
  source: LinkedIdentity | null
  renderedId: string | null
  handlerId: string | null
  operationId: string | null
  executionClass: string
  event: JsonObject
  stateDeltaDigest: string
  result: string
  diagnostic: string | null
}
interface RuntimeControl {
  value: JsonValue
  checked: boolean
  pending?: boolean
}
interface RuntimeActivation {
  id: number
  owner: string
  handlerId: string
  event: JsonObject
  index: number
  statuses: Record<string, string>
}
interface RuntimeRequest {
  id: string
  generation: number
  sequence: number
  activation: number
  owner: string
  operation: RuntimeOperation
  resultKey: string
  statusKey: string
  errorKey: string
  deadline: number
  responseAt: number
  outcome: string
  value: JsonValue
}
interface RuntimeScheduled {
  time: number
  priority: number
  sequence: number
  requestId: string
  generation: number
  owner: string
  operationId: string
}
interface RuntimeQueued {
  source: string
  event: JsonObject
  handlerId: string | null
}
export interface RuntimeBrowserEffect {
  kind: 'push' | 'replace' | 'traverse' | 'compensate' | 'external'
  fragment: string
  sequence: number
  delta: number
}
export interface RuntimeSnapshot {
  modelDigest: string
  profileDigest: string
  resetGeneration: number
  virtualTime: number
  sequence: number
  requestSequence: number
  activationSequence: number
  states: Record<string, JsonValue>
  controls: Record<string, RuntimeControl>
  invalid: Record<string, string>
  route: ScreenReference | null
  address: string
  history: { fragment: string; sequence: number }[]
  historyIndex: number
  nextHistorySequence: number
  overlays: { id: string; opener: string | null; modal: boolean }[]
  focus: string | null
  selection: Record<string, number>
  expanded: Record<string, boolean>
  viewMode: 'fixed' | 'accessible'
  fixtureCursors: Record<string, number>
  requests: Record<string, RuntimeRequest>
  reservations: Record<string, string>
  activations: Record<string, RuntimeActivation>
  queue: RuntimeQueued[]
  scheduled: RuntimeScheduled[]
  trace: RuntimeTrace[]
  effects: RuntimeBrowserEffect[]
  diagnostic: string | null
  suspended: boolean
}
interface RuntimeView {
  visible: Record<string, boolean>
  enabled: Record<string, boolean>
  controls: Record<string, RuntimeControl>
  states: Record<string, JsonValue>
  data: Record<string, JsonValue>
}

/** One closed engine is used by pure conformance calls and the embedded browser adapter. */
function runtimeEngine(program: RuntimeProgram) {
  const nodes = new Map(program.nodes.map((node) => [node.id, node]))
  const byIdentity = new Map(program.nodes.map((node) => [canonical(node.identity), node]))
  const fixtures = new Map(program.fixtures.map((fixture) => [fixture.id, fixture]))
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
  const record = (value: unknown): JsonObject =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as JsonObject)
      : {}
  const scalar = (value: unknown): string => {
    if (value == null) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (typeof value === 'object') return canonical(value)
    throw Error('scalar-type')
  }
  function canonical(value: unknown): string {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
    if (value !== null && typeof value === 'object')
      return (
        '{' +
        Object.keys(value)
          .sort()
          .map(
            (key) => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key]),
          )
          .join(',') +
        '}'
      )
    return JSON.stringify(value)
  }
  function bounded(value: unknown): void {
    const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }]
    let count = 0
    while (stack.length) {
      const entry = stack.pop()!
      if (++count > 250000 || entry.depth > 128) throw Error('limit-json')
      const item = entry.value
      if (typeof item === 'string') {
        for (const character of item) {
          const code = character.codePointAt(0)!
          if (code >= 0xd800 && code <= 0xdfff) throw Error('invalid-unicode')
        }
      } else if (typeof item === 'number') {
        if (!Number.isFinite(item)) throw Error('non-finite-number')
      } else if (Array.isArray(item)) {
        if (item.length > 10000) throw Error('limit-list')
        for (const child of item) stack.push({ value: child, depth: entry.depth + 1 })
      } else if (item !== null && typeof item === 'object') {
        const entries = Object.entries(item)
        if (entries.length > 1000) throw Error('limit-record')
        for (const [key, child] of entries) {
          bounded(key)
          stack.push({ value: child, depth: entry.depth + 1 })
        }
      } else if (item !== null && typeof item !== 'boolean') throw Error('invalid-json')
    }
  }
  function hash(source: string): string {
    const k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
      0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
      0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
      0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
      0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
      0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
      0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
      0xc67178f2,
    ]
    const bytes = new TextEncoder().encode(source),
      padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64)
    padded.set(bytes)
    padded[bytes.length] = 0x80
    const view = new DataView(padded.buffer)
    view.setUint32(padded.length - 8, Math.floor(bytes.length / 0x20000000))
    view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0)
    const h = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
      ],
      words = new Uint32Array(64)
    const rotate = (value: number, shift: number): number =>
      (value >>> shift) | (value << (32 - shift))
    for (let block = 0; block < padded.length; block += 64) {
      for (let index = 0; index < 16; index++) words[index] = view.getUint32(block + index * 4)
      for (let index = 16; index < 64; index++) {
        const x = words[index - 15] ?? 0,
          y = words[index - 2] ?? 0
        words[index] =
          ((words[index - 16] ?? 0) +
            (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) +
            (words[index - 7] ?? 0) +
            (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) >>>
          0
      }
      let [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, v = 0] = h
      for (let index = 0; index < 64; index++) {
        const first =
            (v +
              (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
              ((e & f) ^ (~e & g)) +
              (k[index] ?? 0) +
              (words[index] ?? 0)) >>>
            0,
          second =
            ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
        v = g
        g = f
        f = e
        e = (d + first) >>> 0
        d = c
        c = b
        b = a
        a = (first + second) >>> 0
      }
      for (const [index, value] of [a, b, c, d, e, f, g, v].entries())
        h[index] = ((h[index] ?? 0) + value) >>> 0
    }
    return 'sha256:' + h.map((value) => value.toString(16).padStart(8, '0')).join('')
  }
  function range(code: number, ranges: number[][]): boolean {
    let low = 0,
      high = ranges.length - 1
    while (low <= high) {
      const middle = (low + high) >>> 1,
        pair = ranges[middle]
      if (code < pair[0]) high = middle - 1
      else if (code > pair[1]) low = middle + 1
      else return true
    }
    return false
  }
  function convert(value: JsonValue, mode: string): string {
    if (typeof value !== 'string') throw Error('value-type')
    const chars = Array.from(value)
    if (mode === 'trim') {
      let start = 0,
        end = chars.length
      while (start < end && range(chars[start].codePointAt(0)!, program.unicode.whitespace)) start++
      while (end > start && range(chars[end - 1].codePointAt(0)!, program.unicode.whitespace)) end--
      return chars.slice(start, end).join('')
    }
    return chars
      .map((character, index) => {
        if (mode === 'lower' && character === 'Σ') {
          let before = index - 1,
            after = index + 1
          while (before >= 0 && range(chars[before].codePointAt(0)!, program.unicode.ignorable))
            before--
          while (
            after < chars.length &&
            range(chars[after].codePointAt(0)!, program.unicode.ignorable)
          )
            after++
          if (
            before >= 0 &&
            range(chars[before].codePointAt(0)!, program.unicode.cased) &&
            !(after < chars.length && range(chars[after].codePointAt(0)!, program.unicode.cased))
          )
            return 'ς'
        }
        return (
          (mode === 'upper' ? program.unicode.upper : program.unicode.lower)[
            String(character.codePointAt(0))
          ] ?? character
        )
      })
      .join('')
  }
  function expression(
    raw: JsonValue,
    node: RuntimeNode,
    state: RuntimeSnapshot,
    event: JsonObject = {},
    depth = 0,
  ): JsonValue {
    if (depth > 128) throw Error('limit-expression')
    const value = record(raw)
    if (Object.hasOwn(value, 'literal')) return value.literal!
    if (typeof value.state === 'string') {
      const binding = node.bindings[value.state]
      if (!binding) throw Error('missing-state')
      return state.states[binding.key]!
    }
    if (typeof value.event === 'string') {
      if (!Object.hasOwn(event, value.event)) throw Error('event-value-unavailable')
      return event[value.event]!
    }
    if (value.read) {
      const read = record(value.read)
      let result = expression(read.source, node, state, event, depth + 1)
      for (const key of read.path as (string | number)[]) {
        if (
          ['__proto__', 'constructor', 'prototype'].includes(String(key)) ||
          result === null ||
          typeof result !== 'object' ||
          !Object.hasOwn(result, key)
        )
          throw Error('missing-read-path')
        result = (result as Record<string, JsonValue>)[key]!
      }
      return result
    }
    if (typeof value.call === 'string') {
      const args = (value.args as JsonValue[]).map((arg) =>
        expression(arg, node, state, event, depth + 1),
      )
      if (
        value.call === 'length' &&
        args.length === 1 &&
        (typeof args[0] === 'string' || Array.isArray(args[0]))
      )
        return Array.from(args[0] as string).length
      if (['lower', 'upper', 'trim'].includes(value.call) && args.length === 1)
        return convert(args[0], value.call)
      if (
        value.call === 'concat' &&
        args.length >= 2 &&
        args.length <= 16 &&
        args.every((arg) => typeof arg === 'string')
      )
        return args.join('')
      if (value.call === 'coalesce' && args.length >= 2 && args.length <= 16)
        return args.find((arg) => arg !== null) ?? null
      if (
        ['add', 'subtract', 'multiply', 'divide'].includes(value.call) &&
        args.length === 2 &&
        args.every((arg) => typeof arg === 'number')
      ) {
        const a = args[0],
          b = args[1]
        if (value.call === 'divide' && b === 0) throw Error('division-by-zero')
        const result =
          value.call === 'add'
            ? a + b
            : value.call === 'subtract'
              ? a - b
              : value.call === 'multiply'
                ? a * b
                : a / b
        if (!Number.isFinite(result)) throw Error('non-finite-number')
        return result
      }
    }
    throw Error('expression-type')
  }
  function compare(a: JsonValue, b: JsonValue): number {
    if (typeof a !== typeof b || !['number', 'string'].includes(typeof a))
      throw Error('comparison-type')
    if (typeof a === 'number' && typeof b === 'number') return a === b ? 0 : a < b ? -1 : 1
    const left = Array.from(a as string),
      right = Array.from(b as string)
    for (let index = 0; index < Math.min(left.length, right.length); index++)
      if (left[index] !== right[index])
        return left[index].codePointAt(0)! < right[index].codePointAt(0)! ? -1 : 1
    return left.length - right.length
  }
  function guard(
    raw: JsonValue | undefined,
    node: RuntimeNode,
    state: RuntimeSnapshot,
    event: JsonObject = {},
  ): boolean {
    if (raw === undefined) return true
    const value = record(raw)
    if (value.op === 'all')
      return (value.guards as JsonValue[]).every((item) => guard(item, node, state, event))
    if (value.op === 'any')
      return (value.guards as JsonValue[]).some((item) => guard(item, node, state, event))
    if (value.op === 'not') return !guard(value.guard, node, state, event)
    const left = expression(value.left, node, state, event),
      right = expression(value.right, node, state, event)
    if (value.op === 'eq') return canonical(left) === canonical(right)
    if (value.op === 'ne') return canonical(left) !== canonical(right)
    if (value.op === 'in' && Array.isArray(right))
      return right.some((item) => canonical(item) === canonical(left))
    if (
      ['contains', 'startsWith'].includes(scalar(value.op)) &&
      typeof left === 'string' &&
      typeof right === 'string'
    )
      return value.op === 'contains' ? left.includes(right) : left.startsWith(right)
    const order = compare(left, right)
    if (value.op === 'lt') return order < 0
    if (value.op === 'lte') return order <= 0
    if (value.op === 'gt') return order > 0
    if (value.op === 'gte') return order >= 0
    throw Error('guard-type')
  }
  function routeAddress(route: ScreenReference): string {
    return (
      '#wf/' +
      encodeURIComponent(route.namespace) +
      '/' +
      encodeURIComponent(route.id) +
      (route.variant === undefined ? '' : '?variant=' + encodeURIComponent(route.variant))
    )
  }
  function parseAddress(fragment: string): ScreenReference | null {
    if (fragment === '') return clone(program.entry)
    try {
      const match = /^#wf\/([^/?]+)\/([^/?]+)(?:\?variant=([^&]*))?$/.exec(fragment)
      if (!match) return null
      const result: ScreenReference = {
        namespace: decodeURIComponent(match[1]),
        id: decodeURIComponent(match[2]),
      }
      if (match[3] !== undefined) result.variant = decodeURIComponent(match[3])
      const screen = program.screens.find(
        (screen) => screen.route.namespace === result.namespace && screen.route.id === result.id,
      )
      return screen && (result.variant === undefined || screen.variants.includes(result.variant))
        ? result
        : null
    } catch (error) {
      void error
      return null
    }
  }
  function screenOf(state: RuntimeSnapshot) {
    return program.screens.find(
      (screen) =>
        screen.route.namespace === state.route?.namespace && screen.route.id === state.route?.id,
    )
  }
  function roots(state: RuntimeSnapshot): string[] {
    const screen = screenOf(state)
    return screen
      ? [
          'app',
          'screen/' + screen.route.namespace + '/' + screen.route.id,
          ...(screen.shell
            ? [program.shells.find((shell) => shell.id === screen.shell)!.root]
            : []),
        ]
      : ['app']
  }
  function descendant(id: string, ancestor: string): boolean {
    let node = nodes.get(id)
    while (node) {
      if (node.id === ancestor) return true
      node = node.parent ? nodes.get(node.parent) : undefined
    }
    return false
  }
  function visible(node: RuntimeNode, state: RuntimeSnapshot): boolean {
    const mounted = roots(state)
    let current: RuntimeNode | undefined = node
    while (current) {
      if (!mounted.includes(current.root) || !guard(current.attributes.visibleWhen, current, state))
        return false
      if (
        (['modal', 'drawer', 'popover'].includes(current.kind) ||
          (current.kind === 'dropdown' && current.id !== node.id)) &&
        !state.overlays.some((overlay) => overlay.id === current!.id)
      )
        return false
      if (current.kind === 'tab' && current.parent && current.id !== node.id) {
        const owner = nodes.get(current.parent)
        if (
          owner?.kind === 'tabs' &&
          owner.children.filter((id) => nodes.get(id)?.kind === 'tab')[
            state.selection[owner.id] ?? 0
          ] !== current.id
        )
          return false
      }
      const when = current.attributes.when
      if (when !== undefined) {
        const screen = screenOf(state)
        const variant = state.route?.variant ?? screen?.variants[0]
        if (!(Array.isArray(when) ? when.includes(variant ?? '') : when === variant)) return false
      }
      current = current.parent ? nodes.get(current.parent) : undefined
    }
    return true
  }
  function enabled(node: RuntimeNode, state: RuntimeSnapshot): boolean {
    let current: RuntimeNode | undefined = node
    while (current) {
      if (
        current.attributes.disabled === true ||
        current.attributes.loading === true ||
        !guard(current.attributes.enabledWhen, current, state)
      )
        return false
      current = current.parent ? nodes.get(current.parent) : undefined
    }
    return true
  }
  function active(node: RuntimeNode, state: RuntimeSnapshot): boolean {
    if (!visible(node, state) || !enabled(node, state)) return false
    const modal = state.overlays.filter((overlay) => overlay.modal).at(-1)
    return !modal || descendant(node.id, modal.id)
  }
  function focusable(node: RuntimeNode, state: RuntimeSnapshot): boolean {
    return (
      active(node, state) &&
      ([
        'input',
        'textarea',
        'select',
        'checkbox',
        'radio',
        'switch',
        'slider',
        'button',
        'link',
        'nav-item',
        'dropdown-item',
        'page',
        'modal',
        'drawer',
        'popover',
        'dropdown',
        'tabs',
        'tab',
        'accordion',
      ].includes(node.kind) ||
        node.attributes.scroll === true)
    )
  }
  function controlValue(node: RuntimeNode, state: RuntimeSnapshot): RuntimeControl {
    const raw = state.controls[node.id] ?? { value: '', checked: false },
      bind = record(node.attributes.bind),
      binding = node.bindings[scalar(bind.state)]
    if (!binding || state.invalid[node.id] || raw.pending) return raw
    const value = state.states[binding.key]!
    if (node.kind === 'radio')
      return {
        value: node.attributes.value ?? '',
        checked: canonical(value) === canonical(node.attributes.value ?? ''),
      }
    return bind.property === 'checked'
      ? { value: node.attributes.value ?? '', checked: value === true }
      : { value, checked: raw.checked }
  }
  function view(state: RuntimeSnapshot): RuntimeView {
    const result: RuntimeView = {
      visible: {},
      enabled: {},
      controls: {},
      states: state.states,
      data: {},
    }
    for (const node of program.nodes) {
      result.visible[node.id] = visible(node, state)
      result.enabled[node.id] = enabled(node, state)
      result.controls[node.id] = controlValue(node, state)
      if (node.attributes.data) result.data[node.id] = expression(node.attributes.data, node, state)
    }
    return result
  }
  function append(
    state: RuntimeSnapshot,
    node: RuntimeNode | null,
    handler: RuntimeHandler | null,
    operation: RuntimeOperation | null,
    event: JsonObject,
    result: string,
    diagnostic: string | null = null,
    before: Record<string, JsonValue> = state.states,
  ): void {
    const delta: JsonObject = {}
    for (const [key, value] of Object.entries(state.states))
      if (canonical(before[key]) !== canonical(value))
        delta[key] = program.states[key]?.sensitive ? '[redacted]' : value
    const normalized = clone(event),
      binding = node?.bindings[scalar(record(node?.attributes.bind).state)]
    if (binding?.sensitive || node?.attributes.inputType === 'password') {
      if ('value' in normalized) normalized.value = '[redacted]'
      if ('checked' in normalized) normalized.checked = '[redacted]'
    }
    state.trace.push({
      schemaVersion: '1.0.0',
      appId: program.appId,
      modelDigest: program.modelDigest,
      profileDigest: program.profileDigest,
      sequence: ++state.sequence,
      resetGeneration: state.resetGeneration,
      virtualTime: state.virtualTime,
      route: clone(state.route),
      source: node?.identity ?? null,
      renderedId: node?.id ?? null,
      handlerId: handler?.id ?? null,
      operationId: operation?.id ?? null,
      executionClass: operation?.executionClass ?? 'runtime',
      event: normalized,
      stateDeltaDigest: hash(canonical(delta)),
      result,
      diagnostic,
    })
    if (diagnostic) state.diagnostic = diagnostic
  }
  function write(
    state: RuntimeSnapshot,
    binding: StateBinding | undefined,
    value: JsonValue,
    requestId?: string,
  ): void {
    if (!binding) throw Error('missing-state')
    const held = state.reservations[binding.key]
    if (held && held !== requestId) throw Error('state-busy')
    bounded(value)
    const valid =
      binding.type === 'list'
        ? Array.isArray(value)
        : binding.type === 'record'
          ? value !== null && typeof value === 'object' && !Array.isArray(value)
          : typeof value === binding.type
    if (!valid) throw Error('state-type')
    state.states[binding.key] = clone(value)
  }
  let microsteps = 0
  function tick(): void {
    if (++microsteps > 256) throw Error('limit-microsteps')
  }
  function enqueue(state: RuntimeSnapshot, item: RuntimeQueued): void {
    if (state.queue.length >= 4096) throw Error('limit-queue')
    state.queue.push(item)
  }
  function fieldError(node: RuntimeNode, state: RuntimeSnapshot): string | null {
    const attrs = node.attributes,
      control = controlValue(node, state)
    if (!visible(node, state) || !enabled(node, state) || attrs.readonly === true) return null
    const value = control.value,
      text = scalar(value),
      type = node.kind === 'input' ? scalar(attrs.inputType ?? 'text') : node.kind
    if (
      attrs.required === true &&
      ((['checkbox', 'switch'].includes(type) && !control.checked) ||
        (type === 'radio' &&
          !program.nodes.some(
            (other) =>
              other.kind === 'radio' &&
              other.form === node.form &&
              other.attributes.name === attrs.name &&
              controlValue(other, state).checked,
          )) ||
        (!['checkbox', 'switch', 'radio'].includes(type) && text === ''))
    )
      return 'required'
    if (text === '') return null
    if (typeof attrs.minLength === 'number' && Array.from(text).length < attrs.minLength)
      return 'too-short'
    if (typeof attrs.maxLength === 'number' && Array.from(text).length > attrs.maxLength)
      return 'too-long'
    if (
      type === 'email' &&
      !/^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(
        text,
      )
    )
      return 'email'
    if (type === 'url') {
      try {
        const url = new URL(text)
        if (!url.protocol) return 'url'
      } catch (error) {
        void error
        return 'url'
      }
    }
    if (type === 'date') {
      const match = /^(\d{4,})-(\d\d)-(\d\d)$/.exec(text)
      if (!match) return 'date'
      const year = Number(match[1]),
        month = Number(match[2]),
        day = Number(match[3]),
        days = [
          31,
          year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
          31,
          30,
          31,
          30,
          31,
          31,
          30,
          31,
          30,
          31,
        ]
      if (year < 1 || month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0))
        return 'date'
    }
    if (type === 'number' || type === 'slider') {
      const number = typeof value === 'number' ? value : Number(text)
      if (!Number.isFinite(number)) return 'number'
      const min = typeof attrs.min === 'number' ? attrs.min : type === 'slider' ? 0 : undefined,
        max = typeof attrs.max === 'number' ? attrs.max : type === 'slider' ? 100 : undefined,
        step = typeof attrs.step === 'number' ? attrs.step : 1
      if (min !== undefined && number < min) return 'range-underflow'
      if (max !== undefined && number > max) return 'range-overflow'
      const remainder = (number - (min ?? 0)) / step
      if (Math.abs(remainder - Math.round(remainder)) > 1e-9) return 'step-mismatch'
    }
    if (
      node.kind === 'select' &&
      !(attrs.options as JsonObject[]).some(
        (option) => option.disabled !== true && canonical(option.value) === canonical(value),
      )
    )
      return 'option'
    return null
  }
  function validateForm(state: RuntimeSnapshot, form: RuntimeNode): boolean {
    let first: RuntimeNode | undefined
    for (const control of program.nodes.filter(
      (node) =>
        node.form === form.id &&
        ['input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider'].includes(
          node.kind,
        ),
    )) {
      const error = fieldError(control, state)
      if (error) {
        state.invalid[control.id] = error
        first ??= control
      } else delete state.invalid[control.id]
    }
    if (first) {
      state.invalid[form.id] = 'form-invalid'
      state.focus = first.id
      return false
    }
    delete state.invalid[form.id]
    return true
  }
  function normalizeControl(state: RuntimeSnapshot, node: RuntimeNode, event: JsonObject): void {
    const bind = record(node.attributes.bind),
      target = node.bindings[scalar(bind.state)],
      previous = state.controls[node.id] ?? { value: '', checked: false }
    const raw: RuntimeControl = {
      value: Object.hasOwn(event, 'value') ? event.value! : previous.value,
      checked: typeof event.checked === 'boolean' ? event.checked : previous.checked,
      pending: !!target && bind.update !== event.type,
    }
    if (node.attributes.readonly === true) throw Error('readonly-control')
    state.controls[node.id] = raw
    if (!target || bind.update !== event.type) return
    if (node.kind === 'radio' && !raw.checked) return
    let value = bind.property === 'checked' ? raw.checked : raw.value
    if (node.kind === 'radio') value = node.attributes.value ?? ''
    else if (node.kind === 'select') {
      const option = (node.attributes.options as JsonObject[]).find(
        (option) => option.disabled !== true && scalar(option.value) === scalar(raw.value),
      )
      if (!option) throw Error('option')
      value = option.value!
    } else if (target.type === 'number') {
      if (value === '') {
        state.invalid[node.id] = 'number'
        throw Error('invalid-edit')
      }
      value = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(value)) {
        state.invalid[node.id] = 'number'
        throw Error('invalid-edit')
      }
    } else if (target.type === 'boolean' && bind.property !== 'checked') {
      if (![true, false, 'true', 'false'].includes(value as string)) throw Error('state-type')
      value = value === true || value === 'true'
    }
    const check = clone(state)
    delete check.invalid[node.id]
    check.controls[node.id] = { ...raw, value }
    if (target) check.states[target.key] = value
    const error = fieldError(node, check)
    if (
      error &&
      [
        'too-short',
        'too-long',
        'range-underflow',
        'range-overflow',
        'step-mismatch',
        'number',
        'option',
      ].includes(error)
    ) {
      state.invalid[node.id] = error
      throw Error('invalid-edit')
    }
    write(state, target, value)
    raw.pending = false
    delete state.invalid[node.id]
  }
  function resolveTarget(node: RuntimeNode, effect: JsonObject): RuntimeNode {
    const target = record(effect.target),
      id = node.targets[scalar(target.scope) + ':' + scalar(target.id)],
      resolved = nodes.get(id ?? '')
    if (!resolved) throw Error('missing-target')
    return resolved
  }
  function openOverlay(state: RuntimeSnapshot, target: RuntimeNode, opener: RuntimeNode): void {
    if (state.overlays.some((overlay) => overlay.id === target.id)) return
    if (
      !roots(state).includes(target.root) ||
      !guard(target.attributes.visibleWhen, target, state) ||
      (target.parent && !visible(nodes.get(target.parent)!, state))
    )
      throw Error('inactive-target')
    const modal =
      target.kind === 'modal' || (target.kind === 'drawer' && target.attributes.modal !== false)
    state.overlays.push({ id: target.id, opener: opener.id, modal })
    if (target.kind === 'tooltip') return
    const initial = nodes.get(target.targets.initialFocus ?? '')
    const first =
      initial ??
      program.nodes.find(
        (node) => node.id !== target.id && descendant(node.id, target.id) && focusable(node, state),
      )
    if (initial && !focusable(initial, state)) throw Error('invalid-focus')
    state.focus = first?.id ?? target.id
  }
  function closeOverlay(state: RuntimeSnapshot, target: RuntimeNode): void {
    const index = state.overlays.findIndex((overlay) => overlay.id === target.id)
    if (index < 0) return
    const opener = state.overlays[index].opener
    if (target.kind === 'tooltip') {
      state.overlays.splice(index, 1)
      return
    }
    state.overlays.splice(index)
    const candidate = opener ? nodes.get(opener) : undefined
    state.focus =
      candidate && focusable(candidate, state) ? candidate.id : (screenOf(state)?.id ?? null)
  }
  interface Segment {
    route: {
      fragment: string
      mode: 'push' | 'replace' | 'traverse' | 'address'
      index: number | null
      browserSequence: number | null
    } | null
    reset: boolean
  }
  function schedule(
    state: RuntimeSnapshot,
    node: RuntimeNode,
    activation: RuntimeActivation,
    operation: RuntimeOperation,
  ): void {
    const effect = operation.effect,
      fixture = fixtures.get(scalar(effect.fixtureRef))
    if (!fixture) throw Error('missing-fixture')
    if (Object.keys(state.requests).length >= 128) throw Error('limit-requests')
    const output = [
      scalar(effect.resultState),
      scalar(effect.statusState),
      scalar(effect.errorState),
    ].map((ref) => node.bindings[ref])
    if (output.some((item) => !item) || new Set(output.map((item) => item.key)).size !== 3)
      throw Error('fixture-output-alias')
    for (const item of output) if (state.reservations[item.key]) throw Error('state-busy')
    const cursor = state.fixtureCursors[fixture.id] ?? 0,
      step =
        fixture.steps[cursor] ??
        (fixture.exhaustion === 'repeat-last' ? fixture.steps.at(-1) : undefined)
    state.fixtureCursors[fixture.id] = cursor + 1
    const sequence = ++state.requestSequence,
      id = state.resetGeneration + ':' + sequence,
      timeout = Number(effect.timeoutMs)
    const deadline = state.virtualTime + timeout,
      responseAt = state.virtualTime + (step?.delayMs ?? 0)
    if (!Number.isSafeInteger(deadline) || !Number.isSafeInteger(responseAt))
      throw Error('limit-clock')
    const request: RuntimeRequest = {
      id,
      generation: state.resetGeneration,
      sequence,
      activation: activation.id,
      owner: node.id,
      operation: clone(operation),
      resultKey: output[0].key,
      statusKey: output[1].key,
      errorKey: output[2].key,
      deadline,
      responseAt,
      outcome: step?.outcome ?? 'exhausted',
      value: clone(step?.value ?? null),
    }
    for (const item of output) state.reservations[item.key] = id
    write(state, output[1], 'pending', id)
    write(state, output[2], {}, id)
    state.requests[id] = request
    state.scheduled.push({
      time: deadline,
      priority: 0,
      sequence,
      requestId: id,
      generation: state.resetGeneration,
      owner: node.id,
      operationId: operation.id,
    })
    if (request.outcome !== 'timeout')
      state.scheduled.push({
        time: responseAt,
        priority: 1,
        sequence,
        requestId: id,
        generation: state.resetGeneration,
        owner: node.id,
        operationId: operation.id,
      })
    if (state.scheduled.length > 4096) throw Error('limit-queue')
    state.activations[String(activation.id)] = clone(activation)
  }
  function applyOperation(
    state: RuntimeSnapshot,
    node: RuntimeNode,
    activation: RuntimeActivation,
    operation: RuntimeOperation,
    segment: Segment,
  ): 'succeeded' | 'pending' | 'specified-unexecuted' | 'history-boundary' {
    tick()
    const effect = operation.effect,
      kind = scalar(effect.kind),
      event = activation.event
    if (kind === 'specify') return 'specified-unexecuted'
    if (kind === 'simulate') {
      schedule(state, node, activation, operation)
      return 'pending'
    }
    if (kind === 'set') {
      write(
        state,
        node.bindings[scalar(effect.state)],
        expression(effect.value, node, state, event),
      )
      return 'succeeded'
    }
    if (kind === 'reset') {
      const binding = node.bindings[scalar(effect.state)]
      write(state, binding, binding.initial)
      for (const child of program.nodes)
        if (child.bindings[scalar(record(child.attributes.bind).state)]?.key === binding.key)
          delete state.invalid[child.id]
      return 'succeeded'
    }
    if (kind === 'toggle') {
      const binding = node.bindings[scalar(effect.state)],
        value = state.states[binding.key]
      if (typeof value !== 'boolean') throw Error('state-type')
      write(state, binding, !value)
      return 'succeeded'
    }
    if (kind === 'filter' || kind === 'sort') {
      const source = state.states[node.bindings[scalar(effect.source)].key]
      if (!Array.isArray(source)) throw Error('list-type')
      const field = scalar(effect.field)
      let result: JsonValue[]
      if (kind === 'filter') {
        const query = convert(expression(effect.query, node, state, event), 'lower')
        for (const item of source)
          if (!Object.hasOwn(record(item), field) || typeof record(item)[field] !== 'string')
            throw Error('filter-field-type')
        result = source.filter((item) => convert(record(item)[field], 'lower').includes(query))
      } else {
        let type: string | undefined
        for (const item of source) {
          const value = record(item)[field]
          if (
            !Object.hasOwn(record(item), field) ||
            !['number', 'string'].includes(typeof value) ||
            (type && type !== typeof value)
          )
            throw Error('sort-field-type')
          type = typeof value
        }
        result = source
          .map((value, index) => ({ value, index }))
          .sort(
            (a, b) =>
              compare(record(a.value)[field], record(b.value)[field]) *
                (effect.direction === 'descending' ? -1 : 1) || a.index - b.index,
          )
          .map((item) => item.value)
      }
      write(state, node.bindings[scalar(effect.target)], result)
      return 'succeeded'
    }
    if (['open', 'close', 'toggleOverlay', 'focus', 'validate'].includes(kind)) {
      const target = resolveTarget(node, effect)
      if (kind === 'validate') {
        if (!active(target, state)) throw Error('inactive-target')
        if (!validateForm(state, target)) throw Error('form-invalid')
      } else if (kind === 'focus') {
        if (!focusable(target, state)) throw Error('invalid-focus')
        state.focus = target.id
      } else if (
        kind === 'close' ||
        (kind === 'toggleOverlay' && state.overlays.some((item) => item.id === target.id))
      )
        closeOverlay(state, target)
      else openOverlay(state, target, node)
      return 'succeeded'
    }
    if (kind === 'navigate') {
      const target = record(effect.target)
      if (target.kind === 'url') {
        state.effects.push({
          kind: 'external',
          fragment: scalar(target.url),
          sequence: 0,
          delta: 0,
        })
        return 'succeeded'
      }
      const route = target.screen as unknown as ScreenReference
      const fragment = routeAddress(route)
      if (!parseAddress(fragment)) throw Error('missing-route')
      segment.route = {
        fragment,
        mode: effect.history === 'replace' ? 'replace' : 'push',
        index: null,
        browserSequence: null,
      }
      return 'succeeded'
    }
    if (kind === 'navigateBack' || kind === 'navigateForward') {
      const index = state.historyIndex + (kind === 'navigateBack' ? -1 : 1)
      if (index < 0 || index >= state.history.length) return 'history-boundary'
      segment.route = {
        fragment: state.history[index].fragment,
        mode: 'traverse',
        index,
        browserSequence: null,
      }
      return 'succeeded'
    }
    if (kind === 'resetScenario') {
      segment.reset = true
      return 'succeeded'
    }
    throw Error('unsupported-operation')
  }
  function cancelRequest(
    state: RuntimeSnapshot,
    request: RuntimeRequest,
    surviving: string[],
    reset = false,
  ): void {
    for (const key of [request.resultKey, request.statusKey, request.errorKey])
      delete state.reservations[key]
    if (!reset) {
      for (const [key, value] of [
        [request.statusKey, 'cancelled'],
        [request.errorKey, { code: 'cancelled', value: null, operationId: request.operation.id }],
      ] as [string, JsonValue][]) {
        const binding = program.states[key]
        if (binding && (binding.lifetime === 'session' || surviving.includes(binding.root)))
          write(state, binding, value)
      }
    }
    const node = nodes.get(request.owner)!,
      activation = state.activations[String(request.activation)],
      handler = node.handlers.find((handler) => handler.id === activation?.handlerId) ?? null
    delete state.requests[request.id]
    state.scheduled = state.scheduled.filter(
      (item) => item.requestId !== request.id || item.priority === 1,
    )
    delete state.activations[String(request.activation)]
    state.queue = state.queue.filter((item) => item.source !== request.owner)
    append(state, node, handler, request.operation, activation?.event ?? {}, 'cancelled')
  }
  function ensureFocus(
    state: RuntimeSnapshot,
    previous: RuntimeSnapshot,
    observed?: { source: string; type: string },
  ): void {
    for (const overlay of [...state.overlays]) {
      const node = nodes.get(overlay.id)
      if (node && !visible(node, state)) closeOverlay(state, node)
    }
    let target = state.focus ? nodes.get(state.focus) : undefined
    if (target && !focusable(target, state)) {
      while (target?.parent) {
        target = nodes.get(target.parent)
        if (target && focusable(target, state)) break
      }
      state.focus = target && focusable(target, state) ? target.id : (screenOf(state)?.id ?? null)
    }
    if (state.focus !== previous.focus) {
      for (const [source, type] of [
        [previous.focus, 'blur'],
        [state.focus, 'focus'],
      ] as const) {
        if (
          !source ||
          (observed?.source === source && observed.type === type) ||
          !nodes.get(source)?.handlers.some((handler) => handler.event === type) ||
          state.queue.some(
            (item) => item.source === source && item.event.type === type && item.handlerId === null,
          )
        )
          continue
        enqueue(state, { source, event: { type }, handlerId: null })
      }
    }
  }

  function lifecycle(
    state: RuntimeSnapshot,
    ids: (string | null | undefined)[],
    event: string,
  ): void {
    for (const id of ids) {
      const node = nodes.get(id ?? '')
      if (!node) continue
      const handler = node.handlers.find((handler) => handler.event === event)
      if (!handler) continue
      tick()
      if (!guard(handler.guard, node, state)) continue
      const activation: RuntimeActivation = {
          id: ++state.activationSequence,
          owner: node.id,
          handlerId: handler.id,
          event: { type: event },
          index: 0,
          statuses: {},
        },
        segment: Segment = { route: null, reset: false }
      for (const operation of handler.operations) {
        const before = clone(state.states)
        if (operation.after.some((id) => activation.statuses[id] !== 'succeeded')) {
          activation.statuses[operation.id] = 'skipped-dependency'
          append(state, node, handler, operation, activation.event, 'skipped-dependency')
          continue
        }
        try {
          const result = applyOperation(state, node, activation, operation, segment)
          activation.statuses[operation.id] = result
          append(state, node, handler, operation, activation.event, result, null, before)
        } catch (error) {
          activation.statuses[operation.id] = 'failed'
          append(
            state,
            node,
            handler,
            operation,
            activation.event,
            'failed',
            (error as Error).message,
          )
          if (operation.onFailure === 'stop') throw error
        }
      }
      if (segment.route || segment.reset) throw Error('exit-effect')
    }
  }
  function changeRoute(state: RuntimeSnapshot, request: NonNullable<Segment['route']>): void {
    const route = parseAddress(request.fragment),
      current = screenOf(state),
      next = program.screens.find(
        (screen) => screen.route.namespace === route?.namespace && screen.route.id === route?.id,
      )
    const identical =
      canonical(state.route) === canonical(route) &&
      state.address === (request.fragment || routeAddress(program.entry))
    if (identical && request.mode === 'push') return
    const departed = current?.id !== next?.id,
      oldRoots = roots(state),
      nextRoots = next
        ? [
            'app',
            'screen/' + next.route.namespace + '/' + next.route.id,
            ...(next.shell ? [program.shells.find((shell) => shell.id === next.shell)!.root] : []),
          ]
        : ['app']
    if (departed) {
      for (const pending of Object.values(state.requests))
        if (!nextRoots.includes(nodes.get(pending.owner)!.root))
          cancelRequest(state, pending, nextRoots)
      lifecycle(
        state,
        [current?.id, current?.shell !== next?.shell ? current?.shell : null],
        'exit',
      )
      state.overlays = state.overlays.filter((overlay) =>
        nextRoots.includes(nodes.get(overlay.id)!.root),
      )
      for (const binding of Object.values(program.states))
        if (
          binding.lifetime === 'mount' &&
          oldRoots.includes(binding.root) &&
          !nextRoots.includes(binding.root)
        )
          state.states[binding.key] = clone(binding.initial)
      for (const node of program.nodes)
        if (oldRoots.includes(node.root) && !nextRoots.includes(node.root)) {
          delete state.invalid[node.id]
          state.controls[node.id] = initialControl(node)
        }
      state.queue = state.queue.filter((item) =>
        nextRoots.includes(nodes.get(item.source)?.root ?? ''),
      )
    }
    state.route = route
    state.address = request.fragment || routeAddress(program.entry)
    if (request.mode === 'push') {
      state.history = state.history.slice(0, state.historyIndex + 1)
      const sequence = state.nextHistorySequence++
      state.history.push({ fragment: state.address, sequence })
      state.historyIndex = state.history.length - 1
      state.effects.push({ kind: 'push', fragment: state.address, sequence, delta: 0 })
    } else if (request.mode === 'replace') {
      const sequence = state.history[state.historyIndex].sequence
      state.history[state.historyIndex] = { fragment: state.address, sequence }
      state.effects.push({ kind: 'replace', fragment: state.address, sequence, delta: 0 })
    } else if (request.index !== null) {
      const delta = request.index - state.historyIndex
      state.historyIndex = request.index
      if (request.mode === 'traverse')
        state.effects.push({
          kind: 'traverse',
          fragment: state.address,
          sequence: state.history[request.index].sequence,
          delta,
        })
    } else {
      const sequence = state.nextHistorySequence++
      state.history = [{ fragment: state.address, sequence }]
      state.historyIndex = 0
      state.effects.push({ kind: 'replace', fragment: state.address, sequence, delta: 0 })
    }
    if (departed && next) {
      if (current?.shell !== next.shell && next.shell)
        enqueue(state, { source: next.shell, event: { type: 'enter' }, handlerId: null })
      enqueue(state, { source: next.id, event: { type: 'enter' }, handlerId: null })
    }
    if (departed) state.focus = next?.id ?? null
  }
  function initialControl(node: RuntimeNode): RuntimeControl {
    return {
      value:
        node.attributes.value ??
        (node.kind === 'select'
          ? Array.isArray(node.attributes.options)
            ? (node.attributes.options.map(record).find((option) => option.disabled !== true)
                ?.value ?? '')
            : ''
          : ['slider', 'progress'].includes(node.kind)
            ? (node.attributes.min ?? 0)
            : ''),
      checked: node.attributes.checked === true,
    }
  }
  function fresh(fragment = routeAddress(program.entry)): RuntimeSnapshot {
    const route = parseAddress(fragment),
      state: RuntimeSnapshot = {
        modelDigest: program.modelDigest,
        profileDigest: program.profileDigest,
        resetGeneration: 0,
        virtualTime: Number(program.profile.clockStartMs),
        sequence: 0,
        requestSequence: 0,
        activationSequence: 0,
        states: {},
        controls: {},
        invalid: {},
        route,
        address: fragment || routeAddress(program.entry),
        history: [{ fragment: fragment || routeAddress(program.entry), sequence: 0 }],
        historyIndex: 0,
        nextHistorySequence: 1,
        overlays: [],
        focus: null,
        selection: {},
        expanded: {},
        viewMode: 'fixed',
        fixtureCursors: {},
        requests: {},
        reservations: {},
        activations: {},
        queue: [],
        scheduled: [],
        trace: [],
        effects: [],
        diagnostic: null,
        suspended: false,
      }
    for (const [key, binding] of Object.entries(program.states))
      state.states[key] = clone(binding.initial)
    for (const node of program.nodes) {
      state.controls[node.id] = initialControl(node)
      if (node.kind === 'tabs') state.selection[node.id] = Number(node.attributes.active ?? 0)
      state.expanded[node.id] =
        node.attributes.expanded === true || node.attributes.dismissible === true
    }
    const screen = screenOf(state)
    state.focus = screen?.id ?? null
    if (screen?.shell)
      enqueue(state, { source: screen.shell, event: { type: 'enter' }, handlerId: null })
    if (screen) enqueue(state, { source: screen.id, event: { type: 'enter' }, handlerId: null })
    return state
  }
  function reset(state: RuntimeSnapshot): void {
    const next = fresh(),
      previousTrace = state.trace
    next.resetGeneration = state.resetGeneration + 1
    next.sequence = state.sequence
    next.trace = previousTrace
    next.nextHistorySequence = state.nextHistorySequence + 1
    next.history[0].sequence = state.nextHistorySequence
    next.effects = [
      { kind: 'replace', fragment: next.address, sequence: next.history[0].sequence, delta: 0 },
    ]
    Object.assign(state, next)
    append(state, null, null, null, { type: 'reset' }, 'succeeded')
  }
  function runHandler(
    state: RuntimeSnapshot,
    node: RuntimeNode,
    handler: RuntimeHandler,
    event: JsonObject,
    resumed?: RuntimeActivation,
  ): void {
    tick()
    if (
      !resumed &&
      !['input', 'change'].includes(scalar(event.type)) &&
      Object.values(state.requests).some(
        (request) =>
          request.owner === node.id &&
          state.activations[String(request.activation)]?.handlerId === handler.id,
      )
    ) {
      if (handler.concurrency === 'queue')
        enqueue(state, { source: node.id, event: clone(event), handlerId: handler.id })
      else append(state, node, handler, null, event, 'busy', 'busy')
      return
    }
    const before = clone(state),
      draft = clone(state),
      segment: Segment = { route: null, reset: false },
      records: { operation: RuntimeOperation; result: string; code: string | null }[] = []
    const activation: RuntimeActivation = resumed
      ? clone(resumed)
      : {
          id: ++draft.activationSequence,
          owner: node.id,
          handlerId: handler.id,
          event: clone(event),
          index: 0,
          statuses: {},
        }
    let pending = false
    try {
      if (!resumed && ['input', 'change'].includes(scalar(event.type)))
        normalizeControl(draft, node, event)
      const busy = Object.values(draft.requests).some(
        (request) =>
          request.owner === node.id &&
          draft.activations[String(request.activation)]?.handlerId === handler.id,
      )
      if (!resumed && busy) {
        if (handler.concurrency === 'queue') {
          enqueue(draft, { source: node.id, event: clone(event), handlerId: handler.id })
          Object.assign(state, draft)
          return
        }
        Object.assign(state, draft)
        append(state, node, handler, null, event, 'busy', 'busy', before.states)
        return
      }
      if (!resumed && !guard(handler.guard, node, draft, event)) {
        Object.assign(state, draft)
        for (const operation of handler.operations)
          append(state, node, handler, operation, event, 'guard-false', null, before.states)
        return
      }
      for (let index = activation.index; index < handler.operations.length; index++) {
        const operation = handler.operations[index]
        activation.index = index + 1
        if (operation.after.some((id) => activation.statuses[id] !== 'succeeded')) {
          activation.statuses[operation.id] = 'skipped-dependency'
          records.push({ operation, result: 'skipped-dependency', code: null })
          continue
        }
        const prior = clone(draft),
          priorSegment = clone(segment)
        try {
          const result = applyOperation(draft, node, activation, operation, segment)
          activation.statuses[operation.id] = result
          records.push({
            operation,
            result,
            code: result === 'history-boundary' ? 'history-boundary' : null,
          })
          if (result === 'pending') {
            pending = true
            draft.activations[String(activation.id)] = clone(activation)
            break
          }
          if (
            segment.reset ||
            ((result === 'specified-unexecuted' || result === 'history-boundary') &&
              operation.onFailure === 'stop')
          )
            break
        } catch (error) {
          const validation = clone(draft.invalid),
            focus = draft.focus
          Object.assign(draft, prior)
          Object.assign(segment, priorSegment)
          if ((error as Error).message === 'form-invalid') {
            draft.invalid = validation
            draft.focus = focus
          }
          activation.statuses[operation.id] = 'failed'
          records.push({ operation, result: 'failed', code: (error as Error).message })
          if (operation.onFailure === 'stop') throw error
        }
      }
      if (segment.route) changeRoute(draft, segment.route)
      view(draft)
      ensureFocus(draft, before, { source: node.id, type: scalar(event.type) })
      if (!pending) delete draft.activations[String(activation.id)]
      Object.assign(state, draft)
      for (const item of records)
        append(state, node, handler, item.operation, event, item.result, item.code, before.states)
      if (segment.reset) reset(state)
    } catch (error) {
      const code = (error as Error).message
      if (code === 'invalid-edit') {
        state.controls[node.id] = draft.controls[node.id]!
        state.invalid[node.id] = draft.invalid[node.id]!
        append(state, node, handler, null, event, 'failed', 'invalid-edit')
        return
      }
      if (code === 'form-invalid') {
        state.invalid = clone(draft.invalid)
        state.focus = draft.focus
      }
      if (resumed) delete state.activations[String(activation.id)]
      if (!records.length) append(state, node, handler, null, event, 'failed', code)
      for (const item of records)
        append(
          state,
          node,
          handler,
          item.operation,
          event,
          item.result === 'succeeded' || item.result === 'pending' ? 'cancelled' : item.result,
          item.code ?? (item.result === 'succeeded' ? null : code),
        )
      if (!records.some((item) => item.code === code))
        append(state, node, handler, null, event, 'failed', code)
      if (code.startsWith('limit-')) throw error
    }
  }
  function composite(state: RuntimeSnapshot, node: RuntimeNode, event: JsonObject): void {
    const type = event.type,
      key = event.key
    if (node.kind === 'accordion' && type === 'click')
      state.expanded[node.id] = !state.expanded[node.id]
    if (
      ['alert', 'toast'].includes(node.kind) &&
      node.attributes.dismissible === true &&
      type === 'click'
    )
      state.expanded[node.id] = false
    const tabs =
      node.kind === 'tab' && node.parent
        ? nodes.get(node.parent)
        : node.kind === 'tabs'
          ? node
          : undefined
    if (tabs?.kind === 'tabs') {
      const list = tabs.children
        .map((id) => nodes.get(id)!)
        .filter((child) => child.kind === 'tab' && enabled(child, state))
      const selected = list.findIndex((child) => child.id === node.id),
        current = selected < 0 ? 0 : selected
      const backwards = tabs.attributes.vertical === true ? 'ArrowUp' : 'ArrowLeft',
        forwards = tabs.attributes.vertical === true ? 'ArrowDown' : 'ArrowRight'
      let next = current
      if (type === 'keydown' && key === backwards) next = (current - 1 + list.length) % list.length
      else if (type === 'keydown' && key === forwards) next = (current + 1) % list.length
      else if (type === 'keydown' && key === 'Home') next = 0
      else if (type === 'keydown' && key === 'End') next = list.length - 1
      if (type === 'click' || (type === 'keydown' && ['Enter', ' '].includes(scalar(key))))
        state.selection[tabs.id] = tabs.children
          .filter((id) => nodes.get(id)?.kind === 'tab')
          .indexOf(node.id)
      if (list[next]) state.focus = list[next].id
    }
    if (
      node.kind === 'dropdown' &&
      (type === 'click' ||
        (type === 'keydown' && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(scalar(key))))
    ) {
      if (state.overlays.some((overlay) => overlay.id === node.id) && type === 'click')
        closeOverlay(state, node)
      else openOverlay(state, node, node)
    }
    let menu: RuntimeNode | undefined = node
    while (menu && menu.kind !== 'dropdown') menu = menu.parent ? nodes.get(menu.parent) : undefined
    if (menu && node.kind === 'dropdown-item' && type === 'click') closeOverlay(state, menu)
    if (menu && state.overlays.some((overlay) => overlay.id === menu.id) && type === 'keydown') {
      const list = program.nodes.filter(
        (candidate) =>
          candidate.kind === 'dropdown-item' &&
          descendant(candidate.id, menu.id) &&
          enabled(candidate, state),
      )
      let index = list.findIndex((candidate) => candidate.id === node.id)
      if (key === 'ArrowDown') index = (index + 1) % list.length
      else if (key === 'ArrowUp') index = (index - 1 + list.length) % list.length
      else if (key === 'Home') index = 0
      else if (key === 'End') index = list.length - 1
      else index = -1
      if (list[index]) state.focus = list[index].id
    }
    if (type === 'keydown' && key === 'Escape') {
      const top = state.overlays.at(-1),
        target = top ? nodes.get(top.id) : undefined
      if (target && target.attributes.dismissible !== false) closeOverlay(state, target)
    }
    const tooltip = node.parent ? nodes.get(node.parent) : undefined
    if (tooltip?.kind === 'tooltip') {
      if (type === 'focus') openOverlay(state, tooltip, node)
      else if (type === 'blur') closeOverlay(state, tooltip)
    }
    if (type === 'focus') state.focus = node.id
    else if (type === 'blur' && state.focus === node.id) state.focus = null
  }
  function dispatch(
    state: RuntimeSnapshot,
    node: RuntimeNode,
    event: JsonObject,
    handlerId: string | null = null,
  ): void {
    tick()
    const internal = ['enter', 'exit'].includes(scalar(event.type))
    if (!internal && !active(node, state)) {
      append(state, node, null, null, event, 'failed', 'inactive-owner')
      return
    }
    if (internal && !roots(state).includes(node.root)) return
    const handlers = node.handlers.filter((handler) =>
      handlerId
        ? handler.id === handlerId
        : handler.event === event.type &&
          (handler.event !== 'keydown' || handler.key === event.key),
    )
    if (event.type === 'submit') {
      const validated = clone(state)
      if (!validateForm(validated, node)) {
        state.invalid = validated.invalid
        state.focus = validated.focus
        append(state, node, null, null, event, 'failed', 'form-invalid')
        return
      }
      state.invalid = validated.invalid
      if (state.diagnostic === 'form-invalid') state.diagnostic = null
    }
    const previous = { ...state, states: { ...state.states } }
    composite(state, node, event)
    if (!handlers.length && ['input', 'change'].includes(scalar(event.type))) {
      const draft = clone(state)
      try {
        normalizeControl(draft, node, event)
        view(draft)
        Object.assign(state, draft)
        append(state, node, null, null, event, 'succeeded', null, previous.states)
      } catch (error) {
        const code = (error as Error).message
        if (code === 'invalid-edit') {
          state.controls[node.id] = draft.controls[node.id]!
          state.invalid[node.id] = draft.invalid[node.id]!
        }
        append(state, node, null, null, event, 'failed', code)
      }
    }
    for (const handler of handlers) runHandler(state, node, handler, event)
    if (
      event.type === 'keydown' &&
      node.kind === 'dropdown-item' &&
      ['Enter', ' '].includes(scalar(event.key))
    )
      enqueue(state, { source: node.id, event: { type: 'click' }, handlerId: null })
    if (
      event.type === 'click' &&
      node.kind === 'button' &&
      (node.attributes.buttonType === 'submit' || node.attributes.action === 'submit') &&
      !handlers.some((handler) => handler.event === 'click')
    ) {
      const form = nodes.get(node.form ?? '')
      if (form) enqueue(state, { source: form.id, event: { type: 'submit' }, handlerId: null })
    }
    if (
      event.type === 'click' &&
      node.kind === 'button' &&
      node.attributes.buttonType === 'reset'
    ) {
      for (const child of program.nodes.filter((child) => child.form === node.form)) {
        const target = child.bindings[scalar(record(child.attributes.bind).state)]
        if (target) write(state, target, target.initial)
        state.controls[child.id] = initialControl(child)
        delete state.invalid[child.id]
      }
    }
    ensureFocus(state, previous, { source: node.id, type: scalar(event.type) })
  }
  function drain(state: RuntimeSnapshot): void {
    let blocked = 0
    while (state.queue.length) {
      if (blocked >= state.queue.length) break
      const next = state.queue.shift()!,
        node = nodes.get(next.source)
      if (!node) continue
      if (
        next.handlerId &&
        Object.values(state.requests).some(
          (request) =>
            request.owner === node.id &&
            state.activations[String(request.activation)]?.handlerId === next.handlerId,
        )
      ) {
        state.queue.push(next)
        blocked++
        continue
      }
      blocked = 0
      dispatch(state, node, next.event, next.handlerId)
    }
  }
  function completion(state: RuntimeSnapshot, due: RuntimeScheduled): void {
    const request = state.requests[due.requestId],
      node = nodes.get(due.owner) ?? null
    if (!request || request.generation !== state.resetGeneration) {
      const handler =
        node?.handlers.find((handler) =>
          handler.operations.some((operation) => operation.id === due.operationId),
        ) ?? null
      if (due.priority === 1)
        append(
          state,
          node,
          handler,
          handler?.operations.find((operation) => operation.id === due.operationId) ?? null,
          { type: 'fixture-response', requestId: due.requestId },
          'stale-response',
          'stale-response',
        )
      return
    }
    const activation = state.activations[String(request.activation)],
      owner = nodes.get(request.owner)!,
      handler = owner.handlers.find((handler) => handler.id === activation?.handlerId)
    if (!activation || !handler || !roots(state).includes(owner.root)) {
      cancelRequest(state, request, roots(state))
      append(
        state,
        owner,
        handler ?? null,
        request.operation,
        { type: 'fixture-response' },
        'stale-response',
        'stale-response',
      )
      return
    }
    const before = clone(state.states),
      timedOut = due.priority === 0,
      success = !timedOut && request.outcome === 'success'
    for (const key of [request.resultKey, request.statusKey, request.errorKey])
      delete state.reservations[key]
    delete state.requests[request.id]
    state.scheduled = state.scheduled.filter(
      (item) => item.requestId !== request.id || (timedOut && item.priority === 1),
    )
    const code = success
      ? null
      : timedOut
        ? 'timeout'
        : request.outcome === 'exhausted'
          ? 'fixture-exhausted'
          : 'fixture-error'
    if (success) write(state, program.states[request.resultKey], request.value)
    write(state, program.states[request.statusKey], success ? 'succeeded' : 'failed')
    write(
      state,
      program.states[request.errorKey],
      success
        ? {}
        : {
            code: code!,
            value: timedOut || request.outcome === 'exhausted' ? null : request.value,
            operationId: request.operation.id,
          },
    )
    activation.statuses[request.operation.id] = success ? 'succeeded' : 'failed'
    append(
      state,
      owner,
      handler,
      request.operation,
      activation.event,
      success ? 'succeeded' : 'failed',
      code,
      before,
    )
    if (!success && request.operation.onFailure === 'stop')
      delete state.activations[String(activation.id)]
    else runHandler(state, owner, handler, activation.event, activation)
    drain(state)
  }
  function initial(fragment?: string): RuntimeSnapshot {
    microsteps = 0
    const state = fresh(fragment)
    try {
      drain(state)
    } catch (error) {
      state.queue = []
      append(state, null, null, null, { type: 'initial' }, 'failed', (error as Error).message)
    }
    state.effects = []
    return state
  }
  function reduce(
    previous: RuntimeSnapshot,
    input: RuntimeInput,
    browserSequence: number | null = null,
  ): RuntimeSnapshot {
    const state = clone(previous)
    state.effects = []
    microsteps = 0
    try {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('input-shape')
      const keys =
        input.kind === 'reset'
          ? ['kind']
          : input.kind === 'advanceClock'
            ? ['kind', 'deltaMs']
            : input.kind === 'address'
              ? ['kind', 'fragment']
              : input.kind === 'event'
                ? ['kind', 'source', 'event', 'key', 'value', 'checked']
                : []
      if (!keys.length || Object.keys(input).some((key) => !keys.includes(key)))
        throw Error('input-shape')
      if (state.suspended && input.kind !== 'address' && input.kind !== 'reset') {
        append(state, null, null, null, { type: input.kind }, 'busy', 'history-compensation')
        return state
      }
      if (input.kind === 'reset') {
        reset(state)
        drain(state)
        return state
      }
      if (input.kind === 'advanceClock') {
        if (
          !Number.isInteger(input.deltaMs) ||
          input.deltaMs < 0 ||
          input.deltaMs > 600000 ||
          !Number.isSafeInteger(state.virtualTime + input.deltaMs)
        )
          throw Error('limit-clock')
        const target = state.virtualTime + input.deltaMs
        for (;;) {
          state.scheduled.sort(
            (a, b) => a.time - b.time || a.priority - b.priority || a.sequence - b.sequence,
          )
          const due = state.scheduled[0]
          if (!due || due.time > target) break
          state.scheduled.shift()
          state.virtualTime = due.time
          microsteps = 0
          completion(state, due)
        }
        state.virtualTime = target
        return state
      }
      if (input.kind === 'address') {
        if (typeof input.fragment !== 'string') throw Error('input-shape')
        bounded(input.fragment)
        const fragment = input.fragment || routeAddress(program.entry)
        if (
          state.suspended &&
          fragment === state.address &&
          browserSequence === state.history[state.historyIndex].sequence
        ) {
          state.suspended = false
          return state
        }
        const index =
          browserSequence === null
            ? -1
            : state.history.findIndex(
                (entry) => entry.sequence === browserSequence && entry.fragment === fragment,
              )
        try {
          changeRoute(state, {
            fragment: input.fragment,
            mode: 'address',
            index: index < 0 ? null : index,
            browserSequence,
          })
          ensureFocus(state, previous)
          drain(state)
          return state
        } catch (error) {
          const restored = clone(previous)
          restored.effects = []
          const code = (error as Error).message
          append(
            restored,
            null,
            null,
            null,
            { type: 'address', fragment: input.fragment },
            'failed',
            code,
          )
          if (index >= 0) {
            restored.suspended = true
            restored.effects.push({
              kind: 'compensate',
              fragment: restored.address,
              sequence: restored.history[restored.historyIndex].sequence,
              delta: restored.historyIndex - index,
            })
          } else {
            const sequence = restored.nextHistorySequence++
            restored.history = [{ fragment: restored.address, sequence }]
            restored.historyIndex = 0
            restored.effects.push({
              kind: 'replace',
              fragment: restored.address,
              sequence,
              delta: 0,
            })
          }
          return restored
        }
      }
      const node = byIdentity.get(canonical(input.source))
      if (!node) throw Error('unknown-source')
      if (!['click', 'input', 'change', 'submit', 'keydown', 'focus', 'blur'].includes(input.event))
        throw Error('event-type')
      if (
        input.event === 'keydown' &&
        (typeof input.key !== 'string' || 'value' in input || 'checked' in input)
      )
        throw Error('event-payload')
      if (
        !['input', 'change', 'keydown'].includes(input.event) &&
        ('value' in input || 'checked' in input || 'key' in input)
      )
        throw Error('event-payload')
      if (
        ['input', 'change'].includes(input.event) &&
        !['input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider'].includes(
          node.kind,
        )
      )
        throw Error('event-owner')
      if (input.event === 'submit' && node.kind !== 'form') throw Error('event-owner')
      const event: JsonObject = { type: input.event }
      if (input.value !== undefined) {
        bounded(input.value)
        event.value = input.value
      }
      if (input.checked !== undefined) event.checked = input.checked
      if (input.key !== undefined) event.key = input.key
      dispatch(state, node, event)
      drain(state)
      view(state)
      return state
    } catch (error) {
      const restored = clone(previous)
      restored.effects = []
      append(
        restored,
        null,
        null,
        null,
        { type: scalar(record(input).kind) || 'invalid' },
        'failed',
        (error as Error).message,
      )
      return restored
    }
  }
  function hover(previous: RuntimeSnapshot, id: string, open: boolean): RuntimeSnapshot {
    const state = clone(previous),
      node = nodes.get(id)
    state.effects = []
    if (node?.kind === 'tooltip' && active(node, state)) {
      if (open) openOverlay(state, node, node)
      else closeOverlay(state, node)
    }
    return state
  }
  return { initial, reduce, view, parseAddress, routeAddress, hover }
}

/*
UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2026 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.

Data: Unicode 15.1.0 UCD, https://www.unicode.org/Public/15.1.0/ucd/
Inputs: UnicodeData.txt, SpecialCasing.txt, DerivedCoreProperties.txt, PropList.txt.
*/
const UNICODE_15_1 = JSON.parse(
  [
    '{"lower":{"65":"a","66":"b","67":"c","68":"d","69":"e","70":"f","71":"g","72":"h","73":"i","74":"j","75":"k","76":"l","77":"m","78":"n","79":"o","80":"p","81":"q","82":"r","83":"s","84":"t","85":"u","86":"v","87":"w","88":"x","89":"y","90":"z","192":"\\u00e0","193":"\\u00e1","194":"\\u00e2","195":"\\u00e3","196":"\\u00e4","197":"\\u00e5","198":"\\u00e6","199":"\\u00e7","200":"\\u00e8","201":"\\u00e9","202":"\\u00ea","203":"\\u00eb","204":"\\u00ec","205":"\\u00ed","206":"\\u00ee","207":"\\u00ef","208":"\\u00f0","209":"\\u00f1","210":"\\u00f2","211":"\\u00f3","212":"\\u00f4","213":"\\u00f5","214":"\\u00f6","216":"\\u00f8","217":"\\u00f9","218":"\\u00fa","219":"\\u00fb","220":"\\u00fc","221":"\\u00fd","222":"\\u00fe","256":"\\u0101","258":"\\u0103","260":"\\u0105","262":"\\u0107","264":"\\u0109","266":"\\u010b","268":"\\u010d","270":"\\u010f","272":"\\u0111","274":"\\u0113","276":"\\u0115","278":"\\u0117","280":"\\u0119","282":"\\u011b","284":"\\u011d","286":"\\u011f","288":"\\u0121","290":"\\u0123","292":"\\u0125","294":"\\u0127","296":"\\u0129","298":"\\u012b","300":"\\u012d","302":"\\u012f","304":"i\\u0307","306":"\\u0133","308":"\\u0135","310":"\\u0137","313":"\\u013a","315":"\\u013c","317":"\\u013e","319":"\\u0140","321":"\\u0142","323":"\\u0144","325":"\\u0146","327":"\\u0148","330":"\\u014b","332":"\\u014d","334":"\\u014f","336":"\\u0151","338":"\\u0153","340":"\\u0155","342":"\\u0157","344":"\\u0159","346":"\\u015b","348":"\\u015d","350":"\\u015f","352":"\\u0161","354":"\\u0163","356":"\\u0165","358":"\\u0167","360":"\\u0169","362":"\\u016b","364":"\\u016d","366":"\\u016f","368":"\\u0171","370":"\\u0173","372":"\\u0175","374":"\\u0177","376":"\\u00ff","377":"\\u017a","379":"\\u017c","381":"\\u017e","385":"\\u0253","386":"\\u0183","388":"\\u0185","390":"\\u0254","391":"\\u0188","393":"\\u0256","394":"\\u0257","395":"\\u018c","398":"\\u01dd","399":"\\u0259","400":"\\u025b","401":"\\u0192","403":"\\u0260","404":"\\u0263","406":"\\u0269","407":"\\u0268","408":"\\u0199","412":"\\u026f","413":"\\u0272","415":"\\u0275","416":"\\u01a1","418":"\\u01a3","420":"\\u01a5","422":"\\u0280","423":"\\u01a8","425":"\\u0283","428":"\\u01ad","430":"\\u0288","431":"\\u01b0","433":"\\u028a","434":"\\u028b","435":"\\u01b4","437":"\\u01b6","439":"\\u0292","440":"\\u01b9","444":"\\u01bd","452":"\\u01c6","453":"\\u01c6","455":"\\u01c9","456":"\\u01c9","458":"\\u01cc","459":"\\u01cc","461":"\\u01ce","463":"\\u01d0","465":"\\u01d2","467":"\\u01d4","469":"\\u01d6","471":"\\u01d8","473":"\\u01da","475":"\\u01dc","478":"\\u01df","480":"\\u01e1","482":"\\u01e3","484":"\\u01e5","486":"\\u01e7","488":"\\u01e9","490":"\\u01eb","492":"\\u01ed","494":"\\u01ef","497":"\\u01f3","498":"\\u01f3","500":"\\u01f5","502":"\\u0195","503":"\\u01bf","504":"\\u01f9","506":"\\u01fb","508":"\\u01fd","510":"\\u01ff","512":"\\u0201","514":"\\u0203","516":"\\u0205","518":"\\u0207","520":"\\u0209","522":"\\u020b","524":"\\u020d","526":"\\u020f","528":"\\u0211","530":"\\u0213","532":"\\u0215","534":"\\u0217","536":"\\u0219","538":"\\u021b","540":"\\u021d","542":"\\u021f","544":"\\u019e","546":"\\u0223","548":"\\u0225","550":"\\u0227","552":"\\u0229","554":"\\u022b","556":"\\u0',
    '22d","558":"\\u022f","560":"\\u0231","562":"\\u0233","570":"\\u2c65","571":"\\u023c","573":"\\u019a","574":"\\u2c66","577":"\\u0242","579":"\\u0180","580":"\\u0289","581":"\\u028c","582":"\\u0247","584":"\\u0249","586":"\\u024b","588":"\\u024d","590":"\\u024f","880":"\\u0371","882":"\\u0373","886":"\\u0377","895":"\\u03f3","902":"\\u03ac","904":"\\u03ad","905":"\\u03ae","906":"\\u03af","908":"\\u03cc","910":"\\u03cd","911":"\\u03ce","913":"\\u03b1","914":"\\u03b2","915":"\\u03b3","916":"\\u03b4","917":"\\u03b5","918":"\\u03b6","919":"\\u03b7","920":"\\u03b8","921":"\\u03b9","922":"\\u03ba","923":"\\u03bb","924":"\\u03bc","925":"\\u03bd","926":"\\u03be","927":"\\u03bf","928":"\\u03c0","929":"\\u03c1","931":"\\u03c3","932":"\\u03c4","933":"\\u03c5","934":"\\u03c6","935":"\\u03c7","936":"\\u03c8","937":"\\u03c9","938":"\\u03ca","939":"\\u03cb","975":"\\u03d7","984":"\\u03d9","986":"\\u03db","988":"\\u03dd","990":"\\u03df","992":"\\u03e1","994":"\\u03e3","996":"\\u03e5","998":"\\u03e7","1000":"\\u03e9","1002":"\\u03eb","1004":"\\u03ed","1006":"\\u03ef","1012":"\\u03b8","1015":"\\u03f8","1017":"\\u03f2","1018":"\\u03fb","1021":"\\u037b","1022":"\\u037c","1023":"\\u037d","1024":"\\u0450","1025":"\\u0451","1026":"\\u0452","1027":"\\u0453","1028":"\\u0454","1029":"\\u0455","1030":"\\u0456","1031":"\\u0457","1032":"\\u0458","1033":"\\u0459","1034":"\\u045a","1035":"\\u045b","1036":"\\u045c","1037":"\\u045d","1038":"\\u045e","1039":"\\u045f","1040":"\\u0430","1041":"\\u0431","1042":"\\u0432","1043":"\\u0433","1044":"\\u0434","1045":"\\u0435","1046":"\\u0436","1047":"\\u0437","1048":"\\u0438","1049":"\\u0439","1050":"\\u043a","1051":"\\u043b","1052":"\\u043c","1053":"\\u043d","1054":"\\u043e","1055":"\\u043f","1056":"\\u0440","1057":"\\u0441","1058":"\\u0442","1059":"\\u0443","1060":"\\u0444","1061":"\\u0445","1062":"\\u0446","1063":"\\u0447","1064":"\\u0448","1065":"\\u0449","1066":"\\u044a","1067":"\\u044b","1068":"\\u044c","1069":"\\u044d","1070":"\\u044e","1071":"\\u044f","1120":"\\u0461","1122":"\\u0463","1124":"\\u0465","1126":"\\u0467","1128":"\\u0469","1130":"\\u046b","1132":"\\u046d","1134":"\\u046f","1136":"\\u0471","1138":"\\u0473","1140":"\\u0475","1142":"\\u0477","1144":"\\u0479","1146":"\\u047b","1148":"\\u047d","1150":"\\u047f","1152":"\\u0481","1162":"\\u048b","1164":"\\u048d","1166":"\\u048f","1168":"\\u0491","1170":"\\u0493","1172":"\\u0495","1174":"\\u0497","1176":"\\u0499","1178":"\\u049b","1180":"\\u049d","1182":"\\u049f","1184":"\\u04a1","1186":"\\u04a3","1188":"\\u04a5","1190":"\\u04a7","1192":"\\u04a9","1194":"\\u04ab","1196":"\\u04ad","1198":"\\u04af","1200":"\\u04b1","1202":"\\u04b3","1204":"\\u04b5","1206":"\\u04b7","1208":"\\u04b9","1210":"\\u04bb","1212":"\\u04bd","1214":"\\u04bf","1216":"\\u04cf","1217":"\\u04c2","1219":"\\u04c4","1221":"\\u04c6","1223":"\\u04c8","1225":"\\u04ca","1227":"\\u04cc","1229":"\\u04ce","1232":"\\u04d1","1234":"\\u04d3","1236":"\\u04d5","1238":"\\u04d7","1240":"\\u04d9","1242":"\\u04db","1244":"\\u04dd","1246":"\\u04df","1248":"\\u04e1","1250":"\\u04e3","1252":"\\u04e5","1254":"\\u04e7","1256":"\\u04e9","1258":"\\u04eb","1260":"\\u04ed","1262":"\\u04ef","1264":"\\u04f1","1266":"\\u04f3","',
    '1268":"\\u04f5","1270":"\\u04f7","1272":"\\u04f9","1274":"\\u04fb","1276":"\\u04fd","1278":"\\u04ff","1280":"\\u0501","1282":"\\u0503","1284":"\\u0505","1286":"\\u0507","1288":"\\u0509","1290":"\\u050b","1292":"\\u050d","1294":"\\u050f","1296":"\\u0511","1298":"\\u0513","1300":"\\u0515","1302":"\\u0517","1304":"\\u0519","1306":"\\u051b","1308":"\\u051d","1310":"\\u051f","1312":"\\u0521","1314":"\\u0523","1316":"\\u0525","1318":"\\u0527","1320":"\\u0529","1322":"\\u052b","1324":"\\u052d","1326":"\\u052f","1329":"\\u0561","1330":"\\u0562","1331":"\\u0563","1332":"\\u0564","1333":"\\u0565","1334":"\\u0566","1335":"\\u0567","1336":"\\u0568","1337":"\\u0569","1338":"\\u056a","1339":"\\u056b","1340":"\\u056c","1341":"\\u056d","1342":"\\u056e","1343":"\\u056f","1344":"\\u0570","1345":"\\u0571","1346":"\\u0572","1347":"\\u0573","1348":"\\u0574","1349":"\\u0575","1350":"\\u0576","1351":"\\u0577","1352":"\\u0578","1353":"\\u0579","1354":"\\u057a","1355":"\\u057b","1356":"\\u057c","1357":"\\u057d","1358":"\\u057e","1359":"\\u057f","1360":"\\u0580","1361":"\\u0581","1362":"\\u0582","1363":"\\u0583","1364":"\\u0584","1365":"\\u0585","1366":"\\u0586","4256":"\\u2d00","4257":"\\u2d01","4258":"\\u2d02","4259":"\\u2d03","4260":"\\u2d04","4261":"\\u2d05","4262":"\\u2d06","4263":"\\u2d07","4264":"\\u2d08","4265":"\\u2d09","4266":"\\u2d0a","4267":"\\u2d0b","4268":"\\u2d0c","4269":"\\u2d0d","4270":"\\u2d0e","4271":"\\u2d0f","4272":"\\u2d10","4273":"\\u2d11","4274":"\\u2d12","4275":"\\u2d13","4276":"\\u2d14","4277":"\\u2d15","4278":"\\u2d16","4279":"\\u2d17","4280":"\\u2d18","4281":"\\u2d19","4282":"\\u2d1a","4283":"\\u2d1b","4284":"\\u2d1c","4285":"\\u2d1d","4286":"\\u2d1e","4287":"\\u2d1f","4288":"\\u2d20","4289":"\\u2d21","4290":"\\u2d22","4291":"\\u2d23","4292":"\\u2d24","4293":"\\u2d25","4295":"\\u2d27","4301":"\\u2d2d","5024":"\\uab70","5025":"\\uab71","5026":"\\uab72","5027":"\\uab73","5028":"\\uab74","5029":"\\uab75","5030":"\\uab76","5031":"\\uab77","5032":"\\uab78","5033":"\\uab79","5034":"\\uab7a","5035":"\\uab7b","5036":"\\uab7c","5037":"\\uab7d","5038":"\\uab7e","5039":"\\uab7f","5040":"\\uab80","5041":"\\uab81","5042":"\\uab82","5043":"\\uab83","5044":"\\uab84","5045":"\\uab85","5046":"\\uab86","5047":"\\uab87","5048":"\\uab88","5049":"\\uab89","5050":"\\uab8a","5051":"\\uab8b","5052":"\\uab8c","5053":"\\uab8d","5054":"\\uab8e","5055":"\\uab8f","5056":"\\uab90","5057":"\\uab91","5058":"\\uab92","5059":"\\uab93","5060":"\\uab94","5061":"\\uab95","5062":"\\uab96","5063":"\\uab97","5064":"\\uab98","5065":"\\uab99","5066":"\\uab9a","5067":"\\uab9b","5068":"\\uab9c","5069":"\\uab9d","5070":"\\uab9e","5071":"\\uab9f","5072":"\\uaba0","5073":"\\uaba1","5074":"\\uaba2","5075":"\\uaba3","5076":"\\uaba4","5077":"\\uaba5","5078":"\\uaba6","5079":"\\uaba7","5080":"\\uaba8","5081":"\\uaba9","5082":"\\uabaa","5083":"\\uabab","5084":"\\uabac","5085":"\\uabad","5086":"\\uabae","5087":"\\uabaf","5088":"\\uabb0","5089":"\\uabb1","5090":"\\uabb2","5091":"\\uabb3","5092":"\\uabb4","5093":"\\uabb5","5094":"\\uabb6","5095":"\\uabb7","5096":"\\uabb8","5097":"\\uabb9","5098":"\\uabba","5099":"\\uabbb","5100":"\\uabbc","5101":"\\uabbd","5102":"\\uabbe","5103":"\\',
    'uabbf","5104":"\\u13f8","5105":"\\u13f9","5106":"\\u13fa","5107":"\\u13fb","5108":"\\u13fc","5109":"\\u13fd","7312":"\\u10d0","7313":"\\u10d1","7314":"\\u10d2","7315":"\\u10d3","7316":"\\u10d4","7317":"\\u10d5","7318":"\\u10d6","7319":"\\u10d7","7320":"\\u10d8","7321":"\\u10d9","7322":"\\u10da","7323":"\\u10db","7324":"\\u10dc","7325":"\\u10dd","7326":"\\u10de","7327":"\\u10df","7328":"\\u10e0","7329":"\\u10e1","7330":"\\u10e2","7331":"\\u10e3","7332":"\\u10e4","7333":"\\u10e5","7334":"\\u10e6","7335":"\\u10e7","7336":"\\u10e8","7337":"\\u10e9","7338":"\\u10ea","7339":"\\u10eb","7340":"\\u10ec","7341":"\\u10ed","7342":"\\u10ee","7343":"\\u10ef","7344":"\\u10f0","7345":"\\u10f1","7346":"\\u10f2","7347":"\\u10f3","7348":"\\u10f4","7349":"\\u10f5","7350":"\\u10f6","7351":"\\u10f7","7352":"\\u10f8","7353":"\\u10f9","7354":"\\u10fa","7357":"\\u10fd","7358":"\\u10fe","7359":"\\u10ff","7680":"\\u1e01","7682":"\\u1e03","7684":"\\u1e05","7686":"\\u1e07","7688":"\\u1e09","7690":"\\u1e0b","7692":"\\u1e0d","7694":"\\u1e0f","7696":"\\u1e11","7698":"\\u1e13","7700":"\\u1e15","7702":"\\u1e17","7704":"\\u1e19","7706":"\\u1e1b","7708":"\\u1e1d","7710":"\\u1e1f","7712":"\\u1e21","7714":"\\u1e23","7716":"\\u1e25","7718":"\\u1e27","7720":"\\u1e29","7722":"\\u1e2b","7724":"\\u1e2d","7726":"\\u1e2f","7728":"\\u1e31","7730":"\\u1e33","7732":"\\u1e35","7734":"\\u1e37","7736":"\\u1e39","7738":"\\u1e3b","7740":"\\u1e3d","7742":"\\u1e3f","7744":"\\u1e41","7746":"\\u1e43","7748":"\\u1e45","7750":"\\u1e47","7752":"\\u1e49","7754":"\\u1e4b","7756":"\\u1e4d","7758":"\\u1e4f","7760":"\\u1e51","7762":"\\u1e53","7764":"\\u1e55","7766":"\\u1e57","7768":"\\u1e59","7770":"\\u1e5b","7772":"\\u1e5d","7774":"\\u1e5f","7776":"\\u1e61","7778":"\\u1e63","7780":"\\u1e65","7782":"\\u1e67","7784":"\\u1e69","7786":"\\u1e6b","7788":"\\u1e6d","7790":"\\u1e6f","7792":"\\u1e71","7794":"\\u1e73","7796":"\\u1e75","7798":"\\u1e77","7800":"\\u1e79","7802":"\\u1e7b","7804":"\\u1e7d","7806":"\\u1e7f","7808":"\\u1e81","7810":"\\u1e83","7812":"\\u1e85","7814":"\\u1e87","7816":"\\u1e89","7818":"\\u1e8b","7820":"\\u1e8d","7822":"\\u1e8f","7824":"\\u1e91","7826":"\\u1e93","7828":"\\u1e95","7838":"\\u00df","7840":"\\u1ea1","7842":"\\u1ea3","7844":"\\u1ea5","7846":"\\u1ea7","7848":"\\u1ea9","7850":"\\u1eab","7852":"\\u1ead","7854":"\\u1eaf","7856":"\\u1eb1","7858":"\\u1eb3","7860":"\\u1eb5","7862":"\\u1eb7","7864":"\\u1eb9","7866":"\\u1ebb","7868":"\\u1ebd","7870":"\\u1ebf","7872":"\\u1ec1","7874":"\\u1ec3","7876":"\\u1ec5","7878":"\\u1ec7","7880":"\\u1ec9","7882":"\\u1ecb","7884":"\\u1ecd","7886":"\\u1ecf","7888":"\\u1ed1","7890":"\\u1ed3","7892":"\\u1ed5","7894":"\\u1ed7","7896":"\\u1ed9","7898":"\\u1edb","7900":"\\u1edd","7902":"\\u1edf","7904":"\\u1ee1","7906":"\\u1ee3","7908":"\\u1ee5","7910":"\\u1ee7","7912":"\\u1ee9","7914":"\\u1eeb","7916":"\\u1eed","7918":"\\u1eef","7920":"\\u1ef1","7922":"\\u1ef3","7924":"\\u1ef5","7926":"\\u1ef7","7928":"\\u1ef9","7930":"\\u1efb","7932":"\\u1efd","7934":"\\u1eff","7944":"\\u1f00","7945":"\\u1f01","7946":"\\u1f02","7947":"\\u1f03","7948":"\\u1f04","7949":"\\u1f05","7950":"\\u1f06","7951":"\\u1f07","7960":"\\u1f10","7961":"\\u1f11","7962":"\\u1f12","',
    '7963":"\\u1f13","7964":"\\u1f14","7965":"\\u1f15","7976":"\\u1f20","7977":"\\u1f21","7978":"\\u1f22","7979":"\\u1f23","7980":"\\u1f24","7981":"\\u1f25","7982":"\\u1f26","7983":"\\u1f27","7992":"\\u1f30","7993":"\\u1f31","7994":"\\u1f32","7995":"\\u1f33","7996":"\\u1f34","7997":"\\u1f35","7998":"\\u1f36","7999":"\\u1f37","8008":"\\u1f40","8009":"\\u1f41","8010":"\\u1f42","8011":"\\u1f43","8012":"\\u1f44","8013":"\\u1f45","8025":"\\u1f51","8027":"\\u1f53","8029":"\\u1f55","8031":"\\u1f57","8040":"\\u1f60","8041":"\\u1f61","8042":"\\u1f62","8043":"\\u1f63","8044":"\\u1f64","8045":"\\u1f65","8046":"\\u1f66","8047":"\\u1f67","8072":"\\u1f80","8073":"\\u1f81","8074":"\\u1f82","8075":"\\u1f83","8076":"\\u1f84","8077":"\\u1f85","8078":"\\u1f86","8079":"\\u1f87","8088":"\\u1f90","8089":"\\u1f91","8090":"\\u1f92","8091":"\\u1f93","8092":"\\u1f94","8093":"\\u1f95","8094":"\\u1f96","8095":"\\u1f97","8104":"\\u1fa0","8105":"\\u1fa1","8106":"\\u1fa2","8107":"\\u1fa3","8108":"\\u1fa4","8109":"\\u1fa5","8110":"\\u1fa6","8111":"\\u1fa7","8120":"\\u1fb0","8121":"\\u1fb1","8122":"\\u1f70","8123":"\\u1f71","8124":"\\u1fb3","8136":"\\u1f72","8137":"\\u1f73","8138":"\\u1f74","8139":"\\u1f75","8140":"\\u1fc3","8152":"\\u1fd0","8153":"\\u1fd1","8154":"\\u1f76","8155":"\\u1f77","8168":"\\u1fe0","8169":"\\u1fe1","8170":"\\u1f7a","8171":"\\u1f7b","8172":"\\u1fe5","8184":"\\u1f78","8185":"\\u1f79","8186":"\\u1f7c","8187":"\\u1f7d","8188":"\\u1ff3","8486":"\\u03c9","8490":"k","8491":"\\u00e5","8498":"\\u214e","8544":"\\u2170","8545":"\\u2171","8546":"\\u2172","8547":"\\u2173","8548":"\\u2174","8549":"\\u2175","8550":"\\u2176","8551":"\\u2177","8552":"\\u2178","8553":"\\u2179","8554":"\\u217a","8555":"\\u217b","8556":"\\u217c","8557":"\\u217d","8558":"\\u217e","8559":"\\u217f","8579":"\\u2184","9398":"\\u24d0","9399":"\\u24d1","9400":"\\u24d2","9401":"\\u24d3","9402":"\\u24d4","9403":"\\u24d5","9404":"\\u24d6","9405":"\\u24d7","9406":"\\u24d8","9407":"\\u24d9","9408":"\\u24da","9409":"\\u24db","9410":"\\u24dc","9411":"\\u24dd","9412":"\\u24de","9413":"\\u24df","9414":"\\u24e0","9415":"\\u24e1","9416":"\\u24e2","9417":"\\u24e3","9418":"\\u24e4","9419":"\\u24e5","9420":"\\u24e6","9421":"\\u24e7","9422":"\\u24e8","9423":"\\u24e9","11264":"\\u2c30","11265":"\\u2c31","11266":"\\u2c32","11267":"\\u2c33","11268":"\\u2c34","11269":"\\u2c35","11270":"\\u2c36","11271":"\\u2c37","11272":"\\u2c38","11273":"\\u2c39","11274":"\\u2c3a","11275":"\\u2c3b","11276":"\\u2c3c","11277":"\\u2c3d","11278":"\\u2c3e","11279":"\\u2c3f","11280":"\\u2c40","11281":"\\u2c41","11282":"\\u2c42","11283":"\\u2c43","11284":"\\u2c44","11285":"\\u2c45","11286":"\\u2c46","11287":"\\u2c47","11288":"\\u2c48","11289":"\\u2c49","11290":"\\u2c4a","11291":"\\u2c4b","11292":"\\u2c4c","11293":"\\u2c4d","11294":"\\u2c4e","11295":"\\u2c4f","11296":"\\u2c50","11297":"\\u2c51","11298":"\\u2c52","11299":"\\u2c53","11300":"\\u2c54","11301":"\\u2c55","11302":"\\u2c56","11303":"\\u2c57","11304":"\\u2c58","11305":"\\u2c59","11306":"\\u2c5a","11307":"\\u2c5b","11308":"\\u2c5c","11309":"\\u2c5d","11310":"\\u2c5e","11311":"\\u2c5f","11360":"\\u2c61","11362":"\\u026b","11363":"\\u1d7d","11364":"\\u027d","11367":"\\',
    'u2c68","11369":"\\u2c6a","11371":"\\u2c6c","11373":"\\u0251","11374":"\\u0271","11375":"\\u0250","11376":"\\u0252","11378":"\\u2c73","11381":"\\u2c76","11390":"\\u023f","11391":"\\u0240","11392":"\\u2c81","11394":"\\u2c83","11396":"\\u2c85","11398":"\\u2c87","11400":"\\u2c89","11402":"\\u2c8b","11404":"\\u2c8d","11406":"\\u2c8f","11408":"\\u2c91","11410":"\\u2c93","11412":"\\u2c95","11414":"\\u2c97","11416":"\\u2c99","11418":"\\u2c9b","11420":"\\u2c9d","11422":"\\u2c9f","11424":"\\u2ca1","11426":"\\u2ca3","11428":"\\u2ca5","11430":"\\u2ca7","11432":"\\u2ca9","11434":"\\u2cab","11436":"\\u2cad","11438":"\\u2caf","11440":"\\u2cb1","11442":"\\u2cb3","11444":"\\u2cb5","11446":"\\u2cb7","11448":"\\u2cb9","11450":"\\u2cbb","11452":"\\u2cbd","11454":"\\u2cbf","11456":"\\u2cc1","11458":"\\u2cc3","11460":"\\u2cc5","11462":"\\u2cc7","11464":"\\u2cc9","11466":"\\u2ccb","11468":"\\u2ccd","11470":"\\u2ccf","11472":"\\u2cd1","11474":"\\u2cd3","11476":"\\u2cd5","11478":"\\u2cd7","11480":"\\u2cd9","11482":"\\u2cdb","11484":"\\u2cdd","11486":"\\u2cdf","11488":"\\u2ce1","11490":"\\u2ce3","11499":"\\u2cec","11501":"\\u2cee","11506":"\\u2cf3","42560":"\\ua641","42562":"\\ua643","42564":"\\ua645","42566":"\\ua647","42568":"\\ua649","42570":"\\ua64b","42572":"\\ua64d","42574":"\\ua64f","42576":"\\ua651","42578":"\\ua653","42580":"\\ua655","42582":"\\ua657","42584":"\\ua659","42586":"\\ua65b","42588":"\\ua65d","42590":"\\ua65f","42592":"\\ua661","42594":"\\ua663","42596":"\\ua665","42598":"\\ua667","42600":"\\ua669","42602":"\\ua66b","42604":"\\ua66d","42624":"\\ua681","42626":"\\ua683","42628":"\\ua685","42630":"\\ua687","42632":"\\ua689","42634":"\\ua68b","42636":"\\ua68d","42638":"\\ua68f","42640":"\\ua691","42642":"\\ua693","42644":"\\ua695","42646":"\\ua697","42648":"\\ua699","42650":"\\ua69b","42786":"\\ua723","42788":"\\ua725","42790":"\\ua727","42792":"\\ua729","42794":"\\ua72b","42796":"\\ua72d","42798":"\\ua72f","42802":"\\ua733","42804":"\\ua735","42806":"\\ua737","42808":"\\ua739","42810":"\\ua73b","42812":"\\ua73d","42814":"\\ua73f","42816":"\\ua741","42818":"\\ua743","42820":"\\ua745","42822":"\\ua747","42824":"\\ua749","42826":"\\ua74b","42828":"\\ua74d","42830":"\\ua74f","42832":"\\ua751","42834":"\\ua753","42836":"\\ua755","42838":"\\ua757","42840":"\\ua759","42842":"\\ua75b","42844":"\\ua75d","42846":"\\ua75f","42848":"\\ua761","42850":"\\ua763","42852":"\\ua765","42854":"\\ua767","42856":"\\ua769","42858":"\\ua76b","42860":"\\ua76d","42862":"\\ua76f","42873":"\\ua77a","42875":"\\ua77c","42877":"\\u1d79","42878":"\\ua77f","42880":"\\ua781","42882":"\\ua783","42884":"\\ua785","42886":"\\ua787","42891":"\\ua78c","42893":"\\u0265","42896":"\\ua791","42898":"\\ua793","42902":"\\ua797","42904":"\\ua799","42906":"\\ua79b","42908":"\\ua79d","42910":"\\ua79f","42912":"\\ua7a1","42914":"\\ua7a3","42916":"\\ua7a5","42918":"\\ua7a7","42920":"\\ua7a9","42922":"\\u0266","42923":"\\u025c","42924":"\\u0261","42925":"\\u026c","42926":"\\u026a","42928":"\\u029e","42929":"\\u0287","42930":"\\u029d","42931":"\\uab53","42932":"\\ua7b5","42934":"\\ua7b7","42936":"\\ua7b9","42938":"\\ua7bb","42940":"\\ua7bd","42942":"\\ua7bf","42944":"\\ua7c1","',
    '42946":"\\ua7c3","42948":"\\ua794","42949":"\\u0282","42950":"\\u1d8e","42951":"\\ua7c8","42953":"\\ua7ca","42960":"\\ua7d1","42966":"\\ua7d7","42968":"\\ua7d9","42997":"\\ua7f6","65313":"\\uff41","65314":"\\uff42","65315":"\\uff43","65316":"\\uff44","65317":"\\uff45","65318":"\\uff46","65319":"\\uff47","65320":"\\uff48","65321":"\\uff49","65322":"\\uff4a","65323":"\\uff4b","65324":"\\uff4c","65325":"\\uff4d","65326":"\\uff4e","65327":"\\uff4f","65328":"\\uff50","65329":"\\uff51","65330":"\\uff52","65331":"\\uff53","65332":"\\uff54","65333":"\\uff55","65334":"\\uff56","65335":"\\uff57","65336":"\\uff58","65337":"\\uff59","65338":"\\uff5a","66560":"\\ud801\\udc28","66561":"\\ud801\\udc29","66562":"\\ud801\\udc2a","66563":"\\ud801\\udc2b","66564":"\\ud801\\udc2c","66565":"\\ud801\\udc2d","66566":"\\ud801\\udc2e","66567":"\\ud801\\udc2f","66568":"\\ud801\\udc30","66569":"\\ud801\\udc31","66570":"\\ud801\\udc32","66571":"\\ud801\\udc33","66572":"\\ud801\\udc34","66573":"\\ud801\\udc35","66574":"\\ud801\\udc36","66575":"\\ud801\\udc37","66576":"\\ud801\\udc38","66577":"\\ud801\\udc39","66578":"\\ud801\\udc3a","66579":"\\ud801\\udc3b","66580":"\\ud801\\udc3c","66581":"\\ud801\\udc3d","66582":"\\ud801\\udc3e","66583":"\\ud801\\udc3f","66584":"\\ud801\\udc40","66585":"\\ud801\\udc41","66586":"\\ud801\\udc42","66587":"\\ud801\\udc43","66588":"\\ud801\\udc44","66589":"\\ud801\\udc45","66590":"\\ud801\\udc46","66591":"\\ud801\\udc47","66592":"\\ud801\\udc48","66593":"\\ud801\\udc49","66594":"\\ud801\\udc4a","66595":"\\ud801\\udc4b","66596":"\\ud801\\udc4c","66597":"\\ud801\\udc4d","66598":"\\ud801\\udc4e","66599":"\\ud801\\udc4f","66736":"\\ud801\\udcd8","66737":"\\ud801\\udcd9","66738":"\\ud801\\udcda","66739":"\\ud801\\udcdb","66740":"\\ud801\\udcdc","66741":"\\ud801\\udcdd","66742":"\\ud801\\udcde","66743":"\\ud801\\udcdf","66744":"\\ud801\\udce0","66745":"\\ud801\\udce1","66746":"\\ud801\\udce2","66747":"\\ud801\\udce3","66748":"\\ud801\\udce4","66749":"\\ud801\\udce5","66750":"\\ud801\\udce6","66751":"\\ud801\\udce7","66752":"\\ud801\\udce8","66753":"\\ud801\\udce9","66754":"\\ud801\\udcea","66755":"\\ud801\\udceb","66756":"\\ud801\\udcec","66757":"\\ud801\\udced","66758":"\\ud801\\udcee","66759":"\\ud801\\udcef","66760":"\\ud801\\udcf0","66761":"\\ud801\\udcf1","66762":"\\ud801\\udcf2","66763":"\\ud801\\udcf3","66764":"\\ud801\\udcf4","66765":"\\ud801\\udcf5","66766":"\\ud801\\udcf6","66767":"\\ud801\\udcf7","66768":"\\ud801\\udcf8","66769":"\\ud801\\udcf9","66770":"\\ud801\\udcfa","66771":"\\ud801\\udcfb","66928":"\\ud801\\udd97","66929":"\\ud801\\udd98","66930":"\\ud801\\udd99","66931":"\\ud801\\udd9a","66932":"\\ud801\\udd9b","66933":"\\ud801\\udd9c","66934":"\\ud801\\udd9d","66935":"\\ud801\\udd9e","66936":"\\ud801\\udd9f","66937":"\\ud801\\udda0","66938":"\\ud801\\udda1","66940":"\\ud801\\udda3","66941":"\\ud801\\udda4","66942":"\\ud801\\udda5","66943":"\\ud801\\udda6","66944":"\\ud801\\udda7","66945":"\\ud801\\udda8","66946":"\\ud801\\udda9","66947":"\\ud801\\uddaa","66948":"\\ud801\\uddab","66949":"\\ud801\\uddac","66950":"\\ud801\\uddad","66951":"\\ud801\\uddae","66952":"\\ud801\\uddaf","66953":"\\ud801\\uddb0","66954":"\\ud801\\uddb1","66956":"\\ud801\\uddb3","66957":"\\ud801\\uddb',
    '4","66958":"\\ud801\\uddb5","66959":"\\ud801\\uddb6","66960":"\\ud801\\uddb7","66961":"\\ud801\\uddb8","66962":"\\ud801\\uddb9","66964":"\\ud801\\uddbb","66965":"\\ud801\\uddbc","68736":"\\ud803\\udcc0","68737":"\\ud803\\udcc1","68738":"\\ud803\\udcc2","68739":"\\ud803\\udcc3","68740":"\\ud803\\udcc4","68741":"\\ud803\\udcc5","68742":"\\ud803\\udcc6","68743":"\\ud803\\udcc7","68744":"\\ud803\\udcc8","68745":"\\ud803\\udcc9","68746":"\\ud803\\udcca","68747":"\\ud803\\udccb","68748":"\\ud803\\udccc","68749":"\\ud803\\udccd","68750":"\\ud803\\udcce","68751":"\\ud803\\udccf","68752":"\\ud803\\udcd0","68753":"\\ud803\\udcd1","68754":"\\ud803\\udcd2","68755":"\\ud803\\udcd3","68756":"\\ud803\\udcd4","68757":"\\ud803\\udcd5","68758":"\\ud803\\udcd6","68759":"\\ud803\\udcd7","68760":"\\ud803\\udcd8","68761":"\\ud803\\udcd9","68762":"\\ud803\\udcda","68763":"\\ud803\\udcdb","68764":"\\ud803\\udcdc","68765":"\\ud803\\udcdd","68766":"\\ud803\\udcde","68767":"\\ud803\\udcdf","68768":"\\ud803\\udce0","68769":"\\ud803\\udce1","68770":"\\ud803\\udce2","68771":"\\ud803\\udce3","68772":"\\ud803\\udce4","68773":"\\ud803\\udce5","68774":"\\ud803\\udce6","68775":"\\ud803\\udce7","68776":"\\ud803\\udce8","68777":"\\ud803\\udce9","68778":"\\ud803\\udcea","68779":"\\ud803\\udceb","68780":"\\ud803\\udcec","68781":"\\ud803\\udced","68782":"\\ud803\\udcee","68783":"\\ud803\\udcef","68784":"\\ud803\\udcf0","68785":"\\ud803\\udcf1","68786":"\\ud803\\udcf2","71840":"\\ud806\\udcc0","71841":"\\ud806\\udcc1","71842":"\\ud806\\udcc2","71843":"\\ud806\\udcc3","71844":"\\ud806\\udcc4","71845":"\\ud806\\udcc5","71846":"\\ud806\\udcc6","71847":"\\ud806\\udcc7","71848":"\\ud806\\udcc8","71849":"\\ud806\\udcc9","71850":"\\ud806\\udcca","71851":"\\ud806\\udccb","71852":"\\ud806\\udccc","71853":"\\ud806\\udccd","71854":"\\ud806\\udcce","71855":"\\ud806\\udccf","71856":"\\ud806\\udcd0","71857":"\\ud806\\udcd1","71858":"\\ud806\\udcd2","71859":"\\ud806\\udcd3","71860":"\\ud806\\udcd4","71861":"\\ud806\\udcd5","71862":"\\ud806\\udcd6","71863":"\\ud806\\udcd7","71864":"\\ud806\\udcd8","71865":"\\ud806\\udcd9","71866":"\\ud806\\udcda","71867":"\\ud806\\udcdb","71868":"\\ud806\\udcdc","71869":"\\ud806\\udcdd","71870":"\\ud806\\udcde","71871":"\\ud806\\udcdf","93760":"\\ud81b\\ude60","93761":"\\ud81b\\ude61","93762":"\\ud81b\\ude62","93763":"\\ud81b\\ude63","93764":"\\ud81b\\ude64","93765":"\\ud81b\\ude65","93766":"\\ud81b\\ude66","93767":"\\ud81b\\ude67","93768":"\\ud81b\\ude68","93769":"\\ud81b\\ude69","93770":"\\ud81b\\ude6a","93771":"\\ud81b\\ude6b","93772":"\\ud81b\\ude6c","93773":"\\ud81b\\ude6d","93774":"\\ud81b\\ude6e","93775":"\\ud81b\\ude6f","93776":"\\ud81b\\ude70","93777":"\\ud81b\\ude71","93778":"\\ud81b\\ude72","93779":"\\ud81b\\ude73","93780":"\\ud81b\\ude74","93781":"\\ud81b\\ude75","93782":"\\ud81b\\ude76","93783":"\\ud81b\\ude77","93784":"\\ud81b\\ude78","93785":"\\ud81b\\ude79","93786":"\\ud81b\\ude7a","93787":"\\ud81b\\ude7b","93788":"\\ud81b\\ude7c","93789":"\\ud81b\\ude7d","93790":"\\ud81b\\ude7e","93791":"\\ud81b\\ude7f","125184":"\\ud83a\\udd22","125185":"\\ud83a\\udd23","125186":"\\ud83a\\udd24","125187":"\\ud83a\\udd25","125188":"\\ud83a\\udd26","125189":"\\ud83a\\udd27","125190":"\\ud83a\\udd28","125191":"\\ud83a\\udd29"',
    ',"125192":"\\ud83a\\udd2a","125193":"\\ud83a\\udd2b","125194":"\\ud83a\\udd2c","125195":"\\ud83a\\udd2d","125196":"\\ud83a\\udd2e","125197":"\\ud83a\\udd2f","125198":"\\ud83a\\udd30","125199":"\\ud83a\\udd31","125200":"\\ud83a\\udd32","125201":"\\ud83a\\udd33","125202":"\\ud83a\\udd34","125203":"\\ud83a\\udd35","125204":"\\ud83a\\udd36","125205":"\\ud83a\\udd37","125206":"\\ud83a\\udd38","125207":"\\ud83a\\udd39","125208":"\\ud83a\\udd3a","125209":"\\ud83a\\udd3b","125210":"\\ud83a\\udd3c","125211":"\\ud83a\\udd3d","125212":"\\ud83a\\udd3e","125213":"\\ud83a\\udd3f","125214":"\\ud83a\\udd40","125215":"\\ud83a\\udd41","125216":"\\ud83a\\udd42","125217":"\\ud83a\\udd43","223":"\\u00df","64256":"\\ufb00","64257":"\\ufb01","64258":"\\ufb02","64259":"\\ufb03","64260":"\\ufb04","64261":"\\ufb05","64262":"\\ufb06","1415":"\\u0587","64275":"\\ufb13","64276":"\\ufb14","64277":"\\ufb15","64278":"\\ufb16","64279":"\\ufb17","329":"\\u0149","912":"\\u0390","944":"\\u03b0","496":"\\u01f0","7830":"\\u1e96","7831":"\\u1e97","7832":"\\u1e98","7833":"\\u1e99","7834":"\\u1e9a","8016":"\\u1f50","8018":"\\u1f52","8020":"\\u1f54","8022":"\\u1f56","8118":"\\u1fb6","8134":"\\u1fc6","8146":"\\u1fd2","8147":"\\u1fd3","8150":"\\u1fd6","8151":"\\u1fd7","8162":"\\u1fe2","8163":"\\u1fe3","8164":"\\u1fe4","8166":"\\u1fe6","8167":"\\u1fe7","8182":"\\u1ff6","8064":"\\u1f80","8065":"\\u1f81","8066":"\\u1f82","8067":"\\u1f83","8068":"\\u1f84","8069":"\\u1f85","8070":"\\u1f86","8071":"\\u1f87","8080":"\\u1f90","8081":"\\u1f91","8082":"\\u1f92","8083":"\\u1f93","8084":"\\u1f94","8085":"\\u1f95","8086":"\\u1f96","8087":"\\u1f97","8096":"\\u1fa0","8097":"\\u1fa1","8098":"\\u1fa2","8099":"\\u1fa3","8100":"\\u1fa4","8101":"\\u1fa5","8102":"\\u1fa6","8103":"\\u1fa7","8115":"\\u1fb3","8131":"\\u1fc3","8179":"\\u1ff3","8114":"\\u1fb2","8116":"\\u1fb4","8130":"\\u1fc2","8132":"\\u1fc4","8178":"\\u1ff2","8180":"\\u1ff4","8119":"\\u1fb7","8135":"\\u1fc7","8183":"\\u1ff7"},"upper":{"97":"A","98":"B","99":"C","100":"D","101":"E","102":"F","103":"G","104":"H","105":"I","106":"J","107":"K","108":"L","109":"M","110":"N","111":"O","112":"P","113":"Q","114":"R","115":"S","116":"T","117":"U","118":"V","119":"W","120":"X","121":"Y","122":"Z","181":"\\u039c","224":"\\u00c0","225":"\\u00c1","226":"\\u00c2","227":"\\u00c3","228":"\\u00c4","229":"\\u00c5","230":"\\u00c6","231":"\\u00c7","232":"\\u00c8","233":"\\u00c9","234":"\\u00ca","235":"\\u00cb","236":"\\u00cc","237":"\\u00cd","238":"\\u00ce","239":"\\u00cf","240":"\\u00d0","241":"\\u00d1","242":"\\u00d2","243":"\\u00d3","244":"\\u00d4","245":"\\u00d5","246":"\\u00d6","248":"\\u00d8","249":"\\u00d9","250":"\\u00da","251":"\\u00db","252":"\\u00dc","253":"\\u00dd","254":"\\u00de","255":"\\u0178","257":"\\u0100","259":"\\u0102","261":"\\u0104","263":"\\u0106","265":"\\u0108","267":"\\u010a","269":"\\u010c","271":"\\u010e","273":"\\u0110","275":"\\u0112","277":"\\u0114","279":"\\u0116","281":"\\u0118","283":"\\u011a","285":"\\u011c","287":"\\u011e","289":"\\u0120","291":"\\u0122","293":"\\u0124","295":"\\u0126","297":"\\u0128","299":"\\u012a","301":"\\u012c","303":"\\u012e","305":"I","307":"\\u0132","309":"\\u0134","311":"\\u0136","314":',
    '"\\u0139","316":"\\u013b","318":"\\u013d","320":"\\u013f","322":"\\u0141","324":"\\u0143","326":"\\u0145","328":"\\u0147","331":"\\u014a","333":"\\u014c","335":"\\u014e","337":"\\u0150","339":"\\u0152","341":"\\u0154","343":"\\u0156","345":"\\u0158","347":"\\u015a","349":"\\u015c","351":"\\u015e","353":"\\u0160","355":"\\u0162","357":"\\u0164","359":"\\u0166","361":"\\u0168","363":"\\u016a","365":"\\u016c","367":"\\u016e","369":"\\u0170","371":"\\u0172","373":"\\u0174","375":"\\u0176","378":"\\u0179","380":"\\u017b","382":"\\u017d","383":"S","384":"\\u0243","387":"\\u0182","389":"\\u0184","392":"\\u0187","396":"\\u018b","402":"\\u0191","405":"\\u01f6","409":"\\u0198","410":"\\u023d","414":"\\u0220","417":"\\u01a0","419":"\\u01a2","421":"\\u01a4","424":"\\u01a7","429":"\\u01ac","432":"\\u01af","436":"\\u01b3","438":"\\u01b5","441":"\\u01b8","445":"\\u01bc","447":"\\u01f7","453":"\\u01c4","454":"\\u01c4","456":"\\u01c7","457":"\\u01c7","459":"\\u01ca","460":"\\u01ca","462":"\\u01cd","464":"\\u01cf","466":"\\u01d1","468":"\\u01d3","470":"\\u01d5","472":"\\u01d7","474":"\\u01d9","476":"\\u01db","477":"\\u018e","479":"\\u01de","481":"\\u01e0","483":"\\u01e2","485":"\\u01e4","487":"\\u01e6","489":"\\u01e8","491":"\\u01ea","493":"\\u01ec","495":"\\u01ee","498":"\\u01f1","499":"\\u01f1","501":"\\u01f4","505":"\\u01f8","507":"\\u01fa","509":"\\u01fc","511":"\\u01fe","513":"\\u0200","515":"\\u0202","517":"\\u0204","519":"\\u0206","521":"\\u0208","523":"\\u020a","525":"\\u020c","527":"\\u020e","529":"\\u0210","531":"\\u0212","533":"\\u0214","535":"\\u0216","537":"\\u0218","539":"\\u021a","541":"\\u021c","543":"\\u021e","547":"\\u0222","549":"\\u0224","551":"\\u0226","553":"\\u0228","555":"\\u022a","557":"\\u022c","559":"\\u022e","561":"\\u0230","563":"\\u0232","572":"\\u023b","575":"\\u2c7e","576":"\\u2c7f","578":"\\u0241","583":"\\u0246","585":"\\u0248","587":"\\u024a","589":"\\u024c","591":"\\u024e","592":"\\u2c6f","593":"\\u2c6d","594":"\\u2c70","595":"\\u0181","596":"\\u0186","598":"\\u0189","599":"\\u018a","601":"\\u018f","603":"\\u0190","604":"\\ua7ab","608":"\\u0193","609":"\\ua7ac","611":"\\u0194","613":"\\ua78d","614":"\\ua7aa","616":"\\u0197","617":"\\u0196","618":"\\ua7ae","619":"\\u2c62","620":"\\ua7ad","623":"\\u019c","625":"\\u2c6e","626":"\\u019d","629":"\\u019f","637":"\\u2c64","640":"\\u01a6","642":"\\ua7c5","643":"\\u01a9","647":"\\ua7b1","648":"\\u01ae","649":"\\u0244","650":"\\u01b1","651":"\\u01b2","652":"\\u0245","658":"\\u01b7","669":"\\ua7b2","670":"\\ua7b0","837":"\\u0399","881":"\\u0370","883":"\\u0372","887":"\\u0376","891":"\\u03fd","892":"\\u03fe","893":"\\u03ff","940":"\\u0386","941":"\\u0388","942":"\\u0389","943":"\\u038a","945":"\\u0391","946":"\\u0392","947":"\\u0393","948":"\\u0394","949":"\\u0395","950":"\\u0396","951":"\\u0397","952":"\\u0398","953":"\\u0399","954":"\\u039a","955":"\\u039b","956":"\\u039c","957":"\\u039d","958":"\\u039e","959":"\\u039f","960":"\\u03a0","961":"\\u03a1","962":"\\u03a3","963":"\\u03a3","964":"\\u03a4","965":"\\u03a5","966":"\\u03a6","967":"\\u03a7","968":"\\u03a8","969":"\\u03a9","970":"\\u03aa","971":"\\u03ab","972":"\\u038c","973":"\\u038e","974":"\\u038f","976":"\\u0392","977":"\\u03',
    '98","981":"\\u03a6","982":"\\u03a0","983":"\\u03cf","985":"\\u03d8","987":"\\u03da","989":"\\u03dc","991":"\\u03de","993":"\\u03e0","995":"\\u03e2","997":"\\u03e4","999":"\\u03e6","1001":"\\u03e8","1003":"\\u03ea","1005":"\\u03ec","1007":"\\u03ee","1008":"\\u039a","1009":"\\u03a1","1010":"\\u03f9","1011":"\\u037f","1013":"\\u0395","1016":"\\u03f7","1019":"\\u03fa","1072":"\\u0410","1073":"\\u0411","1074":"\\u0412","1075":"\\u0413","1076":"\\u0414","1077":"\\u0415","1078":"\\u0416","1079":"\\u0417","1080":"\\u0418","1081":"\\u0419","1082":"\\u041a","1083":"\\u041b","1084":"\\u041c","1085":"\\u041d","1086":"\\u041e","1087":"\\u041f","1088":"\\u0420","1089":"\\u0421","1090":"\\u0422","1091":"\\u0423","1092":"\\u0424","1093":"\\u0425","1094":"\\u0426","1095":"\\u0427","1096":"\\u0428","1097":"\\u0429","1098":"\\u042a","1099":"\\u042b","1100":"\\u042c","1101":"\\u042d","1102":"\\u042e","1103":"\\u042f","1104":"\\u0400","1105":"\\u0401","1106":"\\u0402","1107":"\\u0403","1108":"\\u0404","1109":"\\u0405","1110":"\\u0406","1111":"\\u0407","1112":"\\u0408","1113":"\\u0409","1114":"\\u040a","1115":"\\u040b","1116":"\\u040c","1117":"\\u040d","1118":"\\u040e","1119":"\\u040f","1121":"\\u0460","1123":"\\u0462","1125":"\\u0464","1127":"\\u0466","1129":"\\u0468","1131":"\\u046a","1133":"\\u046c","1135":"\\u046e","1137":"\\u0470","1139":"\\u0472","1141":"\\u0474","1143":"\\u0476","1145":"\\u0478","1147":"\\u047a","1149":"\\u047c","1151":"\\u047e","1153":"\\u0480","1163":"\\u048a","1165":"\\u048c","1167":"\\u048e","1169":"\\u0490","1171":"\\u0492","1173":"\\u0494","1175":"\\u0496","1177":"\\u0498","1179":"\\u049a","1181":"\\u049c","1183":"\\u049e","1185":"\\u04a0","1187":"\\u04a2","1189":"\\u04a4","1191":"\\u04a6","1193":"\\u04a8","1195":"\\u04aa","1197":"\\u04ac","1199":"\\u04ae","1201":"\\u04b0","1203":"\\u04b2","1205":"\\u04b4","1207":"\\u04b6","1209":"\\u04b8","1211":"\\u04ba","1213":"\\u04bc","1215":"\\u04be","1218":"\\u04c1","1220":"\\u04c3","1222":"\\u04c5","1224":"\\u04c7","1226":"\\u04c9","1228":"\\u04cb","1230":"\\u04cd","1231":"\\u04c0","1233":"\\u04d0","1235":"\\u04d2","1237":"\\u04d4","1239":"\\u04d6","1241":"\\u04d8","1243":"\\u04da","1245":"\\u04dc","1247":"\\u04de","1249":"\\u04e0","1251":"\\u04e2","1253":"\\u04e4","1255":"\\u04e6","1257":"\\u04e8","1259":"\\u04ea","1261":"\\u04ec","1263":"\\u04ee","1265":"\\u04f0","1267":"\\u04f2","1269":"\\u04f4","1271":"\\u04f6","1273":"\\u04f8","1275":"\\u04fa","1277":"\\u04fc","1279":"\\u04fe","1281":"\\u0500","1283":"\\u0502","1285":"\\u0504","1287":"\\u0506","1289":"\\u0508","1291":"\\u050a","1293":"\\u050c","1295":"\\u050e","1297":"\\u0510","1299":"\\u0512","1301":"\\u0514","1303":"\\u0516","1305":"\\u0518","1307":"\\u051a","1309":"\\u051c","1311":"\\u051e","1313":"\\u0520","1315":"\\u0522","1317":"\\u0524","1319":"\\u0526","1321":"\\u0528","1323":"\\u052a","1325":"\\u052c","1327":"\\u052e","1377":"\\u0531","1378":"\\u0532","1379":"\\u0533","1380":"\\u0534","1381":"\\u0535","1382":"\\u0536","1383":"\\u0537","1384":"\\u0538","1385":"\\u0539","1386":"\\u053a","1387":"\\u053b","1388":"\\u053c","1389":"\\u053d","1390":"\\u053e","1391":"\\u053f","1392":"\\u0540","1393":"\\u0541","1394":"\\u0542"',
    ',"1395":"\\u0543","1396":"\\u0544","1397":"\\u0545","1398":"\\u0546","1399":"\\u0547","1400":"\\u0548","1401":"\\u0549","1402":"\\u054a","1403":"\\u054b","1404":"\\u054c","1405":"\\u054d","1406":"\\u054e","1407":"\\u054f","1408":"\\u0550","1409":"\\u0551","1410":"\\u0552","1411":"\\u0553","1412":"\\u0554","1413":"\\u0555","1414":"\\u0556","4304":"\\u1c90","4305":"\\u1c91","4306":"\\u1c92","4307":"\\u1c93","4308":"\\u1c94","4309":"\\u1c95","4310":"\\u1c96","4311":"\\u1c97","4312":"\\u1c98","4313":"\\u1c99","4314":"\\u1c9a","4315":"\\u1c9b","4316":"\\u1c9c","4317":"\\u1c9d","4318":"\\u1c9e","4319":"\\u1c9f","4320":"\\u1ca0","4321":"\\u1ca1","4322":"\\u1ca2","4323":"\\u1ca3","4324":"\\u1ca4","4325":"\\u1ca5","4326":"\\u1ca6","4327":"\\u1ca7","4328":"\\u1ca8","4329":"\\u1ca9","4330":"\\u1caa","4331":"\\u1cab","4332":"\\u1cac","4333":"\\u1cad","4334":"\\u1cae","4335":"\\u1caf","4336":"\\u1cb0","4337":"\\u1cb1","4338":"\\u1cb2","4339":"\\u1cb3","4340":"\\u1cb4","4341":"\\u1cb5","4342":"\\u1cb6","4343":"\\u1cb7","4344":"\\u1cb8","4345":"\\u1cb9","4346":"\\u1cba","4349":"\\u1cbd","4350":"\\u1cbe","4351":"\\u1cbf","5112":"\\u13f0","5113":"\\u13f1","5114":"\\u13f2","5115":"\\u13f3","5116":"\\u13f4","5117":"\\u13f5","7296":"\\u0412","7297":"\\u0414","7298":"\\u041e","7299":"\\u0421","7300":"\\u0422","7301":"\\u0422","7302":"\\u042a","7303":"\\u0462","7304":"\\ua64a","7545":"\\ua77d","7549":"\\u2c63","7566":"\\ua7c6","7681":"\\u1e00","7683":"\\u1e02","7685":"\\u1e04","7687":"\\u1e06","7689":"\\u1e08","7691":"\\u1e0a","7693":"\\u1e0c","7695":"\\u1e0e","7697":"\\u1e10","7699":"\\u1e12","7701":"\\u1e14","7703":"\\u1e16","7705":"\\u1e18","7707":"\\u1e1a","7709":"\\u1e1c","7711":"\\u1e1e","7713":"\\u1e20","7715":"\\u1e22","7717":"\\u1e24","7719":"\\u1e26","7721":"\\u1e28","7723":"\\u1e2a","7725":"\\u1e2c","7727":"\\u1e2e","7729":"\\u1e30","7731":"\\u1e32","7733":"\\u1e34","7735":"\\u1e36","7737":"\\u1e38","7739":"\\u1e3a","7741":"\\u1e3c","7743":"\\u1e3e","7745":"\\u1e40","7747":"\\u1e42","7749":"\\u1e44","7751":"\\u1e46","7753":"\\u1e48","7755":"\\u1e4a","7757":"\\u1e4c","7759":"\\u1e4e","7761":"\\u1e50","7763":"\\u1e52","7765":"\\u1e54","7767":"\\u1e56","7769":"\\u1e58","7771":"\\u1e5a","7773":"\\u1e5c","7775":"\\u1e5e","7777":"\\u1e60","7779":"\\u1e62","7781":"\\u1e64","7783":"\\u1e66","7785":"\\u1e68","7787":"\\u1e6a","7789":"\\u1e6c","7791":"\\u1e6e","7793":"\\u1e70","7795":"\\u1e72","7797":"\\u1e74","7799":"\\u1e76","7801":"\\u1e78","7803":"\\u1e7a","7805":"\\u1e7c","7807":"\\u1e7e","7809":"\\u1e80","7811":"\\u1e82","7813":"\\u1e84","7815":"\\u1e86","7817":"\\u1e88","7819":"\\u1e8a","7821":"\\u1e8c","7823":"\\u1e8e","7825":"\\u1e90","7827":"\\u1e92","7829":"\\u1e94","7835":"\\u1e60","7841":"\\u1ea0","7843":"\\u1ea2","7845":"\\u1ea4","7847":"\\u1ea6","7849":"\\u1ea8","7851":"\\u1eaa","7853":"\\u1eac","7855":"\\u1eae","7857":"\\u1eb0","7859":"\\u1eb2","7861":"\\u1eb4","7863":"\\u1eb6","7865":"\\u1eb8","7867":"\\u1eba","7869":"\\u1ebc","7871":"\\u1ebe","7873":"\\u1ec0","7875":"\\u1ec2","7877":"\\u1ec4","7879":"\\u1ec6","7881":"\\u1ec8","7883":"\\u1eca","7885":"\\u1ecc","7887":"\\u1ece","7889":"\\u1ed0","7891":"\\u1ed2","7893":"\\u1ed4","7895":',
    '"\\u1ed6","7897":"\\u1ed8","7899":"\\u1eda","7901":"\\u1edc","7903":"\\u1ede","7905":"\\u1ee0","7907":"\\u1ee2","7909":"\\u1ee4","7911":"\\u1ee6","7913":"\\u1ee8","7915":"\\u1eea","7917":"\\u1eec","7919":"\\u1eee","7921":"\\u1ef0","7923":"\\u1ef2","7925":"\\u1ef4","7927":"\\u1ef6","7929":"\\u1ef8","7931":"\\u1efa","7933":"\\u1efc","7935":"\\u1efe","7936":"\\u1f08","7937":"\\u1f09","7938":"\\u1f0a","7939":"\\u1f0b","7940":"\\u1f0c","7941":"\\u1f0d","7942":"\\u1f0e","7943":"\\u1f0f","7952":"\\u1f18","7953":"\\u1f19","7954":"\\u1f1a","7955":"\\u1f1b","7956":"\\u1f1c","7957":"\\u1f1d","7968":"\\u1f28","7969":"\\u1f29","7970":"\\u1f2a","7971":"\\u1f2b","7972":"\\u1f2c","7973":"\\u1f2d","7974":"\\u1f2e","7975":"\\u1f2f","7984":"\\u1f38","7985":"\\u1f39","7986":"\\u1f3a","7987":"\\u1f3b","7988":"\\u1f3c","7989":"\\u1f3d","7990":"\\u1f3e","7991":"\\u1f3f","8000":"\\u1f48","8001":"\\u1f49","8002":"\\u1f4a","8003":"\\u1f4b","8004":"\\u1f4c","8005":"\\u1f4d","8017":"\\u1f59","8019":"\\u1f5b","8021":"\\u1f5d","8023":"\\u1f5f","8032":"\\u1f68","8033":"\\u1f69","8034":"\\u1f6a","8035":"\\u1f6b","8036":"\\u1f6c","8037":"\\u1f6d","8038":"\\u1f6e","8039":"\\u1f6f","8048":"\\u1fba","8049":"\\u1fbb","8050":"\\u1fc8","8051":"\\u1fc9","8052":"\\u1fca","8053":"\\u1fcb","8054":"\\u1fda","8055":"\\u1fdb","8056":"\\u1ff8","8057":"\\u1ff9","8058":"\\u1fea","8059":"\\u1feb","8060":"\\u1ffa","8061":"\\u1ffb","8064":"\\u1f08\\u0399","8065":"\\u1f09\\u0399","8066":"\\u1f0a\\u0399","8067":"\\u1f0b\\u0399","8068":"\\u1f0c\\u0399","8069":"\\u1f0d\\u0399","8070":"\\u1f0e\\u0399","8071":"\\u1f0f\\u0399","8080":"\\u1f28\\u0399","8081":"\\u1f29\\u0399","8082":"\\u1f2a\\u0399","8083":"\\u1f2b\\u0399","8084":"\\u1f2c\\u0399","8085":"\\u1f2d\\u0399","8086":"\\u1f2e\\u0399","8087":"\\u1f2f\\u0399","8096":"\\u1f68\\u0399","8097":"\\u1f69\\u0399","8098":"\\u1f6a\\u0399","8099":"\\u1f6b\\u0399","8100":"\\u1f6c\\u0399","8101":"\\u1f6d\\u0399","8102":"\\u1f6e\\u0399","8103":"\\u1f6f\\u0399","8112":"\\u1fb8","8113":"\\u1fb9","8115":"\\u0391\\u0399","8126":"\\u0399","8131":"\\u0397\\u0399","8144":"\\u1fd8","8145":"\\u1fd9","8160":"\\u1fe8","8161":"\\u1fe9","8165":"\\u1fec","8179":"\\u03a9\\u0399","8526":"\\u2132","8560":"\\u2160","8561":"\\u2161","8562":"\\u2162","8563":"\\u2163","8564":"\\u2164","8565":"\\u2165","8566":"\\u2166","8567":"\\u2167","8568":"\\u2168","8569":"\\u2169","8570":"\\u216a","8571":"\\u216b","8572":"\\u216c","8573":"\\u216d","8574":"\\u216e","8575":"\\u216f","8580":"\\u2183","9424":"\\u24b6","9425":"\\u24b7","9426":"\\u24b8","9427":"\\u24b9","9428":"\\u24ba","9429":"\\u24bb","9430":"\\u24bc","9431":"\\u24bd","9432":"\\u24be","9433":"\\u24bf","9434":"\\u24c0","9435":"\\u24c1","9436":"\\u24c2","9437":"\\u24c3","9438":"\\u24c4","9439":"\\u24c5","9440":"\\u24c6","9441":"\\u24c7","9442":"\\u24c8","9443":"\\u24c9","9444":"\\u24ca","9445":"\\u24cb","9446":"\\u24cc","9447":"\\u24cd","9448":"\\u24ce","9449":"\\u24cf","11312":"\\u2c00","11313":"\\u2c01","11314":"\\u2c02","11315":"\\u2c03","11316":"\\u2c04","11317":"\\u2c05","11318":"\\u2c06","11319":"\\u2c07","11320":"\\u2c08","11321":"\\u2c09","11322":"\\u2c0a","11323":"\\u2c0b","11324":"\\u2c0c","11325":"\\u2c0d","11326":"\\u2c0e',
    '","11327":"\\u2c0f","11328":"\\u2c10","11329":"\\u2c11","11330":"\\u2c12","11331":"\\u2c13","11332":"\\u2c14","11333":"\\u2c15","11334":"\\u2c16","11335":"\\u2c17","11336":"\\u2c18","11337":"\\u2c19","11338":"\\u2c1a","11339":"\\u2c1b","11340":"\\u2c1c","11341":"\\u2c1d","11342":"\\u2c1e","11343":"\\u2c1f","11344":"\\u2c20","11345":"\\u2c21","11346":"\\u2c22","11347":"\\u2c23","11348":"\\u2c24","11349":"\\u2c25","11350":"\\u2c26","11351":"\\u2c27","11352":"\\u2c28","11353":"\\u2c29","11354":"\\u2c2a","11355":"\\u2c2b","11356":"\\u2c2c","11357":"\\u2c2d","11358":"\\u2c2e","11359":"\\u2c2f","11361":"\\u2c60","11365":"\\u023a","11366":"\\u023e","11368":"\\u2c67","11370":"\\u2c69","11372":"\\u2c6b","11379":"\\u2c72","11382":"\\u2c75","11393":"\\u2c80","11395":"\\u2c82","11397":"\\u2c84","11399":"\\u2c86","11401":"\\u2c88","11403":"\\u2c8a","11405":"\\u2c8c","11407":"\\u2c8e","11409":"\\u2c90","11411":"\\u2c92","11413":"\\u2c94","11415":"\\u2c96","11417":"\\u2c98","11419":"\\u2c9a","11421":"\\u2c9c","11423":"\\u2c9e","11425":"\\u2ca0","11427":"\\u2ca2","11429":"\\u2ca4","11431":"\\u2ca6","11433":"\\u2ca8","11435":"\\u2caa","11437":"\\u2cac","11439":"\\u2cae","11441":"\\u2cb0","11443":"\\u2cb2","11445":"\\u2cb4","11447":"\\u2cb6","11449":"\\u2cb8","11451":"\\u2cba","11453":"\\u2cbc","11455":"\\u2cbe","11457":"\\u2cc0","11459":"\\u2cc2","11461":"\\u2cc4","11463":"\\u2cc6","11465":"\\u2cc8","11467":"\\u2cca","11469":"\\u2ccc","11471":"\\u2cce","11473":"\\u2cd0","11475":"\\u2cd2","11477":"\\u2cd4","11479":"\\u2cd6","11481":"\\u2cd8","11483":"\\u2cda","11485":"\\u2cdc","11487":"\\u2cde","11489":"\\u2ce0","11491":"\\u2ce2","11500":"\\u2ceb","11502":"\\u2ced","11507":"\\u2cf2","11520":"\\u10a0","11521":"\\u10a1","11522":"\\u10a2","11523":"\\u10a3","11524":"\\u10a4","11525":"\\u10a5","11526":"\\u10a6","11527":"\\u10a7","11528":"\\u10a8","11529":"\\u10a9","11530":"\\u10aa","11531":"\\u10ab","11532":"\\u10ac","11533":"\\u10ad","11534":"\\u10ae","11535":"\\u10af","11536":"\\u10b0","11537":"\\u10b1","11538":"\\u10b2","11539":"\\u10b3","11540":"\\u10b4","11541":"\\u10b5","11542":"\\u10b6","11543":"\\u10b7","11544":"\\u10b8","11545":"\\u10b9","11546":"\\u10ba","11547":"\\u10bb","11548":"\\u10bc","11549":"\\u10bd","11550":"\\u10be","11551":"\\u10bf","11552":"\\u10c0","11553":"\\u10c1","11554":"\\u10c2","11555":"\\u10c3","11556":"\\u10c4","11557":"\\u10c5","11559":"\\u10c7","11565":"\\u10cd","42561":"\\ua640","42563":"\\ua642","42565":"\\ua644","42567":"\\ua646","42569":"\\ua648","42571":"\\ua64a","42573":"\\ua64c","42575":"\\ua64e","42577":"\\ua650","42579":"\\ua652","42581":"\\ua654","42583":"\\ua656","42585":"\\ua658","42587":"\\ua65a","42589":"\\ua65c","42591":"\\ua65e","42593":"\\ua660","42595":"\\ua662","42597":"\\ua664","42599":"\\ua666","42601":"\\ua668","42603":"\\ua66a","42605":"\\ua66c","42625":"\\ua680","42627":"\\ua682","42629":"\\ua684","42631":"\\ua686","42633":"\\ua688","42635":"\\ua68a","42637":"\\ua68c","42639":"\\ua68e","42641":"\\ua690","42643":"\\ua692","42645":"\\ua694","42647":"\\ua696","42649":"\\ua698","42651":"\\ua69a","42787":"\\ua722","42789":"\\ua724","42791":"\\ua726","42793":"\\ua728","42795":"\\ua72a","42797',
    '":"\\ua72c","42799":"\\ua72e","42803":"\\ua732","42805":"\\ua734","42807":"\\ua736","42809":"\\ua738","42811":"\\ua73a","42813":"\\ua73c","42815":"\\ua73e","42817":"\\ua740","42819":"\\ua742","42821":"\\ua744","42823":"\\ua746","42825":"\\ua748","42827":"\\ua74a","42829":"\\ua74c","42831":"\\ua74e","42833":"\\ua750","42835":"\\ua752","42837":"\\ua754","42839":"\\ua756","42841":"\\ua758","42843":"\\ua75a","42845":"\\ua75c","42847":"\\ua75e","42849":"\\ua760","42851":"\\ua762","42853":"\\ua764","42855":"\\ua766","42857":"\\ua768","42859":"\\ua76a","42861":"\\ua76c","42863":"\\ua76e","42874":"\\ua779","42876":"\\ua77b","42879":"\\ua77e","42881":"\\ua780","42883":"\\ua782","42885":"\\ua784","42887":"\\ua786","42892":"\\ua78b","42897":"\\ua790","42899":"\\ua792","42900":"\\ua7c4","42903":"\\ua796","42905":"\\ua798","42907":"\\ua79a","42909":"\\ua79c","42911":"\\ua79e","42913":"\\ua7a0","42915":"\\ua7a2","42917":"\\ua7a4","42919":"\\ua7a6","42921":"\\ua7a8","42933":"\\ua7b4","42935":"\\ua7b6","42937":"\\ua7b8","42939":"\\ua7ba","42941":"\\ua7bc","42943":"\\ua7be","42945":"\\ua7c0","42947":"\\ua7c2","42952":"\\ua7c7","42954":"\\ua7c9","42961":"\\ua7d0","42967":"\\ua7d6","42969":"\\ua7d8","42998":"\\ua7f5","43859":"\\ua7b3","43888":"\\u13a0","43889":"\\u13a1","43890":"\\u13a2","43891":"\\u13a3","43892":"\\u13a4","43893":"\\u13a5","43894":"\\u13a6","43895":"\\u13a7","43896":"\\u13a8","43897":"\\u13a9","43898":"\\u13aa","43899":"\\u13ab","43900":"\\u13ac","43901":"\\u13ad","43902":"\\u13ae","43903":"\\u13af","43904":"\\u13b0","43905":"\\u13b1","43906":"\\u13b2","43907":"\\u13b3","43908":"\\u13b4","43909":"\\u13b5","43910":"\\u13b6","43911":"\\u13b7","43912":"\\u13b8","43913":"\\u13b9","43914":"\\u13ba","43915":"\\u13bb","43916":"\\u13bc","43917":"\\u13bd","43918":"\\u13be","43919":"\\u13bf","43920":"\\u13c0","43921":"\\u13c1","43922":"\\u13c2","43923":"\\u13c3","43924":"\\u13c4","43925":"\\u13c5","43926":"\\u13c6","43927":"\\u13c7","43928":"\\u13c8","43929":"\\u13c9","43930":"\\u13ca","43931":"\\u13cb","43932":"\\u13cc","43933":"\\u13cd","43934":"\\u13ce","43935":"\\u13cf","43936":"\\u13d0","43937":"\\u13d1","43938":"\\u13d2","43939":"\\u13d3","43940":"\\u13d4","43941":"\\u13d5","43942":"\\u13d6","43943":"\\u13d7","43944":"\\u13d8","43945":"\\u13d9","43946":"\\u13da","43947":"\\u13db","43948":"\\u13dc","43949":"\\u13dd","43950":"\\u13de","43951":"\\u13df","43952":"\\u13e0","43953":"\\u13e1","43954":"\\u13e2","43955":"\\u13e3","43956":"\\u13e4","43957":"\\u13e5","43958":"\\u13e6","43959":"\\u13e7","43960":"\\u13e8","43961":"\\u13e9","43962":"\\u13ea","43963":"\\u13eb","43964":"\\u13ec","43965":"\\u13ed","43966":"\\u13ee","43967":"\\u13ef","65345":"\\uff21","65346":"\\uff22","65347":"\\uff23","65348":"\\uff24","65349":"\\uff25","65350":"\\uff26","65351":"\\uff27","65352":"\\uff28","65353":"\\uff29","65354":"\\uff2a","65355":"\\uff2b","65356":"\\uff2c","65357":"\\uff2d","65358":"\\uff2e","65359":"\\uff2f","65360":"\\uff30","65361":"\\uff31","65362":"\\uff32","65363":"\\uff33","65364":"\\uff34","65365":"\\uff35","65366":"\\uff36","65367":"\\uff37","65368":"\\uff38","65369":"\\uff39","65370":"\\uff3a","66600":"\\ud801\\udc00","66601":',
    '"\\ud801\\udc01","66602":"\\ud801\\udc02","66603":"\\ud801\\udc03","66604":"\\ud801\\udc04","66605":"\\ud801\\udc05","66606":"\\ud801\\udc06","66607":"\\ud801\\udc07","66608":"\\ud801\\udc08","66609":"\\ud801\\udc09","66610":"\\ud801\\udc0a","66611":"\\ud801\\udc0b","66612":"\\ud801\\udc0c","66613":"\\ud801\\udc0d","66614":"\\ud801\\udc0e","66615":"\\ud801\\udc0f","66616":"\\ud801\\udc10","66617":"\\ud801\\udc11","66618":"\\ud801\\udc12","66619":"\\ud801\\udc13","66620":"\\ud801\\udc14","66621":"\\ud801\\udc15","66622":"\\ud801\\udc16","66623":"\\ud801\\udc17","66624":"\\ud801\\udc18","66625":"\\ud801\\udc19","66626":"\\ud801\\udc1a","66627":"\\ud801\\udc1b","66628":"\\ud801\\udc1c","66629":"\\ud801\\udc1d","66630":"\\ud801\\udc1e","66631":"\\ud801\\udc1f","66632":"\\ud801\\udc20","66633":"\\ud801\\udc21","66634":"\\ud801\\udc22","66635":"\\ud801\\udc23","66636":"\\ud801\\udc24","66637":"\\ud801\\udc25","66638":"\\ud801\\udc26","66639":"\\ud801\\udc27","66776":"\\ud801\\udcb0","66777":"\\ud801\\udcb1","66778":"\\ud801\\udcb2","66779":"\\ud801\\udcb3","66780":"\\ud801\\udcb4","66781":"\\ud801\\udcb5","66782":"\\ud801\\udcb6","66783":"\\ud801\\udcb7","66784":"\\ud801\\udcb8","66785":"\\ud801\\udcb9","66786":"\\ud801\\udcba","66787":"\\ud801\\udcbb","66788":"\\ud801\\udcbc","66789":"\\ud801\\udcbd","66790":"\\ud801\\udcbe","66791":"\\ud801\\udcbf","66792":"\\ud801\\udcc0","66793":"\\ud801\\udcc1","66794":"\\ud801\\udcc2","66795":"\\ud801\\udcc3","66796":"\\ud801\\udcc4","66797":"\\ud801\\udcc5","66798":"\\ud801\\udcc6","66799":"\\ud801\\udcc7","66800":"\\ud801\\udcc8","66801":"\\ud801\\udcc9","66802":"\\ud801\\udcca","66803":"\\ud801\\udccb","66804":"\\ud801\\udccc","66805":"\\ud801\\udccd","66806":"\\ud801\\udcce","66807":"\\ud801\\udccf","66808":"\\ud801\\udcd0","66809":"\\ud801\\udcd1","66810":"\\ud801\\udcd2","66811":"\\ud801\\udcd3","66967":"\\ud801\\udd70","66968":"\\ud801\\udd71","66969":"\\ud801\\udd72","66970":"\\ud801\\udd73","66971":"\\ud801\\udd74","66972":"\\ud801\\udd75","66973":"\\ud801\\udd76","66974":"\\ud801\\udd77","66975":"\\ud801\\udd78","66976":"\\ud801\\udd79","66977":"\\ud801\\udd7a","66979":"\\ud801\\udd7c","66980":"\\ud801\\udd7d","66981":"\\ud801\\udd7e","66982":"\\ud801\\udd7f","66983":"\\ud801\\udd80","66984":"\\ud801\\udd81","66985":"\\ud801\\udd82","66986":"\\ud801\\udd83","66987":"\\ud801\\udd84","66988":"\\ud801\\udd85","66989":"\\ud801\\udd86","66990":"\\ud801\\udd87","66991":"\\ud801\\udd88","66992":"\\ud801\\udd89","66993":"\\ud801\\udd8a","66995":"\\ud801\\udd8c","66996":"\\ud801\\udd8d","66997":"\\ud801\\udd8e","66998":"\\ud801\\udd8f","66999":"\\ud801\\udd90","67000":"\\ud801\\udd91","67001":"\\ud801\\udd92","67003":"\\ud801\\udd94","67004":"\\ud801\\udd95","68800":"\\ud803\\udc80","68801":"\\ud803\\udc81","68802":"\\ud803\\udc82","68803":"\\ud803\\udc83","68804":"\\ud803\\udc84","68805":"\\ud803\\udc85","68806":"\\ud803\\udc86","68807":"\\ud803\\udc87","68808":"\\ud803\\udc88","68809":"\\ud803\\udc89","68810":"\\ud803\\udc8a","68811":"\\ud803\\udc8b","68812":"\\ud803\\udc8c","68813":"\\ud803\\udc8d","68814":"\\ud803\\udc8e","68815":"\\ud803\\udc8f","68816":"\\ud803\\udc90","68817":"\\ud803\\udc91","68818":"\\ud803\\udc92","68819":"\\ud803\\udc93","68820":"\\ud803\\ud',
    'c94","68821":"\\ud803\\udc95","68822":"\\ud803\\udc96","68823":"\\ud803\\udc97","68824":"\\ud803\\udc98","68825":"\\ud803\\udc99","68826":"\\ud803\\udc9a","68827":"\\ud803\\udc9b","68828":"\\ud803\\udc9c","68829":"\\ud803\\udc9d","68830":"\\ud803\\udc9e","68831":"\\ud803\\udc9f","68832":"\\ud803\\udca0","68833":"\\ud803\\udca1","68834":"\\ud803\\udca2","68835":"\\ud803\\udca3","68836":"\\ud803\\udca4","68837":"\\ud803\\udca5","68838":"\\ud803\\udca6","68839":"\\ud803\\udca7","68840":"\\ud803\\udca8","68841":"\\ud803\\udca9","68842":"\\ud803\\udcaa","68843":"\\ud803\\udcab","68844":"\\ud803\\udcac","68845":"\\ud803\\udcad","68846":"\\ud803\\udcae","68847":"\\ud803\\udcaf","68848":"\\ud803\\udcb0","68849":"\\ud803\\udcb1","68850":"\\ud803\\udcb2","71872":"\\ud806\\udca0","71873":"\\ud806\\udca1","71874":"\\ud806\\udca2","71875":"\\ud806\\udca3","71876":"\\ud806\\udca4","71877":"\\ud806\\udca5","71878":"\\ud806\\udca6","71879":"\\ud806\\udca7","71880":"\\ud806\\udca8","71881":"\\ud806\\udca9","71882":"\\ud806\\udcaa","71883":"\\ud806\\udcab","71884":"\\ud806\\udcac","71885":"\\ud806\\udcad","71886":"\\ud806\\udcae","71887":"\\ud806\\udcaf","71888":"\\ud806\\udcb0","71889":"\\ud806\\udcb1","71890":"\\ud806\\udcb2","71891":"\\ud806\\udcb3","71892":"\\ud806\\udcb4","71893":"\\ud806\\udcb5","71894":"\\ud806\\udcb6","71895":"\\ud806\\udcb7","71896":"\\ud806\\udcb8","71897":"\\ud806\\udcb9","71898":"\\ud806\\udcba","71899":"\\ud806\\udcbb","71900":"\\ud806\\udcbc","71901":"\\ud806\\udcbd","71902":"\\ud806\\udcbe","71903":"\\ud806\\udcbf","93792":"\\ud81b\\ude40","93793":"\\ud81b\\ude41","93794":"\\ud81b\\ude42","93795":"\\ud81b\\ude43","93796":"\\ud81b\\ude44","93797":"\\ud81b\\ude45","93798":"\\ud81b\\ude46","93799":"\\ud81b\\ude47","93800":"\\ud81b\\ude48","93801":"\\ud81b\\ude49","93802":"\\ud81b\\ude4a","93803":"\\ud81b\\ude4b","93804":"\\ud81b\\ude4c","93805":"\\ud81b\\ude4d","93806":"\\ud81b\\ude4e","93807":"\\ud81b\\ude4f","93808":"\\ud81b\\ude50","93809":"\\ud81b\\ude51","93810":"\\ud81b\\ude52","93811":"\\ud81b\\ude53","93812":"\\ud81b\\ude54","93813":"\\ud81b\\ude55","93814":"\\ud81b\\ude56","93815":"\\ud81b\\ude57","93816":"\\ud81b\\ude58","93817":"\\ud81b\\ude59","93818":"\\ud81b\\ude5a","93819":"\\ud81b\\ude5b","93820":"\\ud81b\\ude5c","93821":"\\ud81b\\ude5d","93822":"\\ud81b\\ude5e","93823":"\\ud81b\\ude5f","125218":"\\ud83a\\udd00","125219":"\\ud83a\\udd01","125220":"\\ud83a\\udd02","125221":"\\ud83a\\udd03","125222":"\\ud83a\\udd04","125223":"\\ud83a\\udd05","125224":"\\ud83a\\udd06","125225":"\\ud83a\\udd07","125226":"\\ud83a\\udd08","125227":"\\ud83a\\udd09","125228":"\\ud83a\\udd0a","125229":"\\ud83a\\udd0b","125230":"\\ud83a\\udd0c","125231":"\\ud83a\\udd0d","125232":"\\ud83a\\udd0e","125233":"\\ud83a\\udd0f","125234":"\\ud83a\\udd10","125235":"\\ud83a\\udd11","125236":"\\ud83a\\udd12","125237":"\\ud83a\\udd13","125238":"\\ud83a\\udd14","125239":"\\ud83a\\udd15","125240":"\\ud83a\\udd16","125241":"\\ud83a\\udd17","125242":"\\ud83a\\udd18","125243":"\\ud83a\\udd19","125244":"\\ud83a\\udd1a","125245":"\\ud83a\\udd1b","125246":"\\ud83a\\udd1c","125247":"\\ud83a\\udd1d","125248":"\\ud83a\\udd1e","125249":"\\ud83a\\udd1f","125250":"\\ud83a\\udd20","125251":"\\ud83a\\udd21","223":"SS","304":',
    '"\\u0130","64256":"FF","64257":"FI","64258":"FL","64259":"FFI","64260":"FFL","64261":"ST","64262":"ST","1415":"\\u0535\\u0552","64275":"\\u0544\\u0546","64276":"\\u0544\\u0535","64277":"\\u0544\\u053b","64278":"\\u054e\\u0546","64279":"\\u0544\\u053d","329":"\\u02bcN","912":"\\u0399\\u0308\\u0301","944":"\\u03a5\\u0308\\u0301","496":"J\\u030c","7830":"H\\u0331","7831":"T\\u0308","7832":"W\\u030a","7833":"Y\\u030a","7834":"A\\u02be","8016":"\\u03a5\\u0313","8018":"\\u03a5\\u0313\\u0300","8020":"\\u03a5\\u0313\\u0301","8022":"\\u03a5\\u0313\\u0342","8118":"\\u0391\\u0342","8134":"\\u0397\\u0342","8146":"\\u0399\\u0308\\u0300","8147":"\\u0399\\u0308\\u0301","8150":"\\u0399\\u0342","8151":"\\u0399\\u0308\\u0342","8162":"\\u03a5\\u0308\\u0300","8163":"\\u03a5\\u0308\\u0301","8164":"\\u03a1\\u0313","8166":"\\u03a5\\u0342","8167":"\\u03a5\\u0308\\u0342","8182":"\\u03a9\\u0342","8072":"\\u1f08\\u0399","8073":"\\u1f09\\u0399","8074":"\\u1f0a\\u0399","8075":"\\u1f0b\\u0399","8076":"\\u1f0c\\u0399","8077":"\\u1f0d\\u0399","8078":"\\u1f0e\\u0399","8079":"\\u1f0f\\u0399","8088":"\\u1f28\\u0399","8089":"\\u1f29\\u0399","8090":"\\u1f2a\\u0399","8091":"\\u1f2b\\u0399","8092":"\\u1f2c\\u0399","8093":"\\u1f2d\\u0399","8094":"\\u1f2e\\u0399","8095":"\\u1f2f\\u0399","8104":"\\u1f68\\u0399","8105":"\\u1f69\\u0399","8106":"\\u1f6a\\u0399","8107":"\\u1f6b\\u0399","8108":"\\u1f6c\\u0399","8109":"\\u1f6d\\u0399","8110":"\\u1f6e\\u0399","8111":"\\u1f6f\\u0399","8124":"\\u0391\\u0399","8140":"\\u0397\\u0399","8188":"\\u03a9\\u0399","8114":"\\u1fba\\u0399","8116":"\\u0386\\u0399","8130":"\\u1fca\\u0399","8132":"\\u0389\\u0399","8178":"\\u1ffa\\u0399","8180":"\\u038f\\u0399","8119":"\\u0391\\u0342\\u0399","8135":"\\u0397\\u0342\\u0399","8183":"\\u03a9\\u0342\\u0399"},"cased":[[65,90],[97,122],[170,170],[181,181],[186,186],[192,214],[216,246],[248,442],[444,447],[452,659],[661,696],[704,705],[736,740],[837,837],[880,883],[886,887],[890,893],[895,895],[902,902],[904,906],[908,908],[910,929],[931,1013],[1015,1153],[1162,1327],[1329,1366],[1376,1416],[4256,4293],[4295,4295],[4301,4301],[4304,4346],[4348,4351],[5024,5109],[5112,5117],[7296,7304],[7312,7354],[7357,7359],[7424,7615],[7680,7957],[7960,7965],[7968,8005],[8008,8013],[8016,8023],[8025,8025],[8027,8027],[8029,8029],[8031,8061],[8064,8116],[8118,8124],[8126,8126],[8130,8132],[8134,8140],[8144,8147],[8150,8155],[8160,8172],[8178,8180],[8182,8188],[8305,8305],[8319,8319],[8336,8348],[8450,8450],[8455,8455],[8458,8467],[8469,8469],[8473,8477],[8484,8484],[8486,8486],[8488,8488],[8490,8493],[8495,8500],[8505,8505],[8508,8511],[8517,8521],[8526,8526],[8544,8575],[8579,8580],[9398,9449],[11264,11492],[11499,11502],[11506,11507],[11520,11557],[11559,11559],[11565,11565],[42560,42605],[42624,42653],[42786,42887],[42891,42894],[42896,42954],[42960,42961],[42963,42963],[42965,42969],[42994,42998],[43000,43002],[43824,43866],[43868,43881],[43888,43967],[64256,64262],[64275,64279],[65313,65338],[65345,65370],[66560,66639],[66736,66771],[66776,66811],[66928,66938],[66940,66954],[66956,66962],[66964,66965],[66967,66977],[66979,66993],[66995,67001],[67003,67004],[67456,67456',
    '],[67459,67461],[67463,67504],[67506,67514],[68736,68786],[68800,68850],[71840,71903],[93760,93823],[119808,119892],[119894,119964],[119966,119967],[119970,119970],[119973,119974],[119977,119980],[119982,119993],[119995,119995],[119997,120003],[120005,120069],[120071,120074],[120077,120084],[120086,120092],[120094,120121],[120123,120126],[120128,120132],[120134,120134],[120138,120144],[120146,120485],[120488,120512],[120514,120538],[120540,120570],[120572,120596],[120598,120628],[120630,120654],[120656,120686],[120688,120712],[120714,120744],[120746,120770],[120772,120779],[122624,122633],[122635,122654],[122661,122666],[122928,122989],[125184,125251],[127280,127305],[127312,127337],[127344,127369]],"ignorable":[[39,39],[46,46],[58,58],[94,94],[96,96],[168,168],[173,173],[175,175],[180,180],[183,184],[688,879],[884,885],[890,890],[900,901],[903,903],[1155,1161],[1369,1369],[1375,1375],[1425,1469],[1471,1471],[1473,1474],[1476,1477],[1479,1479],[1524,1524],[1536,1541],[1552,1562],[1564,1564],[1600,1600],[1611,1631],[1648,1648],[1750,1757],[1759,1768],[1770,1773],[1807,1807],[1809,1809],[1840,1866],[1958,1968],[2027,2037],[2042,2042],[2045,2045],[2070,2093],[2137,2139],[2184,2184],[2192,2193],[2200,2207],[2249,2306],[2362,2362],[2364,2364],[2369,2376],[2381,2381],[2385,2391],[2402,2403],[2417,2417],[2433,2433],[2492,2492],[2497,2500],[2509,2509],[2530,2531],[2558,2558],[2561,2562],[2620,2620],[2625,2626],[2631,2632],[2635,2637],[2641,2641],[2672,2673],[2677,2677],[2689,2690],[2748,2748],[2753,2757],[2759,2760],[2765,2765],[2786,2787],[2810,2815],[2817,2817],[2876,2876],[2879,2879],[2881,2884],[2893,2893],[2901,2902],[2914,2915],[2946,2946],[3008,3008],[3021,3021],[3072,3072],[3076,3076],[3132,3132],[3134,3136],[3142,3144],[3146,3149],[3157,3158],[3170,3171],[3201,3201],[3260,3260],[3263,3263],[3270,3270],[3276,3277],[3298,3299],[3328,3329],[3387,3388],[3393,3396],[3405,3405],[3426,3427],[3457,3457],[3530,3530],[3538,3540],[3542,3542],[3633,3633],[3636,3642],[3654,3662],[3761,3761],[3764,3772],[3782,3782],[3784,3790],[3864,3865],[3893,3893],[3895,3895],[3897,3897],[3953,3966],[3968,3972],[3974,3975],[3981,3991],[3993,4028],[4038,4038],[4141,4144],[4146,4151],[4153,4154],[4157,4158],[4184,4185],[4190,4192],[4209,4212],[4226,4226],[4229,4230],[4237,4237],[4253,4253],[4348,4348],[4957,4959],[5906,5908],[5938,5939],[5970,5971],[6002,6003],[6068,6069],[6071,6077],[6086,6086],[6089,6099],[6103,6103],[6109,6109],[6155,6159],[6211,6211],[6277,6278],[6313,6313],[6432,6434],[6439,6440],[6450,6450],[6457,6459],[6679,6680],[6683,6683],[6742,6742],[6744,6750],[6752,6752],[6754,6754],[6757,6764],[6771,6780],[6783,6783],[6823,6823],[6832,6862],[6912,6915],[6964,6964],[6966,6970],[6972,6972],[6978,6978],[7019,7027],[7040,7041],[7074,7077],[7080,7081],[7083,7085],[7142,7142],[7144,7145],[7149,7149],[7151,7153],[7212,7219],[7222,7223],[7288,7293],[7376,7378],[7380,7392],[7394,7400],[7405,7405],[7412,7412],[7416,7417],[7468,7530],[7544,7544],[7579,7679],[8125,8125],[8',
    '127,8129],[8141,8143],[8157,8159],[8173,8175],[8189,8190],[8203,8207],[8216,8217],[8228,8228],[8231,8231],[8234,8238],[8288,8292],[8294,8303],[8305,8305],[8319,8319],[8336,8348],[8400,8432],[11388,11389],[11503,11505],[11631,11631],[11647,11647],[11744,11775],[11823,11823],[12293,12293],[12330,12333],[12337,12341],[12347,12347],[12441,12446],[12540,12542],[40981,40981],[42232,42237],[42508,42508],[42607,42610],[42612,42621],[42623,42623],[42652,42655],[42736,42737],[42752,42785],[42864,42864],[42888,42890],[42994,42996],[43000,43001],[43010,43010],[43014,43014],[43019,43019],[43045,43046],[43052,43052],[43204,43205],[43232,43249],[43263,43263],[43302,43309],[43335,43345],[43392,43394],[43443,43443],[43446,43449],[43452,43453],[43471,43471],[43493,43494],[43561,43566],[43569,43570],[43573,43574],[43587,43587],[43596,43596],[43632,43632],[43644,43644],[43696,43696],[43698,43700],[43703,43704],[43710,43711],[43713,43713],[43741,43741],[43756,43757],[43763,43764],[43766,43766],[43867,43871],[43881,43883],[44005,44005],[44008,44008],[44013,44013],[64286,64286],[64434,64450],[65024,65039],[65043,65043],[65056,65071],[65106,65106],[65109,65109],[65279,65279],[65287,65287],[65294,65294],[65306,65306],[65342,65342],[65344,65344],[65392,65392],[65438,65439],[65507,65507],[65529,65531],[66045,66045],[66272,66272],[66422,66426],[67456,67461],[67463,67504],[67506,67514],[68097,68099],[68101,68102],[68108,68111],[68152,68154],[68159,68159],[68325,68326],[68900,68903],[69291,69292],[69373,69375],[69446,69456],[69506,69509],[69633,69633],[69688,69702],[69744,69744],[69747,69748],[69759,69761],[69811,69814],[69817,69818],[69821,69821],[69826,69826],[69837,69837],[69888,69890],[69927,69931],[69933,69940],[70003,70003],[70016,70017],[70070,70078],[70089,70092],[70095,70095],[70191,70193],[70196,70196],[70198,70199],[70206,70206],[70209,70209],[70367,70367],[70371,70378],[70400,70401],[70459,70460],[70464,70464],[70502,70508],[70512,70516],[70712,70719],[70722,70724],[70726,70726],[70750,70750],[70835,70840],[70842,70842],[70847,70848],[70850,70851],[71090,71093],[71100,71101],[71103,71104],[71132,71133],[71219,71226],[71229,71229],[71231,71232],[71339,71339],[71341,71341],[71344,71349],[71351,71351],[71453,71455],[71458,71461],[71463,71467],[71727,71735],[71737,71738],[71995,71996],[71998,71998],[72003,72003],[72148,72151],[72154,72155],[72160,72160],[72193,72202],[72243,72248],[72251,72254],[72263,72263],[72273,72278],[72281,72283],[72330,72342],[72344,72345],[72752,72758],[72760,72765],[72767,72767],[72850,72871],[72874,72880],[72882,72883],[72885,72886],[73009,73014],[73018,73018],[73020,73021],[73023,73029],[73031,73031],[73104,73105],[73109,73109],[73111,73111],[73459,73460],[73472,73473],[73526,73530],[73536,73536],[73538,73538],[78896,78912],[78919,78933],[92912,92916],[92976,92982],[92992,92995],[94031,94031],[94095,94111],[94176,94177],[94179,94180],[110576,110579],[110581,110587],[110589,110590],[113821,113822],[113824,113827],[118528,118573],[118576,1185',
    '98],[119143,119145],[119155,119170],[119173,119179],[119210,119213],[119362,119364],[121344,121398],[121403,121452],[121461,121461],[121476,121476],[121499,121503],[121505,121519],[122880,122886],[122888,122904],[122907,122913],[122915,122916],[122918,122922],[122928,122989],[123023,123023],[123184,123197],[123566,123566],[123628,123631],[124139,124143],[125136,125142],[125252,125259],[127995,127999],[917505,917505],[917536,917631],[917760,917999]],"whitespace":[[9,13],[32,32],[133,133],[160,160],[5760,5760],[8192,8202],[8232,8233],[8239,8239],[8287,8287],[12288,12288]]}',
  ].join(''),
) as UnicodeTables

const programCache = new WeakMap<LinkedApp, RuntimeProgram>()
const snapshotPrograms = new WeakMap<RuntimeSnapshot, RuntimeProgram>()
function runtimeProgram(linked: LinkedApp): RuntimeProgram {
  const cached = programCache.get(linked)
  if (cached) return cached
  const data = getLinkedAppData(linked)
  if (!data) throw new TypeError('Untrusted LinkedApp')
  const states: Record<string, StateBinding> = {}
  for (const state of data.bundle.states) {
    const key = `app:${textValue(state.id)}`
    states[key] = {
      key,
      initial: state.initial!,
      type: textValue(state.type),
      lifetime: 'session',
      sensitive: state.sensitive === true,
      root: 'app',
    }
  }
  const runtimeNodes: RuntimeNode[] = data.nodes.map((entry) => {
    for (const binding of Object.values(entry.stateBindings)) states[binding.key] = binding
    let form = entry.parent
    while (form && form.node.kind !== 'form') form = form.parent
    const root = entry.identity.instanceRoot
    const handlers: RuntimeHandler[] = asObjects(entry.node.attributes.on).map((handler) => ({
      id: textValue(handler.id),
      event: textValue(handler.event),
      ...(handler.key === undefined ? {} : { key: textValue(handler.key) }),
      ...(handler.guard === undefined ? {} : { guard: handler.guard as JsonObject }),
      concurrency: handler.concurrency === 'queue' ? 'queue' : 'drop',
      operations: asObjects(handler.operations).map((operation) => ({
        id: textValue(operation.id),
        executionClass: operation.executionClass as RuntimeOperation['executionClass'],
        effect: operation.effect as JsonObject,
        after: operation.after as string[],
        onFailure: operation.onFailure === 'continue' ? 'continue' : 'stop',
      })),
    }))
    const targets = { ...entry.effectTargets }
    if (typeof entry.node.attributes.initialFocus === 'string') {
      const find = (node: ExpandedNode): ExpandedNode | undefined => {
        if (node.node.id === entry.node.attributes.initialFocus) return node
        for (const child of node.children) {
          const found = find(child)
          if (found) return found
        }
        return undefined
      }
      const initial = find(entry)
      if (initial) targets.initialFocus = initial.renderedId
    }
    return {
      id: entry.renderedId,
      identity: entry.identity,
      kind: entry.node.kind,
      label: entry.node.label ?? '',
      parent: entry.parent?.renderedId ?? null,
      root: `${root.kind}/${root.namespace}/${root.id}`,
      attributes: entry.node.attributes,
      bindings: entry.stateBindings,
      handlers,
      targets,
      children: entry.children.map((child) => child.renderedId),
      form: entry.formTarget ?? form?.renderedId ?? null,
    }
  })
  const program: RuntimeProgram = freeze({
    appId: data.bundle.id,
    modelDigest: linked.digest,
    profileDigest: digestV4(jcs(data.bundle.profile)),
    profile: data.bundle.profile,
    entry: data.bundle.entry,
    nodes: runtimeNodes,
    states,
    screens: data.screens.map((screen) => ({
      route: screen.route,
      id: screen.children[0].renderedId,
      shell: screen.shell
        ? data.shells.find((shell) => shell.owner.key === screen.shell)!.children[0].renderedId
        : null,
      variants: (screen.owner.definition.attributes.variants ?? []) as string[],
    })),
    shells: data.shells.map((shell) => ({
      id: shell.children[0].renderedId,
      root: `shell/${shell.owner.module.namespace}/${shell.owner.definition.id}`,
      slot: shell.slotId,
    })),
    fixtures: data.bundle.fixtures.map((fixture) => ({
      id: textValue(fixture.id),
      exhaustion: textValue(fixture.exhaustion),
      steps: asObjects(fixture.steps).map((step) => ({
        delayMs: Number(step.delayMs),
        outcome: textValue(step.outcome),
        value: step.value!,
      })),
    })),
    unicode: UNICODE_15_1,
  })
  programCache.set(linked, program)
  return program
}
function ownSnapshot(snapshot: RuntimeSnapshot, program: RuntimeProgram): RuntimeSnapshot {
  freeze(snapshot)
  snapshotPrograms.set(snapshot, program)
  return snapshot
}
/** Creates fresh state from the verified linked model; no DOM or wall clock is consulted. */
export function createRuntime(
  linked: LinkedApp,
  options: { fragment?: string } = {},
): RuntimeSnapshot {
  const program = runtimeProgram(linked)
  return ownSnapshot(runtimeEngine(program).initial(options.fragment), program)
}
/** Applies one closed conformance input. The supplied snapshot is never mutated. */
export function reduceEvent(snapshot: RuntimeSnapshot, input: RuntimeInput): RuntimeSnapshot {
  const program = snapshotPrograms.get(snapshot)
  if (!program) throw new TypeError('Untrusted RuntimeSnapshot')
  return ownSnapshot(runtimeEngine(program).reduce(snapshot, input), program)
}
export function advanceClock(snapshot: RuntimeSnapshot, deltaMs: number): RuntimeSnapshot {
  return reduceEvent(snapshot, { kind: 'advanceClock', deltaMs })
}
export function resetRuntime(snapshot: RuntimeSnapshot): RuntimeSnapshot {
  return reduceEvent(snapshot, { kind: 'reset' })
}

function browserAdapter(engine: ReturnType<typeof runtimeEngine>, program: RuntimeProgram): void {
  const root = document.getElementById('wireweave-app')!,
    storage = root.querySelector<HTMLElement>('[data-wf-screen-storage]')!
  const nodes = new Map(program.nodes.map((node) => [node.id, node]))
  let state = engine.initial(location.hash),
    projecting = false,
    processing = false,
    paused = false,
    last = performance.now(),
    timer: ReturnType<typeof setTimeout> | undefined
  let projectedFocus: string | null | undefined
  let projectionTimer: ReturnType<typeof setTimeout> | undefined
  const queue: { input: RuntimeInput; sequence: number | null; deferProjection: boolean }[] = []
  let composition: { id: string; value: string } | null = null
  const present = (value: JsonValue | undefined): string =>
    value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  function element(id: string): HTMLElement | null {
    return document.getElementById(id)
  }
  function focusElement(id: string): HTMLElement | null {
    const node = nodes.get(id)
    if (node?.kind === 'tab') return document.getElementById(id + '-tab')
    if (node?.kind === 'dropdown') return document.getElementById(id + '-trigger')
    return element(id)
  }
  function metadata(sequence: number): { wireweave: { modelDigest: string; sequence: number } } {
    return { wireweave: { modelDigest: program.modelDigest, sequence } }
  }
  function browserSequence(): number | null {
    const outer: unknown = history.state
    const value: unknown =
      outer && typeof outer === 'object' ? (outer as Record<string, unknown>).wireweave : undefined
    if (!value || typeof value !== 'object') return null
    const entry = value as Record<string, unknown>
    return entry.modelDigest === program.modelDigest &&
      typeof entry.sequence === 'number' &&
      Number.isInteger(entry.sequence)
      ? entry.sequence
      : null
  }
  function effectCommands(): void {
    for (const effect of state.effects) {
      if (effect.kind === 'push') history.pushState(metadata(effect.sequence), '', effect.fragment)
      else if (effect.kind === 'replace')
        history.replaceState(metadata(effect.sequence), '', effect.fragment)
      else if (effect.kind === 'traverse' || effect.kind === 'compensate') {
        if (effect.delta !== 0) history.go(effect.delta)
        else history.replaceState(metadata(effect.sequence), '', effect.fragment)
      } else location.assign(effect.fragment)
    }
  }
  function render(): void {
    if (projectionTimer !== undefined) {
      clearTimeout(projectionTimer)
      projectionTimer = undefined
    }
    projecting = true
    try {
      const view = engine.view(state),
        active = program.screens.find(
          (screen) =>
            screen.route.namespace === state.route?.namespace &&
            screen.route.id === state.route?.id,
        )
      for (const wrapper of root.querySelectorAll<HTMLElement>('[data-wf-screen]')) {
        const visible = wrapper.contains(element(active?.id ?? ''))
        wrapper.hidden = !visible
        wrapper.inert = !visible
        if (!visible && wrapper.parentElement !== storage) storage.append(wrapper)
      }
      for (const wrapper of root.querySelectorAll<HTMLElement>('[data-wf-shell]')) {
        const visible = !!active?.shell && wrapper.contains(element(active.shell))
        wrapper.hidden = !visible
        wrapper.inert = !visible
      }
      if (active) {
        const screen = element(active.id)!.closest<HTMLElement>('[data-wf-screen]')!
        if (active.shell) {
          const shell = program.shells.find((shell) => shell.id === active.shell)!
          const slot = element(shell.slot)!
          if (screen.parentElement !== slot) slot.append(screen)
        } else if (screen.parentElement !== storage) storage.append(screen)
        screen.hidden = false
        screen.inert = false
      }
      const routeError = root.querySelector<HTMLElement>('[data-wf-route-error]')!
      routeError.hidden = state.route !== null
      root.querySelector('[data-wf-invalid-address]')!.textContent = state.address
      root.setAttribute('data-wf-route', state.route ? state.address : 'error')
      root.setAttribute('data-wf-view', state.viewMode)
      root.setAttribute('aria-busy', String(state.suspended))
      for (const node of program.nodes) {
        const el = element(node.id)
        if (!el) continue
        el.hidden = view.visible[node.id] !== true
        const field = el.closest<HTMLElement>('[data-wf-field]')
        if (field) field.hidden = el.hidden
        if (node.kind === 'tab') {
          const owner = nodes.get(node.parent ?? ''),
            tabs = owner?.children.filter((id) => nodes.get(id)?.kind === 'tab') ?? [],
            selected = tabs[state.selection[owner?.id ?? ''] ?? 0] === node.id
          el.hidden = !view.visible[node.id] || !selected
          const button = document.getElementById(node.id + '-tab')
          if (button) {
            button.setAttribute('aria-selected', String(selected))
            button.tabIndex =
              state.focus === node.id
                ? 0
                : tabs.includes(state.focus ?? '')
                  ? -1
                  : selected
                    ? 0
                    : -1
            ;(button as HTMLButtonElement).disabled = !view.enabled[node.id]
          }
        }
        if ('disabled' in el) (el as HTMLInputElement).disabled = view.enabled[node.id] !== true
        const control = view.controls[node.id]
        if (
          ['input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider'].includes(
            node.kind,
          )
        ) {
          const input = el as HTMLInputElement
          if (['checkbox', 'radio', 'switch'].includes(node.kind)) input.checked = control.checked
          else if (!composition || composition.id !== node.id) input.value = present(control.value)
        }
        if (state.invalid[node.id]) {
          el.setAttribute('aria-invalid', 'true')
          const message = element(node.id + '-error')
          if (message) {
            message.textContent = state.invalid[node.id]
            message.hidden = false
            el.setAttribute('aria-describedby', message.id)
          }
        } else {
          el.removeAttribute('aria-invalid')
          const message = element(node.id + '-error')
          if (message) message.hidden = true
          el.removeAttribute('aria-describedby')
        }
        if (node.kind === 'form') {
          const error = el.querySelector<HTMLElement>('[data-wf-form-error]')
          if (error) {
            error.textContent = state.invalid[node.id] ? 'Check the required input values.' : ''
            error.hidden = !state.invalid[node.id]
          }
          el.setAttribute(
            'aria-busy',
            String(Object.values(state.requests).some((request) => request.owner === node.id)),
          )
        }
        if (node.kind === 'accordion')
          (el as HTMLDetailsElement).open = state.expanded[node.id] === true
        if (['modal', 'drawer', 'popover'].includes(node.kind)) {
          const overlay = state.overlays.find((overlay) => overlay.id === node.id),
            dialog = el as HTMLDialogElement
          if (overlay) {
            dialog.hidden = false
            if (!dialog.open) {
              if (overlay.modal) dialog.showModal()
              else dialog.show()
            }
            dialog.setAttribute('aria-modal', String(overlay.modal))
          } else if (dialog.open) dialog.close()
        }
        if (node.kind === 'dropdown') {
          const open = state.overlays.some((overlay) => overlay.id === node.id)
          const body = el.querySelector<HTMLElement>('[data-wf-overlay-body]')
          if (body) body.hidden = !open
          const button = document.getElementById(node.id + '-trigger')
          button?.setAttribute('aria-expanded', String(open))
        }
        if (node.kind === 'tooltip') {
          const tooltip = el.querySelector<HTMLElement>('[role=tooltip]')
          if (tooltip) tooltip.hidden = !state.overlays.some((overlay) => overlay.id === node.id)
          const trigger = node.children[0] ? element(node.children[0]) : null
          if (trigger && tooltip) trigger.setAttribute('aria-describedby', tooltip.id)
        }
        if (node.attributes.dismissible === true && ['toast', 'alert'].includes(node.kind))
          el.hidden = el.hidden || state.expanded[node.id] === false
        if (el instanceof HTMLAnchorElement) {
          if (el.getAttribute('href') === state.address) el.setAttribute('aria-current', 'page')
          else el.removeAttribute('aria-current')
        }
        if (node.attributes.data) {
          const value = view.data[node.id]
          if (node.kind === 'table' && Array.isArray(value)) {
            const body = el.querySelector('tbody')!,
              fragment = document.createDocumentFragment()
            for (const row of value) {
              const tr = document.createElement('tr')
              for (const key of node.attributes.columns as string[]) {
                const td = document.createElement('td')
                td.textContent = present((row as JsonObject)[key])
                tr.append(td)
              }
              fragment.append(tr)
            }
            body.replaceChildren(fragment)
          } else if (node.kind === 'list' && Array.isArray(value)) {
            const fragment = document.createDocumentFragment()
            for (const item of value) {
              const li = document.createElement('li')
              li.textContent = present(item)
              fragment.append(li)
            }
            el.replaceChildren(fragment)
          } else if (node.kind === 'text' && value !== undefined) el.textContent = present(value)
        }
      }
      for (const screen of program.screens) element(screen.id)?.removeAttribute('role')
      if (active && ![...root.querySelectorAll('main')].some((main) => !main.closest('[hidden]')))
        element(active.id)?.setAttribute('role', 'main')
      const status = root.querySelector('[data-wf-runtime-status]')!
      status.textContent = state.diagnostic
        ? 'The action could not complete: ' + state.diagnostic
        : ''
      if (state.diagnostic) root.setAttribute('data-wf-runtime-diagnostic', state.diagnostic)
      else root.removeAttribute('data-wf-runtime-diagnostic')
      const lastTrace = state.trace.at(-1)
      if (lastTrace) root.setAttribute('data-wf-operation-result', lastTrace.result)
      document.getElementById('wf-runtime-trace')!.textContent = JSON.stringify(state.trace)
      if (state.focus && state.focus !== projectedFocus) {
        const focus = focusElement(state.focus)
        if (focus && focus !== document.activeElement && !focus.closest('[hidden],[inert]'))
          focus.focus()
      } else if (!state.route && projectedFocus !== null) {
        const heading = routeError.querySelector<HTMLElement>('h1')
        heading?.focus()
      }
      projectedFocus = state.focus
    } finally {
      projecting = false
    }
  }
  function apply(
    input: RuntimeInput,
    sequence: number | null = null,
    deferProjection = false,
  ): void {
    if (queue.length >= 4096) throw Error('limit-queue')
    queue.push({ input, sequence, deferProjection })
    if (processing) return
    processing = true
    try {
      while (queue.length) {
        const item = queue.shift()!
        state = engine.reduce(state, item.input, item.sequence)
        effectCommands()
        if (item.deferProjection) {
          // Native activation delivers click before input/change. Preserve its
          // transient control value until that platform event task completes.
          if (projectionTimer === undefined) projectionTimer = setTimeout(render, 0)
        } else render()
      }
    } finally {
      processing = false
    }
  }
  function owner(target: EventTarget | null): RuntimeNode | undefined {
    if (!(target instanceof Element)) return undefined
    const el = target.closest<HTMLElement>('[data-wf-event-owner], [data-wf-kind]')
    return nodes.get(el?.getAttribute('data-wf-event-owner') ?? el?.id ?? '')
  }
  function nativeEvent(event: Event): void {
    if (projecting) return
    const node = owner(event.target)
    if (!node) return
    const kind = event.type as 'input' | 'change' | 'focus' | 'blur'
    const input: RuntimeInput = { kind: 'event', source: node.identity, event: kind }
    if (kind === 'input' || kind === 'change') {
      const control = event.target as HTMLInputElement
      if ((event as InputEvent).isComposing) return
      if (composition?.id === node.id) {
        if (composition.value === control.value) {
          composition = null
          return
        }
        composition = null
      }
      if (['checkbox', 'radio', 'switch'].includes(node.kind)) input.checked = control.checked
      else input.value = control.value
    }
    apply(input)
  }
  root.addEventListener('input', nativeEvent)
  root.addEventListener('change', nativeEvent)
  root.addEventListener('focus', nativeEvent, true)
  root.addEventListener('blur', nativeEvent, true)
  root.addEventListener('compositionstart', (event) => {
    const node = owner(event.target)
    if (node) composition = { id: node.id, value: (event.target as HTMLInputElement).value }
  })
  root.addEventListener('compositionend', (event) => {
    const node = owner(event.target)
    if (!node) return
    const value = (event.target as HTMLInputElement).value
    composition = null
    apply({ kind: 'event', source: node.identity, event: 'input', value })
    composition = { id: node.id, value }
  })
  root.addEventListener('submit', (event) => {
    event.preventDefault()
    if (projecting) return
    const node = owner(event.target)
    if (node) apply({ kind: 'event', source: node.identity, event: 'submit' })
  })
  root.addEventListener('click', (event) => {
    if (projecting) return
    const target = event.target as Element,
      tool = target.closest<HTMLElement>('[data-wf-tooling]')
    if (tool) {
      event.preventDefault()
      projectedFocus = undefined
      if (tool.getAttribute('data-wf-tooling') === 'view') {
        state = { ...state, viewMode: state.viewMode === 'fixed' ? 'accessible' : 'fixed' }
        render()
      } else if (tool.getAttribute('data-wf-tooling') === 'reset') apply({ kind: 'reset' })
      return
    }
    const node = owner(event.target)
    if (!node) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
    const anchor = target.closest('a')
    if (
      ['input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider'].includes(node.kind)
    ) {
      if (node.handlers.some((handler) => handler.event === 'click'))
        apply({ kind: 'event', source: node.identity, event: 'click' }, null, true)
      return
    }
    if (
      anchor &&
      node.attributes.href !== undefined &&
      !node.handlers.some((handler) => handler.event === 'click')
    )
      return
    event.preventDefault()
    apply({ kind: 'event', source: node.identity, event: 'click' })
  })
  root.addEventListener('keydown', (event) => {
    if (projecting) return
    const node = owner(event.target)
    if (!node) return
    const explicit = node.handlers.some(
        (handler) => handler.event === 'keydown' && handler.key === event.key,
      ),
      widget =
        ['tab', 'tabs', 'dropdown', 'dropdown-item'].includes(node.kind) &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '].includes(
          event.key,
        )
    if (explicit || widget || event.key === 'Escape') {
      event.preventDefault()
      apply({ kind: 'event', source: node.identity, event: 'keydown', key: event.key })
    } else if (event.key === 'Enter' && ['input', 'select'].includes(node.kind) && node.form) {
      event.preventDefault()
      const form = nodes.get(node.form)!
      apply({ kind: 'event', source: form.identity, event: 'submit' })
    }
  })
  root.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault()
      const node = owner(event.target)
      if (node) apply({ kind: 'event', source: node.identity, event: 'keydown', key: 'Escape' })
    },
    true,
  )
  function addressChanged(): void {
    const sequence = browserSequence(),
      fragment = location.hash,
      canonical = fragment || engine.routeAddress(program.entry)
    if (
      !state.suspended &&
      canonical === state.address &&
      sequence === state.history[state.historyIndex].sequence
    )
      return
    apply({ kind: 'address', fragment }, sequence)
  }
  addEventListener('hashchange', addressChanged)
  addEventListener('popstate', addressChanged)
  for (const type of ['pointerover', 'pointerout'])
    root.addEventListener(type, (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-wf-kind=tooltip]')
          : null
      if (!target || target.contains((event as PointerEvent).relatedTarget as Node | null)) return
      if (type === 'pointerout' && target.contains(document.activeElement)) return
      state = engine.hover(state, target.id, type === 'pointerover')
      render()
    })
  function schedule(): void {
    timer = setTimeout(() => {
      const now = performance.now()
      if (!paused && !state.suspended) {
        let delta = Math.max(0, Math.floor(now - last))
        while (delta > 0) {
          const part = Math.min(delta, 600000)
          const next = engine.reduce(state, { kind: 'advanceClock', deltaMs: part })
          const changed = next.sequence !== state.sequence
          state = next
          if (changed) {
            effectCommands()
            render()
          }
          delta -= part
        }
      }
      last = now
      schedule()
    }, 16)
  }
  history.replaceState(metadata(state.history[state.historyIndex].sequence), '', location.href)
  render()
  schedule()
  Object.defineProperty(window, 'wireweaveRuntime', {
    value: Object.freeze({
      pause() {
        paused = true
        last = performance.now()
      },
      resume() {
        paused = false
        last = performance.now()
      },
      dispatch(input: RuntimeInput) {
        apply(input)
      },
      advanceClock(deltaMs: number) {
        paused = true
        apply({ kind: 'advanceClock', deltaMs })
      },
      reset() {
        apply({ kind: 'reset' })
      },
      snapshot() {
        return JSON.parse(JSON.stringify(state)) as RuntimeSnapshot
      },
    }),
    enumerable: false,
    writable: false,
    configurable: false,
  })
  addEventListener('pagehide', () => {
    if (timer !== undefined) clearTimeout(timer)
  })
}

const NATIVE_RUNTIME = `(()=>{const program=JSON.parse(document.getElementById("wf-runtime-data").textContent);(${browserAdapter.toString()})((${runtimeEngine.toString()})(program),program);})();`

function compileAppV4(linked: LinkedApp): AppResult<AppArtifact> {
  const data = getLinkedAppData(linked)
  if (data === undefined)
    return failed([diagnostic('WW_SCHEMA', 'app.untrusted-linked-model', undefined, {}, 'compile')])
  if (data.artifact !== undefined) return { ok: true, value: data.artifact, diagnostics: [] }
  const renderer = new HtmlArtifact(data, runtimeProgram(linked))
  const html = renderer.html()
  if (new TextEncoder().encode(html).byteLength > 64 * 1024 * 1024)
    return failed([diagnostic('WW_LIMIT', 'app.html-byte-limit', undefined, {}, 'compile')])
  const artifact: AppArtifact = freeze({
    kind: 'AppArtifact',
    schemaVersion: '1.0.0',
    languageVersion: '4.0.0',
    html,
    sourceMap: data.sourceMap,
    mediaType: 'text/html',
    byteLength: new TextEncoder().encode(html).byteLength,
    digest: digestV4(html),
    modelDigest: linked.digest,
    profileDigest: digestV4(jcs(data.bundle.profile)),
    runtimeDigest: digestV4(NATIVE_RUNTIME),
    registryDigest: data.bundle.registry.digest,
    entry: data.bundle.entry,
    screenIndex: data.screens.map((screen) => ({
      route: screen.route,
      renderedId: screen.children[0].renderedId,
    })),
    operationIndex: data.nodes.flatMap((node) =>
      asObjects(node.node.attributes.on).flatMap((handler) =>
        asObjects(handler.operations).map((operation) => ({
          renderedId: node.renderedId,
          handlerId: textValue(handler.id),
          operationId: textValue(operation.id),
          executionClass: textValue(operation.executionClass),
          operation,
        })),
      ),
    ),
    diagnostics: [],
    manifest: {
      appId: data.bundle.id,
      modelDigest: linked.digest,
      profileDigest: digestV4(jcs(data.bundle.profile)),
      registryDigest: data.bundle.registry.digest,
      htmlDigest: digestV4(html),
      runtimeDigest: digestV4(NATIVE_RUNTIME),
      executionScope: 'standard-1',
      unsupportedOperations: renderer.unsupported,
    },
  })
  data.artifact = artifact
  return { ok: true, value: artifact, diagnostics: [] }
}

export function renderSite(bundle: AppBundle): AppResult<AppArtifact> {
  const linked = linkApp(bundle)
  return linked.ok ? compileAppV4(linked.value) : linked
}
