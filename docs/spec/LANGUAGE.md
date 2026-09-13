# Wireweave language

Contract: `core/language`. Language version: `4.0.0`. Schema version: `1.0.0`.

## 1. Authority and scope

[language.ebnf](language.ebnf) owns lexical and syntactic productions. [schema.json](schema.json) owns the canonical JSON shape and value domains. This document owns normalization, ownership, reference resolution and static meaning. [RUNTIME.md](RUNTIME.md) owns execution and output. [TOOLING.md](TOOLING.md) owns public calls and adapters. [examples.json](examples.json) supplies positive and negative contract fixtures. A conforming language release satisfies all five contracts; successful JSON validation alone does not establish language validity.

Core is a deterministic language engine. People, scripts and agents use the same language without a harness, account, server, Git repository or external product-definition system. The Wireweave binding owns interviews, scenario coverage, generation order and UX decisions under `contract:harness/wireweave`. Core owns syntax, reusable structure, linking, typed state and operations, neutral rendering and source maps. Import resolution consumes caller-supplied bytes; Core does not fetch dependencies, invoke providers or write project files.

The language describes low-fidelity UI and its observable behavior. Brand styling is not its authority. Semantic control types, hierarchy, layout, states, focus, navigation, error handling and implementation obligations are preserved. A static fragment, executable app and implementation-ready project have different acceptance scopes.

## 2. Lexical contract and canonical text

Files use `.wf` or `.wireframe`; both denote the same UTF-8 language. One leading UTF-8 BOM is accepted and removed from canonical text. Invalid UTF-8 and lone Unicode surrogates are errors. String content is not Unicode-normalized. CRLF and CR outside strings normalize to LF. `//` and non-nesting `/* ... */` comments are accepted; an unterminated comment is an error.

Identifiers and namespaces match `[A-Za-z_][A-Za-z0-9_-]*`, at most 128 characters, case sensitive. Keywords cannot be definition identifiers. Human labels are Unicode strings and never identifiers. Numeric values are finite IEEE 754 doubles; integers used as counts or indices are safe integers. `NaN`, infinity, arithmetic overflow and duplicate object/attribute keys are errors. Numbers support a leading minus, decimal part and exponent. Negative zero canonicalizes to zero. Unquoted enum words such as `primary` and `2xl` are strings; quoted strings support the escapes in the EBNF. Longest complete token wins. Equal-length lexical matches use string → unit-value → number → boolean/null → bare-word precedence. Thus `1e3` is number 1000, `2xl` is string "2xl", `2em` is unit "2em", and `true` is boolean true; quoted forms are strings. Adjacent array/object entries without commas are accepted only at complete token boundaries.

The canonical printer uses LF, two-space indentation, double-quoted strings with JSON escaping, comma-separated collections, one leaf per line, a final newline and attribute keys in UTF-16 lexical order. It prints explicit `=true`, normalized structured handlers and explicit component arguments. Definition, child, row, operation and fixture-step order is preserved. Empty optional blocks print `{}`. Source locations and digests are metadata, not DSL attributes. Ordinary comments are non-semantic trivia and omitted by the canonical printer; lossless editor edits preserve source text separately. Product requirements cannot depend on trivia.

`parse(print(document))` preserves semantic AST content, explicit IDs, registry entries, operation order and references. Source spans, raw byte digests and non-semantic trivia are excluded from that equivalence. Reprinting canonical text is byte-identical. Semantic equality never treats array reordering, missing values and explicit null as interchangeable.

## 3. Document, module and bundle

A document has an optional `language "4.0.0"` header and one app, one module, or top-level page/layout/component definitions. Omitting the header selects language 4.0.0; adapters pass the version explicitly when opening a versioned artifact. Unsupported major versions are errors.

```wireframe
app catalog entry={namespace=main,id=home} {
  module main namespace=main {
    page "Home" id=home viewport="1440x900" {
      title "Catalog" level=1
      link "Settings" id=settingsLink navigate=settings
    }
    page "Settings" id=settings viewport="1440x900" {
      link "Home" id=homeLink navigate=home
    }
  }
}
```

