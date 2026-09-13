import { defineConfig } from 'tsup'

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
  treeshake: false,
})
