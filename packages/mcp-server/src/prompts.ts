/**
 * MCP Prompt Definitions
 *
 * ⚠️  AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 *
 * Generated: 2026-05-17T13:36:38.485Z
 * Public prompts: 3
 */

export interface PromptArgument {
  name: string
  description: string
  required: boolean
}

export interface PromptDefinition {
  name: string
  description: string
  arguments: PromptArgument[]
}

export const prompts: PromptDefinition[] = [
  {
    name: 'improve_ux',
    description:
      'Analyze existing wireframe code and suggest UX improvements based on best practices.',
    arguments: [
      {
        name: 'code',
        description: 'Wireweave DSL code to analyze',
        required: true,
      },
    ],
  },
  {
    name: 'convert_to_wireframe',
    description: 'Convert a UI description or sketch concept into Wireweave DSL code.',
    arguments: [
      {
        name: 'ui_description',
        description: 'Detailed description of the UI layout and components',
        required: true,
      },
      {
        name: 'style',
        description: 'Optional style preference (minimal, detailed, mobile-first)',
        required: false,
      },
    ],
  },
  {
    name: 'create_wireframe',
    description:
      'Create a new wireframe from a natural language description. Generates Wireweave DSL code.',
    arguments: [
      {
        name: 'description',
        description:
          'Description of the wireframe to create (e.g., "dashboard with sidebar nav and a stats card row")',
        required: true,
      },
    ],
  },
]

// Prompt templates with {{arg}} placeholders
export const promptTemplates: Record<string, string> = {
  improve_ux: `Analyze and improve the UX of this Wireweave wireframe:

\`\`\`wireframe
{{code}}
\`\`\`

Please use wireweave_validate_ux to get specific recommendations, then suggest improvements.`,
  convert_to_wireframe: `Convert this UI description to Wireweave DSL code:

{{ui_description}}

Style preference: {{style}}

Use wireweave_guide for syntax reference and wireweave_patterns for common layouts.`,
  create_wireframe: `Create a Wireweave DSL wireframe for: {{description}}

Please use the wireweave_guide tool first to understand the DSL syntax, then generate valid Wireweave code.
After generating, use wireweave_validate to check the syntax and wireweave_validate_ux to check UX best practices.`,
}
