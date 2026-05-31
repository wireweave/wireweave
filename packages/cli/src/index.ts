import { Command } from 'commander'
import { loginCommand } from './commands/login.js'
import { whoamiCommand } from './commands/whoami.js'
import { logoutCommand } from './commands/logout.js'
import { renderCommand } from './commands/render.js'
import { parseCommand } from './commands/parse.js'
import { validateCommand } from './commands/validate.js'
import { listComponentsCommand } from './commands/list-components.js'
import { analyzeCommand } from './commands/analyze.js'
import { diffCommand } from './commands/diff.js'
import { validateUxCommand, type UxSeverity } from './commands/validate-ux.js'
import { exportJsonCommand } from './commands/export-json.js'
import { exportFigmaCommand } from './commands/export-figma.js'

const program = new Command()

program
  .name('wireweave')
  .description(
    'Wireweave CLI — auth, parse, validate, render, analyze, diff, validate-ux, and export .wf files',
  )
  .version('0.1.0-beta.0')

program
  .command('login')
  .description('Verify a Wireweave API key and store it for future sessions')
  .option('--api-key <key>', 'API key (otherwise read from WIREWEAVE_API_KEY or stdin)')
  .option('--api-url <url>', 'Override API base URL')
  .action(async (opts: { apiKey?: string; apiUrl?: string }) => {
    const code = await loginCommand({ apiKey: opts.apiKey, apiUrl: opts.apiUrl })
    process.exit(code)
  })

program
  .command('whoami')
  .description('Show the currently configured Wireweave account')
  .action(async () => {
    const code = await whoamiCommand()
    process.exit(code)
  })

program
  .command('logout')
  .description('Remove the stored Wireweave API key from disk')
  .action(async () => {
    const code = await logoutCommand()
    process.exit(code)
  })

program
  .command('render')
  .argument('<file>', 'Path to a .wf or .wireframe file')
  .option('-o, --output <path>', 'Write HTML to a file instead of stdout')
  .option('--theme <theme>', 'Theme: light or dark', 'light')
  .option('--full-document', 'Return a complete HTML document (default: fragment)')
  .description('Render a wireframe file to HTML (local — no network)')
  .action(
    async (file: string, opts: { output?: string; theme?: string; fullDocument?: boolean }) => {
      const theme = opts.theme === 'dark' ? 'dark' : 'light'
      const code = await renderCommand({
        file,
        output: opts.output,
        theme,
        fullDocument: opts.fullDocument === true,
      })
      process.exit(code)
    },
  )

program
  .command('parse')
  .argument('<file>', 'Path to a .wf or .wireframe file')
  .description('Parse a wireframe file and print its AST as JSON (local — no network)')
  .action(async (file: string) => {
    const code = await parseCommand({ file })
    process.exit(code)
  })

program
  .command('validate')
  .argument('<file>', 'Path to a .wf or .wireframe file')
  .option('--strict', 'Reject unknown attributes')
  .description('Validate a wireframe file (local — no network)')
  .action(async (file: string, opts: { strict?: boolean }) => {
    const code = await validateCommand({ file, strict: opts.strict === true })
    process.exit(code)
  })

program
  .command('list-components')
  .option('--category <category>', 'Filter by category (layout, navigation, form, ...)')
  .option('--format <format>', 'Output format: table or json', 'table')
  .description('List Wireweave DSL components (local — no network)')
  .action(async (opts: { category?: string; format?: string }) => {
    const format = opts.format === 'json' ? 'json' : 'table'
    const code = await listComponentsCommand({ category: opts.category, format })
    process.exit(code)
  })

program
  .command('analyze')
  .argument('<file>', 'Path to a .wf or .wireframe file')
  .option('--format <format>', 'Output format: json or summary', 'json')
  .option('--no-component-breakdown', 'Skip per-component usage breakdown')
  .option('--no-accessibility', 'Skip accessibility analysis')
  .option('--no-complexity', 'Skip complexity analysis')
  .option('--no-layout', 'Skip layout analysis')
  .option('--no-content', 'Skip content analysis')
  .description(
    'Analyze a wireframe for statistics, accessibility, and complexity (local — no network)',
  )
  .action(
    async (
      file: string,
      opts: {
        format?: string
        componentBreakdown?: boolean
        accessibility?: boolean
        complexity?: boolean
        layout?: boolean
        content?: boolean
      },
    ) => {
      const format = opts.format === 'summary' ? 'summary' : 'json'
      const code = await analyzeCommand({
        file,
        format,
        includeComponentBreakdown: opts.componentBreakdown,
        includeAccessibility: opts.accessibility,
        includeComplexity: opts.complexity,
        includeLayout: opts.layout,
        includeContent: opts.content,
      })
      process.exit(code)
    },
  )

