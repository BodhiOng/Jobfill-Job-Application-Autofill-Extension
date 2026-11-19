# JobFill

JobFill is a Firefox-first, local-only browser extension for copying profile information and explicitly filling forms. It is built with TypeScript, Vite, and the WebExtensions API. No account, backend, authentication, or external API is required.

## Current features

- Searchable popup with click-to-copy profile fields.
- Profile builder with ready-made fields and English/Indonesian aliases.
- Personal, contact, address, education, past work experience, skills, links, preferences, and custom Q&A sections.
- Separate work-experience cards with company, job title, start date, end date, description, and work type.
- Technical skills stored as comma-separated values and shown as individual copyable items in the popup.
- Local JSON backup import/export.
- Local reusable files for resume, cover letter, and profile picture.
- Browser-based file viewer for stored files when supported by the browser.
- Dark/light theme preference shared by the popup and settings page.
- Firefox docked iframe interface with page-width adjustment, minimize behavior, and refresh support.
- Explicit autofill action. Fields are never changed merely because a page is opened.
- Deterministic field matching using field names, IDs, placeholders, autocomplete, ARIA labels, associated labels, aliases, and normalized text.
- Support for text inputs, email, telephone, dates, textareas, selects, React-controlled inputs, and common dropdown fallbacks.
- Autofill audit output in the page console showing fields read, matched, skipped, and filled.
- Existing values are preserved unless an overwrite action is explicitly used.

All profile data is stored locally with `browser.storage.local`.

## Requirements

- Node.js and npm.
- WSL with Node.js/npm and the `zip` utility for the included packaging script.
- Firefox for the primary extension target.

## Development

From WSL:

```bash
cd /mnt/c/Projects/jobfill
npm install
npm run typecheck
npm run build
```

The production extension is generated in `dist/`. The Vite development server is only for development UI work:

```bash
npm run dev
```

It uses `http://127.0.0.1:5173/`. This port is not required when running the built extension.

## Build a ZIP from Windows

From WSL, run the script from the project root:

```bash
bash build-extension.sh
```

It creates:

```text
JobFill-1.0.0.zip
```

The ZIP contains the built `dist` directory contents and is suitable for backup or uploading to Mozilla's Add-on Developer Hub. It is not a signed install package for Firefox Release by itself.

You can run the same command manually in WSL:

```bash
npm install && npm run typecheck && npm run build && rm -f JobFill-1.0.0.zip && zip -r JobFill-1.0.0.zip dist
```

## Load the unpacked extension in Firefox

1. Run `npm run build`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on**.
4. Choose `dist/manifest.json`.

Temporary add-ons are removed when Firefox restarts, so reload the built manifest after restarting Firefox or rebuilding the project. See Mozilla's [temporary installation guide](https://www.extensionworkshop.com/documentation/develop/temporary-installation/).

## Stable Firefox distribution

Firefox Release requires the extension to be signed by Mozilla. The usual distribution process is:

1. Build the extension.
2. Upload the ZIP to the [Firefox Add-on Developer Hub](https://www.extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).
3. Choose unlisted/self-distribution if it should not appear publicly.
4. Download the signed `.xpi` and install it through Firefox's Add-ons Manager.

The manifest includes a stable Firefox extension ID. For private/self-distributed installation, create AMO API credentials, export them in WSL, then run:

### Get AMO API credentials

1. Sign in to [addons.mozilla.org](https://addons.mozilla.org/) with your Mozilla account.
2. Open the [AMO API credentials page](https://addons.mozilla.org/developers/addon/api/key/).
3. Generate a set of credentials.
4. Use the generated API key as `AMO_JWT_ISSUER` and the generated API secret as `AMO_JWT_SECRET`.

These credentials are only used by `web-ext` to submit/sign the extension through Mozilla. They are not used by JobFill at runtime. Keep the secret private and never commit it to Git.

```bash
export AMO_JWT_ISSUER="your-generated-api-key"
export AMO_JWT_SECRET="your-generated-api-secret"
bash sign-extension.sh
```

`sign-extension.sh` runs `build-extension.sh` first. This is necessary because `web-ext sign` signs the compiled extension from `dist/`; building first ensures the `.xpi` contains the latest TypeScript, manifest, HTML, and CSS changes. You do not need to run `build-extension.sh` separately before signing.

The environment variables only apply to the current WSL terminal session. If you do not want to use API credentials, upload `JobFill-1.0.0.zip` manually through the [Firefox Add-on Developer Hub](https://www.extensionworkshop.com/documentation/publish/signing-and-distribution-overview/) and download the signed `.xpi`.

See the [web-ext command reference](https://www.extensionworkshop.com/documentation/develop/web-ext-command-reference/).

## Chromium

The project contains a `browser`/`chrome` API fallback, but the current manifest is Firefox-first and uses Manifest V2. Firefox is the supported stable target. Chromium packaging may require a separate Manifest V3 manifest and build configuration.

## Privacy and permissions

JobFill has no backend and does not send profile data anywhere. The current manifest uses `storage`, `activeTab`, and `tabs` for local persistence, explicit form filling, and communication with the active page. Content scripts run on pages so the user-triggered matcher can inspect supported form controls.
