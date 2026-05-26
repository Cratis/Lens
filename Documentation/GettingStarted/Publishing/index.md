# Publishing Setup

Use this guide to configure Lens so the Publish workflow can build and release the browser extensions.

## What the workflow does

The publish workflow in [.github/workflows/publish.yml](../../.github/workflows/publish.yml) does this:

1. Runs the release step through `cratis/release-action@v1`.
2. Builds the extension in `Source/` with Yarn on Node.js 23.
3. Uploads `Source/dist/` as the shared build artifact.
4. Publishes Chrome, Edge, Firefox, and Safari releases when the release is not marked as a prerelease.

Publishing can start in two ways:

- Manually through `workflow_dispatch`
- Automatically when a pull request is closed and changes under `Source/` are included

## Prerequisites

- GitHub repository admin access so you can add Actions secrets
- Accounts for each store you want to publish to
- Permission to publish GitHub releases from Actions
- A validated local build from `Source/` before you trigger a release

The workflow expects these local build commands to succeed:

```bash
cd Source
yarn
yarn build
```

## 1. Configure repository secrets

Open **GitHub repository settings > Secrets and variables > Actions** and add the secrets used by the workflow.

## 2. How to get the secrets

Use the sections below to collect the values before you add them as GitHub Actions secrets.

### Chrome Web Store

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

These are consumed by the `mnao305/chrome-extension-upload@v5.0.0` step.

How to get them:

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Google Cloud Console](https://console.cloud.google.com/)
- Create or open the extension item in the Chrome Web Store Developer Dashboard.
- Copy the extension ID from the dashboard or from the published item URL and store it as `CHROME_EXTENSION_ID`.
- In Google Cloud, create an OAuth client that is authorized to use the Chrome Web Store publish flow.
- Store that OAuth client ID as `CHROME_CLIENT_ID` and the client secret as `CHROME_CLIENT_SECRET`.
- Complete the OAuth consent flow once and exchange it for a refresh token for the publisher account.
- Store that long-lived token as `CHROME_REFRESH_TOKEN`.

### Microsoft Edge Add-ons

- `EDGE_PRODUCT_ID`
- `EDGE_CLIENT_ID`
- `EDGE_CLIENT_SECRET`
- `EDGE_ACCESS_TOKEN_URL`

These are consumed by the `wdzeng/edge-addon@v2` step.

How to get them:

- [Microsoft Partner Center](https://partner.microsoft.com/dashboard)
- [Microsoft Entra admin center](https://entra.microsoft.com/)
- Create or open the extension listing in the Microsoft Partner Center for Edge Add-ons.
- Copy the add-on product identifier and store it as `EDGE_PRODUCT_ID`.
- Register an application that can publish to the Edge Add-ons API for the tenant that owns the listing.
- Store that application's client ID as `EDGE_CLIENT_ID` and its client secret as `EDGE_CLIENT_SECRET`.
- Copy the tenant-specific OAuth token endpoint for that application and store it as `EDGE_ACCESS_TOKEN_URL`.

### Firefox Add-ons

- `FIREFOX_API_KEY`
- `FIREFOX_API_SECRET`

These are passed to `yarn dlx web-ext sign` for signing and
publishing the extension.

How to get them:

- [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
- Sign in to the Firefox Add-ons developer hub with the publisher account.
- Open the API credentials page for that account.
- Create a new API key pair with permission to manage the add-on.
- Store the key as `FIREFOX_API_KEY` and the secret as `FIREFOX_API_SECRET`.

### Safari

- `APPLE_SIGNING_IDENTITY`
- `APPLE_TEAM_ID`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER_ID`

These are used during the Safari conversion, archive, and export steps on `macos-latest`.

How to get them:

- [Apple Developer](https://developer.apple.com/account/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- Enroll in the Apple Developer Program for the team that will ship the Safari app extension.
- Create or locate the Apple signing certificate used to archive the macOS app and capture its signing identity string for `APPLE_SIGNING_IDENTITY`.
- Copy the Apple Developer Team ID and store it as `APPLE_TEAM_ID`.
- In App Store Connect, create an API key for the account that will upload the build.
- Store the API key identifier as `APPLE_API_KEY_ID` and the issuer identifier as `APPLE_API_ISSUER_ID`.
- Keep the matching `.p8` private key available to the runner environment as well.

The workflow currently passes the App Store Connect key ID and issuer ID to `xcodebuild`, but it does not create the private key file in the job. If Safari publishing is required, make sure the runner environment also provides the matching App Store Connect private key material in the way `xcodebuild` expects.

## 3. Secret acquisition checklist

Before the first publish, confirm you can answer all of these:

- Which store account owns the Chrome extension, and who can generate its OAuth refresh token?
- Which Microsoft tenant owns the Edge listing and its OAuth application?
- Which Firefox publisher account owns the AMO API key pair?
- Which Apple team owns the signing certificate, Team ID, API key, and private key material?
- Who will rotate these credentials when they expire or are revoked?

## 4. Verify release permissions

The workflow requests these GitHub permissions:

- `contents: write`
- `deployments: write`
- `id-token: write`

Make sure repository and organization settings allow GitHub Actions to use write permissions for releases.

## 5. Check the build environment

The build job uses:

- `ubuntu-latest` for release, build, Chrome, Edge, and Firefox
- `macos-latest` for Safari
- Node.js `23.x`
- Yarn in `Source/`

Before publishing, confirm that `Source/manifest.json` can safely have its version rewritten by the workflow and that `yarn build` produces a complete `Source/dist/` folder.

## 6. Understand artifact packaging

The build job uploads `Source/dist/` as an artifact named `extension-dist`.

The store-specific jobs then package that artifact like this:

- Chrome downloads to `dist/` and zips `dist/` into `extension-chrome.zip`
- Edge downloads to `dist/` and zips `dist/` into `extension-edge.zip`
- Firefox downloads to `Source/dist/` and signs the unpacked folder with `web-ext`
- Safari downloads to `Source/dist/` and converts that folder into an Xcode Safari extension project

This means publishing setup depends on the extension being fully buildable from `Source/dist/` alone.

## 7. Run a release

To publish manually:

1. Open the **Publish** workflow in GitHub Actions.
2. Select **Run workflow**.
3. Provide a `version`.
4. Provide `release-notes`.
5. Start the workflow.

If the release action decides the version should publish and it is not a prerelease, the browser store jobs will run automatically after the build job finishes.

## 8. Recommended setup checklist

- Add all required store secrets before the first release
- Validate `yarn build` locally from `Source/`
- Confirm store credentials have publish rights, not just read access
- Verify Safari signing assets are available to the macOS runner
- Test with a prerelease first if you want to verify the release step without publishing to stores

## Related files

- [.github/workflows/publish.yml](../../.github/workflows/publish.yml)
- [Getting Started](../index.md)
