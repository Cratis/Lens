# Build and Side Load in Chrome

Use this tutorial to build Lens and load it as an unpacked Chrome extension.

## Prerequisites

- Node.js 20 or later
- Yarn
- Google Chrome

## 1. Install dependencies

From the repository root:

```bash
cd Source
yarn
```

## 2. Build the extension

Build the production bundle:

```bash
yarn build
```

This creates `Source/dist/`, including the generated `manifest.json`
and bundled assets.

## 3. Open the Chrome extensions page

1. Open `chrome://extensions`.
2. Enable **Developer mode**.

## 4. Side load the extension

1. Select **Load unpacked**.
2. Choose the `Source/dist` folder.

Chrome loads **Lens - Cratis Developer Tools** as an unpacked extension.

## 5. Reload after changes

If you change source files, rebuild and reload:

```bash
yarn build
```

Then use the **Reload** action for Lens on `chrome://extensions`.

For faster iteration during development, use
[Local Development](../LocalDevelopment/index.md) with watch mode.