An app accepts `entry`, `profile`, `states`, `registry` and `fixtures`. Its body contains modules only. An absent profile expands to `{id:neutral-app,width:1440,height:900,language:en,entryPolicy:explicit,unknownRoute:error-view,clockStartMs:0,limits:standard-1,unicodeVersion:"15.1.0",assets:[]}`. States and fixtures default to empty arrays. Registry defaults to empty entries and their computed digest. App entry is required and never inferred from a title, canvas order or first successful screen.

Bare definitions normalize to one module named `main` in namespace `main`, with no imports and no explicit exports. A module document has the same default app metadata but does not imply an executable entry. A fragment can contain anonymous pages; each gets a source-local inspection address. Strict app linking requires an explicit page ID and an explicit ID on every addressed control, overlay, form and reusable-component invocation. Inspection addresses are not durable product identities.

A canonical `AppBundle` contains `schemaVersion`, `languageVersion`, `id`, `entry`, `profile`, `states`, `modules`, `registry` and `fixtures`. `Module` contains `id`, `namespace`, `sourceDigest`, `imports`, `exports` and `definitions`. Each module source digest hashes its original UTF-8 module declaration from the module keyword through its closing brace, excluding surrounding whitespace. For a bare-definition source it hashes the entire original file. This makes inline modules independently addressable without digest self-reference; the containing file retains a separate source-artifact digest. All IDs within a declaration kind and namespace must be unique. Duplicate IDs are rejected even when bodies are equal. App/global IDs, module IDs and product UUIDs occupy distinct typed domains.

`AppConfiguration` owns the shared shape of id, entry, profile, states and fixtures. AppBundle contains those fields plus explicit language/schema versions, modules and registry. A product project stores one application configuration and its ordered module IDs, then derives AppBundle from that configuration, fixed module bytes and the same registry; a second independently editable bundle is not another authority.

The pure parser returns a `ParsedDocument`; bundle construction supplies the chosen entry and profile before linking. JSON defaults are materialized by this normalization, not by a JSON Schema validator. Omitting a required canonical field is invalid.

## 4. Canonical node mapping

The canonical tree uses `kind`, optional `id`, optional `label`/`number`/`items`, `attributes` and `children`. Positional UI text becomes `label`; the original spelling is retained by source maps. Positional image source becomes `attributes.src`, avatar/icon text becomes `attributes.name`, and a numbered marker or annotation item uses `number`. `id=` becomes `Node.id` and is not duplicated in `attributes`. An equal duplicate positional/attribute value is still a duplicate declaration error.

A definition has `kind:layout|component`, `id`, `parameters`, `attributes`, `children`. `use` has `id`, `name`, optional imported `namespace`, typed `inputs` and named `fills`. `slot` has an optional name; `repeat` has a count and children. Template attributes may contain whole-string parameter references; they are checked symbolically against declared parameter types and against the ordinary node schema after substitution. No template can inject a new keyword, property key, identifier or source text.

Collection normalization is explicit:

| Source construct                                  | Canonical meaning                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `table [[headers],[row1],[row2]]`                 | `attributes.columns=headers`, `items=[row1,row2]`; block `columns [...] row [...]` is equivalent    |
| `select "Country" ["KR","JP"]` or `options=[...]` | `attributes.options=[{label,value},...]`; option blocks map to the same array                       |
| `list ["a","b"]`                                  | ordered children of kind `list-item`; nested `item` blocks preserve the hierarchy                   |
| `nav [...]` / block `item`, `group`, `divider`    | children `nav-item`, `nav-group`, `divider`; scalar entries are labels with no invented destination |
| `dropdown [...]` / block `item`, `divider`        | children `dropdown-item` and `divider`; scalar `---`, `-`, `divider` denote separators only here    |
| `tabs [labels] { tab ... }`                       | children of kind `tab`; if labels and blocks coexist, their labels and count must match             |
| `breadcrumb [...]`                                | ordered `nav-item` children; last item is the current location; earlier destinations are explicit   |
| `annotations { item N "Title" { ... } }`          | `annotation-item` children; marker numbers have scope within the page, not application identity     |

