import { basename } from 'node:path'
import { defineConfig } from 'tsup'

const GENERATED_CHUNK = /^chunk-[A-Z0-9]+\.(?:js|mjs|cjs)$/

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    parser: 'src/parser/index.ts',
    renderer: 'src/renderer/index.ts',
    spec: 'src/spec/index.ts',
    app: 'src/app/index.ts',
    interaction: 'src/interaction/index.ts',
  },
  format: ['cjs', 'esm'],
  // The compiled runtime is embedded into generated HTML via function source.
  // Keep optional/nullish syntax lowered identically in CJS and ESM so the
  // standalone artifact never references a format-specific helper module.
  target: 'es2019',
  dts: true,
  // Shared parser metadata and opaque app provenance must retain one module
  // identity across root and subpath imports in each published module format.
  splitting: true,
  sourcemap: false,
  clean: true,
  // Carry Core's sideEffects=false contract across generated split chunks.
  // Keep external dependencies and other initialization imports observable.
  treeshake: {
    preset: 'safest',
    moduleSideEffects: (id) => !(id.startsWith('./') && GENERATED_CHUNK.test(id.slice(2))),
  },
  esbuildPlugins: [
    {
      name: 'discard-empty-generated-chunks',
      setup(build) {
        build.onEnd((result) => {
          if (!result.outputFiles) return
          // Type-only barrels can produce zero-byte split chunks. Their bare
          // imports are removed by the pure-chunk policy above; do not pass
          // empty internal artifacts to Rollup or publish them as modules.
          result.outputFiles = result.outputFiles.filter(
            (file) => file.contents.byteLength !== 0 || !GENERATED_CHUNK.test(basename(file.path)),
          )
        })
      },
    },
  ],
})
