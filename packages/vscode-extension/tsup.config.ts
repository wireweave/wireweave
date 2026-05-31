import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { extension: 'src/extension.ts' },
  format: ['cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['vscode'],
  // Bundle @wireweave/core into the extension
  noExternal: [/@wireweave/],
})
