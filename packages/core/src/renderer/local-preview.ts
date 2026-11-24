/** Bounded, opt-in Page illustration with local ephemeral interaction only. */
import { parse } from '../parser'
import { validate } from '../validation'
import { digestV4 } from '../parser/v4-lexical'
import { renderPage, resolvePageDimensions } from './page-renderer'
import { INTERACTIVE_ATTR_NAMES } from './html/interactive'

export const LOCAL_PAGE_PROFILE = 'local-page-1' as const
const [, OPEN, , ACTION] = INTERACTIVE_ATTR_NAMES
const RUNTIME = `(()=>{'use strict';
const source=document.querySelector('.wf-modal-backdrop');let dialog=null,opener=null;
const visible=e=>e instanceof HTMLElement&&e.isConnected&&!e.disabled&&e.getClientRects().length>0;
function close(){if(!dialog||!dialog.open)return;dialog.close();const target=opener;opener=null;if(visible(target))target.focus();else document.body.focus();}
if(source){dialog=document.createElement('dialog');dialog.id=source.id;dialog.className='wf-local-dialog';dialog.tabIndex=-1;const inner=source.querySelector('.wf-modal');dialog.setAttribute('aria-label',inner.getAttribute('aria-label'));inner.removeAttribute('role');inner.removeAttribute('aria-modal');dialog.append(inner);source.remove();document.body.append(dialog);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('input:not(:disabled),textarea:not(:disabled),button:not(:disabled)')].filter(visible);const first=controls[0],last=controls[controls.length-1];if(!first){event.preventDefault();dialog.focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});}
document.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('button'):null;if(!button||button.disabled)return;
if(button.hasAttribute('${OPEN}')){if(dialog&&!dialog.open&&button.getAttribute('${OPEN}')===dialog.id){opener=button;dialog.showModal();const first=dialog.querySelector('input:not(:disabled),textarea:not(:disabled),button:not(:disabled)');if(first)first.focus();}}
else if(button.getAttribute('${ACTION}')==='close'&&dialog&&dialog.contains(button))close();});
document.addEventListener('submit',event=>event.preventDefault());
})();`
const FRAME = `.wf-modal-backdrop{display:none}html,body{margin:0;min-height:100vh}body{display:flex;justify-content:flex-start;justify-content:safe center;align-items:flex-start;padding:24px;box-sizing:border-box}.wf-page{flex-shrink:0}.wf-local-dialog{padding:0;border:0;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto}.wf-local-dialog::backdrop{background:#0006}.wf-local-dialog>.wf-modal{box-sizing:border-box;max-width:100%;margin:0}`

export type LocalPagePreviewResult =
  | { ok: false; diagnostic: 'invalid-input' | 'unsupported-profile' | 'invalid-target' | 'limit' }
  | {
      ok: true
      profile: typeof LOCAL_PAGE_PROFILE
      html: string
      inputDigest: string
      htmlDigest: string
      runtimeDigest: string
      sandbox: 'allow-scripts'
    }

function base64Digest(text: string): string {
  const hex = digestV4(text).slice(7)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  for (let i = 0; i < 32; i += 3) {
    const a = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    const b = Number.parseInt(hex.slice((i + 1) * 2, (i + 1) * 2 + 2), 16) || 0
    const c = Number.parseInt(hex.slice((i + 2) * 2, (i + 2) * 2 + 2), 16) || 0
    const value = (a << 16) | (b << 8) | c
    result +=
      alphabet[(value >>> 18) & 63] +
      alphabet[(value >>> 12) & 63] +
      (i + 1 < 32 ? alphabet[(value >>> 6) & 63] : '=') +
      (i + 2 < 32 ? alphabet[value & 63] : '=')
  }
  return result
}
const fields: Record<string, string[]> = {
  Page: ['title', 'id', 'viewport', 'device', 'centered'],
  Header: [],
  Main: [],
  Footer: [],
  Section: [],
  Row: [],
  Col: [],
  Card: ['title'],
  Text: ['content', 'size', 'weight', 'muted', 'align'],
  Title: ['content', 'level'],
  Divider: [],
  Modal: ['title', 'id'],
  Button: ['content', 'opens', 'action', 'disabled', 'variant', 'size'],
  Input: ['label', 'inputType', 'placeholder', 'value', 'disabled', 'readonly', 'required'],
  Textarea: ['label', 'placeholder', 'value', 'rows', 'disabled', 'required'],
}
const common = new Set(
  'p px py pt pr pb pl m mx my mt mr mb ml gap w h minW maxW minH maxH flex direction justify align wrap bg border rounded'.split(
    ' ',
  ),
)
const textFields = new Set(['title', 'content', 'label', 'placeholder', 'value'])

/**
 * No AppBundle/project identity is manufactured. Callers must mount the complete
 * document in an opaque-origin iframe with exactly sandbox="allow-scripts";
 * no same-origin/forms/popups/top-navigation/bridge/messaging is required.
 * Recreating the document is reset. Unsupported input returns no HTML.
 */
