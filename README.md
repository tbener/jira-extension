# TalTool Jira Extension

A Chrome extension for quicker day-to-day work in Jira: fast issue navigation, a freezing issue title, copy-as-link, due date alerts, favorites, and a popup showing your open/active issues.

## Install

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/taltool-jira-extension/iohffigcgojbeipjbhnacdfpolihlpfk).

## Features

- Popup for quick navigation to any issue by key
- Freeze issue title while scrolling, so you always know which issue you're on
- Copy issue key as a markdown link + summary
- Smart navigation — reuses an existing tab instead of opening a new one
- Due date indication according to status
- Configurable "My Issues" list in the popup (JQL is customizable in Options)
- Save favorite issues for quick access

## Development

### Running a local build for testing

Since the extension is distributed through the Chrome Web Store, use a separate local dev build to test changes without touching your installed version:

1. Make your changes (on a branch off `develop`).
2. Run `node scripts/build-dev.js`. This copies `src/` into `dist-dev/` and appends `(DEV)` to the extension name.
3. Go to `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the `dist-dev` folder.
4. The dev build shows a small red "D" badge on the toolbar icon, so it's easy to tell apart from the Web Store version.
5. After making more changes, rerun `node scripts/build-dev.js` and click the reload icon on the extension's card in `chrome://extensions/`.

### Releasing

See [RELEASING.md](RELEASING.md).
