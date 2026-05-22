# Local Development

Use this tutorial to run Lens locally and connect it to your Arc backend.

## Prerequisites

- Node.js 20 or later
- npm
- Chrome or another Chromium-based browser
- A running Arc application on your machine

## 1. Install dependencies

From the repository root, install dependencies for the extension:

```bash
cd Source
npm ci
```

You should see `added ... packages` with no install errors.

## 2. Build the extension

Build the extension bundle:

```bash
npm run build
```

This generates `Source/dist/`, including `manifest.json`.

## 3. Load Lens in your browser

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `Source/dist` folder from this repository.

The **Lens - Cratis Developer Tools** extension should now appear in your extension list.

## 4. Set up Arc connection

1. Open the extension options page from the extension details.
2. Set **Arc Base URL** to your local Arc host, for example `http://localhost:5000`.
3. Keep the default **Tenant Header Name** unless your app expects a different header.
4. Select **Save Settings**.

Lens can now fetch command and query introspection metadata from your Arc application.

## 5. Use watch mode while developing

Run this in `Source/` during active development:

```bash
npm run dev
```

Vite rebuilds the extension when you change source files. Reload the extension in `chrome://extensions` after each rebuild.

