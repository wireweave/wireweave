import { LANGUAGE_RESOURCE_DATA, LANGUAGE_RESOURCE_PACKAGE } from './language-resources.generated'

/** A source asset, not a complete language profile, schema closure or execution capability. */
export interface LanguageSourceResource {
  readonly uri: string
  readonly path: string
  readonly digest: string
  readonly byteLength: number
  readonly mediaType: string
  /** Exact source text; encode as UTF-8 to recover the fingerprinted bytes. */
  readonly text: string
}

/** Package identity and content-addressed source resources bundled at build time.
 * No schema closure, renderer/runtime fingerprint or browser capability is implied.
 */
export const languageSourceResources = Object.freeze({
  package: Object.freeze({ ...LANGUAGE_RESOURCE_PACKAGE }),
  resources: Object.freeze(
    LANGUAGE_RESOURCE_DATA.map((resource) => Object.freeze({ ...resource })),
  ),
})

/** Exact embedded URI lookup only. Unknown URIs (including fragments) return null;
 * never performs network/filesystem access or interprets a URI as a fetch permission.
 */
export function resolveLanguageSourceResource(
  uri: string,
): Readonly<LanguageSourceResource> | null {
  return languageSourceResources.resources.find((resource) => resource.uri === uri) ?? null
}
