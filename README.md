# JobFill

JobFill is a local-first browser extension for copying and filling job application information. It uses TypeScript, Vite, and the WebExtensions API, with Firefox as the primary target and Chromium support through a `browser`/`chrome` API fallback.

## Features

- Searchable popup with one-click copy for saved fields.
- Explicit **Fill this page** and **Overwrite** actions; nothing is changed automatically.
- Deterministic matching from `name`, `id`, `placeholder`, `autocomplete`, ARIA labels, associated labels, and configurable aliases.
- Built-in English/Indonesian vocabulary for common fields such as `Full name`/`Nama lengkap`, `Phone`/`Nomor telepon`, `Address`/`Alamat`, `Salary`/`Gaji`, and more.
- React-friendly input/change/blur events for text inputs, textareas, and selects.
- Local `browser.storage.local` persistence with no backend, accounts, or external APIs.
- Options page for profile sections, custom Q&A, and JSON import/export backups.
- Existing values are preserved by default; low-confidence fields are skipped.

## Development

```bash
npm install
npm run typecheck
npm run build
```

`npm run dev` serves the Vite UI at `http://127.0.0.1:5173/`. Port 5173 must be free; if another Vite/Node process is using it, stop that process first. The extension’s actual runtime is loaded from the built `dist/` directory, not from the dev page.

The production extension is generated in `dist/`.

## Load in Firefox

1. Run `npm run build`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on…**.
4. Choose `dist/manifest.json`.

For Chromium, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/`.

All profile data stays in extension-local storage. The extension requests only `storage` and `activeTab`; filling occurs only after the user clicks a fill action.
