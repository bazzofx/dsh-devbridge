# Changelog

All notable changes to **Point & Comment → DSH** are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned with [SemVer](https://semver.org/).

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
