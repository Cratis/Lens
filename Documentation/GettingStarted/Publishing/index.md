# Publishing Setup

Use this guide as a Lens release maintainer: establish store ownership and signing assets, collect the named credentials, save the repository secrets, then check the build artifact before deliberately starting a release. If you only want to use Lens locally, follow Getting Started under Related files; browser-store credentials are not part of that setup.

## What the workflow does

The publish workflow in
[.github/workflows/publish.yml](../../../.github/workflows/publish.yml)
separates the release decision, shared build and store-specific jobs:

1. Runs the release step through `cratis/release-action@v1`.
2. Builds the extension in `Source/` with Yarn on Node.js 23 when the release decision requests publishing.
3. Uploads `Source/dist/` as the shared build artifact.
4. Starts the Chrome, Edge, Firefox, and Safari publish jobs only for a publish decision that is not a prerelease. Check each job's result separately; starting a job is not a published store listing.

The workflow starts manually through `workflow_dispatch`, or automatically on a push to `main` that changes files under `Source/`. It does not run once for every closed pull request. Runs are grouped by workflow and ref and configured to queue rather than replace an in-flight run.

## Prerequisites

- GitHub repository admin access so you can add Actions secrets
- Accounts for each store you want to publish to
- Permission to publish GitHub releases from Actions
- A validated local build from `Source/` before you trigger a release

The workflow expects these local build commands to succeed:

```bash
cd Source
yarn install
yarn ci        # typecheck, specs and build — the same gate CI runs
```

## 1. Configure repository secrets

Collect the store inputs in the next section before entering them here. Use the ownership checklist to confirm who controls each account and its rotation; a copied identifier alone does not establish publishing access. Then open **GitHub repository settings > Secrets and variables > Actions** and add the named secrets for the workflow. Keep credential values out of the workflow file and release logs.

## 2. How to get the secrets

Use the store sections as acquisition references, then return to repository secret entry. Confirm each provider's current account, OAuth, signing and pricing requirements in its portal before creating assets: repository source establishes which inputs the jobs consume, not the provider's current enrollment or approval policy.

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
   - From the `Source/` directory, run `yarn install && yarn build`
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
     Lens saves current settings in `chrome.storage.local`; loading settings can also read older Chrome sync data as a legacy-settings fallback.
   - Justify `scripting` as injecting a read-only detection script into the
     inspected page to determine whether it is a Cratis Arc application and
     to read its Arc configuration and observable-query diagnostics. The
     script runs only when the popup is open, only on the tab the developer
     is looking at, and only reads — it never modifies the page. It needs
     the main world because the values it reads live on page-owned React
     objects that an isolated content script cannot see.
   - Justify `cookies` as only being used to remove the Cratis Arc
     `.cratis-identity` cookie from configured Arc application or backend
     origins when the active Lens user or tenant changes. Lens does not
     store, transmit, analyze, or share cookie values.
   - Justify `declarativeNetRequest` and
     `declarativeNetRequestWithHostAccess` as required to add Cratis Arc
     identity and tenant headers to matching XHR requests.
   - Describe `<all_urls>` alongside the actual rule conditions: Lens supports development applications on local or remote hosts. When a page hostname is available, the rules use a wildcard URL filter bounded by that initiating hostname; otherwise they use the configured backend host. With no usable host scope, Lens installs no rules. This is host-based matching, not a claim of full-origin isolation.
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

The Safari job runs conversion, archive and export on `macos-latest`. It references these inputs, but the workflow shows no certificate-import or private-key provisioning step. Establish that runner handoff before treating Safari as ready; registering secret identifiers is not the same as installing signing material.

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
   - Confirm how the `.p8` private key file will reach the macOS runner through your approved signing setup.
   - The workflow invokes `xcodebuild` but does not show how to install the `.p8` file. Do not assume that adding an unused repository secret completes this handoff; the release maintainer must resolve the runner provisioning procedure separately.

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

- `issues: write`
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
- Yarn in `Source/` (pinned via `.yarnrc.yml` + the committed release binary)

The build job rewrites `Source/manifest.json` from the release step's version output before `yarn build`. Check the resulting `Source/dist/` manifest and bundle rather than assuming the checked-in version is the one being packaged. A completed build is not a check of each store's version rules.

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

The store jobs prepare the shared built artifact; they do not repeat the extension build. Inspect the downloaded folder and the archive's manifest location when diagnosing a packaging failure. Safari also reads the repository's export options file and needs its signing assets, so `Source/dist/` alone is not a complete Safari release setup.

For a local archive, run `yarn build-package` from the Source directory. The repository helper builds the extension and writes `dist/lens-extension.zip` at the repository root. That helper path differs from both the initial Chrome listing ZIP described above and the Chrome/Edge ZIP names produced by the workflow.

## 7. Run a release

Manual dispatch is a release action, not a read-only packaging check. A non-prerelease publish decision starts all four store jobs after the build; a prerelease skips those jobs but can still run the release and build steps. Complete the readiness checks below before starting a run:

To publish manually:

1. Open the **Publish** workflow in GitHub Actions.
2. Select **Run workflow**.
3. Provide a `version`.
4. Provide `release-notes`.
5. Start the workflow.

After starting a run, inspect the release job's publish decision, prerelease flag and reason, then the build artifact and each store job's result. The build requires a publish decision; the store jobs also require a non-prerelease. Use the job outcomes to distinguish a deliberately skipped store publish from a failed upload or missing signing setup.

## 8. Recommended setup checklist

- Complete the account-ownership checklist and secret entry before a store release; confirm publish rights, not just read access.
- Validate `yarn build` locally from `Source/` and inspect the artifact/version used by the workflow.
- Resolve Safari runner signing/key provisioning before a non-prerelease run; the workflow does not supply that installation procedure.
- If you choose a prerelease first, use it to inspect the release/build path and shared artifact. Store jobs are skipped, so this does not test their credentials, signing or upload steps.
- Start a non-prerelease only when you intend the store jobs to run, then inspect each result rather than treating build success as publication.

## 9. Troubleshooting

**The publish run was cancelled seconds after a merge.** Compare the run's event and ref in GitHub Actions with the workflow configuration before changing `concurrency`. The current trigger is a Source-changing push to main, not one run per closed pull request. Its workflow/ref group is configured to queue runs; the retired pull-request-number explanation does not diagnose this configuration. Inspect the affected run and its job logs rather than changing the grouping to match the old advice.

**The release job ran but every store job was skipped.** Inspect both the publish decision and prerelease flag. `should-publish: false` skips the build and store path; a prerelease can build while still skipping every store job. The verify-published job reports the no-label and error reasons as failures. For a missing semantic version label, follow its diagnostic and add exactly one of `major`, `minor`, or `patch` to the merged pull request before retrying.

**A store job failed with a credentials error.** Start with the failing step's named inputs and the corresponding store list in section 2. Check account ownership and publish access as well as whether the named secrets are present, without printing their values. A local build or successful prerelease does not validate a skipped store job's credentials; Safari also needs the runner signing/key handoff described above.

## Related files

- [.github/workflows/publish.yml](../../../.github/workflows/publish.yml)
- [Getting Started](../index.md)