program
  .command('diff')
  .argument('<old>', 'Path to the original .wf file')
  .argument('<new>', 'Path to the modified .wf file')
  .option('--ignore-attributes', 'Compare structure only, ignore attribute changes')
  .option('--ignore-order', 'Ignore child element order when comparing')
  .option('--format <format>', 'Output format: json or summary', 'json')
  .description('Compare two wireframe files and report differences (local — no network)')
  .action(
    async (
      oldFile: string,
      newFile: string,
      opts: { ignoreAttributes?: boolean; ignoreOrder?: boolean; format?: string },
    ) => {
      const format = opts.format === 'summary' ? 'summary' : 'json'
      const code = await diffCommand({
        oldFile,
        newFile,
        ignoreAttributes: opts.ignoreAttributes === true,
        ignoreOrder: opts.ignoreOrder === true,
        format,
      })
      process.exit(code)
    },
  )

program
  .command('validate-ux')
  .argument('<file>', 'Path to a .wf or .wireframe file')
  .option(
    '--categories <list>',
    'Comma-separated UX rule categories (accessibility,usability,form,...)',
  )
  .option('--min-severity <severity>', 'Minimum severity to report: error, warning, info')
  .option('--max-issues <n>', 'Maximum number of issues to return', (v) => Number(v))
  .option('--disabled-rules <list>', 'Comma-separated rule IDs to skip')
  .option('--format <format>', 'Output format: json or summary', 'json')
  .description('Validate a wireframe against UX best-practice rules (local — no network)')
  .action(
    async (
      file: string,
      opts: {
        categories?: string
        minSeverity?: string
        maxIssues?: number
        disabledRules?: string
        format?: string
      },
    ) => {
      const format = opts.format === 'summary' ? 'summary' : 'json'
      const minSeverity: UxSeverity | undefined =
        opts.minSeverity === 'error' ||
        opts.minSeverity === 'warning' ||
        opts.minSeverity === 'info'
          ? opts.minSeverity
          : undefined
      const code = await validateUxCommand({
        file,
        categories: opts.categories ? opts.categories.split(',').map((s) => s.trim()) : undefined,
        minSeverity,
        maxIssues: typeof opts.maxIssues === 'number' ? opts.maxIssues : undefined,
        disabledRules: opts.disabledRules
          ? opts.disabledRules.split(',').map((s) => s.trim())
          : undefined,
        format,
      })
      process.exit(code)
    },
  )

program
  .command('export-json')
  .argument('<file>', 'Path to a .wf or .wireframe file')
  .option('-o, --output <path>', 'Write JSON to a file instead of stdout')
  .option('--include-locations', 'Include source location metadata in nodes')
  .option('--no-pretty-print', 'Emit minified JSON (default: pretty)')
  .option('--include-empty-attributes', 'Include attributes whose value is empty')
  .description('Export a wireframe as JSON (local — no network)')
  .action(
    async (
      file: string,
      opts: {
        output?: string
        includeLocations?: boolean
        prettyPrint?: boolean
        includeEmptyAttributes?: boolean
      },
    ) => {
      const code = await exportJsonCommand({
        file,
        output: opts.output,
        includeLocations: opts.includeLocations === true,
        prettyPrint: opts.prettyPrint !== false,
        includeEmptyAttributes: opts.includeEmptyAttributes === true,
      })
      process.exit(code)
    },
  )

program
  .command('export-figma')
  .argument('<file>', 'Path to a .wf or .wireframe file')
  .option('-o, --output <path>', 'Write Figma JSON to a file instead of stdout')
  .description('Export a wireframe to Figma-compatible JSON (local — no network)')
  .action(async (file: string, opts: { output?: string }) => {
    const code = await exportFigmaCommand({
      file,
      output: opts.output,
    })
    process.exit(code)
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`wireweave: ${message}\n`)
  process.exit(1)
})
