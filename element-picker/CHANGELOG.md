# Changelog

All notable changes to **HSN Dev Bridge Design** are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned with [SemVer](https://semver.org/).

## [1.1.2] — 2026-02-XX

### Changed
- Popup footer: 'Cyber Samurai' is now a hyperlink to https://cybersamurai.co.uk (opens in a new tab).

## [1.1.1] — 2026-02-XX

Bugfix release.

### Fixed
- Popup history: the X (delete) button now reliably removes a capture from the list. Deletion compared stored entries by object identity, which never matches across chrome.storage reads (every read returns fresh instances); it now matches a stable per-capture key - new captures carry a unique id, older ones fall back to a content signature.

## [1.1.0] — 2026-02-XX

Rebranded to **HSN Dev Bridge Design** - developed by Cyber Samurai, red & white theme.

### Changed
- Renamed the extension to $newName.
- Rethemed UI (red/white): picker overlay, pill, review panel, popup and icons.
- Popup footer now credits 'Developed by Cyber Samurai'.
- Capture contract unchanged (ELEMENT-CAPTURE v1); selectors and Harness delivery logic untouched.

## [1.0.0] — 2026-02-XX

Production release, prepared for the Chrome Web Store.

### Security & permissions
- Removed the broad `host_permissions: <all_urls>` — the picker now runs under the
  **`activeTab`** grant (temporary, user-invoked) instead of permanent access to
  every website.
- Removed the `tabs` permission — no browsing-history access; tab operations are
  scoped to the local Harness host permission.
- Removed the `downloads` permission — “Download .md” now uses an in-popup blob
  download.
- Permanent host access is limited to `http://127.0.0.1:3080` /
  `http://localhost:3080` (the DeepSeek Harness chat) and is only used when the
  user explicitly sends a capture.
- Captures are stored only in `chrome.storage.local`; the extension makes no
  remote network requests.

### Reliability
- Cleaner failure surfacing when a page cannot host the picker (chrome:// pages,
  the Web Store, etc.), with a guidance hint in the popup.

### Packaging & docs
- Version bumped to 1.0.0; added this changelog.
- Added `scripts/build-release.ps1` — reproducible store-ready `.zip` builds with
  validation and SHA-256 output.
- Rewrote the README for end users and maintainers.
- Added `docs/`: store listing copy, permission justification, privacy policy
  (Markdown + standalone HTML), screenshot guide, and a demo page.

## [0.1.0] — 2026-02-XX

Initial working version.

- Element picker on any page (`Alt+Shift+E` or toolbar icon) with hover highlight.
- Deterministic CSS selector + XPath + HTML snippet extraction
  (`#id` → `data-testid`/`data-cy` → tag+class → unique `nth-of-type` path).
- In-page review panel: comment, **Send to Harness chat**, Copy block, Save only.
- Background service worker opens/reuses the Harness tab at `127.0.0.1:3080`.
- Harness-page content script inserts the capture into the real chat composer
  (React-safe value set + submit) with delivered/prefilled reporting.
- Popup capture list: Send / Copy / .md / Delete / Pick on this page.
- Capture block contract (`ELEMENT-CAPTURE v1`) shared by picker, popup and docs.
