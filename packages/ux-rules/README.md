# @wireweave/ux-rules

[![npm version](https://img.shields.io/npm/v/@wireweave/ux-rules.svg)](https://www.npmjs.com/package/@wireweave/ux-rules)
[![npm downloads](https://img.shields.io/npm/dm/@wireweave/ux-rules.svg)](https://www.npmjs.com/package/@wireweave/ux-rules)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

UX validation rules for Wireweave DSL.

## What it does

Walks a parsed wireframe AST (from [`@wireweave/core`](https://www.npmjs.com/package/@wireweave/core)) and checks it against 59 UX best-practice rules across 10 categories — accessibility, forms, usability, touch targets, navigation, consistency, content, data display, feedback, and interaction. It returns the matched issues plus a complexity-normalized **0–100 score**.

It is a free, fully local linter — no network, no API key. The Wireweave SDK and CLI expose it as the `validate_ux` tool. Validation only; it does not autofix.

## Installation

```bash
npm install @wireweave/ux-rules
# or
pnpm add @wireweave/ux-rules
# or
yarn add @wireweave/ux-rules
```

## Usage

```typescript
import { parse } from '@wireweave/core'
import { validateUX, getUXScore, getUXIssues } from '@wireweave/ux-rules'

const doc = parse(`
  page {
    card {
      input placeholder="Email"
      button "Submit" primary
    }
  }
`)

// Full validation
const result = validateUX(doc)
console.log(result.score) // 0-100, complexity-normalized
console.log(result.rawScore) // 0-100, undamped total penalty
console.log(result.complexity) // { score: 1-10, level: 'simple' | ... }
console.log(result.valid) // true if no errors
console.log(result.issues) // Array of UX issues

// Quick helpers
const score = getUXScore(doc)
const issues = getUXIssues(doc)
```

## Rule Categories

| Category        | Rules | Description                                                               |
| --------------- | ----- | ------------------------------------------------------------------------- |
| `accessibility` | 5     | Screen reader support, labels, alt text                                   |
| `form`          | 4     | Form UX patterns, input types, validation                                 |
| `usability`     | 10    | General usability (empty containers, CTA, loading states, cognitive load) |
| `touch-target`  | 5     | Touch target sizes for mobile (WCAG 2.5.5)                                |
| `navigation`    | 5     | Navigation patterns (item count, active states)                           |
| `consistency`   | 4     | Consistent styling across components                                      |
| `content`       | 6     | Text quality, placeholder detection, title requirements                   |
| `data-display`  | 6     | Tables, lists, empty states, pagination                                   |
| `feedback`      | 6     | Spinners, progress bars, toasts, alerts                                   |
| `interaction`   | 8     | Interactive elements need actions defined                                 |

**Total: 59 rules**

## API

### `validateUX(ast, options?)`

Full validation with score and issues.

**Options:**

- `categories`: Filter by rule categories
- `minSeverity`: Minimum severity to report (`'error'` | `'warning'` | `'info'`)
- `maxIssues`: Maximum issues to collect
- `customRules`: Add custom rules
- `disabledRules`: Disable rules by ID

**Returns** `UXValidationResult`:

- `valid`: `true` if no errors
- `score`: complexity-normalized score (0-100) — see [Scoring](#scoring)
- `rawScore`: undamped total-penalty score (0-100)
- `complexity`: `{ score: 1-10, level }` from core `analyze()`
- `issues`: array of `UXIssue`
- `summary`: per-category pass/fail/warning counts
- `severityCounts`: `{ errors, warnings, info }`

### `isUXValid(ast)`

Quick check - returns `true` if no errors.

### `getUXScore(ast)`

Returns UX score from 0 to 100.

### `getUXIssues(ast, options?)`

Returns array of UX issues.

### `formatUXResult(result)`

Formats validation result as human-readable string.

## Issue Severity

| Severity  | Impact              | Base Penalty   |
| --------- | ------------------- | -------------- |
| `error`   | Critical UX problem | -10 (absolute) |
| `warning` | Should fix          | -3 (soft)      |
| `info`    | Consider improving  | -1 (soft)      |

### Scoring

`validateUX()` returns two scores:

- **`rawScore`** — the undamped total penalty, clamped to `[0, 100]`:
  `100 − (errors × 10 + warnings × 3 + info × 1)`.
- **`score`** — the headline score. Errors stay an absolute penalty (a hard defect
  is a hard defect at any screen size — no volume discount). The _soft_ penalty
  (warnings + info) is damped by the document's achieved complexity:

  ```
  score = round(100 − errors × 10 − (warnings × 3 + info × 1) × dampingFactor)
  dampingFactor = REFERENCE_COMPLEXITY / max(REFERENCE_COMPLEXITY, complexity.score)
  ```

  `complexity.score` ∈ `[1, 10]` comes from `@wireweave/core`'s `analyze()`, and
  `REFERENCE_COMPLEXITY` is `3` (core's "moderate" band). At or below the reference
  the factor is `1`, so a trivial screen earns no relief; above it, a dense,
  intent-fitting design gets proportional relief for the per-element
  warning/info heuristics it is expected to accumulate. `score >= rawScore` always
  holds. Both `complexity` and `REFERENCE_COMPLEXITY` are exported.

## All Rules

<details>
<summary><strong>Accessibility (5 rules)</strong></summary>

| Rule ID                  | Severity      | Description                            |
| ------------------------ | ------------- | -------------------------------------- |
| `a11y-input-label`       | error/warning | Input fields must have labels          |
| `a11y-image-alt`         | warning       | Images should have alt text            |
| `a11y-icon-button-label` | error         | Icon-only buttons need accessible text |
| `a11y-link-text`         | warning       | Links should have descriptive text     |
| `a11y-heading-hierarchy` | warning       | Heading levels should be sequential    |

</details>

<details>
<summary><strong>Form (4 rules)</strong></summary>

| Rule ID                   | Severity | Description                                       |
| ------------------------- | -------- | ------------------------------------------------- |
| `form-submit-button`      | warning  | Forms with inputs need submit button              |
| `form-required-indicator` | info     | Required fields should be marked                  |
| `form-password-confirm`   | info     | Registration forms may need password confirmation |
| `form-input-type`         | warning  | Use appropriate input types (email, tel, etc.)    |

</details>

<details>
<summary><strong>Usability (10 rules)</strong></summary>

| Rule ID                          | Severity | Description                             |
| -------------------------------- | -------- | --------------------------------------- |
| `usability-empty-container`      | warning  | Avoid empty containers                  |
| `usability-clear-cta`            | info     | Pages should have primary button (CTA)  |
| `usability-loading-states`       | info     | Async buttons may need loading state    |
| `usability-destructive-confirm`  | warning  | Destructive actions need danger styling |
| `usability-modal-close`          | warning  | Modals need close mechanism             |
| `usability-nesting-depth`        | warning  | Avoid excessive nesting (max 6 levels)  |
| `usability-too-many-buttons`     | warning  | Max 5 buttons per container             |
| `usability-too-many-form-fields` | info     | Max 10 form fields                      |
| `usability-page-complexity`      | info     | Max 50 elements per page                |
| `usability-drawer-width`         | info     | Drawers should have width               |

</details>

<details>
<summary><strong>Touch Target (5 rules)</strong></summary>

| Rule ID                     | Severity | Description                        |
| --------------------------- | -------- | ---------------------------------- |
| `touch-button-size`         | warning  | Button minimum 44px (WCAG AAA)     |
| `touch-icon-button-size`    | warning  | Icon buttons need adequate padding |
| `touch-checkbox-radio-size` | info     | Checkbox/Radio should have labels  |
| `touch-link-spacing`        | info     | Adjacent links need spacing        |
| `touch-avatar-size`         | info     | Clickable avatars should be 44px+  |

</details>

<details>
<summary><strong>Navigation (5 rules)</strong></summary>

| Rule ID               | Severity | Description                           |
| --------------------- | -------- | ------------------------------------- |
| `nav-item-count`      | warning  | Max 7 navigation items (Miller's Law) |
| `nav-active-state`    | info     | Navigation should show active state   |
| `nav-breadcrumb-home` | info     | Breadcrumb should start with home     |
| `nav-tab-count`       | warning  | Max 5 tabs                            |
| `nav-dropdown-items`  | warning  | Dropdown must have items              |

</details>

<details>
<summary><strong>Consistency (4 rules)</strong></summary>

| Rule ID                      | Severity | Description                           |
| ---------------------------- | -------- | ------------------------------------- |
| `consistency-button-styles`  | info     | Consistent button styles in container |
| `consistency-spacing`        | info     | Consistent gap values                 |
| `consistency-card-styling`   | info     | Sibling cards should match            |
| `consistency-alert-variants` | warning  | Alert variant should match content    |

</details>

<details>
<summary><strong>Content (6 rules)</strong></summary>

| Rule ID                      | Severity | Description                   |
| ---------------------------- | -------- | ----------------------------- |
| `content-empty-text`         | warning  | Avoid empty/placeholder text  |
| `content-button-text-length` | info     | Button text max 25 characters |
| `content-title-length`       | info     | Title max 60 characters       |
| `content-page-title`         | warning  | Pages should have title       |
| `content-link-text`          | error    | Links must have text          |
| `content-no-placeholder`     | warning  | Replace placeholder content   |

</details>

<details>
<summary><strong>Data Display (6 rules)</strong></summary>

| Rule ID                  | Severity | Description                      |
| ------------------------ | -------- | -------------------------------- |
| `data-table-header`      | warning  | Tables need headers              |
| `data-list-empty-state`  | info     | Lists should have empty state    |
| `data-table-empty-state` | info     | Tables should have empty state   |
| `data-list-pagination`   | info     | Long lists (20+) need pagination |
| `data-table-columns`     | warning  | Max 8 table columns              |
| `data-card-grid`         | info     | Card grids should be consistent  |

</details>

<details>
<summary><strong>Feedback (6 rules)</strong></summary>

| Rule ID                      | Severity | Description                               |
| ---------------------------- | -------- | ----------------------------------------- |
| `feedback-spinner-context`   | info     | Spinners should have context text         |
| `feedback-progress-value`    | info     | Progress should show value                |
| `feedback-toast-duration`    | info     | Toast duration 2-10 seconds               |
| `feedback-alert-dismissible` | info     | Non-critical alerts should be dismissible |
| `feedback-tooltip-length`    | info     | Tooltip max 100 characters                |
| `feedback-form-errors`       | info     | Forms should handle errors                |

</details>

<details>
<summary><strong>Interaction (8 rules)</strong></summary>

| Rule ID                          | Severity | Description                      |
| -------------------------------- | -------- | -------------------------------- |
| `interaction-button-action`      | warning  | Buttons need onClick/action/href |
| `interaction-link-destination`   | warning  | Links need href/to destination   |
| `interaction-form-submit`        | warning  | Forms need onSubmit/action       |
| `interaction-tab-target`         | warning  | Tabs need target/value           |
| `interaction-menu-action`        | warning  | Menu items need action           |
| `interaction-card-action`        | info     | Clickable cards need action      |
| `interaction-icon-button-action` | warning  | Icon buttons need action         |
| `interaction-modal-close`        | info     | Modals need close mechanism      |

</details>

## Custom Rules

Create custom rules using the exported types and utilities:

```typescript
import { validateUX, UXRule, getNodeText, containsAnyWord } from '@wireweave/ux-rules'

const myRule: UXRule = {
  id: 'custom-no-click-here',
  category: 'accessibility',
  severity: 'warning',
  name: 'Avoid "click here" text',
  description: 'Link text should be descriptive',
  appliesTo: ['Button', 'Link'],
  check: (node, context) => {
    const text = getNodeText(node).toLowerCase()
    if (containsAnyWord(text, ['click here', 'click me'])) {
      return {
        ruleId: 'custom-no-click-here',
        category: 'accessibility',
        severity: 'warning',
        message: 'Avoid generic "click here" text',
        description: 'Use descriptive text that indicates the action',
        suggestion: 'Replace with descriptive action text',
        path: context.path,
        nodeType: node.type,
      }
    }
    return null
  },
}

const result = validateUX(doc, { customRules: [myRule] })
```

## Related Packages

- [@wireweave/core](https://www.npmjs.com/package/@wireweave/core) - Core parser and renderer

Part of the [Wireweave monorepo](https://github.com/wireweave/wireweave).

## License

MIT