Array item objects accept the same label/value/attribute data as their corresponding block item. Array and block bodies cannot independently define competing children. Tables require exactly one column list, rows with equal width and scalar cells. Typed data binding can supply table rows or list entries; inline items and `data` cannot both be present. Bound table data is a list of records: each column string names one own field, and every row must supply a scalar value for every column. Bound list data is a list of scalar values rendered as item text; objects require an explicitly authored presentation component. Missing fields and unsupported item types are validation errors, never `[object Object]` output.

## 5. Imports, reuse and identity

The `imported-shell-component` fixture in [examples.json](examples.json) is the complete source/AST example for imported layout, typed component arguments and named slot fill. Its import digest is calculated from the included module bytes.

Import `from` names a module ID in the supplied input set, not an HTTP URL or filesystem path. Its digest must equal that module's source digest. The import namespace is a lexical alias, unique within the importer. An imported symbol must appear in the target module's explicit exports. `export component Summary;` exports the local definition. Page exports allow cross-module routing. Wildcards, implicit re-exports and namespace merging are not supported. Unknown or ambiguous symbols error; local lookup never falls back to display text or another module. All module imports are checked for cycles before expansion; cycles are errors, even if a particular render does not traverse them.

Layout `uses=layoutId` resolves locally; `uses="alias::layoutId"` resolves through an import. Layouts have exactly one unnamed slot and no named slots. A page's body fills that slot; a page without `uses` supplies its own frame. Layout definitions do not create screens. Layout nesting through `uses` is disallowed. Layouts can use components.

Components have zero or more typed parameters and uniquely named slots. Whole-string `"$name"` references substitute the complete typed value; `"a $name b"` remains literal text. `"$$name"` represents literal `$name` in a template. Missing required arguments, unknown arguments, incompatible values, undeclared parameter references and duplicate/unknown fills are errors. Parameter defaults are validated before use. Omitted fills produce empty content. Filled content retains its caller's lexical declaration owner and state scope; placing it inside a component does not expose that component's private state. A named slot is declared once and filled once. Slots outside layouts/components and fills outside uses are errors. Bare `slot` is terminated by a semicolon, line ending or containing closing brace; it does not consume the next child keyword.

Component invocation inputs are immutable compile-time values. A nested use can pass its enclosing parameter as a whole-value reference; expansion resolves the outer binding before the inner binding. Canonical use inputs contain only literal or param expressions; state, event, read and call expressions are invalid in that position. Runtime state is not a compile-time parameter. Use bindings with local component state for mutable values. Recursion is diagnosed before copying component bodies. `repeat N` makes N ordered instances of the same body, does not expose an index variable, and counts against expansion limits before allocation. `repeat N id=name` names that expansion site; strict apps require the ID, while fragments may use source-local inspection addresses.

Linked identity is `{namespace,definitionKind,definitionId,instanceRoot,instancePath,localId}`, as defined by LinkedIdentity in the schema. The namespace/definition fields name the lexical declaration owner. instanceRoot is `{kind:screen,namespace,id}` or `{kind:shell,namespace,id,profileDigest}` for the retained layout. instancePath is the ordered root-to-rendered-instance expansion path of `{kind:use,id}` and `{kind:repeat,id,index}` steps, using explicit site IDs and zero-based repeat indices. Ordinary, non-repeated root page/layout elements have an empty path. Component bodies and caller-authored fills include the invocation's use step; repeated content includes every containing repeat step, including repeats around a slot placement. A filled control can therefore have a page/layout lexical owner and a path containing use steps. The resolver verifies declaration ownership and expansion placement together. Definition, variant and state addresses for the page/layout itself have an empty path. Identically named uses in different screens and different repeat sites cannot collide. Screen state variants and canvas positions do not rename a logical screen or control. Rendering a control in multiple boards produces distinct rendered-instance IDs that refer to the same logical control. A shared layout instance is identified by layout ID plus viewport profile; it is emitted once per compatible app profile.

Product `LocalRef`/`ArtifactRef` and UUID identity remain owned by `contract:product/contracts`. A source binding maps product identities to Core module/screen/state/element/operation IDs. Internal reference cycles in that product graph are valid; module-import or component-expansion cycles are not.

## 6. Complete component vocabulary

