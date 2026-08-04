# Publishing Setup

Use this guide to configure Lens so the Publish workflow can build and
release the browser extensions.

## What the workflow does

The publish workflow in
[.github/workflows/publish.yml](../../.github/workflows/publish.yml)
does this:

1. Runs the release step through `cratis/release-action@v1`.
2. Builds the extension in `Source/` with npm on Node.js 23.
3. Uploads `Source/dist/` as the shared build artifact.
4. Publishes Chrome, Edge, Firefox, and Safari releases when the release
   is not marked as a prerelease.

Publishing can start in two ways:

- Manually through `workflow_dispatch`
- Automatically when a pull request is closed and changes under `Source/`
  are included

## Prerequisites

- GitHub repository admin access so you can add Actions secrets
- Accounts for each store you want to publish to
- Permission to publish GitHub releases from Actions
- A validated local build from `Source/` before you trigger a release

The workflow expects these local build commands to succeed:

```bash
cd Source
npm install
npm run build
```

## 1. Configure repository secrets

Open **GitHub repository settings > Secrets and variables > Actions**
and add the secrets used by the workflow.

## 2. How to get the secrets

Use the sections below to collect the values before you add them as
GitHub Actions secrets.

### Chrome Web Store

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

These are consumed by the `mnao305/chrome-extension-upload@v5.0.0` step.

How to get them:

1. **Create OAuth client (no extension needed yet):**
   - Go to [Google Cloud Console - APIs & Services - Credentials]
     (<https://console.cloud.google.com/apis/credentials>)
   - Create a new project or select existing project
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Select **Application type: Web application**
   - Add authorized redirect URI:
     `https://developers.google.com/oauthplayground`
   - Click **Create** and copy the client ID and client secret
   - Store the client ID as `CHROME_CLIENT_ID` and the client secret as
     `CHROME_CLIENT_SECRET`

2. **Enable Chrome Web Store API:**
   - Go to [Google Cloud Console - Chrome Web Store API]
     (<https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com>)
   - Click **Enable** for the project

3. **Generate refresh token:**
   - Go to [Google OAuth 2.0 Playground]
     (<https://developers.google.com/oauthplayground/>)
   - Click the gear icon (⚙️) in the upper right
   - Check **Use your own OAuth credentials**
   - Enter your client ID and client secret
   - In the left panel, find **Chrome Web Store API v1.1** and select
     `https://www.googleapis.com/auth/chromewebstore`
   - Click **Authorize APIs**
   - Sign in with the Google account that owns the extension
   - Click **Exchange authorization code for tokens**
   - Copy the refresh token and store it as `CHROME_REFRESH_TOKEN`

4. **Create extension in Chrome Web Store (requires .zip):**
   - From the `Source/` directory, run `npm install && npm run build`
   - From the project root, run
     `cd Source/dist && zip -r ../../lens-extension.zip .`
   - This creates `lens-extension.zip` in the project root with
     `manifest.json` at the archive root
   - Go to [Chrome Web Store Developer Dashboard]
     (<https://chrome.google.com/webstore/devconsole>)
   - Click **New item** or **Create** to start a new extension
   - Upload your `lens-extension.zip` file
   - Once created, copy the extension ID from the dashboard or from the
     published item URL
   - Store it as `CHROME_EXTENSION_ID`

5. **Complete Chrome Web Store privacy fields:**
   - The single purpose should describe Lens as a Cratis developer tool for
     inspecting Arc commands and queries and simulating tenant/user context.
   - Justify `storage` as local device storage for Lens settings,
     configured Arc sources, users, tenants, and popup navigation state.
   - Justify `cookies` as only being used to remove the Cratis Arc
     `.cratis-identity` cookie from configured Arc application or backend
     origins when the active Lens user or tenant changes. Lens does not
     store, transmit, analyze, or share cookie values.
   - Justify `declarativeNetRequest` and
     `declarativeNetRequestWithHostAccess` as required to add Cratis Arc
     identity and tenant headers to matching XHR requests.
   - Justify `<all_urls>` as needed because developers can configure Lens
     against arbitrary local or remote Cratis Arc application origins. Lens
     scopes its rules to the configured page origin or Arc backend host when
     possible.
   - Make sure the dashboard privacy answers match
     [PRIVACY_POLICY.md](../../../PRIVACY_POLICY.md).

### Microsoft Edge Add-ons

- `EDGE_PRODUCT_ID`
- `EDGE_CLIENT_ID`
- `EDGE_CLIENT_SECRET`
- `EDGE_ACCESS_TOKEN_URL`

These are consumed by the `wdzeng/edge-addon@v2` step.

How to get them:

1. **Get product ID:**
   - Go to [Microsoft Partner Center - Edge Add-ons]
     (<https://partner.microsoft.com/dashboard/microsoftedge/overview>)
   - Create or open the extension listing
   - Copy the product ID from the overview page and store it as
     `EDGE_PRODUCT_ID`

2. **Register application:**
   - Go to [Microsoft Entra admin center - App registrations]
     (<https://entra.microsoft.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps>)
   - Click **+ New registration**
   - Enter a name (e.g., "Edge Add-ons Publisher")
   - Select **Accounts in this organizational directory only**
   - Click **Register**
   - Copy the **Application (client) ID** and store it as
     `EDGE_CLIENT_ID`

3. **Create client secret:**
   - In the same app registration, go to **Certificates & secrets** →
     **Client secrets**
   - Click **+ New client secret**
   - Add a description and select expiration
   - Click **Add** and copy the secret value immediately (it will not be
     shown again)
   - Store it as `EDGE_CLIENT_SECRET`

4. **Configure API permissions:**
   - In the same app registration, go to **API permissions**
   - Click **+ Add a permission** → **APIs my organization uses**
   - Search for "Windows Store" or use the GUID
     `e3cdaaed-44ef-4744-a600-6cf7eb2c4dcb`
   - Select **user_impersonation** permission
   - Click **Add permissions**
   - Click **Grant admin consent** for the tenant

5. **Get token URL:**
   - Copy the tenant ID from the app registration overview page
   - Format the token URL as:
     `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
   - Store it as `EDGE_ACCESS_TOKEN_URL`

### Firefox Add-ons

- `FIREFOX_API_KEY`
- `FIREFOX_API_SECRET`

These are passed to `npx web-ext sign` for signing and
publishing the extension.

How to get them:

1. **Sign in to AMO:**
   - Go to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
   - Sign in with the Firefox account that will publish the extension

2. **Generate API credentials:**
   - Go to [API Credentials page]
     (<https://addons.mozilla.org/developers/addon/api/key/>)
   - Click **Generate new credentials**
   - Give the credentials a name (e.g., "Lens Extension Publisher")
   - Click **Generate credentials**
   - Copy the **JWT issuer** (this is your API key) and store it as
     `FIREFOX_API_KEY`
   - Copy the **JWT secret** and store it as `FIREFOX_API_SECRET`
   - These credentials cannot be retrieved again after you close the page,
     so save them immediately

### Safari

- `APPLE_SIGNING_IDENTITY`
- `APPLE_TEAM_ID`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER_ID`

These are used during the Safari conversion, archive, and export steps on `macos-latest`.

How to get them:

1. **Enroll in Apple Developer Program:**
   - Go to [Apple Developer Program]
     (<https://developer.apple.com/programs/>)
   - Complete enrollment for the team that will ship the Safari app
     extension
   - Note: This requires a $99/year membership

2. **Get Team ID:**
   - Go to [Apple Developer Account - Membership]
     (<https://developer.apple.com/account/#!/membership>)
   - Copy the **Team ID** and store it as `APPLE_TEAM_ID`

3. **Create signing certificate:**
   - Go to [Apple Developer - Certificates]
     (<https://developer.apple.com/account/resources/certificates/list>)
   - Click **+** to create a new certificate
   - Select **Developer ID Application** (for distribution outside Mac App
     Store) or **Apple Distribution** (for Mac App Store)
   - Follow the prompts to generate a CSR and download the certificate
   - Install the certificate in Keychain Access on macOS
   - Find the certificate in Keychain, right-click → Get Info
   - Copy the full certificate name (e.g., "Developer ID Application: Your
     Name (TEAM_ID)")
   - Store it as `APPLE_SIGNING_IDENTITY`

4. **Create App Store Connect API key:**
   - Go to [App Store Connect - Users and Access - Keys]
     (<https://appstoreconnect.apple.com/access/api>)
   - Click **+ Generate API Key** or **+** next to Active
   - Enter a name (e.g., "Lens Extension Publisher")
   - Select **Access: App Manager** or higher
   - Click **Generate**
   - Copy the **Key ID** and store it as `APPLE_API_KEY_ID`
   - Copy the **Issuer ID** (shown at the top of the page) and store it as
     `APPLE_API_ISSUER_ID`
   - Click **Download API Key** to get the `.p8` private key file
   - Store the `.p8` file securely — it can only be downloaded once

5. **Private key setup:**
   - The workflow needs access to the `.p8` private key file
   - The file must be available to the macOS runner in the location
     expected by `xcodebuild`
   - Consider adding the `.p8` file contents as a base64-encoded secret
     and decoding it in the workflow

## 3. Secret acquisition checklist

Before the first publish, confirm you can answer all of these:

- Which store account owns the Chrome extension, and who can generate its
  OAuth refresh token?
- Which Microsoft tenant owns the Edge listing and its OAuth application?
- Which Firefox publisher account owns the AMO API key pair?
- Which Apple team owns the signing certificate, Team ID, API key, and
  private key material?
- Who will rotate these credentials when they expire or are revoked?

## 4. Verify release permissions

The workflow requests these GitHub permissions:

- `contents: write`
- `deployments: write`
- `id-token: write`

Make sure repository and organization settings allow GitHub Actions to use
write permissions for releases.

## 5. Check the build environment

The build job uses:

- `ubuntu-latest` for release, build, Chrome, Edge, and Firefox
- `macos-latest` for Safari
- Node.js `23.x`
- npm in `Source/`

Before publishing, confirm that `Source/manifest.json` can safely have its
version rewritten by the workflow and that `npm run build` produces a complete
`Source/dist/` folder.

## 6. Understand artifact packaging

The build job uploads `Source/dist/` as an artifact named
`extension-dist`.

The store-specific jobs then package that artifact like this:

- Chrome downloads to `dist/` and zips the contents into
  `extension-chrome.zip`
- Edge downloads to `dist/` and zips the contents into `extension-edge.zip`
- Firefox downloads to `Source/dist/` and signs the unpacked folder with
  `web-ext`
- Safari downloads to `Source/dist/` and converts that folder into an Xcode
  Safari extension project

This means publishing setup depends on the extension being fully buildable
from `Source/dist/` alone.

## 7. Run a release

To publish manually:

1. Open the **Publish** workflow in GitHub Actions.
2. Select **Run workflow**.
3. Provide a `version`.
4. Provide `release-notes`.
5. Start the workflow.

If the release action decides the version should publish and it is not a
prerelease, the browser store jobs will run automatically after the build
job finishes.

## 8. Recommended setup checklist

- Add all required store secrets before the first release
- Validate `npm run build` locally from `Source/`
- Confirm store credentials have publish rights, not just read access
- Verify Safari signing assets are available to the macOS runner
- Test with a prerelease first if you want to verify the release step
  without publishing to stores

## Related files

- [.github/workflows/publish.yml](../../.github/workflows/publish.yml)
- [Getting Started](../index.md)
