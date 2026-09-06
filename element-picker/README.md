# Point & Comment → DSH (Chrome extension, v0)

Click **any element on any web page**, write a review about it, and send it
**straight into your DeepSeek Harness chat** — the chat receives the exact
CSS selector, XPath, HTML snippet and your comment, so the agent knows
precisely which element you mean (no more “the button at the bottom of the
left panel”).

The extension **does not read or upload your browsing data**. Captures are
stored locally in `chrome.storage.local` and only ever travel to the locally
running Harness chat at `http://127.0.0.1:3080`.

---

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome/Edge.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and choose this folder:
   `C:\_deepSeekApps\dev_bridge\element-picker`
4. Pin the “Point & Comment → DSH” icon for convenience.

Rebuild after editing any file: open `chrome://extensions`, find the
extension, click the **reload** (↻) button, then refresh your target pages.

---

## Use

### Pick & review an element
- Press **Alt+Shift+E** (anywhere), **or** click the extension icon → **Pick
  element on this page**.
- A pill appears: *Element picker ON*. **Hover** highlights the element under
  the cursor (orange outline).
- **Click** the element you mean → a review panel opens showing the captured
  `Selector`, `XPath`, visible `Text` and the `HTML` snippet.
- Type your review/comment, then:
  - **Send to Harness chat** — the capture is typed into the DSH chat
    composer (the tab at `127.0.0.1:3080`, opened if needed) and submitted.
  - **Copy block** — copies the full capture block (Markdown + JSON) so you
    can paste it anywhere (this chat works).
  - **Save only** — keeps it in the popup list without sending.
- `Esc` closes the panel (keep picking) · `Esc` again stops the picker.
- The picker ignores clicks on the pill/panel itself and only captures page
  elements in the top-level document (iframes come later).

### Manage captures
Click the toolbar icon → popup lists recent captures. Per capture: **Send**
(to the DSH chat), **Copy**, **.md** (download the block as a file), **✕**
(delete). **Clear** empties the list.

---

## The capture block (what the agent receives)

```html
<!-- ELEMENT-CAPTURE v1 -->
Captured: 2026-01-01T10:00:00.000Z
URL: https://example.com/page
Selector: button#submit[data-testid="buy-now"]
XPath: //button[@id='submit']
Tag: BUTTON  Text: "Buy Now"
Comment: Move this button above the search bar.
HTML:
```html
<button id="submit" data-testid="buy-now">Buy Now</button>
```
```

…followed by the same data as pretty JSON (`marker`, `url`, `selector`,
`xpath`, `tag`, `text`, `comment`, `html`). The agent should treat a pasted
block as: *“verify the selector uniquely matches that element on that URL,
find the code that renders it, then apply the comment.”* Ask first if the
selector is ambiguous.

**Selector strategy** (deterministic, verified unique via
`document.querySelectorAll`): `#id` → `[data-testid]` / `[data-cy]` /
`[data-test]` → `tag.class` combo → shortest unique `nth-of-type` path.

---

## Permissions — why

| Permission | Reason |
| --- | --- |
| `host_permissions: <all_urls>` | pick elements on any site you browse |
| `scripting` | inject the picker into the active tab on demand |
| `tabs` | find/open the Harness tab at `127.0.0.1:3080` |
| `storage` | keep your capture list locally |
| `downloads` | “Download .md” button |
| `clipboardWrite` | copy the capture block |
| content script on `127.0.0.1:3080` | type + submit the capture into the real chat composer |

## How “Send to Harness” works

The extension never scrapes the GUI. The Harness-page content script
(`content/send.js`) locates the real chat composer `<textarea>` (React
controlled), sets its value the React-safe way, then clicks the Send button
(or presses Enter) and confirms the composer cleared. If auto-submit is ever
blocked (e.g. agent mid-run), it falls back to pre-filling the composer for
you to press Enter.

---

## File map

```
element-picker/
├── manifest.json            # MV3 manifest
├── background.js            # arm picker; open Harness tab; route sends
├── content/
│   ├── capture-format.js    # the capture-block text/JSON (single source)
│   ├── selector.js          # stable CSS + XPath + HTML snippet extraction
│   ├── picker.js            # hover highlight, click-capture, review panel
│   ├── picker.css           # picker UI styles (dshpc- prefixed)
│   └── send.js              # Harness page: composer insert + submit
├── popup/                   # capture list UI (Send/Copy/.md/Delete/Pick)
├── icons/
└── README.md
```

## Roadmap (post-v0)

- Screenshot region per capture; shadow-DOM + same-origin iframe support.
- Capture queue file + DSH-side auto-ingest when you want to fire several
  reviews without pasting.
- Agent → page highlight handshake (“here is what I changed — re-check”).
