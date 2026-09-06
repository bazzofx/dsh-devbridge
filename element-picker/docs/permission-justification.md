# Permission justification

Why each permission exists, what it can and cannot do, and what a reviewer
should verify. **No permission is used for anything beyond its single
feature.**

| Permission | Feature it powers | What it cannot do |
| --- | --- | --- |
| `activeTab` | The picker runs only in the tab you are actively reviewing — granted when you click the toolbar icon or press Alt+Shift+E. | Cannot access other tabs, background sites, or this tab without a fresh user invocation. |
| `host_permissions`: `http://127.0.0.1:3080/*`, `http://localhost:3080/*` | `background.js` finds/creates the Harness tab and `content/send.js` (declared only for those two loopback URLs) inserts the capture into the chat composer. | Cannot reach the internet or any other host; the address is the machine’s own loopback. |
| `storage` | Persists the capture list in `chrome.storage.local` (max 200 entries). | Cannot read other sites’ data or send anything off-device by itself. |
| `scripting` | Injects `picker.*` on demand into the tab the user chose. | Injection only happens after an `activeTab`-granted invocation. |
| `clipboardWrite` | “Copy block” writes the capture text to the clipboard on click. | No clipboard reading. |

## Where the code proves it

- `manifest.json` — the single source of truth; note there is **no** `tabs`,
  `downloads`, `<all_urls>`, or network permission.
- `background.js` — only two jobs: inject the picker into the active tab
  (`ensurePicker`) and route a capture to a `127.0.0.1:3080` /
  `localhost:3080` tab (`handleSend`).
- `content/send.js` — declared only in `content_scripts` matches for the two
  loopback URLs; it never fetches; it sets a textarea value and presses send.
- `content/picker.js` + `selector.js` — read the DOM of the page the user is
  looking at, while the user is looking at it, and only while the picker is
  armed (visible pill, `Esc` disarms).
- No file in the extension calls `fetch`, `XMLHttpRequest`, `WebSocket`, or
  any remote-code mechanism. Search hint: `fetch(`, `XMLHttpRequest`,
  `new WebSocket` appear **zero** times.

## Review answers (Q&A)

- **Why read and change all your data on 127.0.0.1?** The extension types a
  capture block into your locally running DeepSeek Harness chat at that
  loopback address. 127.0.0.1 is your own machine; nothing is transmitted over
  a network.
- **Why does the picker need site access?** It does not request standing site
  access. `activeTab` grants access to one tab, only while you use the
  extension, exactly matching the “click an element” interaction.
- **Any data collection?** None. No analytics, no telemetry, no network.
