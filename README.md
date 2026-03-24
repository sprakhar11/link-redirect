# Chrome Link Redirect

A Manifest V3 Chrome extension that redirects URLs based on user-defined regex rules. Define patterns with JavaScript regular expressions, use capture group substitution (`$1`, `$2`, …) in destination URLs, and toggle rules on or off from a popup UI.

## Prerequisites

- **Google Chrome** (version 88 or later for Manifest V3 support)
- **Node.js** (v18+) and **npm** — only needed for running tests

## Development Setup

### Install test dependencies

```bash
npm install
```

### Run tests

```bash
npm test
```

This runs the [Vitest](https://vitest.dev/) test suite covering the storage layer, background service worker logic, and popup validation.

## Loading the Extension Locally

### 1. Enable Developer Mode

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle the **Developer mode** switch in the top-right corner of the page.

### 2. Load as Unpacked Extension

1. Click the **Load unpacked** button that appears after enabling Developer Mode.
2. In the file picker, select the root directory of this project (the folder containing `manifest.json`).
3. The extension will appear in your extensions list and its icon will show in the Chrome toolbar.

## Reloading After Code Changes

After editing any extension file (`background.js`, `popup.js`, `popup.html`, `popup.css`, `storage.js`, etc.):

1. Go to `chrome://extensions`.
2. Find **Chrome Link Redirect** in the list.
3. Click the **reload** button (circular arrow icon) on the extension card.
4. If you have the popup open, close and reopen it to pick up the changes.

> **Tip:** You can also press the keyboard shortcut shown on the extension card (if configured) or use the "Update" button at the top of the extensions page to reload all unpacked extensions at once.

## Inspecting Background Service Worker Logs

The background service worker (`background.js`) logs redirect activity, rule-matching warnings, and loop detection messages to its own console.

1. Go to `chrome://extensions`.
2. Find **Chrome Link Redirect** in the list.
3. Click the **Inspect views: service worker** link on the extension card.
4. This opens a DevTools window attached to the service worker. Switch to the **Console** tab to view logs.

> **Note:** The service worker may become inactive after a period of inactivity. Navigating to a URL that triggers a rule will wake it up. You can also click "service worker" again to re-inspect if the DevTools window closes.

## Project Structure

```
├── manifest.json       # Extension manifest (Manifest V3)
├── background.js       # Service worker — navigation interception and redirect logic
├── storage.js          # Chrome sync storage read/write helpers
├── popup.html          # Popup UI markup
├── popup.js            # Popup UI logic (rule CRUD, validation)
├── popup.css           # Popup styles
├── icons/              # Extension icons (16, 48, 128 px)
├── tests/              # Vitest unit tests
│   ├── background.test.js
│   ├── popup.test.js
│   └── storage.test.js
└── package.json        # Dev dependencies (vitest, jsdom)
```
