/*
 * background.js — MV3 service worker for Dev Bridge for DSH.
 *
 * Security model (v1.1.11, Chrome Web Store hardening):
 *   - No <all_urls> host permission. The picker is injected under the
 *     `activeTab` grant, which Chrome bestows the moment the user invokes the
 *     extension (toolbar action click or the Alt+Shift+E command). Site
 *     access is therefore strictly user-triggered and temporary.
 *   - The only permanent host access is to the local DeepSeek Harness chat
 *     (127.0.0.1:3080 / localhost:3080), used exclusively to deliver a
 *     capture the user chose to send.
 *   - After a capture is made, nothing ever touches the reviewed page again:
 *     the payload is plain data routed through extension messaging.
 */
'use strict';

const HARNESS_URLS = ['http://127.0.0.1:3080/*', 'http://localhost:3080/*'];
const HARNESS_URL = 'http://127.0.0.1:3080';

/* ------------------------------------------------------------ picker arm */

async function armPickerInActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return { ok: false, status: 'no-tab', detail: 'No active tab found.' };
  return ensurePicker(tab.id);
}

async function ensurePicker(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: 'dshpc:ping' });
    if (ping && ping.ok) {
      await chrome.tabs.sendMessage(tabId, { type: 'dshpc:arm' });
      return { ok: true };
    }
  } catch {
    // no picker receiver yet — fall through and inject
  }
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content/picker.css'] });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/capture-format.js', 'content/selector.js', 'content/picker.js']
    });
    return { ok: true };
  } catch (err) {
    const msg = String((err && err.message) || err);
    return {
      ok: false,
      status: 'cannot-inject',
      detail: msg,
      hint: 'The picker only runs on regular web pages. If a page blocks it, invoke it again from the toolbar icon.'
    };
  }
}

/* ------------------------------------------------------------- DSH send */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pickHarnessTab() {
  const tabs = await chrome.tabs.query({ url: HARNESS_URLS });
  if (tabs.length === 0) return null;
  const focused = tabs.find((t) => t.active);
  return focused || tabs[0];
}

async function ensureHarnessTab() {
  const existing = await pickHarnessTab();
  if (existing) return { tab: existing, created: false };
  const created = await chrome.tabs.create({ url: HARNESS_URL });
  // wait for the page to finish loading
  for (let i = 0; i < 60; i += 1) {
    const info = await chrome.tabs.get(created.id).catch(() => null);
    if (info && info.status === 'complete') break;
    await sleep(250);
  }
  return { tab: created, created: true };
}

async function deliverToTab(tabId, capture) {
  // Retry while the content script (or a freshly opened Harness page) is mounting.
  for (let attempt = 0; attempt < 16; attempt += 1) {
    try {
      const resp = await chrome.tabs.sendMessage(tabId, { type: 'dshpc:send-capture', capture });
      if (resp && typeof resp === 'object') {
        // 'no-composer' is retriable: the GUI may still be hydrating its composer.
        if (resp.ok || resp.status !== 'no-composer') return resp;
      }
    } catch {
      // receiver missing — if the page is loaded, inject send.js manually
      try {
        const info = await chrome.tabs.get(tabId);
        if (info.status === 'complete') {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/capture-format.js', 'content/send.js']
          });
        }
      } catch {
        // ignore — keep retrying
      }
    }
    await sleep(700);
  }
  return { ok: false, status: 'timeout', detail: 'Could not reach the Harness chat tab.' };
}

async function handleSend(capture) {
  const { tab, created } = await ensureHarnessTab();
  if (!tab || !tab.id) return { ok: false, status: 'no-harness-tab', detail: 'Could not open the Harness chat.' };
  const resp = await deliverToTab(tab.id, capture);
  resp.openedNew = created;
  return resp;
}

/* ------------------------------------------------------------- messaging */

chrome.commands.onCommand.addListener((command) => {
  if (command === 'arm-picker') {
    armPickerInActiveTab().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return false;

  if (msg.type === 'dshpc:arm') {
    armPickerInActiveTab().then(sendResponse, (err) =>
      sendResponse({ ok: false, status: 'error', detail: String((err && err.message) || err) })
    );
    return true;
  }

  if (msg.type === 'dshpc:send') {
    handleSend(msg.capture).then(sendResponse, (err) =>
      sendResponse({ ok: false, status: 'error', detail: String((err && err.message) || err) })
    );
    return true;
  }

  return false;
});
