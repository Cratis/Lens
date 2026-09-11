---
applyTo: "**/*"
---

## Toolchain

**Yarn Berry, pinned.** `Source/.yarnrc.yml` sets `yarnPath` to a release binary committed under
`Source/.yarn/releases/`. That binary must stay tracked — `.gitignore` ignores `**/.yarn/*` and only the
`!**/.yarn/releases` style un-ignore (with the `**/` prefix) reaches a nested path. Without it the release
file silently stops being committed and every `yarn` invocation in CI fails with `MODULE_NOT_FOUND`.

Run everything from `Source/`:

| Command | Does |
| --- | --- |
| `yarn install` | install dependencies |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn test` | the Vitest specs |
| `yarn build` | Vite build into `Source/dist/` |
| `yarn ci` | all three — the gate CI runs |

`yarn.lock` is **not** committed (the shared Cratis `.gitignore` ignores it). A stray `yarn.lock` at the
repository root makes Yarn treat the root as the project and fail from `Source/`; delete it if you hit that.