export function renderLocalPagePreview(source: string): LocalPagePreviewResult {
  const bytes = (value: string) => new TextEncoder().encode(value).byteLength
  if (typeof source !== 'string') return { ok: false, diagnostic: 'invalid-input' }
  if (bytes(source) > 64 * 1024) return { ok: false, diagnostic: 'limit' }
  try {
    const ast = parse(source)
    const page = ast.children[0]
    if (ast.children.length !== 1 || page?.type !== 'Page')
      return { ok: false, diagnostic: 'unsupported-profile' }
    let count = 0
    let modalId: string | null = null
    let opens = 0
    let closes = 0
    const targets: string[] = []
    const ids = new Set<string>()
    const visit = (node: unknown, depth: number, inModal: boolean): void => {
      if (++count > 1000 || depth > 32) throw new Error('limit')
      const n = node as Record<string, unknown>
      const type = String(n.type)
      const allowed = fields[type]
      if (!allowed) throw new Error('unsupported-profile')
      for (const [key, value] of Object.entries(n)) {
        if (['type', 'loc', 'children'].includes(key)) continue
        if (!allowed.includes(key) && !common.has(key)) throw new Error('unsupported-profile')
        if (textFields.has(key)) {
          if (value !== null && typeof value !== 'string') throw new Error('unsupported-profile')
          continue
        }
        if (typeof value === 'string' && !/^[\w.%-]+$/.test(value))
          throw new Error('unsupported-profile')
        if (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > 4096))
          throw new Error('limit')
        if (value !== null && typeof value === 'object') {
          const unit = value as Record<string, unknown>
          if (
            Object.keys(unit).sort().join() !== 'unit,value' ||
            typeof unit.value !== 'number' ||
            !Number.isFinite(unit.value) ||
            Math.abs(unit.value) > 4096 ||
            !['px', '%', 'em', 'rem', 'vh', 'vw'].includes(String(unit.unit))
          )
            throw new Error('unsupported-profile')
        }
      }
      if (n.id !== undefined) {
        if (typeof n.id !== 'string' || !/^[a-zA-Z][\w-]*$/.test(n.id) || ids.has(n.id))
          throw new Error('invalid-target')
        ids.add(n.id)
      }
      if (n.disabled !== undefined && typeof n.disabled !== 'boolean')
        throw new Error('unsupported-profile')
      if (type === 'Input' && n.inputType !== undefined && n.inputType !== 'text')
        throw new Error('unsupported-profile')
      if (type === 'Modal') {
        if (
          modalId !== null ||
          inModal ||
          typeof n.id !== 'string' ||
          !/^[a-zA-Z][\w-]*$/.test(n.id) ||
          typeof n.title !== 'string' ||
          !n.title.trim()
        )
          throw new Error('invalid-target')
        modalId = n.id
      }
      if (type === 'Button') {
        if (typeof n.opens === 'string' && n.action === undefined && !inModal) {
          targets.push(n.opens)
          if (!n.disabled) opens++
        } else if (n.action === 'close' && n.opens === undefined && inModal) {
          if (!n.disabled) closes++
        } else throw new Error('invalid-target')
      }
      if (
        Array.isArray(n.children) &&
        n.children.length &&
        !['Page', 'Header', 'Main', 'Footer', 'Section', 'Row', 'Col', 'Card', 'Modal'].includes(
          type,
        )
      )
        throw new Error('unsupported-profile')
      if (Array.isArray(n.children))
        for (const child of n.children) visit(child, depth + 1, inModal || type === 'Modal')
    }
    visit(page, 0, false)
    if (!validate(ast).valid) return { ok: false, diagnostic: 'invalid-input' }
    if (targets.some((target) => target !== modalId) || (modalId !== null && (!opens || !closes)))
      return { ok: false, diagnostic: 'invalid-target' }
    const dimensions = resolvePageDimensions(page)
    if (
      dimensions.width < 160 ||
      dimensions.height < 160 ||
      dimensions.width > 4096 ||
      dimensions.height > 4096
    )
      return { ok: false, diagnostic: 'limit' }
    const rendered = renderPage(page)
    // Fixed attributes on the closed renderer subset, not an HTML sanitizer.
    const markup = rendered.html.replace(
      /<(input|textarea)\b/g,
      '<$1 autocomplete="off" spellcheck="false"',
    )
    // The admitted subset has no HTML/resource-bearing nodes or authored code.
    const csp = `default-src 'none'; script-src 'sha256-${base64Digest(RUNTIME)}'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'`
    const html = `<!doctype html><html lang="en"><head><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${rendered.css}\n${FRAME}</style></head><body tabindex="-1">${markup}<script>${RUNTIME}</script></body></html>`
    if (bytes(html) > 2 * 1024 * 1024) return { ok: false, diagnostic: 'limit' }
    return {
      ok: true,
      profile: LOCAL_PAGE_PROFILE,
      html,
      inputDigest: digestV4(source),
      htmlDigest: digestV4(html),
      runtimeDigest: digestV4(RUNTIME),
      sandbox: 'allow-scripts',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return {
      ok: false,
      diagnostic:
        message === 'limit' || message === 'invalid-target' || message === 'unsupported-profile'
          ? message
          : 'invalid-input',
    }
  }
}
