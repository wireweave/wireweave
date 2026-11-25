import { compileApp } from './compiler'
import { linkApp } from './linker'
import type { AppArtifact, AppBundle, Diagnostic } from './v4'
import {
  verifyLanguageSchemaReferenceClosure,
  type LanguageSchemaReferenceClosureResult,
  type LanguageSchemaResourceInput,
} from '../spec/schema-closure'
import type { LanguageSchemaPairPin } from '../spec/schema-pair'

export type SchemaReferenceClosureCompileResult =
  | {
      readonly ok: true
      readonly schemaReferenceClosureDigest: string
      readonly artifact: AppArtifact
    }
  | {
      readonly ok: false
      readonly stage: 'schema'
      readonly diagnostic: Extract<
        LanguageSchemaReferenceClosureResult,
        { ok: false }
      >['diagnostic']
    }
  | { readonly ok: false; readonly stage: 'app'; readonly diagnostics: readonly Diagnostic[] }

/** Check exact schema-resource closure before Core semantic linking and compilation.
 * Schema instance validation and catalog admission remain the host's responsibility.
 */
export function compileAppWithSchemaReferenceClosure(
  bundle: AppBundle,
  pin: LanguageSchemaPairPin,
  productSchemaBytes: Uint8Array,
  dependencies?: readonly LanguageSchemaResourceInput[],
): SchemaReferenceClosureCompileResult {
  const closure = verifyLanguageSchemaReferenceClosure(pin, productSchemaBytes, dependencies)
  if (!closure.ok) return { ok: false, stage: 'schema', diagnostic: closure.diagnostic }
  const linked = linkApp(bundle)
  if (!linked.ok) return { ok: false, stage: 'app', diagnostics: linked.diagnostics }
  const output = compileApp(linked.value)
  if (!output.ok) return { ok: false, stage: 'app', diagnostics: output.diagnostics }
  return { ok: true, schemaReferenceClosureDigest: closure.digest, artifact: output.value }
}
