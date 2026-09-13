/**
 * @wireweave/core
 *
 * Text-based wireframe DSL parser and renderer
 */

// AST types, guards, and utilities
export * from './ast'

// Parser functions
export * from './parser'

// Printer (AST → canonical DSL text)
export * from './printer'

// Renderer
export * from './renderer'

// Viewport
export * from './viewport'

// Icons (Lucide)
export * from './icons/lucide-icons'

// DSL Specification (components, attributes)
export * from './spec'

// Validation
export * from './validation'

// Diff (comparison between wireframes)
export * from './diff'

// Export (format conversion)
export * from './export'

// Analyze (statistics and metrics)
export * from './analyze'

// Extract (deterministic SSOT-shaped derivations)
export * from './extract'

// Typed state/event normalization shared by graph extraction and site runtime
export * from './interaction'

// Application manifest, module linker, and resolved app document. The legacy
// `renderSite(WireframeDocument)` stays the root entry point; canonical 4.0
// AppBundle rendering is exposed as `renderAppSite` here and as `renderSite`
// from the dedicated `@wireweave/core/app` subpath. Keeping the names separate
// prevents two different render contracts from being merged by a wildcard.
export {
  compileApp,
  createAppBundle,
  createAppComponentInstanceId,
  createAppNodeId,
  createRuntime,
  advanceClock,
  reduceEvent,
  resetRuntime,
  linkAndCompileApp,
  linkApp,
  renderSite as renderAppSite,
} from './app'
export type {
  AppArtifact,
  AppBundle,
  AppCompileResult,
  AppComponentInput,
  AppComponentInstanceId,
  AppDefinitionKind,
  AppDocument,
  AppLayoutInput,
  AppLinkDiagnostic,
  AppLinkDiagnosticCode,
  AppLinkResult,
  AppManifest,
  AppManifestModule,
  AppModuleInput,
  AppNodeId,
  AppNodeKind,
  AppReferenceInput,
  AppScreenInput,
  AppSourceMapEntry,
  AppSourceSpan,
  AppResult,
  CompileAppOptions,
  CreateAppBundleOptions,
  Diagnostic,
  InstanceStep,
  LinkedApp,
  LinkedIdentity,
  ResolvedAppComponent,
  ResolvedAppLayout,
  ResolvedAppModule,
  ResolvedAppReference,
  ResolvedAppScreen,
  RuntimeBrowserEffect,
  RuntimeInput,
  RuntimeSnapshot,
  RuntimeTrace,
  ScreenReference,
  SourceMapEntry,
} from './app'
