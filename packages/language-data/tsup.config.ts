import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/monaco/index.ts', 'src/codemirror/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
})
