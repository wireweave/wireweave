# `.wf` regression corpus

The corpus contains 73 committed `.wf` sources used by the grammar regression
harness in `__tests__/corpus.test.ts`. The harness compares each parse with the
frozen AST and failure ledgers in `__tests__/corpus-baseline/`, then checks the
`parse(print(parse(source)))` round trip.

Run the corpus checks with:

```bash
pnpm --filter @wireweave/core test corpus
```

After an intentional grammar or printer change, inspect the diff and refresh
every baseline with:

```bash
pnpm --filter @wireweave/core test corpus -u
```

## Inventory

The directory names and relative paths are part of the checked corpus
inventory. Keep each fixture in its existing directory and add new fixtures
under a directory that describes its current contract purpose.

| Directory             |  Files |
| --------------------- | -----: |
| `bookmark-v1`         |      3 |
| `bookmark-v2`         |      4 |
| `dogfood`             |      2 |
| `e2-demo`             |      1 |
| `examples`            |     22 |
| `repeat`              |      1 |
| `studio-fixtures`     |      8 |
| `swapgrid-2026-07-26` |     15 |
| `swapgrid-preremoval` |     15 |
| `variants`            |      2 |
| **Total**             | **73** |

## Rules

- Treat source fixtures as read-only. If a fixture must change, review the
  source diff and regenerate the affected baseline deliberately.
- The inventory and both failure ledgers are contracts. A new parse failure,
  round-trip failure or missing file must remain visible in the test result.
- The corpus is test input only. `packages/core` publishes `dist`, so these
  fixtures are not included in the package archive.
