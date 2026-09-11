---
applyTo: "**/*"
---

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