Primitive spelling is lowercase. The schema's `x-vocabulary` is the element-aware completion/catalog surface; contextual item kinds are not additional top-level keywords. Every component takes the documented box/accessibility/requirement attributes unless its semantic scope explicitly excludes one. Styling a control does not add an event or destination.

| Family        | Elements                                                                         | Meaning and allowed content                                                                                |
| ------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Structure     | `page`, `layout`, `component`, `use`, `fill`, `slot`, `repeat`                   | Declarations/reuse under §§3–5; layout/component/fill are not extra screens                                |
| Landmarks     | `header`, `main`, `footer`, `sidebar`, `section`                                 | Nested ordinary content; header/footer/nav belong to the authored product, not editor chrome               |
| Layout        | `row`, `col`, `stack`, `relative`                                                | Horizontal flex, flexible vertical/grid column, content-height vertical stack, positioned containing block |
| Grouping      | `card`, `modal`, `drawer`, `accordion`, `popover`, `form`                        | Ordinary children; form cannot contain form; modal semantics and lifecycle are runtime-owned               |
| Text          | `text`, `title`, `link`                                                          | Text-only leaves; title rank 1–6; link has explicit destination or an explicit specified obligation        |
| Controls      | `input`, `textarea`, `select`, `checkbox`, `radio`, `switch`, `slider`, `button` | Native value, selection and activation semantics; select accepts options, other controls are leaves        |
| Display       | `image`, `placeholder`, `avatar`, `badge`, `icon`, `divider`                     | Image/text placeholders retain accessible meaning; placeholder may contain content                         |
| Data          | `table`, `columns`, `row`, `list`, contextual `item`                             | Table rows are data, not flex row nodes; list item nesting is explicit                                     |
| Feedback      | `alert`, `toast`, `progress`, `spinner`                                          | State communicated in text/semantics; a spinner is pending presentation, not evidence of work              |
| Overlays      | `tooltip`, `popover`, `dropdown`, contextual `item`, `divider`                   | Tooltip has one trigger child; dropdown has an explicit accessible label and menu items                    |
| Navigation    | `nav`, contextual `group`/`item`, `tabs`, contextual `tab`, `breadcrumb`         | Semantic navigation and selection; no label-based routing                                                  |
| Documentation | `marker`, `annotations`, numbered `item`                                         | Numbered explanation and references to registry requirements; not executable product controls              |

Only page nodes occur as screens; header and main cannot masquerade as independently routable screens. A linked screen has exactly one main landmark, either authored explicitly, from its shell slot wrapper, or supplied as a main wrapper around a page body without an authored main, and landmarks have accessible names when repeated. Generic layout containers must not acquire button semantics merely because they contain a button. An interactive card with interactive descendants is rejected; its primary action must be an explicit child control.

## 7. Attribute domains and precedence

`schema.json#/$defs/Attributes` is the complete type catalog. Its element restrictions and this section are both mandatory. Unknown attributes are errors in strict compilation. The parser retains them only in an error-recovery tree marked invalid. Bare flags are limited to the EBNF list; a value cannot be inferred from a misspelled flag.

Box spacing `p px py pt pr pb pl m mx my mt mr mb ml gap` uses the numeric tokens `0:0,1:4,2:8,3:12,4:16,5:20,6:24,8:32,10:40,12:48,16:64,20:80` CSS pixels. Other finite numbers mean that many pixels. Explicit `px`, `%`, `em`, `rem`, `vh`, `vw` units bypass the token table. Padding/gap cannot be negative; margin can. `auto` is accepted only for `mx`. Side overrides axis, axis overrides all-sides, regardless of source ordering. Units `vh`/`vw` refer to the authored fixed viewport; `rem` uses the 16px neutral root, `em` uses the parent's computed font size and `%` uses the containing block dimension. Indefinite percentage-height dependencies and min/max inversions are errors.

Numeric dimensions `w h minW maxW minH maxH` mean pixels. `w/h=full` means the containing block; `screen` means the profile dimension; `auto` means intrinsic size; `w=fit` means fit-content. Bounds accept finite numeric/unit values, never keywords. Page `width/height` are positive integers. `x/y` mean page canvas coordinates or offsets within a `relative` ancestor. `at(x,y)` normalizes to both; duplicate `at` and `x/y` declarations error. Anchors use the nine named positions; offsets are applied after anchor alignment.

