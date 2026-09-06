# Chrome Web Store — Listing Kit

Everything you paste into the Chrome Web Store developer dashboard
(https://chrome.google.com/webstore/devconsole) for **Dev Bridge for DSH** v1.2.1.

> **Before you start**: you need a developer account
> (one-time **USD 5** registration fee) and a publicly hosted privacy policy —
> see [`privacy-policy.md`](privacy-policy.md). `docs/privacy-policy.html` is a
> self-contained page you can host anywhere (GitHub Pages, a gist, your site).

## 1. Basic info

| Field | Value |
| --- | --- |
| Extension name | `Dev Bridge for DSH` |
| Summary (short description) | ≤ **132 characters** — see candidates below |
| Category | Developer Tools |
| Language | English |
| Developer (publisher) | Cyber Samurai |
| Single purpose | **Send precise element references (selector/XPath) with a written review from any page into a locally running DeepSeek Harness chat.** |

### Short description candidates (≤132 chars)
1. `Click any element on a web page, write a review, and send its exact selector + XPath straight into your DeepSeek Harness chat.` **(131 chars)**
2. `Review website elements visually: click an element, add a comment, and send its precise CSS selector and XPath to your DeepSeek Harness chat.` (146 — too long, trim)
3. `Point at any element on a page, leave a review, and hand its exact selector/XPath to the DeepSeek Harness agent in your chat.` (135 — trim 3 chars)

## 2. Detailed description (paste-ready)

```
Dev Bridge for DSH lets you review a website the way you actually see it.

Instead of describing “the button at the bottom of the left panel” in words,
you click the real element on the page:

1. Press Alt+Shift+E (or open the extension and choose “Pick element on this page”).
2. Hover to highlight the element, then click it.
3. Type your review in the panel that appears.
4. Press “Send to Harness chat”.

Your Harness chat receives the element’s exact CSS selector, XPath, visible
text, HTML snippet, and your comment. The agent can verify the selector on
that URL, locate the code that renders the element, and apply your review —
without ambiguity.

Everything you create stays on your machine:
• Captures are stored only in your browser’s local storage.
• The extension makes no network requests.
• The only destination for a capture is your locally running DeepSeek Harness
  chat at http://127.0.0.1:3080, and only when you press Send.

Permissions, explained:
• activeTab – lets the picker run in the tab you are reviewing, only while you
  use the extension (no background access to sites).
• Host access to 127.0.0.1:3080 and localhost:3080 – the local Harness chat.
• storage – keeps your capture list on this device.
• scripting – injects the picker on demand.
• clipboardWrite – copies a capture block when you click “Copy”.

Requirements: DeepSeek Harness running locally at http://127.0.0.1:3080.
```

## 3. Screenshots & graphics

| Asset | Spec | Where from |
| --- | --- | --- |
| Store icon | 128×128 PNG | `icons/icon128.png` (auto-generated) |
| Screenshot 1 | 1280×800 or 640×400 (use 1280×800) | picker armed, element highlighted |
| Screenshot 2 | 1280×800 | review panel open with a comment |
| Screenshot 3 | 1280×800 | popup capture list |
| Small promo tile (optional) | 440×280 | popup + picker crop |
| Marquee promo tile (optional) | 1400×560 | composite banner |

Follow [`screenshots.md`](screenshots.md) — it includes the ready-made
`demo/demo-page.html` and exact click-by-click steps.

## 4. Privacy practices (dashboard form)

- **Does your extension comply with the Chrome Web Store User Data
  Policy?** Yes.
- **Data use:** the extension does not collect, transmit, or sell any data.
  Answer each category with “No user data collected” / none, including:
  - No personal information, authentication, payments, health, web history,
    browsing activity.
  - No remote code.
- **Privacy policy URL:** host `docs/privacy-policy.html` and paste the public
  URL. (Required for any listing that handles user data — safest to provide it
  even though this extension transmits nothing.)

## 5. Permission justification (paste into the “permission justification” notes if asked)

> “activeTab” injects the element picker only into the tab the user is
> reviewing and only when they invoke the extension (toolbar icon or the
> Alt+Shift+E command). Host access to 127.0.0.1:3080 / localhost:3080
> delivers a capture to the user’s own locally running DeepSeek Harness chat —
> a loopback address, not the internet — and only on explicit Send.
> “storage” keeps the user’s capture list on-device; “scripting” injects the
> picker on demand; “clipboardWrite” supports the Copy-block button. No
> remote network requests occur anywhere in the extension.

## 6. After publishing

1. Copy the store URL into `README.md` (“Install → Chrome Web Store”).
2. Tag the release `v1.2.1` and note the URL in `CHANGELOG.md`.
