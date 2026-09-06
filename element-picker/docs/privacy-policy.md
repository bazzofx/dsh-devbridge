# Privacy Policy — Dev Bridge for DSH

*Developed by Cyber Samurai.*

**Effective date:** 2026-02-XX
**Applies to:** the Chrome extension *Dev Bridge for DSH* (version 1.2.1).

## Short version

This extension **collects no personal data, transmits nothing over the
internet, and has no analytics or advertising**. Everything you create with it
stays on your own computer.

## What we collect

Nothing. The extension does not ask for, read, or store personal information,
account credentials, browsing history, or any site content off-device.

## What happens on your device

- **Captures (element references + your reviews)** are stored in your
  browser’s local extension storage (`chrome.storage.local`) on this device.
  They never leave the device unless you explicitly choose to send or
  download them.
- **Sending to the Harness chat:** when you press *Send to Harness chat*, the
  capture text is inserted into the chat composer of a locally running
  DeepSeek Harness GUI at `http://127.0.0.1:3080` (a loopback address on your
  own machine). This happens only when you press Send, only in your browser,
  and only toward that local address.
- **Downloads:** the *Download .md* button saves a capture as a Markdown file
  to your own downloads folder when you click it.

## Permissions, in plain terms

- `activeTab` — lets the element picker operate in the tab you are actively
  reviewing, and only while you use the extension.
- Host access to `127.0.0.1:3080` / `localhost:3080` — your own machine’s
  loopback, used solely for sending a capture you initiated.
- `storage`, `scripting`, `clipboardWrite` — local list storage, on-demand
  picker injection, and the Copy-block button.

## Network

The extension performs **no network requests**. No remote code is loaded or
executed. Loopback (`127.0.0.1`) communication stays on your machine.

## Third parties

None. No third-party services, SDKs, analytics, or advertising are included.

## Security

- No remote code; the extension is plain MV3 with default Content Security
  Policy restrictions.
- Permissions are kept to the minimum needed (see the manifest and
  `docs/permission-justification.md`).
- If you ever uninstall the extension, its local storage is removed by Chrome.

## Changes

If this policy changes, the updated version will be published at the same URL
with a new effective date. Changes will be limited to accurate descriptions of
how the extension handles data.

## Contact

For privacy questions or to report an issue, open an issue on the project’s
public repository or contact the developer at the address listed on the store
listing for this extension.

---

*Host this page at a public URL and paste that URL into the Chrome Web Store
dashboard → Privacy practices → Privacy policy URL. `docs/privacy-policy.html`
is the same content as a standalone, ready-to-host page.*