A `viewport` string is `WIDTHxHEIGHT` or `WIDTH` in decimal integers; numeric viewport is width. A width-only declaration uses height 900. Every dimension is 1–16384 CSS pixels. The `device` names are stable Wireweave presets, not a claim about physical device pixels:

| Device            | Width × height |
| ----------------- | -------------: |
| desktop-sm        |     1280 × 800 |
| desktop           |     1440 × 900 |
| desktop-lg        |    1920 × 1080 |
| desktop-xl        |    2560 × 1440 |
| ipad              |     1024 × 768 |
| ipad-portrait     |     768 × 1024 |
| ipad-pro          |    1366 × 1024 |
| ipad-pro-portrait |    1024 × 1366 |
| iphone-se         |      375 × 667 |
| iphone14          |      390 × 844 |
| iphone14-pro      |      393 × 852 |
| iphone14-pro-max  |      430 × 932 |
| android           |      360 × 800 |
| android-lg        |      412 × 915 |

`row` defaults to row direction, `col`/`stack` to column; justify=start, align=stretch, wrap=false, gap=0. `col` grows into available space; `stack` remains content height. `flex=true` uses grow=1, false uses grow=0, and a number supplies nonnegative grow. Twelve-column `span` defaults to 12. `sm/md/lg/xl` override it at authored widths 576/768/992/1200px, choosing the largest applicable threshold once at compile time. Parent resizing never reselects a breakpoint. Grid width accounts for gaps: `(innerWidth - 11*gap) * span/12 + (span-1)*gap`. A row that wraps starts a new line before occupied spans exceed 12.

Text sizes xs/sm/base/md/lg/xl/2xl/3xl map to 12/14/16/16/18/20/24/30px; weight normal/medium/semibold/bold maps to 400/500/600/700. `bold=true` with a different weight errors. Heading default level=2; level controls semantics, size controls appearance. Text align allows left/center/right/justify/start/end; container align allows start/center/end/stretch/baseline. Numeric size is limited to icons, avatars and spinners. Button/control size xs/sm/md/lg/xl sets minimum block size 24/28/36/44/52px, never below the accessibility target; text wraps and grows the control.

`primary` and `secondary` are mutually exclusive emphasis. `outline` and `ghost` are mutually exclusive presentation. `danger` is independent destructive meaning. `variant` records status; incompatible duplicate emphasis/status declarations error. `color` on annotations retains category identity in data and labels even under monochrome output. `shadow`, `bg`, `border`, `rounded`, `pill`, `striped`, `bordered`, `hover`, `muted` are neutral presentation signals, not custom CSS. No attribute accepts arbitrary CSS text.

`inputType` selects native text/email/password/number/tel/url/search/date. `required`, `disabled`, `readonly` default false. `value` defaults to empty text, unchecked boolean or numeric min as appropriate. Slider defaults min=0, max=100, step=1; progress defaults max=100 and value=0. Values outside declared ranges error rather than clamp. Radio options in the same named group use unique scalar values and one bound group state. Select values must match a declared enabled option. `rows` defaults to 3. minLength/maxLength apply to Unicode code points, with min≤max; runtime provides equivalent validation beyond native UTF-16 checks.

`label`, positional text and `aria`/`aria-label` supply names; explicit accessible names override the visible label but include its visible text for speech control. Conflicting `aria` and `aria-label` values error. Placeholder is never a substitute for a label. `name` is a radio group, avatar label, control submission key or pinned icon name according to element kind. `src` is an explicit manifest asset or approved URL; boolean avatar `src=true` normalizes to a generated neutral avatar placeholder with no external request. `href` is a URL channel; `external=true` requests a new browsing context with opener isolation.

`active` is a zero-based index on tabs and boolean on a static nav item. App navigation derives active state from route identity; authored active=true must agree with the entry projection. `expanded` initializes a section/accordion. `vertical` affects nav/tabs/divider orientation. `scroll` creates an internal overflow region with keyboard access. `loading` exposes busy state and disables reactivation. `dismissible` adds an accessible dismiss control. Toasts do not disappear on an implicit wall-clock timer. `ordered` and `none` cannot both be true.

