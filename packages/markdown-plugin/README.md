# @wireweave/markdown-plugin

Render Wireweave wireframes from fenced code blocks in Markdown.

## What it does

`@wireweave/markdown-plugin` lets you embed Wireweave DSL directly in Markdown. A fenced `wireframe` code block is parsed and rendered into HTML, an HTML preview container, SVG, or a base64 SVG `<img>` tag. Rendering is delegated to `@wireweave/core`.

Adapters are provided for the three major Markdown engines, each as its own subpath export:

- `@wireweave/markdown-plugin/markdown-it`
- `@wireweave/markdown-plugin/marked`
- `@wireweave/markdown-plugin/remarkable`

Each engine is an **optional peer dependency** — install only the one you use. The package root also exports `renderWireframe`, the standalone renderer the adapters are built on.

## Install

```bash
npm i @wireweave/markdown-plugin
```

## Usage

A fenced block tagged `wireframe` is rendered:

````markdown
```wireframe
page "Home" {
  button "Get Started" primary
}
```
````

### markdown-it

```typescript
import MarkdownIt from 'markdown-it'
import { markdownItWireframe } from '@wireweave/markdown-plugin/markdown-it'

const md = new MarkdownIt()
md.use(markdownItWireframe, { format: 'svg-img', theme: 'light' })

const html = md.render(source)
```

### marked

```typescript
import { marked } from 'marked'
import { markedWireframe } from '@wireweave/markdown-plugin/marked'

marked.use(markedWireframe({ format: 'svg', theme: 'dark' }))

const html = marked.parse(source)
```

### remarkable

```typescript
import { Remarkable } from 'remarkable'
import { remarkableWireframe } from '@wireweave/markdown-plugin/remarkable'

const md = new Remarkable()
remarkableWireframe(md, { format: 'html-preview' })

const html = md.render(source)
```

### Standalone renderer

```typescript
import { renderWireframe } from '@wireweave/markdown-plugin'

const html = renderWireframe('page { button "OK" primary }', {
  format: 'html',
  theme: 'light',
})
```

## Options

`WireframePluginOptions`:

| Option           | Values                                                 | Default                 | Description                                                                                                           |
| ---------------- | ------------------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `format`         | `'html'` \| `'html-preview'` \| `'svg'` \| `'svg-img'` | `'svg-img'`             | Output format. `html-preview` wraps output in a scalable preview container; `svg-img` emits a base64-encoded `<img>`. |
| `theme`          | `'light'` \| `'dark'`                                  | `'light'`               | Rendering theme.                                                                                                      |
| `containerClass` | `string`                                               | `'wireframe-container'` | Wrapper element class.                                                                                                |
| `errorHandling`  | `'code'` \| `'error'` \| `'both'`                      | `'both'`                | What to show when a block fails to parse.                                                                             |
| `containerWidth` | `number`                                               | `0`                     | Target width (px) for `html-preview` scaling. `0` disables scaling.                                                   |
| `maxScale`       | `number`                                               | `1`                     | Upper bound on the preview scale factor.                                                                              |

## Main API

| Export                                 | Description                            |
| -------------------------------------- | -------------------------------------- |
| `renderWireframe(code, options?)`      | Render a DSL string to an HTML string. |
| `markdownItWireframe` (`/markdown-it`) | markdown-it plugin.                    |
| `markedWireframe` (`/marked`)          | marked extension factory.              |
| `remarkableWireframe` (`/remarkable`)  | remarkable plugin.                     |
| `WireframePluginOptions`               | Shared options type.                   |

Part of the [Wireweave monorepo](https://github.com/wireweave/wireweave).

## License

MIT
