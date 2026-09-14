# @wireweave/sdk

The platform client for Wireweave — a typed HTTP client, token-based auth, and an in-process local tool runner, all behind a single `dispatch()` entry point.

## What it does

`@wireweave/sdk` is the contract owner shared by the Wireweave CLI, MCP server, and skill packages. It exposes one tool-dispatch surface that routes each call to the right place:

- **Local tools** run in-process via `@wireweave/core`, `@wireweave/ux-rules`, and `@wireweave/language-data`. No network call, no API key required.
- **Remote tools** are proxied to the Wireweave API server (`api-server`) over HTTP. These require an API key (cloud project/wireframe storage, account & billing, hosted reference content such as the grammar and LLM guide).

Tool schemas, behavioral annotations and routing are generated offline from this package's public `src/tool-catalog.json`. Both SDK and MCP consume the same catalog. Dispatch validates arguments before local execution or network access.

Local dispatch tools:

`wireweave_parse` · `wireweave_validate` · `wireweave_render_html_code` · `wireweave_validate_ux` · `wireweave_diff` · `wireweave_analyze` · `wireweave_list_components` · `wireweave_export_json` · `wireweave_export_figma`

## Install

```bash
npm install @wireweave/sdk
```

Requires Node.js >=22.13.0.

## Usage

```ts
import { dispatch, toolEndpoints, type ApiConfig } from '@wireweave/sdk'

const apiConfig: ApiConfig = {
  apiUrl: 'https://api.wireweave.org',
  apiKey: process.env.WIREWEAVE_API_KEY ?? '', // empty is fine for local tools
}

const source = 'page "Home" { text "Hello" }'

// Local tool — runs in-process, no network, no key needed.
const parsed = await dispatch(
  'wireweave_parse',
  { source },
  { apiConfig, endpoints: toolEndpoints },
)

// Remote tool — proxied to api-server, requires a valid apiKey.
const saved = await dispatch(
  'wireweave_cloud_save_wireframe',
  { name: 'Home', code: source },
  { apiConfig, endpoints: toolEndpoints },
)
```

Pass `DispatchOptions.signal` to cancel pending work. Remote calls send the API key as `x-api-key` only to the configured API URL, reject redirects and time out after 30 seconds. Cloud saving/updating transmits supplied source and metadata; local failures never fall back to remote calls. See the [credential and data-flow guide](https://github.com/wireweave/wireweave/tree/main/packages/mcp-server#http-and-credentials) and [Privacy Policy](https://www.wireweave.org/privacy).

Run a local tool directly, bypassing dispatch:

```ts
import { localDispatch, isLocalDispatchTool } from '@wireweave/sdk'

if (isLocalDispatchTool('wireweave_diff')) {
  const result = localDispatch('wireweave_diff', { oldSource, newSource })
}
```

Authentication helpers persist a token at `~/.wireweave/config.json` (`0600`):

```ts
import { saveToken, loadToken, verifyToken, clearToken } from '@wireweave/sdk'

const check = await verifyToken(token, 'https://api.wireweave.org', '/verify')
if (check.valid) await saveToken({ token })

const stored = await loadToken() // { token, apiUrl? } | null
await clearToken()
```

## API

| Export                                                                     | Description                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispatch(name, args, options)`                                            | Single entry point. Routes local tools to `localDispatch`, remote tools to `callApi`.                                                                                                                   |
| `localDispatch(name, args)`                                                | Runs a local tool in-process (parse, validate, render, diff, analyze, export, etc.).                                                                                                                    |
| `isLocalDispatchTool(name)`                                                | `true` if the tool is dispatched locally.                                                                                                                                                               |
| `LOCAL_DISPATCH_TOOL_NAMES`                                                | `ReadonlySet<string>` of local tool names.                                                                                                                                                              |
| `callApi(config, endpoint, args, fetchFn?, signal?)`                       | Low-level HTTP call with bounded lifetime and cancellation.                                                                                                                                             |
| `buildRequest(config, endpoint, args?)`                                    | Builds the URL and `RequestInit` for an endpoint (path params, query, body).                                                                                                                            |
| `extractCreditInfo(headers)` / `parseErrorMessage(status, body)`           | Credit-header parsing and HTTP-status-to-message mapping.                                                                                                                                               |
| `loadToken` / `saveToken` / `clearToken` / `verifyToken` / `getConfigPath` | Token persistence and verification.                                                                                                                                                                     |
| `tools` / `toolEndpoints` / `localToolNames`                               | Generated, fully annotated definitions and dispatch mappings from the public catalog.                                                                                                                   |
| Types                                                                      | `ApiConfig`, `ApiResult`, `ApiErrorBody`, `HttpMethod`, `ToolEndpoint`, `CreditInfo`, `LocalToolResult`, `LocalToolContentBlock`, `DispatchOptions`, `AuthOptions`, `StoredConfig`, `VerifyTokenResult` |

Part of the [Wireweave monorepo](https://github.com/wireweave/wireweave).

## License

MIT
