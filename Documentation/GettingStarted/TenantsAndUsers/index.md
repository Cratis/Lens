# Tenants and Users

Lens lets you become any user and step into any tenant while you exercise a
running Arc application — no rebuild, no hand-crafted headers, no restarting
the app to switch context. This page explains where that roster comes from,
how Lens uses it, and what it looks like with real demo data.

## Where the roster comes from

Every Arc application already exposes two anonymous, development-only
discovery endpoints:

- `GET /.cratis/users`
- `GET /.cratis/tenants`

An Arc backend implements `ICanProvideUsers` and `ICanProvideTenants` (C#) —
or the equivalent `UsersProvider`/`TenantsProvider` (Kotlin) and
`AsyncUsersProvider`/`AsyncTenantsProvider` (Java) — to answer those
endpoints from wherever the application already keeps that list: a fixed
development set, a database, or a configuration section. Multiple providers
can be registered at once; Arc merges their results.

- C#: [Development users and
  tenants](https://github.com/Cratis/Arc/blob/main/Documentation/backend/csharp/identity/development-and-topologies.md)
- Kotlin and Java: [Development users and
  tenants](https://github.com/Cratis/Arc.Kotlin/blob/main/Documentation/guides/development-users-and-tenants.md)

When you open the Lens popup on a page Lens recognizes as an Arc application,
it fetches both endpoints and merges the result into its own roster (each
entry is tagged `Arc`). You can also add entries by hand from Lens itself —
those are tagged `Custom` and survive even when the backend's own list
changes or is temporarily unreachable.

## What it looks like

The screenshots below are the real extension, popped open against demo data:
three users and two tenants, all sourced from an Arc backend's providers,
exactly as `/.cratis/users` and `/.cratis/tenants` returned them.

### Context — the active user and tenant

![Lens Context tab showing the active user, Alice Developer, and the active
tenant, ACME Corporation](images/lens-context.png)

The **Context** tab is what you land on. It shows the currently active user
and tenant for this browser profile, and lets you switch either one from a
dropdown built from the merged roster.

### Settings — the roster, tagged by source

![Lens Settings tab, Users pane, listing Alice Developer, Bob Tester and
Priya Singh, each tagged Arc](images/lens-settings-users.png)

![Lens Settings tab, Tenants pane, listing ACME Corporation and Widget Inc,
each tagged Arc](images/lens-settings-tenants.png)

The **Settings** tab lists every known user and tenant, each carrying an
`Arc` or `Custom` badge so you can tell at a glance whether an entry came
from the backend's providers or was added locally. The green `Active` badge
marks the selection currently in effect. Use the eye icon to inspect the
full identity or tenant payload the backend returned, the `+` to add a
custom entry, and the refresh icon to re-fetch from the backend without
reopening the popup.

## Switching context

Selecting a different user or tenant on the **Context** tab takes effect
immediately: every subsequent request the inspected page makes carries the
matching tenant header and identity headers, so the backend's tenant
resolution and identity provider see the switch exactly as they would from a
real caller. See the [project README](../../../README.md) for how Lens
rewrites requests at the network boundary without any change to your
frontend code.

## Try it with demo data

To reproduce a roster like the one above against your own application:

1. Implement `ICanProvideUsers`/`ICanProvideTenants` (C#) or
   `UsersProvider`/`TenantsProvider` (Kotlin/Java) and return a handful of
   representative users and tenants — see the language-specific guides
   linked above for complete examples.
2. Run your application and open its page in Chrome with Lens installed (see
   [Local Development](../LocalDevelopment/index.md)).
3. Open the Lens popup once so Lens detects the Arc application, then check
   the **Settings** tab — your providers' users and tenants should already
   be listed, tagged `Arc`.
4. Switch the active user or tenant on the **Context** tab and confirm your
   backend sees the change (for example, through a query that reads the
   resolved tenant or identity).

No provider registered is not an error: both endpoints return an empty
array, and Lens simply shows no `Arc` entries until you add one or switch on
a custom entry of your own.
