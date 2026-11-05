# Local Development

Use this tutorial to run Lens locally and connect it to your Arc backend.

## Prerequisites

- Node.js 22.12 or later, or 20.19 or later on Node.js 20
- Yarn
- Chrome or another Chromium-based browser
- A running Arc application on your machine

## 1. Install dependencies

From the repository root, install dependencies for the extension:

```bash
cd Source
yarn
```

Yarn should install all dependencies without errors.

## 2. Build the extension

Build the extension bundle:

```bash
yarn build
```

This generates `Source/dist/`, including `manifest.json`.

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
3. Select the **Settings** tab (gear icon) in the popup.
4. Use the **Users** and **Tenants** tabs to review the available users and tenants.

Lens now uses the detected Arc context and current page location for
command and query introspection.

## 5. Use watch mode while developing

Run this in `Source/` during active development:

```bash
yarn dev
```

Vite rebuilds the extension when you change source files. Reload the
extension in `chrome://extensions` after each rebuild.
