/*
 * send.js — runs on the DeepSeek Harness GUI page (127.0.0.1:3080).
 * Listens for dshpc:send-capture and types the capture block into the real
 * chat composer, then submits it (send button when found, otherwise Enter).
 * Depends on capture-format.js being loaded first (see manifest).
 */
(() => {
  'use strict';

  const HARNESS_MARKER_SELECTOR = '[data-input-backdrop]';

  function isVisible(node) {
    if (!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const r = node.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function inHiddenAncestor(node) {
    let n = node;
    while (n && n !== document.documentElement) {
      if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') return true;
      n = n.parentElement;
    }
    return false;
  }

  /** The chat composer textarea: visible, enabled, non-hidden, prefers the InputBar (data-input-backdrop). */
  function findComposer() {
    const areas = Array.from(document.querySelectorAll('textarea')).filter((t) => {
      if (t.disabled) return false; // readOnly is fine: a busy agent queues the message
      if (!isVisible(t)) return false;
      if (inHiddenAncestor(t)) return false;
      return true;
    });
    if (areas.length === 0) return null;
    const withMarker = areas.filter((t) => t.closest(HARNESS_MARKER_SELECTOR));
    const pool = withMarker.length > 0 ? withMarker : areas;
    pool.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    return pool[0];
  }

  /** React-safe value set for controlled textarea/input. */
  function setReactValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findSendButton(area) {
    let scope = area.closest(HARNESS_MARKER_SELECTOR) || area.parentElement;
    for (let depth = 0; scope && depth < 6; depth += 1, scope = scope.parentElement) {
      const buttons = Array.from(scope.querySelectorAll('button')).filter((b) => {
        if (b.disabled) return false;
        if (!isVisible(b)) return false;
        const label = ((b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + (b.textContent || '')).trim();
        return /send|发送|submit/i.test(label);
      });
      if (buttons.length > 0) return buttons[0];
    }
    return null;
  }

  function pressEnter(el) {
    const opts = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true
    };
    el.dispatchEvent(new KeyboardEvent('keydown', opts));
    el.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitFor(fn, timeoutMs, intervalMs) {
    const start = Date.now();
    for (;;) {
      if (fn()) return true;
      if (Date.now() - start > timeoutMs) return false;
      await sleep(intervalMs);
    }
  }

  async function deliver(capture) {
    const area = findComposer();
    if (!area) return { ok: false, status: 'no-composer', detail: 'Chat composer not found on the Harness page.' };

    // Master prompt from Settings is prepended to every capture we send.
    const { dshpc_settings = {} } = await chrome.storage.local.get('dshpc_settings');
    const master = String((dshpc_settings && dshpc_settings.masterPrompt) || '').trim();
    let text = globalThis.DSHPC.captureText(capture);
    if (master) text = master + '\n\n' + text;
    area.focus({ preventScroll: false });
    area.scrollIntoView({ block: 'center' });
    setReactValue(area, text);
    await sleep(120); // let React commit the draft

    const sendBtn = findSendButton(area);
    if (sendBtn) {
      sendBtn.click();
    } else {
      pressEnter(area);
    }

    const cleared = await waitFor(() => {
      const current = document.activeElement === area ? area.value : (area.value || '');
      return String(current).trim() === '';
    }, 3000, 90);

    return cleared
      ? { ok: true, delivered: true, status: 'delivered', detail: 'Capture submitted to the DSH chat.' }
      : { ok: true, delivered: false, status: 'prefilled', detail: 'Capture is in the composer — press Enter / Send to submit.' };
  }

  // Idempotency guard: ignore a re-delivery of the same capture within 15 s so
  // a double click/route can never submit the message twice into the chat.
  let lastSendId = null;
  let lastSendAt = 0;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.type !== 'dshpc:send-capture') return false;
    const now = Date.now();
    if (msg.capture && msg.capture.id && msg.capture.id === lastSendId && now - lastSendAt < 15000) {
      sendResponse({ ok: true, delivered: true, status: 'duplicate-skipped', detail: 'Duplicate send ignored.' });
      return false;
    }
    if (msg.capture && msg.capture.id) { lastSendId = msg.capture.id; lastSendAt = now; }
    deliver(msg.capture).then(sendResponse, (err) =>
      sendResponse({ ok: false, status: 'error', detail: String(err && err.message || err) })
    );
    return true; // async response
  });
})();
