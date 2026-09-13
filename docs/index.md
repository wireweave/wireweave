---
layout: home
hero:
  name: Wireweave
  text: A language for UI structure and behavior
  tagline: Language 4.0 · Deterministic parsing · Reusable screens · Neutral executable HTML
  image:
    src: /logo.svg
    alt: Wireweave
  actions:
    - theme: brand
      text: Read the language
      link: /spec/LANGUAGE
    - theme: alt
      text: Runtime and HTML
      link: /spec/RUNTIME
    - theme: alt
      text: Use the tools
      link: /spec/TOOLING
features:
  - title: One semantic model
    details: Screen identity, shared structure, typed state, routes and operations drive each output.
  - title: Independent authoring
    details: People, scripts and agents use Core locally without an account or hosted generation service.
  - title: Explicit execution
    details: Native browser behavior, fixture simulation and implementation obligations have distinct contracts.
  - title: Checkable artifacts
    details: Grammar, JSON Schema, examples, source maps and deterministic traces make the contract inspectable.
---

The English language contract is the authoritative source. 한국어·日本語로 작성한 화면 이름과 콘텐츠도 Unicode 문자열로 보존합니다. UI labels and content may use any supported Unicode text; identifiers follow the language's explicit identifier grammar.

Download the [formal grammar](/spec/language.ebnf), [canonical JSON Schema](/spec/schema.json), and [positive and negative examples](/spec/examples.json). The documentation search runs locally in the browser and sends no queries or visitor events to an analytics service.
