/*
 * capture-format.js - outbound capture shape.
 * Loaded by: picker, send.js, popup.
 * Exposes DSHPC.captureText(capture): ONE pretty-printed JSON object with
 * exactly { url, selector, XPath, Text, comment }.
 * No HTML/markup, no marker, no capturedAt. History-only fields stay stored
 * locally in the popup list and never travel to the chat.
 */
(() => {
  'use strict';

  const VERSION = 'v1.1';
  const MARKER = 'ELEMENT-CAPTURE';

  const esc = (s) => String(s == null ? '' : s).trim();

  function captureText(c) {
    // Single pretty JSON: url, selector, XPath, Text, comment - nothing else.
    const payload = {
      url: c.url || '',
      selector: c.selector || '',
      XPath: c.xpath || '',
      Text: c.text || '',
      comment: String(c.comment || '').trim()
    };
    return JSON.stringify(payload, null, 2);
  }

  globalThis.DSHPC = Object.assign(globalThis.DSHPC || {}, {
    VERSION,
    MARKER,
    captureText
  });
})();