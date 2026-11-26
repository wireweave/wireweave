import type { JsonObject, JsonValue } from '../parser/v4-types'
import type {
  RuntimeEngine,
  RuntimeInput,
  RuntimeNode,
  RuntimeProgram,
  RuntimeSnapshot,
} from './compiler'

export function browserAdapter(engine: RuntimeEngine, program: RuntimeProgram): void {
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
  let projectedScreen: string | undefined
  let revealRouteStart = false
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
  function pendingFor(id: string): boolean {
    for (const request of Object.values(state.requests)) {
      let owner = nodes.get(request.owner)
      while (owner) {
        if (owner.id === id) return true
        owner = owner.parent ? nodes.get(owner.parent) : undefined
      }
    }
    return false
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
  function effectCommands(authoredNavigation = true): void {
    if (!authoredNavigation) revealRouteStart = false
    for (const effect of state.effects) {
      revealRouteStart = authoredNavigation && (effect.kind === 'push' || effect.kind === 'replace')
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
      root.setAttribute(
        'aria-busy',
        String(state.suspended || Object.keys(state.requests).length > 0),
      )
      for (const node of program.nodes) {
        const el = element(node.id)
        if (!el) continue
        el.hidden = view.visible[node.id] !== true
        const pending = pendingFor(node.id)
        if (pending || node.attributes.loading === true) {
          el.setAttribute('aria-busy', 'true')
          if (pending) el.setAttribute('data-wf-pending', 'true')
          else el.removeAttribute('data-wf-pending')
        } else {
          el.removeAttribute('aria-busy')
          el.removeAttribute('data-wf-pending')
        }
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
          el.setAttribute('aria-busy', String(pending || node.attributes.loading === true))
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
      // Reveal the new screen when it owns the default route focus. Preserve
      // browser history scrolling and any explicitly focused destination control.
      const revealStart =
        revealRouteStart &&
        active !== undefined &&
        projectedScreen !== undefined &&
        active.id !== projectedScreen &&
        state.focus === active.id
      revealRouteStart = false
      projectedScreen = active?.id
      if (state.focus && state.focus !== projectedFocus) {
        const focus = focusElement(state.focus)
        if (focus && focus !== document.activeElement && !focus.closest('[hidden],[inert]'))
          focus.focus({ preventScroll: revealStart })
      } else if (!state.route && projectedFocus !== null) {
        const heading = routeError.querySelector<HTMLElement>('h1')
        heading?.focus()
      }
      if (revealStart && (window.scrollX || window.scrollY)) {
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
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
        effectCommands(item.input.kind !== 'address' && item.input.kind !== 'reset')
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
