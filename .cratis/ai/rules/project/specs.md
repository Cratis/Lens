---
applyTo: "**/*"
---

## Specs

Vitest + Mocha-style `describe`/`it` + Chai's `.should` fluent interface, in `for_<Subject>/when_<context>.ts`
folders next to the code. The environment is `node` — there is no DOM and no real `chrome` object, so specs
that touch extension APIs install the stub from `Source/testing/chromeStub.ts` and remove it in `afterEach`.