The executable extensions are `bind`, `form`, `buttonType`, `autocomplete`, `minLength`, `maxLength`, `initialFocus`, `modal`, `data`, `options`, `columns`, `requirementRefs`, `obligationRefs`, typed `on`, `visibleWhen`, `enabledWhen`, `states`, `variants`, and `when`. Full shapes and permitted element pairs are in the schema. A page is a board and cannot have visibleWhen/enabledWhen/when; put these on its content. Layout definition attributes are states and on (enter/exit handlers only); component definition attributes are states only. Component parameters are distinct from attributes.

## 8. State, expression and operation binding

State declarations have `id,type,initial,lifetime,sensitive`. Types are string, number, boolean, record, list. Record/list values are bounded JSON data with no functions or prototypes. `lifetime=mount` resets when the owning scope leaves; session retains until scenario reset. App scope is always session. Sensitive state is omitted from trace values and persistence. Scope references use `app:id`, `shell:id`, `screen:id`, `component:id`; a bare source name normalizes to the nearest declaration in component→screen→shell→app order. Canonical state references are explicit. Reading another screen's local state is prohibited; share an app state deliberately.

Expression is a tagged value: `{literal}`, `{state}`, `{event}`, `{read:{source,path}}`, or `{call,args}`. `{param:id}` is allowed only inside an unbound component template and becomes a literal before runtime. No implicit JavaScript evaluation or string interpolation occurs. `event` exposes only value/checked/key for an event that supplies it. Read paths access own JSON properties only; `__proto__`, `constructor`, `prototype` and missing paths error. Strings compare by Unicode code point order; equality is structural JSON equality without coercion. `eq/ne` accept all JSON values; order operators require both number or both string; contains/startsWith take strings, and in checks membership in a list. all/any evaluate left to right with short-circuiting; not takes one guard.

Expression calls are closed: length(1 string/list), lower/upper/trim(1 string), add/subtract/multiply/divide(2 numbers), concat(2–16 strings), coalesce(2–16 values, first non-null). Division by zero, bad arity and incompatible types are errors. lower/upper use locale-independent Unicode default case conversion; trim uses the release-pinned Unicode whitespace set. Profiles use Unicode 15.1.0 data for these operations; the runtime bundles the required mapping rather than inheriting a changing host locale. Expression recursion counts against AST depth.

Handlers have stable id, event, optional guard, ordered operations and concurrency=drop|queue. Handler IDs and operation IDs occupy separate domains; operation IDs are unique across all handlers of their owner so a source binding needs no implicit handler qualifier. key is required only for keydown. enter/exit attach to page/layout only; submit attaches to form; input/change attach to value controls; other event/element incompatibilities error. An exit handler permits only executable set/reset/toggle/filter/sort/close operations; simulation, specified effects, navigation and event dispatch from exit are WW_EVENT errors. State initializers cannot reference mutable state or events. Outcome guards may read state but cannot mutate it. Multiple handlers for the same element/event/key are rejected; combine effects under one handler. Runtime ordering and every effect are defined in `contract:core/runtime`.

Source shorthand `navigate=id` becomes one executable navigate operation with a resolved typed screen target. Explicit URLs use href or `{kind=url,url=...}`. `opens`/`toggles` become overlay operations. `action=back` and `action=close` map to navigateBack and close nearest overlay on an action control. `action=submit` is allowed only on button and normalizes to buttonType=submit plus its explicit or unique enclosing form ID; it creates no submit Effect. Native form submission dispatches the form handler after validation. Ambiguous/missing form and conflicting buttonType declarations error. Other action IDs are WW*REFERENCE errors; use an explicit typed on handler or specified operation. Handler names are not callable functions. Shorthand and typed on for the same event conflict. In a strict app, single-action shorthands require an explicit owner ID and receive handler ID `shorthand*<event>`and operation ID`primary\_<event>`; those IDs are scoped to that owner. They remain stable when unrelated nodes move. Equality guards `{state,equals}`normalize to typed eq;`effects` in a source handler normalize to operations with source-local IDs, executable class, after=[], onFailure=stop and obligationRefs=[]. Typed app handlers/operations use explicit IDs before acceptance; the shorthand-derived IDs above are the only implicit durable IDs.

