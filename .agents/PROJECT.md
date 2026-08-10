# Lens — Project-Specific Instructions

Project-local context for this repository. See `.claude/CLAUDE.md` for the shared Cratis corpus.

## What this repository is

Lens is a **browser extension** (Chrome/Edge/Firefox/Safari, Manifest V3), not a Cratis application and not
a Cratis framework library. Neither profile in the shared corpus fits it directly:

- There is **no .NET**, no Chronicle, no event sourcing, no vertical slices, no `[Command]`/`[ReadModel]`
  artifacts, and no proxy generation. Ignore those rules here.
- What **does** apply: the universal rules — TypeScript conventions, code quality, BDD specs, documentation,
  commits/PRs, and American English.

Everything is TypeScript + React + PrimeReact under `Source/`, built with Vite.

## Layout

| Folder | Holds |
| --- | --- |
| `Source/background/` | the MV3 service worker and the declarativeNetRequest header rules |
| `Source/shared/` | settings storage, request headers, Arc context detection, identity cookies |
| `Source/settings/`, `context/` | configuration UI and the active user/tenant picker |
| `Source/commands/`, `queries/` | the command and query explorers |
| `Source/observable-query-diagnostics/` | live observable-query diagnostics |
| `Source/testing/` | spec helpers — the chrome API stub and object builders |
| `Documentation/` | published docs (getting started, publishing) |

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

## Specs

Vitest + Mocha-style `describe`/`it` + Chai's `.should` fluent interface, in `for_<Subject>/when_<context>.ts`
folders next to the code. The environment is `node` — there is no DOM and no real `chrome` object, so specs
that touch extension APIs install the stub from `Source/testing/chromeStub.ts` and remove it in `afterEach`.

## Verifying extension behavior

The build output in `Source/dist/` is what you load — via `chrome://extensions/` → **Developer mode** →
**Load unpacked**. Things that only show up at runtime:

- The popup detects Arc by injecting a script into the page's **main world** and walking the React fiber
  tree for the `ArcContext` value. It cannot see anything from an isolated content-script world.
- Header injection is `declarativeNetRequest` **dynamic rules**, applied to `xmlhttprequest` requests only.
  Inspect them from the service worker console; a rule that was never installed looks identical to a rule
  that matched nothing.
- With **no** Arc host configured, Lens deliberately installs **no** rules at all. That is the fail-closed
  behavior, not a bug — `host_permissions` is `<all_urls>`, so a wildcard rule would attach impersonation
  headers to every site you browse.
- Settings live in `chrome.storage.local`. `storage.sync` caps one key at 8 KB, which a real Arc roster
  passes at around the seventh user, and every save past that is silently rejected.
- Changing the active user or tenant also clears the Arc `.cratis-identity` cookie and reloads matching
  tabs. Headers alone don't change identity once Arc has issued a session cookie.
