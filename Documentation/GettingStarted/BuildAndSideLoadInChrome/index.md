# Build and Side Load in Chrome

Build Lens from this repository and load the generated directory into Chrome. You will then open the popup to check that the extension is available, before connecting it to an Arc application.

## Prerequisites

- Node.js 20 or later
- Yarn
- Google Chrome

## 1. Install dependencies

The extension package lives in the Source directory. From the repository root, move into that directory and install its dependencies:

```bash
cd Source
yarn
```

## 2. Build the extension

After dependency installation finishes without errors, keep the terminal in the Source directory for the remaining commands. Build the bundle Chrome will load:

```bash
yarn build
```

The build writes `Source/dist/`, including the generated `manifest.json` and bundled assets. Choose this generated directory in Chrome, not the source files or a release package. If the manifest is missing, return to the terminal and check that the build completed before trying to load the directory.

## 3. Open the Chrome extensions page

Building Lens does not install it in Chrome. Use Chrome's unpacked-extension flow to load the generated directory:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.

Keep this page available for the reload step below.

## 4. Side load the extension

1. Select **Load unpacked**.
2. Choose the `Source/dist` folder.

Chrome should list **Cratis Lens** as an unpacked extension. Open its popup from Chrome's extension toolbar and look for the **Lens** heading with **Context** and **Settings** in the navigation.

## 5. Reload after changes

When you edit Lens source, rebuild the generated directory first. Chrome still needs a separate Reload action to use that build:

```bash
yarn build
```

Then use the **Reload** action for Lens on `chrome://extensions` and reopen the popup to inspect your change. If the popup still appears unchanged, check that the rebuild completed and that you reloaded the entry loaded from the generated directory in step 2.

For watch mode or to connect Lens to a running Arc application, continue with
[Local Development](../LocalDevelopment/index.md). If Commands or Queries is disabled in the popup, follow that guide to open Lens on the application tab: those views depend on page detection, which loading the extension alone does not establish.