## 9. Registry, source mapping and canonical bytes

Requirement and ImplementationObligation contents conform to `contract:product/contracts` and the product schema referenced by `RequirementRegistry`. They are defined once in registry.entries and addressed by UUIDv7. A Core-only app carries its own registry; controllers refer to its IDs. Studio import atomically incorporates the registry into the product model. Equal IDs with different content produce a conflict, never overwrite. A candidate export fixes candidate DSL and candidate registry together.

The registry envelope is the product schema Registry with schemaVersion, entries and digest. Core checks registry IDs, their requirement/obligation links and source bindings. Product validator owns references to Persona, Capability, Decision and other product graph nodes; Core does not invent these nodes or demand the full product graph for rendering. The registry digest is `sha256:` plus SHA-256 of UTF-8 [RFC 8785 JCS](https://www.rfc-editor.org/rfc/rfc8785) serialization of entries. Entries are a set sorted by `(kind,namespace,id)`; operation, source child, fixture-step and scenario-step arrays preserve order. JCS is adopted as this contract's serialization scheme, not described as an IETF Standards Track specification. Source artifact bytes use their original byte digest, not JCS or text normalization. Local references carry IDs; artifact-boundary references fix revision and digest. Hash inputs never recursively substitute target objects or include their own digest field.

Core returns mappings from logical node/operation IDs and rendered instance IDs to module ID, original UTF-16 code-unit half-open span, line/column (one-based) and registry references. UTF-8 byte digest and UTF-16 span units are distinct. Imported component output maps to both definition and invocation spans. A diagnostic on an expanded argument includes both locations. Source maps are deterministic and exclude developer-local absolute paths, secrets and arbitrary source contents.

<a id="validation-and-conformance"></a>

## 10. Validation and conformance

Validation runs parse → structural schema → import graph/cycle validation → symbol binding → template type checking and bounded expansion → viewport/state/route/operation/registry checks → immutable linked model. Compilation consumes only that linked model. All errors are collected up to the profile diagnostic limit, sorted by module input order, span start, phase and code. Truncation emits WW_DIAGNOSTIC_LIMIT with the omitted count; it does not change failure to success.

| Diagnostic family                                      | Rejection condition                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| WW_SYNTAX / WW_ENCODING / WW_DUPLICATE_KEY             | Invalid token/escape/UTF-8, duplicate attribute or record field                                                    |
| WW_SCHEMA / WW_UNKNOWN_ATTRIBUTE / WW_ATTRIBUTE_DOMAIN | Invalid canonical shape, unknown property, incompatible value or element pairing                                   |
| WW_DUPLICATE_ID / WW_IMPORT / WW_CYCLE / WW_REFERENCE  | Duplicate identity, missing/unexported/digest-mismatched import, cyclic expansion, wrong-kind or unresolved target |
| WW_PARAMETER / WW_SLOT / WW_LIMIT                      | Invalid parameter/fill, slot cardinality, input/expansion resource limit                                           |
| WW_STATE / WW_EVENT / WW_EFFECT / WW_GUARD             | Invalid state scope/type, event binding, effect class/dependency or guard                                          |
| WW_VIEWPORT / WW_ROUTE / WW_ACCESSIBILITY              | Incompatible frame, invalid entry/history target, invalid accessible control contract                              |
| WW_REGISTRY / WW_ASSET / WW_UNSUPPORTED_VERSION        | Registry digest/ref mismatch, invalid asset, unavailable required language/profile                                 |

No first-wins name resolution, title heuristics, silent resizing, unknown-action no-op or generated JavaScript recovery is permitted. Tolerant editor recovery returns an invalid partial syntax tree with diagnostics and cannot enter strict compile. A specified operation is valid when its obligation is complete; that does not prove the external function is implemented.

`examples.json.valid` must satisfy the canonical schema. `invalid` must be rejected structurally; `semanticInvalid` must pass shape checks and fail the named semantic rule. Conformance also checks every vocabulary member/attribute domain, parse-print equivalence, import collision/cycle, repeated instance identity, mixed effects, registry preservation and independent HTML behavior. Required examples are validated against source parser and linked output in an implementation conformance run; document-schema validation alone does not replace that run.
