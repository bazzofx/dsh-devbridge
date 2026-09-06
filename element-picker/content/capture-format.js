/*
 * capture-format.js — single source of truth for the capture block shape.
 * Loaded by: picker content script, send.js content script, popup page.
 * Exposes globalThis.DSHPC.captureText(capture) => the full block (Markdown + JSON).
 */
(() => {
  'use strict';

  const VERSION = 'v1';
  const MARKER = 'ELEMENT-CAPTURE';

  function captureText(c) {
    const html = String(c.html || '').slice(0, 2000);
    const comment = String(c.comment || '').trim();

    const lines = [
      `<!-- ${MARKER} ${VERSION} -->`,
      `Captured: ${c.capturedAt || new Date().toISOString()}`,
      `URL: ${c.url || ''}`,
      `Selector: ${c.selector || ''}`,
      `XPath: ${c.xpath || ''}`,
      `Tag: ${String(c.tag || '').toUpperCase()}  Text: "${c.text || ''}"`,
      `Comment: ${comment ? comment.replace(/\n/g, '\n          ') : '(none)'}`,
      'HTML:'
    ];

    const fence = html.includes('```') ? '````' : '```';
    lines.push(fence + 'html');
    lines.push(html);
    lines.push(fence);

    const md = lines.join('\n');

    const payload = {
      marker: `${MARKER} ${VERSION}`,
      capturedAt: c.capturedAt || null,
      url: c.url || null,
      selector: c.selector || null,
      xpath: c.xpath || null,
      tag: c.tag ? String(c.tag).toUpperCase() : null,
      text: c.text || null,
      comment: comment || null,
      html: html || null
    };
    const json = JSON.stringify(payload, null, 2);

    return md + '\n\n---\n' + json;
  }

  globalThis.DSHPC = Object.assign(globalThis.DSHPC || {}, {
    VERSION,
    MARKER,
    captureText
  });
})();
