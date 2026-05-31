import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'markdown-it': 'src/markdown-it.ts',
    marked: 'src/marked.ts',
    remarkable: 'src/remarkable.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['markdown-it', 'marked', 'remarkable'],
})
