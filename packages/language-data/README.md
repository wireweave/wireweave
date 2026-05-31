# @wireweave/language-data

Component and attribute vocabulary for the Wireweave DSL, for editor autocomplete, validation, and tooling.

## What it does

`@wireweave/language-data` is the single source of the Wireweave DSL vocabulary — every component, its allowed attributes, valid children, categories, and value keywords — exposed as plain data plus lookup helpers. It powers autocomplete, hover docs, and validation hints in editor integrations.

This package is **independent of `@wireweave/core`** — it ships only the language metadata, with no parser or renderer dependency.

Optional subpath entries provide ready-made editor integrations:

- `@wireweave/language-data/monaco` — register the Wireweave language with Monaco Editor.
- `@wireweave/language-data/codemirror` — tokenizer, completion, hover, and linting sources for CodeMirror 6.

The editor adapters rely on optional peer dependencies (`monaco-editor`, `@codemirror/*`) — install only the ones for the integration you use.

## Install

```bash
npm i @wireweave/language-data
```

## Usage

```typescript
import {
  ALL_COMPONENTS,
  ATTRIBUTES,
  getComponent,
  getAttribute,
  getValidChildren,
  getComponentAttributes,
  isValidChild,
} from '@wireweave/language-data'

// Component definition
const card = getComponent('card')
console.log(card?.description)

// Attributes allowed on a component
const cardAttrs = getComponentAttributes('card')

// Validity checks for the editor
isValidChild('page', 'card') // true / false
getValidChildren('grid') // valid child component names

// Full vocabulary
console.log(ALL_COMPONENTS.length, ATTRIBUTES.length)
```

### Monaco integration

```typescript
import * as monaco from 'monaco-editor'
import { registerWireframeLanguage } from '@wireweave/language-data/monaco'

registerWireframeLanguage(monaco)
```

### CodeMirror 6 integration

```typescript
import {
  createTokenizer,
  getLanguageConfig,
  createCompletionSource,
  createHoverTooltipSource,
  createLinter,
} from '@wireweave/language-data/codemirror'
```

## Main API

| Export                                                                                                                                       | Description                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `ALL_COMPONENTS`, `COMPONENT_MAP`, `NODE_TYPE_MAP`, `VALID_COMPONENT_NAMES`                                                                  | Component definitions and lookup maps.                         |
| `ATTRIBUTES`, `ATTRIBUTE_MAP`, `COMMON_ATTRIBUTES`, `VALID_ATTRIBUTE_NAMES`                                                                  | Attribute definitions and lookup maps.                         |
| `CATEGORY_LABELS`, `VALUE_KEYWORDS`, `COMMON_NUMBERS`, `SPACING_SCALE`                                                                       | Categories, value keywords, and numeric scales for completion. |
| `getComponent`, `getComponentByNodeType`, `getComponentAttributes`, `getComponentsByCategory`                                                | Component lookups.                                             |
| `getAttribute`, `getAttributeTypeLabel`, `formatAttributeValues`                                                                             | Attribute lookups and formatting.                              |
| `getValidChildren`, `isValidChild`                                                                                                           | Containment rules for validation.                              |
| `isComponent`, `isAttribute`, `getComponentNames`, `getAttributeNames`, `getCategories`                                                      | Membership checks and name listings.                           |
| `ComponentDef`, `AttributeDef`, `ComponentCategory`, `AttributeValueType`                                                                    | Type definitions.                                              |
| `registerWireframeLanguage` (`/monaco`)                                                                                                      | Register the language with Monaco Editor.                      |
| `createTokenizer`, `getLanguageConfig`, `createCompletionSource`, `createHoverTooltipSource`, `createLinter`, `validateCode` (`/codemirror`) | CodeMirror 6 language sources.                                 |

Part of the [Wireweave monorepo](https://github.com/wireweave/wireweave).

## License

MIT
