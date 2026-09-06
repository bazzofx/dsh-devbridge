# Dev Bridge for DSH

*Developed by Cyber Samurai.*

A Chrome extension for **DeepSeek Harness** development: click any element on
any web page, write a review about it, and send it — with its **exact CSS
selector, compact markup snapshot and your comment** — straight into your Harness
chat. No more “the button at the bottom of the left panel”; the agent knows
precisely which element you mean.

> **Privacy first.** The extension makes **no remote network requests**,
> collects no data, and stores captures only in your browser’s local
> `chrome.storage`. The only place a capture ever travels to is the locally
> running Harness chat at `http://127.0.0.1:3080` — and only when you press
> **Send**.

---

## Features

- **Click-to-capture** on any element of any page you are allowed to browse.
- **Stable, verified selectors** — generated deterministically
  (`#id` → `data-testid`/`data-cy` → tag+class → shortest unique `nth-of-type`
  path) and checked against the live DOM before use.
- **Review panel in the page**: comment → *Send to Harness chat* / *Copy block*
  / *Save only*.
- **Direct chat delivery**: the capture is typed into the real Harness composer
  and submitted for you (or pre-filled if the agent is mid-turn).
- **Capture list** in the popup: re-send, copy, download as `.md`, delete.

## Install

### Chrome Web Store
*(Store listing pending publication — see [`docs/store-listing.md`](docs/store-listing.md).)*
Install from the store link once published. No configuration needed: the
extension talks to your local Harness at `http://127.0.0.1:3080`.

### Developer mode (local install / development)
1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. **Load unpacked** → select this folder (`element-picker/`).
4. Pin the “Dev Bridge for DSH” icon.

After editing source files: reload the extension at `chrome://extensions`
(↻ button) and refresh any open target pages.

## Quick start

1. Have your DeepSeek Harness GUI open at `http://127.0.0.1:3080`.
2. On any page press **Alt+Shift+E** — or click the toolbar icon → **Pick
   element on this page**.
3. Hover (orange outline) and **click** the element you want to review.
4. Type your review in the panel and press **Send to Harness chat**.
5. The capture arrives in your Harness chat; the agent verifies the selector on
   that URL, finds the code, and applies your comment.

`Esc` closes the review panel (keep picking); `Esc` again stops the picker.

## The capture block

Every capture is sent to the chat as ONE pretty-printed JSON object with
exactly these fields - no HTML/markup, no marker, no capturedAt:

```json
{
  "url": "https://example.com/page",
  "selector": "button#submit[data-testid=\"buy-now\"]",
  "XPath": "//button[@id='submit']",
  "Text": "Buy Now",
  "comment": "Move this button above the search bar."
}
```

HTML is never captured or sent; the selector and XPath identify the element.
History-only fields (capturedAt, id) stay in the popup list locally and never
travel to the chat.

**Agent-side rule:** treat the message as “verify the selector uniquely matches
that element on that URL, find the code that renders it, then apply the
comment”. If the selector is ambiguous, ask before editing.
## Permissions & privacy

| Declared | Why | Data impact |
| --- | --- | --- |
| `activeTab` | Inject the picker into the tab you are actively reviewing, only when you invoke the extension (toolbar icon or `Alt+Shift+E`) | Temporary, user-triggered, per-tab access |
| `host_permissions` for `127.0.0.1:3080` / `localhost:3080` | Deliver captures to your locally running Harness chat | Only on explicit **Send** |
| `storage` | Keep your capture list on this device (`chrome.storage.local`) | Local only |
| `scripting` | Inject the on-demand picker scripts | — |
| `clipboardWrite` | Copy the capture block when you click **Copy** | — |

**We deliberately do not request:** `<all_urls>` host access, `tabs`,
`downloads`, or any network permission. The extension performs **no network
I/O**; `127.0.0.1` is a local address, not the internet.

See [`docs/permission-justification.md`](docs/permission-justification.md)
and [`docs/privacy-policy.md`](docs/privacy-policy.md) for details.

## Limitations (current)

- Picking works on the top-level document. Cross-origin iframes and shadow-DOM
  interiors are not captured yet.
- Elements that re-render without stable hooks fall back to a positional
  selector; the agent re-verifies before editing.
- The Harness chat must be reachable at `http://127.0.0.1:3080` (the default
  `dsh web` address). Configurable Harness address is planned.
- The picker intentionally does not run on `chrome://` pages, the Chrome Web
  Store, or other restricted schemes.

## Development

### Layout

```
element-picker/
├── manifest.json            # MV3 manifest (v1.1.11, minimal permissions)
├── background.js            # arm picker (activeTab); deliver to Harness tab
├── content/
│   ├── capture-format.js    # capture-block text/JSON — single source of truth
│   ├── selector.js          # stable CSS + compact markup snapshot
│   ├── picker.js            # hover highlight, click-capture, review panel
│   ├── picker.css           # picker UI styles (dshpc- prefixed)
│   └── send.js              # Harness page: composer insert + submit
├── popup/                   # capture list (Send / Copy / .md / Delete)
├── demo/demo-page.html      # sample page for testing & screenshots
├── icons/
├── docs/                    # store listing, privacy, permissions, screenshots
├── scripts/build-release.ps1
├── CHANGELOG.md
└── README.md
```

### Build a release zip

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-release.ps1
```

Validates the manifest, required files and icon dimensions, then writes a
store-ready zip to `releases/element-picker-<version>.zip` (plus a SHA-256
checksum file). The zip’s top-level folder is the extension root, ready for
“Load unpacked” or the Chrome Web Store dashboard.

### Related docs

- [`docs/store-listing.md`](docs/store-listing.md) — listing copy & requirements
- [`docs/permission-justification.md`](docs/permission-justification.md) — review Q&A
- [`docs/privacy-policy.md`](docs/privacy-policy.md) · `docs/privacy-policy.html`
- [`docs/screenshots.md`](docs/screenshots.md) — how to capture store screenshots
- [`CHANGELOG.md`](CHANGELOG.md)

## Troubleshooting

- **Nothing happens on the hotkey** — confirm the shortcut at
  `chrome://extensions/shortcuts`, or use the toolbar icon → *Pick element*.
- **“Could not start picker”** — the page type blocks injection (restricted
  scheme). Pick on a regular `http(s)` page.
- **Capture sits in the composer unsent** — the agent was mid-turn; press
  Enter / Send in the Harness tab. The text is already there.
- **Harness not reachable** — make sure `dsh web` is running on port 3080 and
  the tab can load `http://127.0.0.1:3080`.
