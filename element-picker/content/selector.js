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

  function css(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';

    // 1. id
    if (el.id) {
      const hit = unique(el, '#' + escapeCSS(el.id));
      if (hit) return hit;
    }

    // 2. data attributes
    for (const key of ATTR_KEYS) {
      const value = el.getAttribute(key);
      if (value) {
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const hit = unique(el, `${tagOf(el)}[${key}="${escaped}"]`);
        if (hit) return hit;
      }
    }

    // 3. tag + classes
    for (let max = 1; max <= 2; max += 1) {
      const sel = classSelector(el, max);
      if (sel) {
        const hit = unique(el, sel);
        if (hit) return hit;
      }
    }

    // 4. minimal unique suffix of the nth-of-type path
    const parts = pathParts(el);
    for (let start = 0; start < parts.length; start += 1) {
      const sel = parts.slice(start).join(' > ');
      const hit = unique(el, sel);
      if (hit) return hit;
    }

    // Absolute fallback (should always be unique).
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
      html: el.outerHTML ? el.outerHTML.slice(0, 2000) : '',
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
