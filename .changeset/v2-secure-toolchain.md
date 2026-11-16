---
'@wireweave/core': patch
'@wireweave/language-data': patch
'@wireweave/ux-rules': patch
'@wireweave/agent-prompts': patch
'@wireweave/markdown-plugin': patch
'@wireweave/sdk': patch
'@wireweave/cli': patch
'@wireweave/mcp-server': patch
---

Use the tested Node.js 22.22.2 compatibility floor consistently across package engines, local tooling and installation guidance. Update vulnerable runtime and development dependency closures, including MCP SDK and its explicitly supplied patched Zod peer. Replace the abandoned, failing Packlint dependency with the existing strict packaging verifiers while retaining its command entry point.

Clean installed-package verification preserves the environment's proxy and certificate routing while keeping credentials, lifecycle execution and unrelated user configuration isolated. This changes installation compatibility and verification, not language semantics or release channels.
