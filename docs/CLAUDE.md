# Wireweave documentation contract

Publish the language 4.0.0 snapshot from `spec/LANGUAGE.md`, `spec/RUNTIME.md`, `spec/TOOLING.md`, `spec/language.ebnf`, `spec/schema.json` and `spec/examples.json`. Their ownership and precedence are defined in LANGUAGE §1. The site does not maintain an alternative grammar, prompt-derived specification, pricing table or server API authority.

The public entry is `index.md`; `.vitepress/config.ts` owns navigation, local search, grammar-aware highlighting and stable machine-artifact downloads. Search and rendering must work without analytics, account credentials, remote grammar discovery or LLM calls. Navigation names and links come from the same contract snapshot. No locale switch may claim a translation that is not published and verified against that snapshot.

Keep stable operational commands in the repository README and tool behavior in TOOLING. Do not copy them into package rules. Generated TextMate/catalog outputs are produced through their registered generators; schema-derived highlighting additions do not change parser semantics. Source/dist freshness is checked before syntax generation.

For a documentation change, validate schema fixtures, typecheck/lint the documentation workspace, build the public site, inspect every canonical navigation/download link and confirm local search excludes unpublished content. The standard commands are listed in the repository README. Build output is `.vitepress/dist` and is not source authority.

`@wireweave/docs` is a private workspace package. Its public domain is `docs.wireweave.org`; website deployment and npm package publication are distinct operations. Changesets does not publish the docs package. Do not commit, push, publish or change work governance without the task owner's authorization.
