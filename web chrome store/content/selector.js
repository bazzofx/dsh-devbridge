/*
 * selector.js — deterministic, verifiable element locating.
 * Exposes globalThis.DSHSelector = { css(el), xpath(el), describe(el) }.
 *
 * CSS strategy (first unique candidate wins):
 *   1. #id
 *   2. [data-testid] / [data-cy] / [data-test] / [data-component] / [data-test-id]
 *   3. tag + up to 2 class names
 *   4. minimal unique suffix of an nth-of-type path
 */
(() => {
  'use strict';

  const ATTR_KEYS = ['data-testid', 'data-cy', 'data-test', 'data-component', 'data-test-id'];
  const EXTRA_ANCHOR_ATTRS = ['role', 'aria-label', 'name', 'type', 'alt', 'placeholder'];

  function escapeCSS(value) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    return String(value).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  }

  function queryOne(sel) {
    try {
      const list = document.querySelectorAll(sel);
      if (list.length !== 1) return null;
      return list[0];
    } catch {
      return null;
    }
  }

  function unique(el, sel) {
    const found = queryOne(sel);
    return found === el ? sel : null;
  }

  function tagOf(el) {
    return el.tagName.toLowerCase();
  }

  function classSelector(el, maxClasses) {
    const classes = Array.from(el.classList || []).slice(0, maxClasses);
    if (classes.length === 0) return null;
    const parts = [tagOf(el), ...classes.map((k) => '.' + escapeCSS(k))];
    return parts.join('');
  }

  function nthOfTypeIndex(el) {
    let n = 1;
    let node = el;
    while ((node = node.previousElementSibling) !== null) {
      if (node.tagName === el.tagName) n += 1;
    }
    return n;
  }

  /** Full absolute nth-of-type path, root-first. Returns array of part strings. */
  function pathParts(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE && tagOf(node) !== 'html') {
      const tag = tagOf(node);
      const idx = nthOfTypeIndex(node);
      parts.unshift(idx === 1 && tag === 'body' ? tag : `${tag}:nth-of-type(${idx})`);
      node = node.parentElement;
    }
    return parts;
  }

  function escapeAttr(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /** Nearest-ancestor anchor: an id/data/attr/class combo that uniquely
   *  identifies an ancestor cheaply, so long positional chains can be
   *  shortened to `anchor > ... > element`. */
  function anchorSelector(el) {
    if (el.id) { const s = '#' + escapeCSS(el.id); if (s.length <= 90) return s; }
    for (const key of ATTR_KEYS) {
      const v = el.getAttribute(key);
      if (v) { const s = tagOf(el) + `[${key}="${escapeAttr(v)}"]`; if (s.length <= 90 && unique(el, s)) return s; }
    }
    for (const key of EXTRA_ANCHOR_ATTRS) {
      const v = el.getAttribute(key);
      if (v && v.length <= 40) { const s = tagOf(el) + `[${key}="${escapeAttr(v)}"]`; if (s.length <= 90 && unique(el, s)) return s; }
    }
    for (let max = 1; max <= 3; max += 1) {
      const classes = Array.from(el.classList || []).slice(0, max);
      if (!classes.length) break;
      const s = tagOf(el) + classes.map((k) => '.' + escapeCSS(k)).join('');
      if (s.length <= 80 && unique(el, s)) return s;
    }
    return null;
  }

  function css(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';

    const cands = new Set();
    const consider = (sel, maxLen) => {
      if (!sel || sel.length > (maxLen || 150)) return;
      const hit = unique(el, sel);
      if (hit) cands.add(hit);
    };

    // 1. id
    if (el.id) consider('#' + escapeCSS(el.id));
    // 2. data attributes on the element itself
    for (const key of ATTR_KEYS) {
      const value = el.getAttribute(key);
      if (value) consider(tagOf(el) + `[${key}="${escapeAttr(value)}"]`);
    }
    // 3. tag + classes (try up to 4; hashed leaves often need more)
    for (let max = 1; max <= 4; max += 1) {
      const classes = Array.from(el.classList || []).slice(0, max);
      if (!classes.length) break;
      consider(tagOf(el) + classes.map((k) => '.' + escapeCSS(k)).join(''));
    }
    // 4. anchored path: nearest uniquely-identifiable ancestor + short chain
    const up = [];
    let node = el;
    for (let i = 0; i < 12 && node && node.nodeType === Node.ELEMENT_NODE && tagOf(node) !== 'html'; i += 1) {
      up.push(node);
      node = node.parentElement;
    }
    for (let a = 1; a < up.length; a += 1) {
      const anchor = anchorSelector(up[a]);
      if (!anchor) continue;
      const rel = [];
      let cur = el;
      while (cur && cur !== up[a]) {
        rel.unshift(tagOf(cur) + ':nth-of-type(' + nthOfTypeIndex(cur) + ')');
        cur = cur.parentElement;
      }
      consider(anchor + (rel.length ? ' > ' + rel.join(' > ') : ''));
    }
    // 5. minimal unique suffix of the full positional path (length-capped)
    const parts = pathParts(el);
    for (let start = 0; start < parts.length; start += 1) {
      consider(parts.slice(start).join(' > '));
    }

    const list = [...cands].sort((a, b) => a.length - b.length);
    if (list.length) return list[0];
    return parts.join(' > ') || tagOf(el);
  }

  function xpath(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return `//*[@id=${JSON.stringify(el.id)}]`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      const tag = tagOf(node);
      let idx = 1;
      let sib = node;
      while ((sib = sib.previousElementSibling) !== null) {
        if (sib.tagName === node.tagName) idx += 1;
      }
      parts.unshift(idx === 1 ? `/${tag}` : `/${tag}[${idx}]`);
      node = node.parentElement;
    }
    return parts.join('');
  }

  function describe(el) {
    const rect = el.getBoundingClientRect();
    const rawText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return {
      css: css(el),
      xpath: xpath(el),
      tag: tagOf(el),
      text: rawText.slice(0, 160),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };
  }

  globalThis.DSHSelector = { css, xpath, describe };
})();
