---
applyTo: "**/*"
---

## What this repository is

Lens is a **browser extension** (Chrome/Edge/Firefox/Safari, Manifest V3), not a Cratis application and not
a Cratis framework library. Neither profile in the shared corpus fits it directly:

- There is **no .NET**, no Chronicle, no event sourcing, no vertical slices, no `[Command]`/`[ReadModel]`
  artifacts, and no proxy generation. Ignore those rules here.
- What **does** apply: the universal rules — TypeScript conventions, code quality, BDD specs, documentation,
  commits/PRs, and American English.

Everything is TypeScript + React + PrimeReact under `Source/`, built with Vite.
