# Tenants and Users

Use Lens to repeat a command or query as different users or tenants while developing a Cratis Arc application. With Lens loaded and your app open, choose a context, let the app reload, then check what the backend resolves before continuing your work.

## Where the roster comes from

Lens can import development rosters from two backend routes:

- `GET /.cratis/users`
- `GET /.cratis/tenants`

The backend controls whether those routes are mapped and who can read them. Under C# Arc's default discovery policy, access is anonymous in Development; elsewhere it requires authentication, or discovery is not mapped when the host cannot authenticate. JVM Arc marks the roster routes anonymous internally even in production; the application's Spring Security chain or ingress can still restrict access. Do not assume the same discovery policy across backends or releases.

The provider APIs are `ICanProvideUsers` and `ICanProvideTenants` for C#, `UsersProvider`/`TenantsProvider` for Kotlin, and `AsyncUsersProvider`/`AsyncTenantsProvider` for Java. Use the language-specific guide to supply representative development data. Those APIs do not establish that every backend returns the user shape Lens expects.

Lens requires a `MicrosoftIdentity` object in each discovered user. A JVM user response containing `principal` instead cannot be imported by this Lens mapper; an empty imported user list does not by itself mean the provider is missing. Check that response contract before trying roster refreshes.

- C#: [Development users and
  tenants](https://github.com/Cratis/Arc/blob/main/Documentation/backend/csharp/identity/development-and-topologies.md)
- Kotlin and Java: [Development users and
  tenants](https://github.com/Cratis/Arc.Kotlin/blob/main/Documentation/guides/development-users-and-tenants.md)

When you open the Lens popup on a page it recognizes as an Arc application, Lens fetches `/.cratis/users` and `/.cratis/tenants` and merges the results with entries you have added locally. Discovered entries carry an `Arc` badge. Locally added `Custom` entries survive backend roster refreshes, including a failed fetch or an empty response.

## Switching context

Before switching, check that your development host explicitly supports Lens's unsigned identity headers. C# Arc requires the `Cratis:Arc:TrustForwardedIdentityHeaders` opt-in. The JVM platform-identity bridge is also opt-in and denies ingress until the host supplies a trust policy. Lens cannot turn these headers into credentials. Do not weaken production authentication or trust arbitrary browser-supplied identity headers on an exposed host.

A saved change to either selection triggers a header-rule update, then clearing Arc's `.cratis-identity` cookie for the configured backend and page origins, then reloading open tabs at those origins. Matching tabs can reload even if they are not active: finish unsaved work in those app tabs before switching. Reloading discards the frontend's in-memory identity; confirm the newly resolved identity at the backend rather than treating cookie deletion as proof of a switch.

1. Open Lens on your development app and select **Context**.
2. Choose **Active user** and **Active tenant** from the merged roster.
3. Check the **User** and **Tenant** summary, and let matching app tabs reload.
4. Repeat your command or query and confirm that the backend resolves the intended user and tenant, for example through a query that reads the resolved identity or tenant.

Lens applies identity and tenant headers to matching XMLHttpRequest traffic. With an app page hostname available, the rules match that initiating hostname; otherwise they match the configured backend host. This is not a promise that every request carries the selected context. See the [project README](../../../README.md) for how Lens rewrites requests at the network boundary.

If Lens shows **Not saved**, read the error detail on that indicator and resolve the save failure before retrying. The displayed selection alone does not prove that it was persisted or that the backend accepted the context. If the context still appears unchanged after saving, confirm that Lens has detected the intended app and that its page or backend origin matches the tabs you expected to reload; only tabs at those configured origins are reloaded automatically.

## Try it with demo data

To try the switch against your own application:

1. Use the language-specific provider guide above to supply representative development users and tenants. Check that the returned users match Lens's `MicrosoftIdentity` contract before expecting an imported roster; adding a JVM provider does not change the incompatible `principal` shape.
2. Run your application and open its page in Chrome with Lens installed (see
   [Local Development](../LocalDevelopment/index.md)).
3. Open Lens so it detects the app, then check **Settings** for the discovered users and tenants marked `Arc`. If an entry is missing, use the refresh controls described below rather than assuming the provider is absent.
4. Return to **Context**, choose the user and tenant you want to try, and repeat the backend check above. Check both selections again after refreshing the roster, since a removed entry can change the active selection.

## What it looks like

Use the Context view to choose who and which tenant to work as; use Settings to inspect the available entries or add one locally.

### Context — the active user and tenant

![Lens Context tab showing the active user, Alice Developer, and the active
tenant, ACME Corporation](images/lens-context.png)

The **Context** tab shows the active user and tenant for this browser profile. Its dropdowns use the merged roster; the summary beneath them lets you check the current selection before repeating a task.

### Settings — the roster, tagged by source

![Lens Settings tab, Users pane, listing Alice Developer, Bob Tester and
Priya Singh, each tagged Arc](images/lens-settings-users.png)

![Lens Settings tab, Tenants pane, listing ACME Corporation and Widget Inc,
each tagged Arc](images/lens-settings-tenants.png)

In **Settings**, the `Arc` badge identifies a discovered entry, and the green `Active` badge marks the selected row. Arc entries are read-only in Lens: use the eye icon to inspect one. Use the `+` to add a custom entry; locally added entries can be edited or deleted without changing the backend's providers.

To fetch the backend roster again, keep your development app active and use the refresh icon beside **Users** or **Tenants**. A failed fetch keeps the previous Arc entries, so an unchanged list does not prove the refresh succeeded. A successful empty response removes those Arc entries; custom entries remain.

If the selected ID is no longer in the refreshed roster, Lens chooses the first remaining entry or leaves the selection empty when there are none. Return to **Context** and verify both selections before continuing: a roster refresh can change the context you are about to use.
