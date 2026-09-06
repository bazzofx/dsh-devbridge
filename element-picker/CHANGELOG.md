# Changelog

All notable changes to **HSN Dev Bridge Design** are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned with [SemVer](https://semver.org/).

## [1.1.10] — 2026-02-XX

### Fixed
- picker.js toast(): no longer throws a TypeError when the picker was torn down
  (Esc) while an async send/copy callback was still finishing; it now checks the
  root is connected and no-ops safely.
## [1.1.9] — 2026-02-XX

### Changed
- Send-to-Harness message is a single pretty-printed JSON with exactly:
  url, selector, XPath, Text, comment. Nothing else - no Markdown copy, no
  marker, no capturedAt/tag/markup/html.
- HTML is no longer captured at all (markup snapshot removed); captures keep
  selector + XPath + visible text + comment.
- History rows are upserted by id, so duplicate rows (and duplicate posts)
  can no longer accumulate.
- confirmed: the old double block can only come from a stale installed build.
## [1.1.8] — 2026-02-XX

### Changed
- Send-to-Harness messages are now a single JSON object (no duplicated Markdown
  copy) with exactly the fields: url, selector, xpath, text, comment.
- History-only fields (capturedAt, id, tag, markup, html) remain stored locally
  for the popup UI but are never sent to the chat.
- XPath restored to the payload (capture + describe) since consumers need it.
- Added an idempotency guard in the Harness sender: re-delivering the same
  capture within 15 seconds is ignored, so a double click can never double-post.
## [1.1.7] — 2026-02-XX

### Changed
- Strictly compact sends: the HTML fallback for old stored captures is removed —
  every send is now URL + selector + tag/text + small Markup + comment, nothing more.
- Selector engine improved: when an element has no stable hooks, the selector now
  anchors on the nearest uniquely-identifiable ancestor (id / data-testid / role /
  aria-label / class) instead of a long positional chain; tag+class lookups try up
  to 4 classes before falling back to a positional path.
## [1.1.6] — 2026-02-XX

### Changed
- Capture payload compacted (`ELEMENT-CAPTURE v1.1`): removed the redundant
  XPath field and the ~2000-char outerHTML dump. Captures now carry URL, unique
  verified CSS selector, tag, short visible text, a compact opening-tag markup
  snapshot and the comment — roughly 70-80% fewer tokens per review, with no
  accuracy loss (selector verified at capture, re-verified by the agent before
  acting). Legacy captures still render their html/xpath.
## [1.1.5] — 2026-02-XX

### Changed
- Popup subtitle updated to: Send elements from web page directly to Deep Seek Harness.

## [1.1.4] — 2026-02-XX

### Changed
- Renamed the extension from HSN Dev Bridge Design to **Dev Bridge for DSH**.
- Chat-target wording in the manifest, popup and docs now says DSH chat.

## [1.1.3] — 2026-02-XX

### Changed
- Extension icons regenerated in a pure red gradient (was a lighter salmon-red that read orange-ish at small sizes); white crosshair retained.

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
