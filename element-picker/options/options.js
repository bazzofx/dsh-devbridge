/* options.js — Settings for Dev Bridge for DSH.
 * Fields: Harness port + master prompt (prepended to every capture sent).
 */
(() => {
  'use strict';

  const DEFAULT_PORT = 3080;
  const HOSTS = ['127.0.0.1', 'localhost'];
  const STORE_KEY = 'dshpc_settings';

  const portInput = document.getElementById('portInput');
  const masterInput = document.getElementById('masterInput');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const connNote = document.getElementById('connNote');
  const masterCount = document.getElementById('masterCount');

  let savedPort = DEFAULT_PORT;

  function originsForPort(port) {
    return HOSTS.map((h) => `http://${h}:${port}/`);
  }

  function validPort(v) {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 65535;
  }

  function show(message, kind) {
    statusEl.textContent = message;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  function note(message, kind) {
    connNote.textContent = message || '';
    connNote.className = 'note' + (kind ? ' ' + kind : '');
  }

  async function readSettings() {
    const { [STORE_KEY]: settings = {} } = await chrome.storage.local.get(STORE_KEY);
    return settings || {};
  }

  async function load() {
    const settings = await readSettings();
    const port = Number(settings.port);
    savedPort = validPort(port) ? port : DEFAULT_PORT;
    portInput.value = String(savedPort);
    masterInput.value = settings.masterPrompt || '';
    updateMasterCount();
    note('Harness connection: 127.0.0.1:' + savedPort, '');
  }

  function updateMasterCount() {
    const len = masterInput.value.length;
    masterCount.textContent = len + ' characters' + (len > 0 ? ' · sent with every capture' : '');
  }

  masterInput.addEventListener('input', updateMasterCount);

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    show('Saving…');
    try {
      const rawPort = portInput.value.trim();
      if (!validPort(rawPort)) {
        show('Port must be a number between 1 and 65535.', 'err');
        saveBtn.disabled = false;
        return;
      }
      const port = Number(rawPort);
      const masterPrompt = masterInput.value.trim();
      const next = { port, masterPrompt };

      // Non-default ports need a local host permission; ask once.
      if (port !== DEFAULT_PORT || savedPort !== port) {
        const needed = originsForPort(port);
        const has = await chrome.permissions.contains({ origins: needed });
        if (!has) {
          const granted = await chrome.permissions.request({ origins: needed });
          if (!granted) {
            show('Permission denied. The Harness port stays on ' + savedPort + '.', 'err');
            portInput.value = String(savedPort);
            saveBtn.disabled = false;
            return;
          }
        }
      }

      await chrome.storage.local.set({ [STORE_KEY]: next });
      savedPort = port;
      note('Harness connection: 127.0.0.1:' + port, 'ok');
      show('Settings saved ✓', 'ok');
    } catch (err) {
      show('Save failed: ' + ((err && err.message) || err), 'err');
    } finally {
      saveBtn.disabled = false;
    }
  });

  load();
})();
