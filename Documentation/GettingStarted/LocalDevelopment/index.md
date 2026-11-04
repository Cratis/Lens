# Local Development

To use Cratis Lens with your local Arc application, first build and load the extension. Then open its popup from the application's tab so Lens can look for Arc context on that page.

## Prerequisites

- Node.js 20 or later
- Yarn
- Chrome or another Chromium-based browser
- A running Arc application on your machine

For tenant selection, this tutorial assumes your application reads the header Lens uses by default, `x-cratis-tenant-id`. Lens does not expose a tenant-header-name control in the popup.

## 1. Install dependencies

The extension package lives in `Source/`, so start at the repository root and move into that directory to install its dependencies:

```bash
cd Source
yarn
```

When Yarn finishes without errors, keep this terminal in `Source/` for the build.

## 2. Build the extension

Build the bundle that Chrome will load as an unpacked extension:

```bash
yarn build
```

The build writes `Source/dist/`, including `manifest.json`. Load this directory in the next step; the build does not install the extension in Chrome.

## 3. Load Lens in your browser

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `Source/dist` folder from this repository.

The **Cratis Lens** extension should now appear in
your extension list.

## 4. Open Lens on an Arc application page

1. Navigate to your Arc application in Chrome.
2. Open the Lens extension popup once on that page so Lens can detect Arc context.
3. Open the **Settings** tab in the popup to view the user and tenant lists.

Lens looks for Arc context on the active page. When detection succeeds, the Commands and Queries views use that context's base URL, so open the popup from the application tab you want to inspect.

Continue with [Tenants and Users](../TenantsAndUsers/index.md) to inspect the roster and choose a user or tenant. The remaining section is optional, for changes to Lens itself.

## 5. Use watch mode while developing

If you are editing Lens source, run the watcher in `Source/` instead of repeating the build command after each change:

```bash
yarn dev
```

Vite rebuilds the extension when you change source files. Reload the
extension in `chrome://extensions` after each rebuild.
