/*
 * picker.js — element picker + review panel + capture.
 * Injected on demand (from background) into the page the user is reviewing.
 *
 * Load order in background: capture-format.js, selector.js, picker.js.
 * Messaging (all types prefixed dshpc):
 *   in  dshpc:ping          -> { ok: true, active: boolean }
 *   in  dshpc:arm           -> start / re-show picker
 *   in  dshpc:stop          -> teardown picker
 *   out dshpc:send          -> { capture }   (to background)
 */
(() => {
  'use strict';

  const STATE = { OFF: 'off', HUNT: 'hunt', COMPOSE: 'compose' };
  let state = STATE.OFF;
  let root = null; // .dshpc-root containing pill, overlay, panel, toast
  let overlay = null;
  let panel = null;
  let toastEl = null;
  let toastTimer = null;
  let hoverEl = null;
  let currentCapture = null;
  let huntListeners = null; // { mouseover, mouseout, click, keydown, contextmenu, scroll, resize }

  /* ---------------------------------------------------------------- helpers */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function toast(message, kind) {
    if (!toastEl) {
      toastEl = el('div', 'dshpc-toast');
      root.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.remove('ok', 'err');
    if (kind) toastEl.classList.add(kind);
    // reflow to restart transition
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3600);
  }

  async function pushCapture(capture) {
    try {
      const { dshpc_captures: list = [] } = await chrome.storage.local.get('dshpc_captures');
      list.unshift(capture);
      if (list.length > 200) list.length = 200;
      await chrome.storage.local.set({ dshpc_captures: list });
    } catch (err) {
      // storage failures must not block the flow
    }
  }

  function copyText(text) {
    const done = () => toast('Copied to clipboard ✓', 'ok');
    const fail = () => toast('Copy failed', 'err');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => legacyCopy(text) ? done() : fail());
    } else {
      legacyCopy(text) ? done() : fail();
    }
  }

  function legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function refreshHuntClass() {
    document.documentElement.classList.toggle('dshpc-hunting', state === STATE.HUNT);
  }

  /* ------------------------------------------------------------------ UI */

  function buildPill() {
    const pill = el('div', 'dshpc-pill');
    const lead = el('span');
    lead.innerHTML = 'Element picker <b>ON</b> — click any element to review it &amp; send to DSH';
    const stopBtn = el('button', null, 'Stop (Esc)');
    stopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      teardown();
    });
    pill.appendChild(lead);
    pill.appendChild(stopBtn);
    return pill;
  }

  function buildPanel(capture) {
    const wrap = el('div', 'dshpc-panel');

    const head = el('div', 'dshpc-panel-head');
    const titles = el('div');
    titles.style.cssText = 'min-width:0;flex:1';
    titles.appendChild(el('div', 'dshpc-panel-title', `Captured <${capture.tag}>`));
    const url = el('div', 'dshpc-panel-url', capture.url);
    titles.appendChild(url);
    const closeBtn = el('button', 'dshpc-panel-close', '✕');
    closeBtn.title = 'Close (keep picking)';
    closeBtn.addEventListener('click', () => {
      if (panel) panel.remove();
      panel = null;
      currentCapture = null;
      state = STATE.HUNT;
      refreshHuntClass();
    });
    head.appendChild(titles);
    head.appendChild(closeBtn);

    const body = el('div', 'dshpc-panel-body');
    const summary = el('div', 'dshpc-summary');
    summary.appendChild(row('Selector', el('span', 'dshpc-code', capture.selector)));
    summary.appendChild(row('XPath', el('span', 'dshpc-code', capture.xpath)));
    summary.appendChild(row('Text', el('span', null, capture.text ? `"${capture.text}"` : '(no text)')));
    const htmlBlock = el('div', 'dshpc-summary-row');
    htmlBlock.appendChild(el('span', null, 'HTML'));
    const htmlCode = el('pre', 'dshpc-code dshpc-html');
    htmlCode.textContent = capture.html;
    htmlBlock.appendChild(htmlCode);
    summary.appendChild(htmlBlock);
    body.appendChild(summary);

    const label = el('label', 'dshpc-comment-label', 'Your review / comment for the agent');
    const textarea = el('textarea', 'dshpc-comment');
    textarea.placeholder = 'e.g. Move this button above the search bar and change the label to "Go".';
    body.appendChild(label);
    body.appendChild(textarea);

    const actions = el('div', 'dshpc-actions');
    const sendBtn = el('button', 'dshpc-btn dshpc-btn-primary', 'Send to Harness chat');
    const copyBtn = el('button', 'dshpc-btn dshpc-btn-ghost', 'Copy block');
    const saveBtn = el('button', 'dshpc-btn dshpc-btn-ghost', 'Save only');
    const hint = el('span', 'dshpc-hint', 'Esc = close · pick another element right away');
    actions.appendChild(sendBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(saveBtn);
    actions.appendChild(hint);
    body.appendChild(actions);

    wrap.appendChild(head);
    wrap.appendChild(body);
    return { wrap, textarea, sendBtn, copyBtn, saveBtn };
  }

  function row(key, valueNode) {
    const r = el('div', 'dshpc-summary-row');
    r.appendChild(el('span', null, key));
    r.appendChild(valueNode);
    return r;
  }

  function showPill() {
    if (!root) return;
    if (!root.querySelector('.dshpc-pill')) root.appendChild(buildPill());
  }

  function hidePill() {
    const p = root && root.querySelector('.dshpc-pill');
    if (p) p.remove();
  }

  function withComment() {
    const out = Object.assign({}, currentCapture || {});
    const ta = panel && panel.querySelector('.dshpc-comment');
    out.comment = (ta ? ta.value : '').trim();
    return out;
  }

  function openCompose(capture) {
    state = STATE.COMPOSE;
    refreshHuntClass();
    hidePill();
    hideOverlay();
    currentCapture = capture;
    const built = buildPanel(capture);
    panel = built.wrap;
    root.appendChild(panel);
    const send = async () => {
      built.sendBtn.disabled = true;
      built.sendBtn.textContent = 'Sending…';
      const c = withComment();
      let resp = null;
      try {
        resp = await chrome.runtime.sendMessage({ type: 'dshpc:send', capture: c });
      } catch (err) {
        resp = { ok: false, status: 'error', detail: String(err && err.message || err) };
      }
      built.sendBtn.disabled = false;
      built.sendBtn.textContent = 'Send to Harness chat';
      if (resp && resp.ok) {
        pushCapture(c);
        panel.remove();
        panel = null;
        currentCapture = null;
        state = STATE.HUNT;
        refreshHuntClass();
        showPill();
        toast(resp.delivered === false
          ? 'Sent to DSH chat — ready in the composer (press Enter to submit)'
          : 'Sent to DSH chat ✓', 'ok');
      } else {
        toast('Send failed: ' + ((resp && (resp.status || resp.detail)) || 'no response'), 'err');
      }
    };
    built.sendBtn.addEventListener('click', send);
    built.copyBtn.addEventListener('click', () => {
      const c = withComment();
      copyText(globalThis.DSHPC.captureText(c));
      pushCapture(c);
    });
    built.saveBtn.addEventListener('click', () => {
      const c = withComment();
      pushCapture(c);
      panel.remove();
      panel = null;
      currentCapture = null;
      state = STATE.HUNT;
      refreshHuntClass();
      showPill();
      toast('Saved to the extension list ✓', 'ok');
    });
    built.textarea.focus();
  }

  /* ---------------------------------------------------------------- hunt */

  function repositionOverlay() {
    if (!overlay || state !== STATE.HUNT || !hoverEl) return;
    const r = hoverEl.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) {
      overlay.style.display = 'none';
      return;
    }
    overlay.style.display = 'block';
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  }

  function showOverlay(node) {
    hoverEl = node;
    repositionOverlay();
  }

  function hideOverlay() {
    hoverEl = null;
    if (overlay) overlay.style.display = 'none';
  }

  function inOwnUi(node) {
    return root && node && root.contains(node);
  }

  function onMouseOver(e) {
    if (state !== STATE.HUNT) return;
    const t = e.target;
    if (!(t instanceof Element) || t.closest('.dshpc-root')) return;
    showOverlay(t);
  }

  function onMouseOut(e) {
    if (state !== STATE.HUNT) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (e.relatedTarget instanceof Element && !(e.relatedTarget.closest('.dshpc-root'))) {
      // moved to another page element; mouseover will fire for it
    } else if (!e.relatedTarget) {
      hideOverlay();
    }
  }

  function onContextMenu(e) {
    if (state === STATE.HUNT && !inOwnUi(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onClick(e) {
    if (state !== STATE.HUNT) return;
    const t = e.target;
    if (!(t instanceof Element) || inOwnUi(t)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation && e.stopImmediatePropagation();

    hideOverlay();
    const desc = globalThis.DSHSelector.describe(t);
    const capture = {
      capturedAt: new Date().toISOString(),
      url: location.href,
      selector: desc.css,
      xpath: desc.xpath,
      tag: desc.tag,
      text: desc.text,
      html: desc.html,
      comment: ''
    };
    openCompose(capture);
  }

  function onKeyDown(e) {
    if (e.key !== 'Escape') return;
    if (state === STATE.COMPOSE) {
      // close the panel, keep picking
      if (panel) panel.remove();
      panel = null;
      currentCapture = null;
      state = STATE.HUNT;
      refreshHuntClass();
      showPill();
      toast('Review closed — click another element or press Esc to stop', '');
      return;
    }
    if (state === STATE.HUNT) {
      teardown();
    }
  }

  function attachHunt() {
    if (huntListeners) return;
    huntListeners = {
      mouseover: onMouseOver,
      mouseout: onMouseOut,
      click: onClick,
      keydown: onKeyDown,
      contextmenu: onContextMenu,
      scroll: repositionOverlay,
      resize: repositionOverlay
    };
    for (const [name, fn] of Object.entries(huntListeners)) {
      document.addEventListener(name, fn, name === 'click' || name === 'contextmenu' ? true : false);
    }
    // scroll/resize need capturing=false (bubbling) and also should track window
    window.addEventListener('scroll', repositionOverlay, true);
    window.addEventListener('resize', repositionOverlay);
  }

  function detachHunt() {
    if (!huntListeners) return;
    for (const [name, fn] of Object.entries(huntListeners)) {
      document.removeEventListener(name, fn, name === 'click' || name === 'contextmenu' ? true : false);
    }
    window.removeEventListener('scroll', repositionOverlay, true);
    window.removeEventListener('resize', repositionOverlay);
    huntListeners = null;
  }

  /* ------------------------------------------------------------- lifecycle */

  function init() {
    if (state !== STATE.OFF) {
      showPill();
      state = STATE.HUNT;
      refreshHuntClass();
      return;
    }
    root = el('div', 'dshpc-root');
    overlay = el('div', 'dshpc-overlay');
    overlay.style.display = 'none';
    root.appendChild(overlay);
    document.documentElement.appendChild(root);
    showPill();
    attachHunt();
    state = STATE.HUNT;
    refreshHuntClass();
  }

  function teardown() {
    state = STATE.OFF;
    refreshHuntClass();
    detachHunt();
    hideOverlay();
    if (root) {
      root.remove();
      root = null;
      overlay = null;
      panel = null;
      toastEl = null;
    }
    document.documentElement.classList.remove('dshpc-hunting');
  }

  /* -------------------------------------------------------------- runtime */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== 'string') return false;
    if (msg.type === 'dshpc:ping') {
      sendResponse({ ok: true, active: state !== STATE.OFF });
      return false;
    }
    if (msg.type === 'dshpc:arm') {
      init();
      sendResponse({ ok: true });
      return false;
    }
    if (msg.type === 'dshpc:stop') {
      teardown();
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });

  init();
})();
