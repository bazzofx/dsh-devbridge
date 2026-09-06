/* popup.js — capture list + actions for Dev Bridge for DSH */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const listEl = $('#list');
  const emptyEl = $('#empty');
  const statusEl = $('#status');
  const tpl = $('#itemTpl');

  const STORE_KEY = 'dshpc_captures';

  function status(message, kind, ms = 2600) {
    statusEl.textContent = message;
    statusEl.className = 'status show' + (kind ? ' ' + kind : '');
    clearTimeout(statusEl._t);
    statusEl._t = setTimeout(() => statusEl.classList.remove('show'), ms);
  }

  async function getAll() {
    const { [STORE_KEY]: list = [] } = await chrome.storage.local.get(STORE_KEY);
    return list;
  }

  async function saveAll(list) {
    await chrome.storage.local.set({ [STORE_KEY]: list });
  }

  function hostOf(url) {
    try {
      return new URL(url).host;
    } catch {
      return url || '';
    }
  }

  function fmtTime(iso) {
    try {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? iso || '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso || '';
    }
  }

  /**
   * Stable identity for a stored capture. New captures carry a unique `id`;
   * older ones (before ids existed) fall back to a content signature. Always
   * compare captures with this — chrome.storage returns fresh object
   * instances on every read, so identity comparison (===) never matches.
   */
  function keyOf(c) {
    if (!c) return '';
    if (c.id) return 'id:' + c.id;
    return 'sig:' + [c.url, c.selector, c.capturedAt, c.tag, c.text].join('|');
  }

  async function render() {
    const list = await getAll();
    emptyEl.style.display = list.length ? 'none' : 'block';
    listEl.textContent = '';
    const frag = document.createDocumentFragment();

    list.slice(0, 40).forEach((capture) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector('.item-time').textContent = fmtTime(capture.capturedAt);
      node.querySelector('.item-host').textContent = hostOf(capture.url);
      node.querySelector('.item-selector').textContent = capture.selector || '(no selector)';
      const comment = node.querySelector('.item-comment');
      comment.textContent = capture.comment ? `“${capture.comment}”` : (capture.text ? `“${capture.text}”` : '(no comment)');

      node.querySelector('.act.send').addEventListener('click', async (e) => {
        e.stopPropagation();
        await sendCapture(capture);
      });
      node.querySelector('.act.copy').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(globalThis.DSHPC.captureText(capture));
          status('Copied to clipboard ✓', 'ok');
        } catch (err) {
          status('Copy failed: ' + (err && err.message || err), 'err');
        }
      });
      node.querySelector('.act.dl').addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = globalThis.DSHPC.captureText(capture);
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `element-capture-${String(capture.capturedAt || Date.now()).replace(/[^\w-]/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        status('Downloading .md…', 'ok');
        // Keep the blob alive long enough for the download to start.
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
      node.querySelector('.act.del').addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = keyOf(capture);
        const next = (await getAll()).filter((c) => keyOf(c) !== key);
        await saveAll(next);
        await render();
        status('Removed from history ✓', 'ok', 1500);
      });

      frag.appendChild(node);
    });
    listEl.appendChild(frag);
  }

  async function sendCapture(capture) {
    status('Sending to Harness chat…', '');
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'dshpc:send', capture });
      if (resp && resp.ok) {
        status(resp.delivered === false
          ? 'In the Harness composer now — press Enter there to submit.'
          : 'Sent to the DSH chat ✓', 'ok', 3000);
      } else {
        status('Send failed: ' + ((resp && (resp.detail || resp.status)) || 'no response'), 'err', 4000);
      }
    } catch (err) {
      status('Send failed: ' + (err && err.message || err), 'err', 4000);
    }
  }

  $('#pickBtn').addEventListener('click', async () => {
    status('Arming picker…', '');
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'dshpc:arm' });
      if (resp && resp.ok) {
        window.close();
      } else {
        const detail = (resp && (resp.detail || resp.status)) || 'unsupported page';
        const hint = resp && resp.hint ? '\n' + resp.hint : '';
        status('Could not start picker: ' + detail + hint, 'err', 5000);
      }
    } catch (err) {
      status('Could not start: ' + (err && err.message || err), 'err', 4000);
    }
  });

  $('#clearBtn').addEventListener('click', async () => {
    await saveAll([]);
    await render();
    status('Cleared ✓', 'ok', 1500);
  });

  // Settings (options page): Harness port + master prompt.
  $('#settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Footer credit link — open in a new tab (extension pages cannot navigate themselves).
  $('#authorLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://cybersamurai.co.uk' });
    window.close();
  });

  render();
})();
