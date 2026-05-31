/**
 * MCP Resource Definitions
 *
 * ⚠️  AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 *
 * Generated: 2026-05-17T13:36:38.745Z
 * Public resources: 5
 */

export interface ResourceDefinition {
  uri: string
  name: string
  description: string
  mimeType: string
}

export const resources: ResourceDefinition[] = [
  {
    uri: 'wireweave://grammar',
    name: 'Complete grammar reference for Wireweave DSL syntax and structure',
    description: 'Complete grammar reference for Wireweave DSL syntax and structure',
    mimeType: 'text/markdown',
  },
  {
    uri: 'wireweave://guide',
    name: 'Comprehensive guide for writing Wireweave DSL code, including best practices',
    description: 'Comprehensive guide for writing Wireweave DSL code, including best practices',
    mimeType: 'text/markdown',
  },
  {
    uri: 'wireweave://examples',
    name: 'Collection of example wireframe codes for common UI patterns',
    description: 'Collection of example wireframe codes for common UI patterns',
    mimeType: 'text/markdown',
  },
  {
    uri: 'wireweave://patterns',
    name: 'Common layout patterns and templates for wireframes',
    description: 'Common layout patterns and templates for wireframes',
    mimeType: 'text/markdown',
  },
  {
    uri: 'wireweave://ux-rules',
    name: 'UX validation rules and best practices for wireframe design',
    description: 'UX validation rules and best practices for wireframe design',
    mimeType: 'text/markdown',
  },
]

// Map resource URIs to tool feature_keys for fetching content
export const resourceToTool: Record<string, string> = {
  'wireweave://grammar': 'wireweave_grammar',
  'wireweave://guide': 'wireweave_guide',
  'wireweave://examples': 'wireweave_examples',
  'wireweave://patterns': 'wireweave_patterns',
  'wireweave://ux-rules': 'wireweave_ux_rules',
}
